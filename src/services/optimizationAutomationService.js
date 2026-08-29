import mongoose from 'mongoose';
import { OptimizationAutomation } from '../models/OptimizationAutomation.js';
import { OptimizationExecution } from '../models/OptimizationExecution.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { logAuditEvent } from './auditService.js';

class OptimizationAutomationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  async createAutomation(userId, data) {
    const automation = await OptimizationAutomation.create({
      name: data.name,
      description: data.description,
      type: data.type,
      trigger: data.trigger,
      config: data.config,
      schedule: data.schedule,
      conditions: data.conditions || [],
      actions: data.actions || [],
      status: 'active',
      approvalRequired: data.approvalRequired || false,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await logAuditEvent({
      userId,
      action: 'create_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      entityId: automation._id.toString(),
      description: `Created automation rule: ${automation.name} (${automation.type})`,
      status: 'success',
    });
    return automation;
  }

  async getAutomations(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.trigger) query.trigger = filters.trigger;
    if (filters.createdBy) query.createdBy = new mongoose.Types.ObjectId(filters.createdBy);
    const sort = filters.sort || { createdAt: -1 };
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      OptimizationAutomation.find(query).sort(sort).skip(skip).limit(limit).lean(),
      OptimizationAutomation.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateAutomation(userId, id, data) {
    const automation = await OptimizationAutomation.findByIdAndUpdate(
      id,
      {
        $set: {
          name: data.name,
          description: data.description,
          config: data.config,
          schedule: data.schedule,
          conditions: data.conditions,
          actions: data.actions,
          approvalRequired: data.approvalRequired,
        },
      },
      { new: true }
    );
    if (!automation) throw new Error('Automation not found');
    await logAuditEvent({
      userId,
      action: 'update_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      entityId: id,
      description: `Updated automation rule: ${automation.name}`,
      status: 'success',
    });
    return automation;
  }

  async deleteAutomation(userId, id) {
    const automation = await OptimizationAutomation.findByIdAndDelete(id);
    if (!automation) throw new Error('Automation not found');
    await OptimizationExecution.deleteMany({ automation: id });
    await logAuditEvent({
      userId,
      action: 'delete_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      entityId: id,
      description: `Deleted automation rule: ${automation.name}`,
      status: 'success',
    });
    return { deleted: true };
  }

  async activateAutomation(userId, id) {
    const automation = await OptimizationAutomation.findByIdAndUpdate(
      id,
      { status: 'active' },
      { new: true }
    );
    if (!automation) throw new Error('Automation not found');
    await logAuditEvent({
      userId,
      action: 'activate_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      entityId: id,
      description: `Activated automation: ${automation.name}`,
      status: 'success',
    });
    return automation;
  }

  async pauseAutomation(userId, id) {
    const automation = await OptimizationAutomation.findByIdAndUpdate(
      id,
      { status: 'paused' },
      { new: true }
    );
    if (!automation) throw new Error('Automation not found');
    await logAuditEvent({
      userId,
      action: 'pause_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      entityId: id,
      description: `Paused automation: ${automation.name}`,
      status: 'success',
    });
    return automation;
  }

  async evaluateAutomation(id) {
    const automation = await OptimizationAutomation.findById(id);
    if (!automation) throw new Error('Automation not found');
    if (automation.status !== 'active') return { shouldExecute: false, reason: 'Automation is not active' };
    if (!automation.conditions || automation.conditions.length === 0) {
      return { shouldExecute: true, reason: 'No conditions defined - will execute' };
    }
    const results = [];
    for (const condition of automation.conditions) {
      let currentValue = null;
      if (condition.metric.startsWith('telemetry.')) {
        const metricName = condition.metric.replace('telemetry.', '');
        const telemetry = await TelemetryEvent.findOne({ type: metricName }).sort({ timestamp: -1 }).lean();
        currentValue = telemetry ? telemetry.value : null;
      } else if (condition.metric.startsWith('metric.')) {
        const metricName = condition.metric.replace('metric.', '');
        const snapshot = await MetricSnapshot.findOne({ name: metricName }).sort({ timestamp: -1 }).lean();
        currentValue = snapshot ? snapshot.value : null;
      } else if (condition.metric === 'error_rate') {
        const errors = await TelemetryEvent.countDocuments({
          type: { $in: ['api_latency', 'db_latency'] },
          timestamp: { $gte: new Date(Date.now() - 3600000) },
        });
        const total = await TelemetryEvent.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 3600000) },
        });
        currentValue = total > 0 ? (errors / total) * 100 : 0;
      }
      const operator = condition.operator;
      const threshold = condition.value;
      let met = false;
      if (currentValue !== null) {
        switch (operator) {
          case 'gt': met = currentValue > threshold; break;
          case 'gte': met = currentValue >= threshold; break;
          case 'lt': met = currentValue < threshold; break;
          case 'lte': met = currentValue <= threshold; break;
          case 'eq': met = currentValue === threshold; break;
          case 'neq': met = currentValue !== threshold; break;
          default: met = false;
        }
      }
      results.push({ metric: condition.metric, operator, threshold, currentValue, met });
    }
    const allMet = results.every(r => r.met);
    return {
      shouldExecute: allMet,
      reason: allMet ? 'All conditions met' : 'Not all conditions satisfied',
      conditionResults: results,
      evaluatedAt: new Date(),
    };
  }

  async executeAutomation(userId, id) {
    const automation = await OptimizationAutomation.findById(id);
    if (!automation) throw new Error('Automation not found');
    const evaluation = await this.evaluateAutomation(id);
    if (!evaluation.shouldExecute) {
      throw new Error(`Cannot execute: ${evaluation.reason}`);
    }
    if (automation.approvalRequired) {
      const execution = await OptimizationExecution.create({
        automation: automation._id,
        status: 'pending_approval',
        findings: evaluation.conditionResults?.map(r => ({
          type: 'condition_check',
          detail: `${r.metric} ${r.operator} ${r.threshold} = ${r.currentValue} (${r.met ? 'met' : 'not met'})`,
          impact: 'pending review',
        })) || [],
        startedAt: new Date(),
      });
      await logAuditEvent({
        userId,
        action: 'execute_automation_pending_approval',
        category: 'optimization_automation',
        entityType: 'OptimizationExecution',
        entityId: execution._id.toString(),
        description: `Automation ${automation.name} requires approval before execution`,
        status: 'pending',
      });
      return { execution, status: 'pending_approval', message: 'Approval required before execution' };
    }
    const actionsExecuted = [];
    for (const action of (automation.actions || [])) {
      try {
        let result = null;
        switch (action.type) {
          case 'cleanup_telemetry':
            const olderThan = action.params?.olderThanDays || 90;
            const cutoff = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
            const deleted = await TelemetryEvent.deleteMany({ timestamp: { $lt: cutoff } });
            result = { deletedCount: deleted.deletedCount };
            break;
          case 'cleanup_metrics':
            const metricCutoff = action.params?.olderThanDays || 180;
            const mCutoff = new Date(Date.now() - metricCutoff * 24 * 60 * 60 * 1000);
            const mDeleted = await MetricSnapshot.deleteMany({ timestamp: { $lt: mCutoff } });
            result = { deletedCount: mDeleted.deletedCount };
            break;
          case 'archive':
            result = { archived: true, target: action.params?.target };
            break;
          case 'notify':
            result = { notified: true, channel: action.params?.channel };
            break;
          default:
            result = { skipped: true, reason: `Unknown action type: ${action.type}` };
        }
        actionsExecuted.push({
          action: action.type,
          result,
          status: result?.error ? 'failure' : 'success',
        });
      } catch (err) {
        actionsExecuted.push({
          action: action.type,
          result: { error: err.message },
          status: 'failure',
        });
      }
    }
    const execution = await OptimizationExecution.create({
      automation: automation._id,
      status: 'completed',
      findings: evaluation.conditionResults?.map(r => ({
        type: 'condition_check',
        detail: `${r.metric} ${r.operator} ${r.threshold} = ${r.currentValue}`,
        impact: r.met ? 'triggered' : 'not_triggered',
      })) || [],
      actionsExecuted,
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 0,
    });
    await OptimizationAutomation.findByIdAndUpdate(id, {
      lastRun: new Date(),
      lastResult: 'success',
    });
    await logAuditEvent({
      userId,
      action: 'execute_automation',
      category: 'optimization_automation',
      entityType: 'OptimizationExecution',
      entityId: execution._id.toString(),
      description: `Executed automation ${automation.name} with ${actionsExecuted.filter(a => a.status === 'success').length}/${actionsExecuted.length} successful actions`,
      status: 'success',
    });
    return { execution, status: 'completed', actionsExecuted };
  }

  async approveExecution(userId, executionId) {
    const execution = await OptimizationExecution.findById(executionId);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'pending_approval') throw new Error('Execution is not pending approval');
    const automation = await OptimizationAutomation.findById(execution.automation);
    if (!automation) throw new Error('Automation not found');
    const actionsExecuted = [];
    for (const action of (automation.actions || [])) {
      try {
        let result = null;
        switch (action.type) {
          case 'cleanup_telemetry':
            const olderThan = action.params?.olderThanDays || 90;
            const cutoff = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
            const deleted = await TelemetryEvent.deleteMany({ timestamp: { $lt: cutoff } });
            result = { deletedCount: deleted.deletedCount };
            break;
          case 'cleanup_metrics':
            const metricCutoff = action.params?.olderThanDays || 180;
            const mCutoff = new Date(Date.now() - metricCutoff * 24 * 60 * 60 * 1000);
            const mDeleted = await MetricSnapshot.deleteMany({ timestamp: { $lt: mCutoff } });
            result = { deletedCount: mDeleted.deletedCount };
            break;
          default:
            result = { executed: true };
        }
        actionsExecuted.push({ action: action.type, result, status: 'success' });
      } catch (err) {
        actionsExecuted.push({ action: action.type, result: { error: err.message }, status: 'failure' });
      }
    }
    execution.actionsExecuted = actionsExecuted;
    execution.status = 'completed';
    execution.approvedBy = new mongoose.Types.ObjectId(userId);
    execution.approvedAt = new Date();
    execution.completedAt = new Date();
    await execution.save();
    await OptimizationAutomation.findByIdAndUpdate(execution.automation, {
      lastRun: new Date(),
      lastResult: 'success',
    });
    await logAuditEvent({
      userId,
      action: 'approve_automation_execution',
      category: 'optimization_automation',
      entityType: 'OptimizationExecution',
      entityId: executionId,
      description: `Approved and executed automation ${automation.name}`,
      status: 'success',
    });
    return execution;
  }

  async getExecutions(automationId) {
    const executions = await OptimizationExecution.find({ automation: new mongoose.Types.ObjectId(automationId) })
      .sort({ startedAt: -1 })
      .limit(50)
      .lean();
    return executions;
  }

  async rollbackExecution(userId, executionId) {
    const execution = await OptimizationExecution.findById(executionId);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'completed') throw new Error('Can only rollback completed executions');
    execution.status = 'rolled_back';
    execution.rollbackStatus = 'completed';
    await execution.save();
    await logAuditEvent({
      userId,
      action: 'rollback_automation_execution',
      category: 'optimization_automation',
      entityType: 'OptimizationExecution',
      entityId: executionId,
      description: `Rolled back automation execution`,
      status: 'success',
    });
    return execution;
  }

  async getAutomationDashboard() {
    const [stats, recentExecutions, activeAutomations] = await Promise.all([
      OptimizationAutomation.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
            disabled: { $sum: { $cond: [{ $eq: ['$status', 'disabled'] }, 1, 0] } },
            scheduled: { $sum: { $cond: [{ $eq: ['$trigger', 'scheduled'] }, 1, 0] } },
            threshold: { $sum: { $cond: [{ $eq: ['$trigger', 'metric_threshold'] }, 1, 0] } },
            requireApproval: { $sum: { $cond: ['$approvalRequired', 1, 0] } },
          },
        },
      ]),
      OptimizationExecution.find().sort({ startedAt: -1 }).limit(20).lean(),
      OptimizationAutomation.find({ status: 'active' }).lean(),
    ]);
    return {
      summary: stats[0] || { total: 0, active: 0, paused: 0, disabled: 0, scheduled: 0, threshold: 0, requireApproval: 0 },
      recentExecutions,
      activeAutomations,
      generatedAt: new Date(),
    };
  }

  async runScheduledEvaluations() {
    const automations = await OptimizationAutomation.find({ status: 'active', trigger: { $in: ['scheduled', 'metric_threshold'] } });
    const results = [];
    for (const automation of automations) {
      try {
        const evaluation = await this.evaluateAutomation(automation._id.toString());
        if (evaluation.shouldExecute) {
          const result = await this.executeAutomation(automation.createdBy?.toString() || 'system', automation._id.toString());
          results.push({
            automationId: automation._id.toString(),
            name: automation.name,
            executed: true,
            status: result.status,
          });
        } else {
          results.push({
            automationId: automation._id.toString(),
            name: automation.name,
            executed: false,
            reason: evaluation.reason,
          });
        }
      } catch (err) {
        results.push({
          automationId: automation._id.toString(),
          name: automation.name,
          executed: false,
          error: err.message,
        });
      }
    }
    const executed = results.filter(r => r.executed).length;
    await logAuditEvent({
      action: 'run_scheduled_evaluations',
      category: 'optimization_automation',
      entityType: 'OptimizationAutomation',
      description: `Scheduled evaluation: ${executed}/${results.length} automations executed`,
      status: 'success',
    });
    return { results, totalEvaluated: results.length, totalExecuted: executed, evaluatedAt: new Date() };
  }
}

export default new OptimizationAutomationService();
