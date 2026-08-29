import { ReliabilityIncident } from '../models/ReliabilityIncident.js';
import { ServiceTopology } from '../models/ServiceTopology.js';
import { CircuitBreaker } from '../models/CircuitBreaker.js';
import { RetryPolicy } from '../models/RetryPolicy.js';
import { BulkheadPolicy } from '../models/BulkheadPolicy.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { MetricSeries } from '../models/MetricSeries.js';
import { ScalingEvent } from '../models/ScalingEvent.js';
import { CacheMetrics } from '../models/CacheMetrics.js';
import { SlowQuery } from '../models/SlowQuery.js';
import { DatabaseIndex } from '../models/DatabaseIndex.js';
import { DistributedQueue } from '../models/DistributedQueue.js';
import { ResourceUsage } from '../models/ResourceUsage.js';
import { ResourceCost } from '../models/ResourceCost.js';
import { ComplianceProfile } from '../models/ComplianceProfile.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';
import { DataResidencyRule } from '../models/DataResidencyRule.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ReliabilityDashboardService {
  async getAvailabilityMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const incidents = await ReliabilityIncident.find({ createdAt: { $gte: start } }).lean();
    const services = await ServiceTopology.find({}).lean();
    const availability = {};
    for (const sv of services) {
      const svIncidents = incidents.filter(i => i.service === sv.service);
      const totalDowntime = svIncidents.reduce((sum, i) => sum + (i.impact && i.impact.duration ? i.impact.duration : 0), 0);
      const totalMinutes = period * 24 * 60;
      const avail = totalMinutes > 0 ? Math.max(0, ((totalMinutes - totalDowntime) / totalMinutes) * 100) : 100;
      availability[sv.service] = {
        availability: Math.round(avail * 100) / 100,
        uptime: Math.round(totalMinutes - totalDowntime),
        downtime: totalDowntime,
        incidents: svIncidents.length,
        nines: this._toNines(avail),
      };
    }
    return { period, services: availability, generatedAt: new Date() };
  }

  _toNines(percent) {
    if (percent >= 99.999) return 5;
    if (percent >= 99.99) return 4;
    if (percent >= 99.9) return 3;
    if (percent >= 99) return 2;
    if (percent >= 90) return 1;
    return 0;
  }

  async getSLAMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const incidents = await ReliabilityIncident.find({ createdAt: { $gte: start } }).lean();
    const services = await ServiceTopology.find({}).lean();
    const sla = {};
    for (const sv of services) {
      const svIncidents = incidents.filter(i => i.service === sv.service);
      const breaches = svIncidents.filter(i => i.slaImpact && i.slaImpact.breached).length;
      sla[sv.service] = {
        totalIncidents: svIncidents.length,
        slaBreaches: breaches,
        slaCompliance: svIncidents.length > 0 ? Math.round(((svIncidents.length - breaches) / svIncidents.length) * 100) : 100,
        avgResolutionTime: svIncidents.length > 0 ? Math.round(svIncidents.reduce((s, i) => {
          if (i.resolution && i.resolution.resolvedAt) {
            return s + (new Date(i.resolution.resolvedAt) - new Date(i.createdAt)) / 60000;
          }
          return s;
        }, 0) / svIncidents.length) : 0,
      };
    }
    return { period, sla, generatedAt: new Date() };
  }

  async getErrorRates(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const services = await ServiceHealth.find({}).lean();
    const rates = {};
    for (const sv of services) {
      rates[sv.service] = { errorRate: sv.errorRate || 0, latency: sv.latency || 0, status: sv.status };
    }
    return { period, services: rates, generatedAt: new Date() };
  }

  async getRecoveryMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const resolvedIncidents = await ReliabilityIncident.find({
      status: 'resolved',
      createdAt: { $gte: start },
    }).lean();
    const mtbf = resolvedIncidents.length > 0
      ? Math.round((period * 24 * 60) / resolvedIncidents.length) : period * 24 * 60;
    const mttr = resolvedIncidents.length > 0
      ? Math.round(resolvedIncidents.reduce((s, i) => {
        if (i.impact && i.impact.duration) return s + i.impact.duration;
        return s;
      }, 0) / resolvedIncidents.length) : 0;
    return {
      period,
      mttr,
      mtbf,
      totalResolved: resolvedIncidents.length,
      meanRecoveryTime: mttr,
      meanTimeBetweenFailures: mtbf,
      generatedAt: new Date(),
    };
  }

  async getCapacityMetrics() {
    const usage = await ResourceUsage.aggregate([
      { $group: {
        _id: '$resource',
        avgUsage: { $avg: '$usage' },
        maxUsage: { $max: '$usage' },
        currentUsage: { $last: '$usage' },
        count: { $sum: 1 },
      } },
    ]);
    return {
      resources: usage.map(u => ({
        resource: u._id,
        avgUsage: Math.round(u.avgUsage * 100) / 100,
        maxUsage: u.maxUsage,
        currentUsage: u.currentUsage,
        samples: u.count,
      })),
      generatedAt: new Date(),
    };
  }

  async getPerformanceMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const latencyTypes = ['api_latency', 'db_latency', 'cache_latency', 'queue_latency', 'ai_latency', 'search_latency'];
    const metrics = {};
    for (const lt of latencyTypes) {
      const events = await TelemetryEvent.find({ type: lt, timestamp: { $gte: start } })
        .sort({ timestamp: -1 }).limit(100).lean();
      if (events.length > 0) {
        const values = events.map(e => e.value);
        metrics[lt] = {
          avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
          min: Math.min(...values),
          max: Math.max(...values),
          samples: values.length,
        };
      }
    }
    const volume = await TelemetryEvent.find({ type: 'request_volume', timestamp: { $gte: start } })
      .sort({ timestamp: -1 }).limit(100).lean();
    if (volume.length > 0) {
      const volValues = volume.map(e => e.value);
      metrics.request_volume = {
        avg: Math.round(volValues.reduce((s, v) => s + v, 0) / volValues.length),
        total: volValues.reduce((s, v) => s + v, 0),
        samples: volValues.length,
      };
    }
    return { period, metrics, generatedAt: new Date() };
  }

  async getScalingMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const events = await ScalingEvent.find({ createdAt: { $gte: start } }).lean();
    const scaleUps = events.filter(e => e.direction === 'up');
    const scaleDowns = events.filter(e => e.direction === 'down');
    return {
      period,
      totalEvents: events.length,
      scaleUps: { count: scaleUps.length, avgFrom: scaleUps.length > 0 ? Math.round(scaleUps.reduce((s, e) => s + (e.from || 0), 0) / scaleUps.length) : 0, avgTo: scaleUps.length > 0 ? Math.round(scaleUps.reduce((s, e) => s + (e.to || 0), 0) / scaleUps.length) : 0 },
      scaleDowns: { count: scaleDowns.length },
      scaledServices: [...new Set(events.map(e => e.triggeredBy || 'unknown'))],
      generatedAt: new Date(),
    };
  }

  async getCacheMetrics() {
    const metrics = await CacheMetrics.find({}).sort({ periodStart: -1 }).limit(50).lean();
    const groups = {};
    for (const m of metrics) {
      if (!groups[m.group]) groups[m.group] = { hits: 0, misses: 0, sets: 0, evictions: 0, count: 0, totalHitRate: 0 };
      groups[m.group].hits += m.hits;
      groups[m.group].misses += m.misses;
      groups[m.group].sets += m.sets;
      groups[m.group].evictions += m.evictions;
      groups[m.group].count++;
      groups[m.group].totalHitRate += m.hitRate;
    }
    const result = {};
    for (const [group, data] of Object.entries(groups)) {
      result[group] = {
        ...data,
        hitRate: data.count > 0 ? Math.round((data.totalHitRate / data.count) * 100) / 100 : 0,
        totalAccesses: data.hits + data.misses,
      };
    }
    return { cacheGroups: result, generatedAt: new Date() };
  }

  async getDatabaseMetrics() {
    const [slowQueries, indexes] = await Promise.all([
      SlowQuery.find({}).sort({ lastSeen: -1 }).limit(50).lean(),
      DatabaseIndex.find({}).lean(),
    ]);
    return {
      slowQueries: {
        total: slowQueries.length,
        avgDuration: slowQueries.length > 0 ? Math.round(slowQueries.reduce((s, q) => s + q.duration, 0) / slowQueries.length) : 0,
        byCollection: slowQueries.reduce((acc, q) => { acc[q.collection] = (acc[q.collection] || 0) + 1; return acc; }, {}),
      },
      indexes: {
        total: indexes.length,
        unused: indexes.filter(i => i.status === 'unused').length,
        duplicate: indexes.filter(i => i.status === 'duplicate').length,
        recommended: indexes.filter(i => i.status === 'recommended').length,
        active: indexes.filter(i => i.status === 'active').length,
      },
      generatedAt: new Date(),
    };
  }

  async getQueueMetrics() {
    const queues = await DistributedQueue.find({}).lean();
    return {
      queues: queues.map(q => ({
        name: q.name, type: q.type, status: q.status,
        jobCount: q.jobCount, pendingCount: q.pendingCount,
        processingCount: q.processingCount, completedCount: q.completedCount,
        failedCount: q.failedCount,
      })),
      summary: {
        total: queues.length,
        active: queues.filter(q => q.status === 'active').length,
        paused: queues.filter(q => q.status === 'paused').length,
        totalJobs: queues.reduce((s, q) => s + (q.jobCount || 0), 0),
        totalPending: queues.reduce((s, q) => s + (q.pendingCount || 0), 0),
        totalFailed: queues.reduce((s, q) => s + (q.failedCount || 0), 0),
      },
      generatedAt: new Date(),
    };
  }

  async getCostMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const costs = await ResourceCost.find({ 'period.start': { $gte: start } }).lean();
    const total = costs.reduce((s, c) => s + (c.cost ? c.cost.monthly || 0 : 0), 0);
    return {
      period,
      totalCost: Math.round(total * 100) / 100,
      byType: costs.reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + (c.cost ? c.cost.monthly || 0 : 0);
        return acc;
      }, {}),
      resourceCount: costs.length,
      generatedAt: new Date(),
    };
  }

  async getComplianceMetrics() {
    const [profiles, policies, rules] = await Promise.all([
      ComplianceProfile.find({}).lean(),
      RetentionPolicy.find({ isActive: true }).lean(),
      DataResidencyRule.find({ isActive: true }).lean(),
    ]);
    const compliantProfiles = profiles.filter(p => p.status === 'active' || p.status === 'review');
    return {
      compliance: {
        profiles: { total: profiles.length, compliant: compliantProfiles.length, rate: profiles.length > 0 ? Math.round((compliantProfiles.length / profiles.length) * 100) : 100 },
        retentionPolicies: { total: policies.length, active: policies.filter(p => p.isActive).length },
        residencyRules: { total: rules.length, active: rules.filter(r => r.isActive).length },
      },
      generatedAt: new Date(),
    };
  }

  async generateExecutiveDashboard() {
    const [availability, sla, recovery, performance, incidents] = await Promise.all([
      this.getAvailabilityMetrics(30),
      this.getSLAMetrics(30),
      this.getRecoveryMetrics(30),
      this.getPerformanceMetrics(30),
      ReliabilityIncident.find({ status: { $ne: 'resolved' } }).sort({ severity: 1 }).limit(10).lean(),
    ]);
    return {
      generatedAt: new Date(),
      availability,
      slaCompliance: sla,
      recovery,
      performance,
      activeIncidents: incidents,
      healthScore: this._calculateHealthScore(availability, sla, recovery),
    };
  }

  _calculateHealthScore(availability, sla, recovery) {
    const avgAvail = Object.values(availability.services || {}).reduce((s, v) => s + v.availability, 0) / Math.max(Object.keys(availability.services || {}).length, 1);
    const avgSla = Object.values(sla.sla || {}).reduce((s, v) => s + v.slaCompliance, 0) / Math.max(Object.keys(sla.sla || {}).length, 1);
    const recoveryScore = Math.max(0, 100 - (recovery.mttr || 0) / 10);
    return Math.round((avgAvail * 0.5 + avgSla * 0.3 + recoveryScore * 0.2) * 100) / 100;
  }

  async getReliabilityTrend(metric, period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const incidents = await ReliabilityIncident.find({ createdAt: { $gte: start } }).sort({ createdAt: 1 }).lean();
    const trend = {};
    for (const inc of incidents) {
      const key = inc.createdAt.toISOString().split('T')[0];
      if (!trend[key]) trend[key] = { date: key, count: 0, critical: 0, major: 0 };
      trend[key].count++;
      if (inc.severity === 'critical') trend[key].critical++;
      if (inc.severity === 'major') trend[key].major++;
    }
    return { metric, period, dataPoints: Object.values(trend).sort((a, b) => a.date.localeCompare(b.date)) };
  }

  async getTopIncidents(limit = 10) {
    return ReliabilityIncident.find({})
      .sort({ 'impact.usersAffected': -1 })
      .limit(limit)
      .lean();
  }

  async getImprovementMetrics(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const [before, after] = await Promise.all([
      ReliabilityIncident.find({ createdAt: { $gte: new Date(start.getTime() - period * 86400000), $lte: start } }).lean(),
      ReliabilityIncident.find({ createdAt: { $gte: start } }).lean(),
    ]);
    return {
      period,
      previousPeriod: {
        incidents: before.length,
        avgDuration: before.length > 0 ? Math.round(before.reduce((s, i) => s + (i.impact && i.impact.duration ? i.impact.duration : 0), 0) / before.length) : 0,
      },
      currentPeriod: {
        incidents: after.length,
        avgDuration: after.length > 0 ? Math.round(after.reduce((s, i) => s + (i.impact && i.impact.duration ? i.impact.duration : 0), 0) / after.length) : 0,
      },
      improvement: {
        incidentsReduction: before.length > 0 ? Math.round(((before.length - after.length) / before.length) * 100) : 0,
        durationReduction: before.length > 0 && after.length > 0
          ? Math.round(((before.reduce((s, i) => s + (i.impact && i.impact.duration ? i.impact.duration : 0), 0) / before.length
            - after.reduce((s, i) => s + (i.impact && i.impact.duration ? i.impact.duration : 0), 0) / after.length)
            / (before.reduce((s, i) => s + (i.impact && i.impact.duration ? i.impact.duration : 0), 0) / before.length)) * 100) : 0,
      },
    };
  }

  async generateDashboardReport() {
    const [availability, sla, errorRates, recovery, capacity, performance, scaling, cache, db, queue, cost, compliance] = await Promise.all([
      this.getAvailabilityMetrics(30),
      this.getSLAMetrics(30),
      this.getErrorRates(30),
      this.getRecoveryMetrics(30),
      this.getCapacityMetrics(),
      this.getPerformanceMetrics(30),
      this.getScalingMetrics(30),
      this.getCacheMetrics(),
      this.getDatabaseMetrics(),
      this.getQueueMetrics(),
      this.getCostMetrics(30),
      this.getComplianceMetrics(),
    ]);
    return {
      generatedAt: new Date(),
      availability,
      sla,
      errorRates,
      recovery,
      capacity,
      performance,
      scaling,
      cache,
      database: db,
      queue,
      cost,
      compliance,
    };
  }
}

export const reliabilityDashboardService = new ReliabilityDashboardService();
