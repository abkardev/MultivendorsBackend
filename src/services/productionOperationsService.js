import { ReliabilityIncident } from '../models/ReliabilityIncident.js';
import { ServiceTopology } from '../models/ServiceTopology.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { ResourceUsage } from '../models/ResourceUsage.js';
import { ResourceCost } from '../models/ResourceCost.js';
import { CostRecommendation } from '../models/CostRecommendation.js';
import { ScalingEvent } from '../models/ScalingEvent.js';
import { ScalingPolicy } from '../models/ScalingPolicy.js';
import { DistributedQueue } from '../models/DistributedQueue.js';
import { CircuitBreaker } from '../models/CircuitBreaker.js';
import { ReleasePipeline } from '../models/ReleasePipeline.js';
import { ComplianceProfile } from '../models/ComplianceProfile.js';
import { ActivityFeed } from '../models/ActivityFeed.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ProductionOperationsService {
  async getProductionOverview() {
    const [health, resourceUsage, incidents, queues, releases, compliance] = await Promise.all([
      ServiceHealth.find({}).lean(),
      ResourceUsage.aggregate([
        { $group: { _id: '$resource', avgUsage: { $avg: '$usage' }, maxUsage: { $max: '$usage' }, count: { $sum: 1 } } },
      ]),
      ReliabilityIncident.find({ status: { $ne: 'resolved' } }).sort({ severity: 1 }).limit(20).lean(),
      DistributedQueue.find({ status: { $ne: 'draining' } }).lean(),
      ReleasePipeline.find({ status: { $in: ['pending', 'running'] } }).lean(),
      ComplianceProfile.find({ status: 'non_compliant' }).limit(10).lean(),
    ]);
    const healthSummary = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
    for (const h of health) healthSummary[h.status] = (healthSummary[h.status] || 0) + 1;
    return {
      generatedAt: new Date(),
      serviceHealth: { services: health, summary: healthSummary, total: health.length },
      resourceUsage: resourceUsage.map(r => ({ resource: r._id, avgUsage: Math.round(r.avgUsage * 100) / 100, maxUsage: r.maxUsage })),
      activeIncidents: incidents,
      queueHealth: { total: queues.length, active: queues.filter(q => q.status === 'active').length, paused: queues.filter(q => q.status === 'paused').length },
      pendingReleases: releases.map(r => ({ name: r.name, version: r.version, status: r.status })),
      complianceIssues: compliance.map(c => ({ name: c.name, type: c.type, status: c.status })),
    };
  }

  async getActiveIncidents() {
    return ReliabilityIncident.find({ status: { $ne: 'resolved' } })
      .sort({ severity: 1, createdAt: -1 })
      .lean();
  }

  async getResourceUsage() {
    const usage = await ResourceUsage.aggregate([
      { $group: {
        _id: { resource: '$resource', host: '$host' },
        avgUsage: { $avg: '$usage' },
        maxUsage: { $max: '$usage' },
        current: { $last: '$usage' },
        count: { $sum: 1 },
      } },
      { $sort: { '_id.resource': 1 } },
    ]);
    const summary = {};
    for (const u of usage) {
      if (!summary[u._id.resource]) summary[u._id.resource] = { avgUsage: 0, maxUsage: 0, hosts: 0, total: 0 };
      summary[u._id.resource].avgUsage += u.avgUsage;
      summary[u._id.resource].maxUsage = Math.max(summary[u._id.resource].maxUsage, u.maxUsage);
      summary[u._id.resource].hosts++;
    }
    for (const key of Object.keys(summary)) {
      summary[key].avgUsage = Math.round((summary[key].avgUsage / summary[key].hosts) * 100) / 100;
    }
    return { usage, summary, generatedAt: new Date() };
  }

  async runScalingSimulation(params) {
    const { service, currentLoad, targetLoad, cooldownPeriod = 300 } = params || {};
    const policies = await ScalingPolicy.find(service ? { name: service } : {}).lean();
    const result = policies.map(p => {
      const simulatedInstances = Math.ceil((targetLoad || currentLoad || 100) / (p.metrics ? p.metrics.target || 50 : 50));
      const currentInstances = Math.ceil((currentLoad || 100) / (p.metrics ? p.metrics.target || 50 : 50));
      return {
        policy: p.name,
        simulation: true,
        simulationNote: 'SIMULATION - Scaling scenario',
        currentLoad: currentLoad || 100,
        targetLoad: targetLoad || 150,
        currentInstances,
        recommendedInstances: simulatedInstances,
        delta: simulatedInstances - currentInstances,
        cooldownPeriod,
        estimatedCostImpact: `$${Math.abs(simulatedInstances - currentInstances) * 50}/month`,
      };
    });
    await logAuditEvent({
      action: 'operations.scaling.simulate', category: 'system',
      entityType: 'ScalingPolicy', entityId: 'simulation',
      description: 'SIMULATION - Scaling scenario executed',
      status: 'success',
    });
    return { simulation: true, params, results: result, generatedAt: new Date() };
  }

  async getQueueMonitoring() {
    const queues = await DistributedQueue.find({}).lean();
    const totalJobs = queues.reduce((s, q) => s + (q.jobCount || 0), 0);
    const totalPending = queues.reduce((s, q) => s + (q.pendingCount || 0), 0);
    const totalProcessing = queues.reduce((s, q) => s + (q.processingCount || 0), 0);
    const totalFailed = queues.reduce((s, q) => s + (q.failedCount || 0), 0);
    return {
      queues: queues.map(q => ({
        name: q.name, type: q.type, status: q.status,
        jobs: { total: q.jobCount, pending: q.pendingCount, processing: q.processingCount, completed: q.completedCount, failed: q.failedCount },
        concurrency: q.concurrency,
      })),
      summary: { totalQueues: queues.length, totalJobs, totalPending, totalProcessing, totalFailed },
      generatedAt: new Date(),
    };
  }

  async getHealthOverview() {
    const [health, circuitBreakers] = await Promise.all([
      ServiceHealth.find({}).lean(),
      CircuitBreaker.find({}).lean(),
    ]);
    const healthSummary = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
    for (const h of health) healthSummary[h.status] = (healthSummary[h.status] || 0) + 1;
    const cbSummary = { closed: 0, open: 0, half_open: 0, disabled: 0 };
    for (const cb of circuitBreakers) cbSummary[cb.state] = (cbSummary[cb.state] || 0) + 1;
    return {
      services: { summary: healthSummary, total: health.length },
      circuitBreakers: { summary: cbSummary, total: circuitBreakers.length, open: circuitBreakers.filter(cb => cb.state === 'open').map(cb => ({ name: cb.name, service: cb.service })) },
      generatedAt: new Date(),
    };
  }

  async getReleaseOverview() {
    const pipelines = await ReleasePipeline.find({}).sort({ createdAt: -1 }).lean();
    return {
      pipelines: pipelines.map(p => ({
        name: p.name, version: p.version, status: p.status,
        stages: (p.stages || []).length,
        approvals: (p.approvals || []).length,
        createdAt: p.createdAt,
      })),
      summary: {
        total: pipelines.length,
        pending: pipelines.filter(p => p.status === 'pending').length,
        running: pipelines.filter(p => p.status === 'running').length,
        completed: pipelines.filter(p => p.status === 'completed').length,
        failed: pipelines.filter(p => p.status === 'failed').length,
      },
      generatedAt: new Date(),
    };
  }

  async getCostOverview(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const costs = await ResourceCost.find({ 'period.start': { $gte: start } }).lean();
    const totalMonthly = costs.reduce((s, c) => s + (c.cost ? c.cost.monthly || 0 : 0), 0);
    const projected = costs.reduce((s, c) => s + (c.cost ? c.cost.projected || c.cost.monthly || 0 : 0), 0);
    return {
      period,
      totalMonthly: Math.round(totalMonthly * 100) / 100,
      projected: Math.round(projected * 100) / 100,
      byType: costs.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + (c.cost ? c.cost.monthly || 0 : 0);
        return acc;
      }, {}),
      resourceCount: costs.length,
      generatedAt: new Date(),
    };
  }

  async getReliabilityOverview(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const incidents = await ReliabilityIncident.find({ createdAt: { $gte: start } }).lean();
    const bySeverity = { critical: 0, major: 0, minor: 0, warning: 0 };
    for (const i of incidents) bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    return {
      period,
      totalIncidents: incidents.length,
      bySeverity,
      resolved,
      open: incidents.length - resolved,
      generatedAt: new Date(),
    };
  }

  async getOptimizationRecommendations() {
    const recommendations = await CostRecommendation.find({ status: 'pending' })
      .sort({ estimatedSavings: -1 })
      .limit(50)
      .lean();
    return recommendations.map(r => ({
      id: r._id, title: r.title, type: r.type,
      estimatedSavings: r.estimatedSavings,
      savingsPercentage: r.savingsPercentage,
      effort: r.effort, risk: r.risk,
      implementation: r.implementation,
    }));
  }

  async getPerformanceSummary(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const latencyTypes = ['api_latency', 'db_latency', 'cache_latency', 'ai_latency', 'search_latency'];
    const metrics = {};
    for (const lt of latencyTypes) {
      const events = await TelemetryEvent.find({ type: lt, timestamp: { $gte: start } })
        .sort({ timestamp: -1 }).limit(50).lean();
      if (events.length > 0) {
        const values = events.map(e => e.value);
        metrics[lt] = {
          avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
          p95: values.sort((a, b) => a - b)[Math.floor(values.length * 0.95)] || 0,
          samples: values.length,
        };
      }
    }
    return { period, metrics, generatedAt: new Date() };
  }

  async getComplianceSummary() {
    const profiles = await ComplianceProfile.find({}).lean();
    return {
      total: profiles.length,
      active: profiles.filter(p => p.status === 'active').length,
      nonCompliant: profiles.filter(p => p.status === 'non_compliant').length,
      draft: profiles.filter(p => p.status === 'draft').length,
      byType: profiles.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
      }, {}),
      generatedAt: new Date(),
    };
  }

  async getOperationsScorecard() {
    const [health, incidents, queues, pipelines, resources] = await Promise.all([
      ServiceHealth.find({}).lean(),
      ReliabilityIncident.find({ status: { $ne: 'resolved' } }).lean(),
      DistributedQueue.find({}).lean(),
      ReleasePipeline.find({ status: { $in: ['pending', 'running', 'failed'] } }).lean(),
      ResourceUsage.aggregate([
        { $group: { _id: '$resource', avgUsage: { $avg: '$usage' } } },
      ]),
    ]);
    const healthScore = health.length > 0 ? Math.round((health.filter(h => h.status === 'healthy').length / health.length) * 100) : 100;
    const resourceScore = resources.length > 0 ? Math.round(resources.filter(r => r.avgUsage < 80).length / resources.length * 100) : 100;
    const incidentScore = Math.max(0, 100 - incidents.length * 5);
    const queueScore = queues.length > 0 ? Math.round((queues.filter(q => q.status === 'active').length / queues.length) * 100) : 100;
    const releaseScore = Math.max(0, 100 - pipelines.length * 10);
    const overall = Math.round((healthScore * 0.3 + resourceScore * 0.2 + incidentScore * 0.25 + queueScore * 0.1 + releaseScore * 0.15) * 100) / 100;
    return {
      overall,
      categories: { health: healthScore, resources: resourceScore, incidents: incidentScore, queues: queueScore, releases: releaseScore },
      level: overall >= 90 ? 'excellent' : overall >= 75 ? 'good' : overall >= 50 ? 'fair' : 'poor',
      generatedAt: new Date(),
    };
  }

  async getRecentActivities(limit = 20) {
    const activities = await ActivityFeed.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'name email')
      .lean();
    return activities.map(a => ({
      action: a.action,
      actor: a.actor,
      targetType: a.targetType,
      context: a.context,
      timestamp: a.createdAt,
    }));
  }

  async generateOperationsReport() {
    const [overview, health, incidents, resources, queues, releases, costs, scorecard] = await Promise.all([
      this.getProductionOverview(),
      this.getHealthOverview(),
      this.getReliabilityOverview(30),
      this.getResourceUsage(),
      this.getQueueMonitoring(),
      this.getReleaseOverview(),
      this.getCostOverview(30),
      this.getOperationsScorecard(),
    ]);
    return {
      generatedAt: new Date(),
      overview,
      health,
      incidents,
      resources,
      queues,
      releases,
      costs,
      scorecard,
    };
  }
}

export const productionOperationsService = new ProductionOperationsService();
