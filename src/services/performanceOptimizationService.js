import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { Trace } from '../models/Trace.js';
import { Span } from '../models/Span.js';
import { TraceEvent } from '../models/TraceEvent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class PerformanceOptimizationService {
  async detectSlowEndpoints(threshold) {
    const maxLatency = threshold || 500;
    const start = new Date(Date.now() - 3600000);
    const slowEvents = await TelemetryEvent.aggregate([
      { $match: { type: 'api_latency', timestamp: { $gte: start }, value: { $gt: maxLatency } } },
      { $group: {
        _id: { source: '$source' },
        avgLatency: { $avg: '$value' },
        maxLatency: { $max: '$value' },
        count: { $sum: 1 },
      } },
      { $sort: { avgLatency: -1 } },
    ]);
    return slowEvents.map(e => ({
      endpoint: e._id.source,
      avgLatency: Math.round(e.avgLatency),
      maxLatency: Math.round(e.maxLatency),
      calls: e.count,
      threshold: maxLatency,
      severity: e.avgLatency > maxLatency * 2 ? 'critical' : 'warning',
    }));
  }

  async detectSlowQueries(threshold) {
    const maxDuration = threshold || 1000;
    const start = new Date(Date.now() - 3600000);
    const slowQueries = await TraceEvent.aggregate([
      { $match: { type: 'db_query', timestamp: { $gte: start }, duration: { $gt: maxDuration } } },
      { $group: {
        _id: { $ifNull: ['$metadata.collection', '$metadata.query', 'unknown'] },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        count: { $sum: 1 },
      } },
      { $sort: { avgDuration: -1 } },
    ]);
    return slowQueries.map(q => ({
      query: q._id,
      avgDuration: Math.round(q.avgDuration),
      maxDuration: Math.round(q.maxDuration),
      occurrences: q.count,
      severity: q.avgDuration > maxDuration * 2 ? 'critical' : 'warning',
    }));
  }

  async detectLargePayloads(threshold) {
    const maxSize = threshold || 1024 * 1024;
    const start = new Date(Date.now() - 3600000);
    const events = await TelemetryEvent.aggregate([
      { $match: { type: 'request_volume', timestamp: { $gte: start } } },
      { $group: {
        _id: { source: '$source' },
        avgValue: { $avg: '$value' },
        maxValue: { $max: '$value' },
        count: { $sum: 1 },
      } },
      { $match: { maxValue: { $gt: maxSize } } },
      { $sort: { maxValue: -1 } },
    ]);
    return events.map(e => ({
      endpoint: e._id.source,
      avgSize: Math.round(e.avgValue),
      maxSize: Math.round(e.maxValue),
      occurrences: e.count,
      threshold: maxSize,
      suggestion: e.maxValue > 10 * maxSize
        ? 'Implement pagination or streaming for large responses'
        : 'Consider compressing response payloads',
    }));
  }

  async detectExpensiveAggregations() {
    const start = new Date(Date.now() - 86400000);
    const aggregations = await TraceEvent.aggregate([
      { $match: { type: 'db_query', timestamp: { $gte: start }, 'metadata.operation': 'aggregate' } },
      { $group: {
        _id: { collection: '$metadata.collection', pipeline: '$metadata.pipeline' },
        avgDuration: { $avg: '$duration' },
        maxDuration: { $max: '$duration' },
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
      } },
      { $match: { avgDuration: { $gt: 500 } } },
      { $sort: { totalDuration: -1 } },
    ]);
    return aggregations.map(a => ({
      collection: a._id.collection || 'unknown',
      avgDuration: Math.round(a.avgDuration),
      maxDuration: Math.round(a.maxDuration),
      count: a.count,
      totalDuration: Math.round(a.totalDuration),
      severity: a.avgDuration > 2000 ? 'critical' : 'warning',
      suggestion: 'Add indexes matching aggregation sort/group stages or use allowDiskUse',
    }));
  }

  async detectMemoryIssues() {
    const start = new Date(Date.now() - 86400000);
    const memoryEvents = await TelemetryEvent.aggregate([
      { $match: { type: 'memory', timestamp: { $gte: start } } },
      { $group: {
        _id: { source: '$source' },
        avgUsage: { $avg: '$value' },
        maxUsage: { $max: '$value' },
        count: { $sum: 1 },
        values: { $push: { value: '$value', timestamp: '$timestamp' } },
      } },
      { $sort: { maxUsage: -1 } },
    ]);
    const issues = [];
    for (const m of memoryEvents) {
      const status = m.maxUsage > 90 ? 'critical' : m.maxUsage > 75 ? 'warning' : 'healthy';
      if (status !== 'healthy') {
        issues.push({
          source: m._id.source,
          avgUsage: Math.round(m.avgUsage),
          maxUsage: Math.round(m.maxUsage),
          status,
          suggestion: status === 'critical'
            ? 'Immediate memory scaling required. Increase available memory or fix memory leak.'
            : 'Monitor memory trends. Consider increasing memory allocation.',
        });
      }
    }
    return issues;
  }

  async detectCacheMisses() {
    const start = new Date(Date.now() - 86400000);
    const cacheEvents = await TelemetryEvent.aggregate([
      { $match: { type: 'cache_latency', timestamp: { $gte: start } } },
      { $group: {
        _id: { source: '$source' },
        avgLatency: { $avg: '$value' },
        maxLatency: { $max: '$value' },
        count: { $sum: 1 },
      } },
      { $sort: { count: -1 } },
    ]);
    const cacheHits = await MetricSnapshot.findOne({ name: 'cache_hit_rate' }).lean();
    const hitRate = cacheHits?.value || 0;
    return {
      overallHitRate: Math.round(hitRate),
      status: hitRate < 70 ? 'poor' : hitRate < 85 ? 'fair' : 'good',
      endpoints: cacheEvents,
      suggestion: hitRate < 70
        ? 'Review cache key design and TTL values. Consider warming cache for popular endpoints.'
        : hitRate < 85
          ? 'Minor cache optimization may improve hit rate further.'
          : 'Cache performance is healthy.',
    };
  }

  async generatePerformanceReport() {
    const [slowEndpoints, slowQueries, largePayloads, expensiveAggs, memoryIssues, cacheAnalysis] = await Promise.all([
      this.detectSlowEndpoints(),
      this.detectSlowQueries(),
      this.detectLargePayloads(),
      this.detectExpensiveAggregations(),
      this.detectMemoryIssues(),
      this.detectCacheMisses(),
    ]);
    const issues = [];
    issues.push(...slowEndpoints.map(e => ({ category: 'latency', detail: `${e.endpoint} avg ${e.avgLatency}ms`, severity: e.severity })));
    issues.push(...slowQueries.map(q => ({ category: 'database', detail: `${q.query} avg ${q.avgDuration}ms`, severity: q.severity })));
    issues.push(...largePayloads.map(p => ({ category: 'payload', detail: `${p.endpoint} max ${Math.round(p.maxSize / 1024)}KB`, severity: 'warning' })));
    issues.push(...expensiveAggs.map(a => ({ category: 'aggregation', detail: `${a.collection} avg ${a.avgDuration}ms`, severity: a.severity })));
    issues.push(...memoryIssues.map(m => ({ category: 'memory', detail: `${m.source} at ${m.maxUsage}%`, severity: m.status })));
    return {
      summary: {
        totalIssues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
      },
      cacheHitRate: cacheAnalysis.overallHitRate,
      slowEndpoints, slowQueries, largePayloads,
      expensiveAggregations: expensiveAggs,
      memoryIssues, cacheAnalysis,
      issues,
    };
  }

  async getOptimizationRecommendations() {
    const report = await this.generatePerformanceReport();
    const recommendations = [];
    for (const endpoint of report.slowEndpoints) {
      recommendations.push({
        priority: endpoint.severity === 'critical' ? 1 : 2,
        category: 'latency',
        target: endpoint.endpoint,
        issue: `High latency (avg ${endpoint.avgLatency}ms)`,
        recommendation: 'Add caching layer or optimize business logic',
        impact: `${endpoint.calls} calls affected`,
        estimatedImprovement: `Reduce latency by ${Math.round(endpoint.avgLatency * 0.4)}ms`,
      });
    }
    for (const query of report.slowQueries) {
      recommendations.push({
        priority: query.severity === 'critical' ? 1 : 2,
        category: 'query',
        target: query.query,
        issue: `Slow query (avg ${query.avgDuration}ms)`,
        recommendation: 'Add database indexes or restructure query',
        impact: `${query.occurrences} occurrences`,
        estimatedImprovement: `Reduce duration by ${Math.round(query.avgDuration * 0.6)}ms`,
      });
    }
    for (const agg of report.expensiveAggregations) {
      recommendations.push({
        priority: 2,
        category: 'aggregation',
        target: agg.collection,
        issue: `Expensive aggregation (avg ${agg.avgDuration}ms)`,
        recommendation: agg.suggestion,
        impact: `${agg.count} executions, ${Math.round(agg.totalDuration / 1000)}s total`,
        estimatedImprovement: `Reduce duration by ${Math.round(agg.avgDuration * 0.5)}ms`,
      });
    }
    if (report.cacheHitRate < 85) {
      recommendations.push({
        priority: 1,
        category: 'caching',
        target: 'global',
        issue: `Low cache hit rate (${report.cacheHitRate}%)`,
        recommendation: report.cacheAnalysis.suggestion,
        impact: 'Affects all cache-dependent endpoints',
        estimatedImprovement: `Improve hit rate to >85%`,
      });
    }
    for (const mem of report.memoryIssues) {
      recommendations.push({
        priority: mem.status === 'critical' ? 1 : 3,
        category: 'memory',
        target: mem.source,
        issue: `Memory pressure (${mem.maxUsage}%)`,
        recommendation: mem.suggestion,
        impact: `Avg ${mem.avgUsage}% usage`,
        estimatedImprovement: 'Reduce peak memory by 20%',
      });
    }
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  async getPerformanceDashboard() {
    const [report, recommendations] = await Promise.all([
      this.generatePerformanceReport(),
      this.getOptimizationRecommendations(),
    ]);
    return {
      summary: report.summary,
      cacheHitRate: report.cacheHitRate,
      slowEndpoints: report.slowEndpoints.length,
      slowQueries: report.slowQueries.length,
      memoryIssues: report.memoryIssues.length,
      recommendations: recommendations.slice(0, 10),
      issuesByCategory: report.issues.reduce((acc, i) => {
        acc[i.category] = (acc[i.category] || 0) + 1;
        return acc;
      }, {}),
    };
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();
