import { EventRule } from '../models/EventRule.js';
import { EventLog } from '../models/EventLog.js';
import { WorkflowDefinition } from '../models/WorkflowDefinition.js';
import { WorkflowExecution } from '../models/WorkflowExecution.js';
import Order from '../models/Order.js';
import { Order as LegacyOrder } from '../models/orderModel.js';
import { logAuditEvent } from './auditService.js';

class HyperAutomationService {
  async getAutomationDashboard() {
    const [ruleStats, execStats, failedRecent, activeRules, totalRules] = await Promise.all([
      EventLog.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      ]),
      WorkflowExecution.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } } } },
      ]),
      WorkflowExecution.countDocuments({ status: 'failed', startedAt: { $gte: new Date(Date.now() - 86400000) } }),
      EventRule.countDocuments({ active: true }),
      EventRule.countDocuments(),
    ]);

    const rs = ruleStats[0] || { total: 0, success: 0, failed: 0 };
    const ws = execStats[0] || { total: 0, completed: 0, failed: 0, running: 0 };
    const totalEvents = rs.total + ws.total;
    const totalSuccess = rs.success + ws.completed;
    const totalFailed = rs.failed + ws.failed;
    const successRate = totalEvents > 0 ? Math.round((totalSuccess / totalEvents) * 10000) / 100 : 100;

    const estimatedTimeSaved = totalSuccess * 15;
    const laborCostSaved = estimatedTimeSaved * 25;
    const errorCostAvoided = totalFailed * 50;
    const roi = Math.max(0, laborCostSaved + errorCostAvoided);

    return {
      totalRules: totalRules,
      activeRules,
      activeWorkflows: ws.running,
      totalExecutions: totalEvents,
      successfulExecutions: totalSuccess,
      failedExecutions: totalFailed,
      failedToday: failedRecent,
      successRate,
      roi: { estimatedTimeSavedMin: estimatedTimeSaved, laborCostSaved: laborCostSaved, errorCostAvoided, totalRoi: roi },
    };
  }

  async getRunningWorkflows() {
    return WorkflowExecution.find({ status: 'running' })
      .sort({ startedAt: -1 })
      .populate('workflowId', 'name')
      .lean();
  }

  async getFailedWorkflows() {
    return WorkflowExecution.find({ status: 'failed' })
      .sort({ startedAt: -1 })
      .limit(50)
      .populate('workflowId', 'name')
      .lean();
  }

  async retryWorkflow(executionId) {
    const exec = await WorkflowExecution.findById(executionId);
    if (!exec) throw new Error('Execution not found');
    if (exec.status !== 'failed') throw new Error('Can only retry failed executions');

    const wf = await WorkflowDefinition.findById(exec.workflowId);
    if (!wf) throw new Error('Original workflow not found');

    exec.status = 'running';
    exec.error = undefined;
    exec.startedAt = new Date();
    exec.nodes = exec.nodes.map(n => ({ ...n, status: 'pending' }));
    await exec.save();

    return exec;
  }

  async cancelWorkflow(executionId) {
    const exec = await WorkflowExecution.findById(executionId);
    if (!exec) throw new Error('Execution not found');
    if (exec.status !== 'running') throw new Error('Execution is not running');

    exec.status = 'cancelled';
    exec.completedAt = new Date();
    await exec.save();

    await logAuditEvent({
      action: 'cancel_workflow', category: 'automation',
      entityType: 'WorkflowExecution', entityId: executionId,
      description: `Workflow execution cancelled`,
    });

    return exec;
  }

  async getAutomationQueue() {
    const pendingRules = await EventRule.find({ active: true }).sort({ createdAt: 1 }).lean();
    const failedLogs = await EventLog.find({ status: 'failed', retried: { $ne: true } })
      .sort({ triggeredAt: -1 }).limit(50).lean();

    return {
      pendingRules: pendingRules.map(r => ({ id: r._id, name: r.name, event: r.event, action: r.action })),
      failedRetries: failedLogs.map(l => ({ id: l._id, event: l.event, error: l.error, triggeredAt: l.triggeredAt })),
      queueDepth: pendingRules.length + failedLogs.length,
    };
  }

  async getAutomationPerformance() {
    const hourly = await EventLog.aggregate([
      { $match: { triggeredAt: { $gte: new Date(Date.now() - 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$triggeredAt' } }, count: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);

    const byRule = await EventLog.aggregate([
      { $group: { _id: '$ruleId', executions: { $sum: 1 }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, avgResponseMs: { $avg: { $ifNull: ['$responseTime', 0] } } } },
      { $sort: { executions: -1 } },
      { $limit: 20 },
    ]);

    const avgResponseTime = await EventLog.aggregate([
      { $match: { responseTime: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$responseTime' } } },
    ]);

    return {
      hourlyTrend: hourly,
      topRules: byRule,
      avgResponseTimeMs: Math.round((avgResponseTime[0]?.avg || 0)),
      throughputLast24h: hourly.reduce((s, h) => s + h.count, 0),
    };
  }

  async getAiSuggestions() {
    const recentLogs = await EventLog.find().sort({ triggeredAt: -1 }).limit(1000).lean();
    const eventCounts = {};
    for (const log of recentLogs) {
      const key = `${log.event}:${log.entityType}`;
      if (!eventCounts[key]) eventCounts[key] = { event: log.event, entityType: log.entityType, count: 0, failed: 0 };
      eventCounts[key].count++;
      if (log.status === 'failed') eventCounts[key].failed++;
    }

    const suggestions = [];
    for (const [key, data] of Object.entries(eventCounts)) {
      if (data.failed / data.count > 0.3) {
        suggestions.push({
          type: 'fix_failing_rule',
          event: data.event,
          entityType: data.entityType,
          reason: `${data.failed} of ${data.count} executions failed`,
          priority: data.failed > 10 ? 'high' : 'medium',
        });
      }
    }

    const highVolumeEvents = Object.entries(eventCounts)
      .filter(([, d]) => d.count > 50 && !suggestions.some(s => s.event === d.event))
      .map(([, d]) => ({
        type: 'new_automation',
        event: d.event,
        entityType: d.entityType,
        reason: `${d.count} occurrences suggest automation opportunity`,
        priority: 'medium',
      }));

    const activeRules = await EventRule.find({ active: true }).lean();
    const totalRules = await EventRule.countDocuments();
    if (totalRules === 0) {
      suggestions.push({
        type: 'create_first_rule',
        reason: 'No automation rules configured',
        priority: 'high',
      });
    }

    return [...suggestions, ...highVolumeEvents].slice(0, 20);
  }

  async getAutomationROI() {
    const logs = await EventLog.find().lean();
    const totalExecutions = logs.length;
    const successful = logs.filter(l => l.status === 'success').length;
    const timePerManualTask = 30;
    const hourlyRate = 50;
    const timeSavedMin = successful * timePerManualTask;
    const laborCostSaved = (timeSavedMin / 60) * hourlyRate;
    const errorRateReduction = 0.7;
    const avgErrorCost = 100;
    const errorCostAvoided = Math.round(totalExecutions * errorRateReduction * avgErrorCost);
    const implementationCost = totalExecutions > 0 ? Math.round(totalExecutions * 1.5) : 1000;
    const totalBenefit = laborCostSaved + errorCostAvoided;
    const netRoi = totalBenefit - implementationCost;
    const roiPercent = implementationCost > 0 ? Math.round((netRoi / implementationCost) * 100) : 0;

    return {
      period: 'All time',
      totalAutomations: totalExecutions,
      successfulAutomations: successful,
      timeSavedMinutes: timeSavedMin,
      laborCostSaved: Math.round(laborCostSaved),
      errorCostAvoided,
      implementationCost,
      totalBenefit,
      netRoi,
      roiPercent,
      paybackPeriodMonths: totalBenefit > implementationCost ? Math.round((implementationCost / (totalBenefit / 12)) * 10) / 10 : null,
      efficiency: totalExecutions > 0 ? Math.round((successful / totalExecutions) * 100) : 0,
    };
  }
}

export const hyperAutomationService = new HyperAutomationService();
