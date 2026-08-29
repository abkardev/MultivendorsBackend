import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { Trace } from '../models/Trace.js';
import { Span } from '../models/Span.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class AiOpsService {
  async analyzeMetrics(period) {
    const days = period || 7;
    const start = new Date(Date.now() - days * 86400000);
    const snapshots = await MetricSnapshot.find({ timestamp: { $gte: start } }).lean();
    const anomalies = [];
    const byType = {};
    for (const s of snapshots) {
      if (!byType[s.name]) byType[s.name] = { values: [], snapshots: [] };
      byType[s.name].values.push(s.value);
      byType[s.name].snapshots.push(s);
    }
    for (const [name, data] of Object.entries(byType)) {
      const values = data.values.filter(v => v != null);
      if (values.length < 3) continue;
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      for (const s of data.snapshots) {
        if (Math.abs(s.value - mean) > 2.5 * stdDev) {
          anomalies.push({
            metric: name, value: s.value, mean,
            deviation: s.value - mean, zScore: stdDev > 0 ? (s.value - mean) / stdDev : 0,
            timestamp: s.timestamp, severity: Math.abs(s.value - mean) / (stdDev || 1) > 3 ? 'critical' : 'warning',
          });
        }
      }
    }
    const degradation = [];
    now: for (const s of snapshots) {
      const historical = snapshots.filter(x => x.name === s.name && x.timestamp < s.timestamp);
      if (historical.length < 5) continue now;
      const histAvg = historical.reduce((sum, h) => sum + h.value, 0) / historical.length;
      if (s.value > histAvg * 1.2) {
        degradation.push({ metric: s.name, current: s.value, baseline: histAvg, increase: `${Math.round((s.value / histAvg - 1) * 100)}%`, timestamp: s.timestamp });
      }
    }
    await logAuditEvent({
      action: 'aiops.metrics.analyze', category: 'system',
      entityType: 'MetricSnapshot',
      newValue: { period: days, anomaliesFound: anomalies.length, degradedMetrics: degradation.length },
      description: `Analyzed metrics for past ${days} days: ${anomalies.length} anomalies, ${degradation.length} degradations`,
    });
    return { period: days, anomalies, degradation };
  }

  async analyzeFailures(period) {
    const days = period || 7;
    const start = new Date(Date.now() - days * 86400000);
    const traces = await Trace.find({
      status: 'error', startTime: { $gte: start },
    }).lean();
    const failureGroups = {};
    for (const t of traces) {
      const key = t.service || 'unknown';
      if (!failureGroups[key]) failureGroups[key] = { service: key, count: 0, errors: [] };
      failureGroups[key].count++;
      failureGroups[key].errors.push({
        traceId: t.traceId, name: t.name,
        error: t.error, timestamp: t.startTime, duration: t.duration,
      });
    }
    const patterns = Object.values(failureGroups).map(g => ({
      ...g,
      errors: g.errors.slice(0, 20),
      percentage: traces.length > 0 ? Math.round((g.count / traces.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);
    return { period: days, totalFailures: traces.length, patterns };
  }

  async detectPerformanceDegradation() {
    const now = new Date();
    const recentStart = new Date(now.getTime() - 3600000);
    const baselineStart = new Date(now.getTime() - 86400000);
    const baselineEnd = new Date(now.getTime() - 3600000);
    const [recentMetrics, baselineMetrics] = await Promise.all([
      MetricSnapshot.find({ timestamp: { $gte: recentStart } }).lean(),
      MetricSnapshot.find({ timestamp: { $gte: baselineStart, $lte: baselineEnd } }).lean(),
    ]);
    const baselineAvg = {};
    for (const m of baselineMetrics) {
      if (!baselineAvg[m.name]) baselineAvg[m.name] = { sum: 0, count: 0 };
      baselineAvg[m.name].sum += m.value;
      baselineAvg[m.name].count++;
    }
    for (const key of Object.keys(baselineAvg)) {
      baselineAvg[key] = baselineAvg[key].count > 0 ? baselineAvg[key].sum / baselineAvg[key].count : 0;
    }
    const degradations = [];
    for (const m of recentMetrics) {
      const baseline = baselineAvg[m.name] || m.value;
      const ratio = baseline > 0 ? m.value / baseline : 1;
      if (ratio > 1.15) {
        degradations.push({
          metric: m.name, current: m.value, baseline,
          change: `${Math.round((ratio - 1) * 100)}%`, severity: ratio > 1.3 ? 'high' : 'medium',
        });
      }
    }
    return { degradations, totalMetrics: recentMetrics.length, degradedCount: degradations.length };
  }

  async analyzeCapacity() {
    const [metrics, resourceUsage, services] = await Promise.all([
      MetricSnapshot.find({ type: 'gauge' }).sort({ timestamp: -1 }).limit(50).lean(),
      MetricSeries.aggregate([
        { $unwind: '$values' },
        { $group: { _id: '$name', maxVal: { $max: '$values.value' }, avgVal: { $avg: '$values.value' }, count: { $sum: 1 } } },
      ]),
      ServiceHealth.find({}).lean(),
    ]);
    const pressurePoints = [];
    for (const r of resourceUsage) {
      if (r.maxVal > 80) pressurePoints.push({
        resource: r._id, maxUsage: Math.round(r.maxVal), avgUsage: Math.round(r.avgVal),
        status: r.maxVal > 90 ? 'critical' : 'warning',
      });
    }
    return {
      metrics,
      resourceTrends: resourceUsage,
      pressurePoints,
      serviceCount: services.length,
      degradedServices: services.filter(s => s.status !== 'healthy').length,
    };
  }

  async generateRootCauseHypotheses(incident) {
    const { traceId, metrics, timeRange } = incident;
    const traces = [];
    if (traceId) {
      const trace = await Trace.findOne({ traceId }).populate('rootSpan').lean();
      if (trace) traces.push(trace);
    }
    if (timeRange) {
      const rangeTraces = await Trace.find({
        startTime: { $gte: new Date(timeRange.start), $lte: new Date(timeRange.end) },
        status: 'error',
      }).lean();
      traces.push(...rangeTraces);
    }
    const hypotheses = [];
    for (const trace of traces) {
      const spans = await Span.find({ trace: trace._id }).sort({ startTime: 1 }).lean();
      const errorSpans = spans.filter(s => s.status === 'error');
      for (const es of errorSpans) {
        const ancestors = [];
        let current = es;
        while (current.parentSpanId) {
          const parent = spans.find(s => s.spanId === current.parentSpanId);
          if (parent) { ancestors.unshift(parent); current = parent; }
          else break;
        }
        hypotheses.push({
          rootSpan: es.name,
          rootService: es.service,
          chain: ancestors.map(a => ({ name: a.name, service: a.service, duration: a.duration })),
          error: es.error,
          confidence: ancestors.length > 0 ? 'high' : 'medium',
          traceId: trace.traceId,
        });
      }
    }
    return { incident: traceId || 'unknown', hypotheses: hypotheses.length > 0 ? hypotheses.slice(0, 10) : [{ hypothesis: 'No error spans found', confidence: 'low' }] };
  }

  async generateOptimizationSuggestions() {
    const suggestions = [];
    const slowMetrics = await MetricSnapshot.find({ type: 'timer' }).sort({ value: -1 }).limit(10).lean();
    for (const m of slowMetrics) {
      if (m.value > 1000) {
        suggestions.push({
          type: 'latency', metric: m.name, value: m.value,
          suggestion: `High latency in ${m.name} (${m.value}ms). Consider caching or query optimization.`,
          impact: 'high',
        });
      }
    }
    const highErrorServices = await ServiceHealth.find({ errorRate: { $gt: 5 } }).lean();
    for (const s of highErrorServices) {
      suggestions.push({
        type: 'error_rate', service: s.service, errorRate: s.errorRate,
        suggestion: `Error rate ${s.errorRate}% for ${s.service}. Review error logs and recent deployments.`,
        impact: s.errorRate > 10 ? 'critical' : 'high',
      });
    }
    const capacityIssues = await MetricSeries.aggregate([
      { $unwind: '$values' },
      { $group: { _id: '$_id', name: { $first: '$name' }, maxVal: { $max: '$values.value' }, avgVal: { $avg: '$values.value' } } },
      { $match: { maxVal: { $gt: 80 } } },
    ]);
    for (const c of capacityIssues) {
      suggestions.push({
        type: 'capacity', metric: c.name, maxUsage: Math.round(c.maxVal),
        suggestion: `Resource ${c.name} at ${Math.round(c.maxVal)}% capacity. Plan scaling.`,
        impact: c.maxVal > 90 ? 'critical' : 'medium',
      });
    }
    return suggestions.sort((a, b) => ({ critical: 4, high: 3, medium: 2, low: 1 }[b.impact]) - ({ critical: 4, high: 3, medium: 2, low: 1 }[a.impact]));
  }

  async generateIncidentSummary(traceId, metrics) {
    const trace = await Trace.findOne({ traceId }).lean();
    if (!trace) return { summary: 'Trace not found' };
    const spans = await Span.find({ trace: trace._id }).lean();
    const errorSpans = spans.filter(s => s.status === 'error');
    const totalDuration = trace.duration || 0;
    const affectedServices = [...new Set(spans.map(s => s.service))];
    return {
      traceId,
      summary: `${trace.status === 'error' ? 'Failed' : 'Completed'} ${trace.name} on ${trace.service}`,
      status: trace.status,
      duration: totalDuration,
      affectedServices,
      errorCount: errorSpans.length,
      primaryError: errorSpans[0]?.error || trace.error || null,
      metrics: metrics || [],
      timestamp: trace.startTime,
    };
  }

  async getRecoveryRecommendations(incidentType) {
    const recommendations = {
      latency: [
        { step: 'Scale up service instances', priority: 1, eta: '5 minutes' },
        { step: 'Enable response caching', priority: 2, eta: '15 minutes' },
        { step: 'Optimize database queries', priority: 3, eta: '1 hour' },
        { step: 'Review CDN and static asset serving', priority: 4, eta: '30 minutes' },
      ],
      error_rate: [
        { step: 'Rollback latest deployment', priority: 1, eta: '10 minutes' },
        { step: 'Verify environment configuration', priority: 2, eta: '15 minutes' },
        { step: 'Check upstream service dependencies', priority: 3, eta: '20 minutes' },
        { step: 'Review error logs for stack traces', priority: 4, eta: '5 minutes' },
      ],
      capacity: [
        { step: 'Add additional compute resources', priority: 1, eta: '10 minutes' },
        { step: 'Enable auto-scaling policies', priority: 2, eta: '15 minutes' },
        { step: 'Identify and terminate idle resources', priority: 3, eta: '30 minutes' },
        { step: 'Review load balancer distribution', priority: 4, eta: '20 minutes' },
      ],
      default: [
        { step: 'Check monitoring dashboards for root cause', priority: 1, eta: '5 minutes' },
        { step: 'Review recent changes and deployments', priority: 2, eta: '10 minutes' },
        { step: 'Engage on-call engineering team', priority: 3, eta: '15 minutes' },
        { step: 'Consider rollback if recent change identified', priority: 4, eta: '10 minutes' },
      ],
    };
    return recommendations[incidentType] || recommendations.default;
  }

  async getTrendAnalysis(metric, period) {
    const days = period || 14;
    const start = new Date(Date.now() - days * 86400000);
    const series = await MetricSeries.findOne({ name: metric }).lean();
    if (!series) return { metric, trend: 'insufficient_data', dataPoints: 0 };
    const values = (series.values || []).filter(v => new Date(v.timestamp) >= start);
    if (values.length < 3) return { metric, trend: 'insufficient_data', dataPoints: values.length };
    const sorted = values.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg = firstHalf.reduce((s, v) => s + v.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v.value, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    const changePercent = firstAvg !== 0 ? Math.round((diff / firstAvg) * 100) : 0;
    let trend = 'stable';
    if (changePercent > 10) trend = 'up';
    else if (changePercent < -10) trend = 'down';
    return {
      metric, trend, changePercent,
      firstAvg: Math.round(firstAvg * 100) / 100,
      secondAvg: Math.round(secondAvg * 100) / 100,
      dataPoints: values.length,
    };
  }

  async getAIOpsDashboard() {
    const [recentAlerts, serviceHealth, traceStats, capacityAnalysis] = await Promise.all([
      this.analyzeMetrics(1),
      ServiceHealth.find({}).lean(),
      Trace.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } }, count: { $sum: 1 }, errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } } } },
        { $sort: { _id: -1 } }, { $limit: 14 },
      ]),
      this.analyzeCapacity(),
    ]);
    return {
      anomalies: recentAlerts.anomalies,
      degradation: recentAlerts.degradation,
      services: serviceHealth,
      traceVolume: traceStats,
      capacity: capacityAnalysis,
      recommendations: await this.generateOptimizationSuggestions(),
    };
  }
}

export const aiOpsService = new AiOpsService();
