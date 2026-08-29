import { PerformanceProfile } from '../models/PerformanceProfile.js';
import { SlowQuery } from '../models/SlowQuery.js';
import { PerformanceBudget } from '../models/PerformanceBudget.js';
import { PerformanceSnapshot } from '../models/PerformanceSnapshot.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class PerformanceEngineeringService {
  async recordProfile(data) {
    const profile = await PerformanceProfile.create(data);
    await logAuditEvent({
      action: 'performance.profile.record', category: 'system',
      entityType: 'PerformanceProfile', entityId: profile._id,
      description: `Recorded performance profile: ${data.type} - ${data.name}`,
      status: 'success',
    });
    return profile;
  }

  async detectSlowQueries(threshold, since) {
    const query = { duration: { $gte: threshold } };
    if (since) query.lastSeen = { $gte: new Date(since) };
    const slow = await SlowQuery.find(query).sort({ duration: -1 }).lean();
    for (const q of slow) {
      if (!q._id) continue;
      await SlowQuery.updateOne({ _id: q._id }, { $set: { indexEfficient: false } });
    }
    await logAuditEvent({
      action: 'performance.slow_query.detect', category: 'system',
      entityType: 'SlowQuery',
      description: `Detected ${slow.length} slow queries above ${threshold}ms`,
      status: 'success',
    });
    return slow;
  }

  async analyzeQuery(queryId) {
    const query = await SlowQuery.findById(queryId).lean();
    if (!query) throw new Error('Slow query not found');
    const recommendations = [];
    if (query.documentsExamined > 1000 && query.documentsReturned < 100) {
      recommendations.push('Add index to reduce documents examined');
    }
    if (!query.indexUsed) {
      recommendations.push('No index used - consider adding index');
    }
    if (query.documentsExamined / (query.documentsReturned || 1) > 100) {
      recommendations.push('High examined/returned ratio - optimize query or add index');
    }
    return { ...query, analysis: { recommendations, score: recommendations.length === 0 ? 100 : Math.max(0, 100 - recommendations.length * 25) } };
  }

  async createBudget(data) {
    const budget = await PerformanceBudget.create(data);
    await logAuditEvent({
      action: 'performance.budget.create', category: 'system',
      entityType: 'PerformanceBudget', entityId: budget._id,
      description: `Created performance budget: ${data.name}`,
      status: 'success',
    });
    return budget;
  }

  async updateBudget(id, data) {
    const budget = await PerformanceBudget.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'performance.budget.update', category: 'system',
      entityType: 'PerformanceBudget', entityId: id,
      description: `Updated performance budget: ${budget?.name || id}`,
      status: 'success',
    });
    return budget;
  }

  async listBudgets(filter) {
    const { type, scope, isActive, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (scope) query.scope = scope;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      PerformanceBudget.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      PerformanceBudget.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async validateBudget(budgetId, metrics) {
    const budget = await PerformanceBudget.findById(budgetId).lean();
    if (!budget) throw new Error('Budget not found');
    const currentValue = metrics[budget.metric] || 0;
    const violations = [];
    if (currentValue >= budget.critical) {
      violations.push({ type: 'critical', message: `${budget.metric} ${currentValue} exceeds critical threshold ${budget.critical}` });
    } else if (currentValue >= budget.warning) {
      violations.push({ type: 'warning', message: `${budget.metric} ${currentValue} exceeds warning threshold ${budget.warning}` });
    }
    return { budgetId: budget._id, metric: budget.metric, currentValue, warning: budget.warning, critical: budget.critical, passed: violations.length === 0, violations };
  }

  async generateSnapshot(type) {
    const period = { start: new Date(Date.now() - 86400000), end: new Date() };
    const snapshot = await PerformanceSnapshot.create({
      name: `${type}_snapshot_${Date.now()}`,
      type: type || 'custom',
      period,
      metrics: {},
    });
    await logAuditEvent({
      action: 'performance.snapshot.generate', category: 'system',
      entityType: 'PerformanceSnapshot', entityId: snapshot._id,
      description: `Generated ${type} performance snapshot`,
      status: 'success',
    });
    return snapshot;
  }

  async getSnapshots(filter) {
    const { type, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    const [items, total] = await Promise.all([
      PerformanceSnapshot.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      PerformanceSnapshot.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getSnapshot(id) {
    return PerformanceSnapshot.findById(id).lean();
  }

  async getPerformanceTrend(metric, period) {
    const start = new Date(Date.now() - (period || 7) * 86400000);
    const snapshots = await PerformanceSnapshot.find({
      [`metrics.${metric}`]: { $exists: true },
      'period.start': { $gte: start },
    }).sort({ 'period.start': 1 }).lean();
    const trend = snapshots.map(s => ({
      timestamp: s.period?.start || s.createdAt,
      value: s.metrics?.[metric] || 0,
    }));
    return { metric, period: period || 7, dataPoints: trend.length, trend };
  }

  async compareSnapshots(id1, id2) {
    const [s1, s2] = await Promise.all([
      PerformanceSnapshot.findById(id1).lean(),
      PerformanceSnapshot.findById(id2).lean(),
    ]);
    if (!s1 || !s2) throw new Error('One or both snapshots not found');
    const diffs = {};
    if (s1.metrics && s2.metrics) {
      for (const key of Object.keys({ ...s1.metrics, ...s2.metrics })) {
        const v1 = s1.metrics[key] || 0;
        const v2 = s2.metrics[key] || 0;
        diffs[key] = { from: v1, to: v2, change: v2 - v1, percentChange: v1 ? ((v2 - v1) / v1) * 100 : 0 };
      }
    }
    return { snapshot1: s1, snapshot2: s2, differences: diffs };
  }

  async generateOptimizationRecommendations(snapshotId) {
    const snapshot = await PerformanceSnapshot.findById(snapshotId).lean();
    if (!snapshot) throw new Error('Snapshot not found');
    const recommendations = [];
    if (snapshot.metrics?.avgLatency && snapshot.metrics.avgLatency > 200) {
      recommendations.push({ area: 'latency', severity: 'high', suggestion: 'Investigate high average latency - consider caching or query optimization' });
    }
    if (snapshot.metrics?.cacheHitRate && snapshot.metrics.cacheHitRate < 0.8) {
      recommendations.push({ area: 'cache', severity: 'medium', suggestion: 'Low cache hit rate - review cache warming and eviction policies' });
    }
    if (snapshot.metrics?.errorRate && snapshot.metrics.errorRate > 0.05) {
      recommendations.push({ area: 'errors', severity: 'high', suggestion: 'Error rate above 5% - investigate and address errors' });
    }
    if (snapshot.metrics?.dbQueryTime && snapshot.metrics.dbQueryTime > 500) {
      recommendations.push({ area: 'database', severity: 'medium', suggestion: 'High database query time - review indexes and query patterns' });
    }
    return { snapshotId, recommendations, total: recommendations.length };
  }

  async getProfileSummary(type, period) {
    const query = {};
    if (type) query.type = type;
    const start = new Date(Date.now() - (period || 7) * 86400000);
    query.recordedAt = { $gte: start };
    const profiles = await PerformanceProfile.find(query).lean();
    const summary = {
      total: profiles.length,
      avgDuration: profiles.reduce((s, p) => s + (p.duration || 0), 0) / (profiles.length || 1),
      maxDuration: Math.max(...profiles.map(p => p.duration || 0), 0),
      minDuration: Math.min(...profiles.map(p => p.duration || 0), 0),
    };
    return { type, period: period || 7, summary };
  }

  async getSlowQueries(filter) {
    const { collection, duration, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (collection) query.collection = collection;
    if (duration) query.duration = { $gte: duration };
    const [items, total] = await Promise.all([
      SlowQuery.find(query).sort({ duration: -1 }).skip(offset).limit(limit).lean(),
      SlowQuery.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getQueryRecommendations(queryId) {
    const query = await SlowQuery.findById(queryId).lean();
    if (!query) throw new Error('Slow query not found');
    const recommendations = [];
    if (!query.indexUsed) {
      recommendations.push({ type: 'index', priority: 'high', suggestion: `Create index on ${query.collection} for this query pattern` });
    }
    if (query.documentsExamined > 1000) {
      recommendations.push({ type: 'query', priority: 'medium', suggestion: `Query examines ${query.documentsExamined} documents - add filter or limit` });
    }
    if (query.normalizedQuery && query.normalizedQuery.includes('$or')) {
      recommendations.push({ type: 'query', priority: 'medium', suggestion: '$or queries often cause full collection scans - consider $in' });
    }
    return { queryId, collection: query.collection, pattern: query.pattern, recommendations };
  }
}

export const performanceEngineeringService = new PerformanceEngineeringService();
