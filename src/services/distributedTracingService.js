import { Trace } from '../models/Trace.js';
import { Span } from '../models/Span.js';
import { TraceEvent } from '../models/TraceEvent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class DistributedTracingService {
  async startTrace(name, service, tags) {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const trace = await Trace.create({
      traceId, name, service,
      startTime: new Date(),
      tags: tags || [],
      status: 'success',
    });
    const rootSpan = await Span.create({
      trace: trace._id, spanId: `${traceId}-root`,
      name, service, operation: 'root',
      startTime: new Date(),
      status: 'success',
      tags: tags || [],
    });
    trace.rootSpan = rootSpan._id;
    await trace.save();
    await logAuditEvent({
      action: 'tracing.trace.start', category: 'system',
      entityType: 'Trace', entityId: trace._id,
      newValue: { name, service, traceId },
      description: `Started trace: ${name} on ${service}`,
    });
    return traceId;
  }

  async endTrace(traceId, status, error) {
    const trace = await Trace.findOne({ traceId });
    if (!trace) throw new Error(`Trace ${traceId} not found`);
    trace.endTime = new Date();
    trace.duration = trace.endTime - trace.startTime;
    if (status) trace.status = status;
    if (error) trace.error = error;
    await trace.save();
    return trace;
  }

  async startSpan(traceId, name, operation, parentSpanId, tags) {
    const trace = await Trace.findOne({ traceId });
    if (!trace) throw new Error(`Trace ${traceId} not found`);
    const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const span = await Span.create({
      trace: trace._id, spanId, name,
      service: trace.service, operation,
      parentSpanId: parentSpanId || null,
      startTime: new Date(),
      tags: tags || [],
      status: 'success',
    });
    return spanId;
  }

  async endSpan(spanId, status, error) {
    const span = await Span.findOne({ spanId });
    if (!span) throw new Error(`Span ${spanId} not found`);
    span.endTime = new Date();
    span.duration = span.endTime - span.startTime;
    if (status) span.status = status;
    if (error) { span.error = error; span.status = 'error'; }
    await span.save();
    await Trace.findByIdAndUpdate(span.trace, {
      $set: status === 'error' ? { status: 'error' } : {},
    });
    return span;
  }

  async addTraceEvent(traceId, spanId, type, duration, metadata) {
    const trace = await Trace.findOne({ traceId });
    if (!trace) throw new Error(`Trace ${traceId} not found`);
    const span = await Span.findOne({ spanId });
    if (!span) throw new Error(`Span ${spanId} not found`);
    const event = await TraceEvent.create({
      trace: trace._id, span: span._id,
      type, duration,
      metadata: metadata || {},
    });
    return event;
  }

  async getTrace(traceId) {
    const trace = await Trace.findOne({ traceId }).lean();
    if (!trace) return null;
    const spans = await Span.find({ trace: trace._id }).sort({ startTime: 1 }).lean();
    const spanIds = spans.map(s => s._id);
    const events = await TraceEvent.find({ span: { $in: spanIds } }).sort({ timestamp: 1 }).lean();
    return { ...trace, spans, events };
  }

  async searchTraces(filters) {
    const { service, status, minDuration, maxDuration, start, end, limit = 50, offset = 0 } = filters || {};
    const query = {};
    if (service) query.service = service;
    if (status) query.status = status;
    if (minDuration || maxDuration) {
      query.duration = {};
      if (minDuration) query.duration.$gte = minDuration;
      if (maxDuration) query.duration.$lte = maxDuration;
    }
    if (start || end) {
      query.startTime = {};
      if (start) query.startTime.$gte = new Date(start);
      if (end) query.startTime.$lte = new Date(end);
    }
    const [items, total] = await Promise.all([
      Trace.find(query).sort({ startTime: -1 }).skip(offset).limit(limit).lean(),
      Trace.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getTraceTimeline(traceId) {
    const trace = await Trace.findOne({ traceId }).lean();
    if (!trace) return null;
    const spans = await Span.find({ trace: trace._id }).sort({ startTime: 1 }).lean();
    const timeline = [];
    const buildTree = (parentId, depth) => {
      for (const span of spans.filter(s => (s.parentSpanId || null) === (parentId || null))) {
        timeline.push({
          spanId: span.spanId, name: span.name, operation: span.operation,
          service: span.service, startTime: span.startTime, duration: span.duration,
          status: span.status, depth,
        });
        buildTree(span.spanId, depth + 1);
      }
    };
    buildTree(null, 0);
    return { traceId: trace.traceId, name: trace.name, totalDuration: trace.duration, timeline };
  }

  async getCriticalPath(traceId) {
    const trace = await Trace.findOne({ traceId }).lean();
    if (!trace) return null;
    const spans = await Span.find({ trace: trace._id }).sort({ startTime: 1 }).lean();
    const spanMap = {};
    for (const s of spans) spanMap[s.spanId] = s;
    const memo = {};
    const longestPath = (spanId) => {
      if (memo[spanId]) return memo[spanId];
      const span = spanMap[spanId];
      if (!span) return { duration: 0, path: [] };
      const children = spans.filter(s => s.parentSpanId === spanId);
      if (children.length === 0) {
        return { duration: span.duration || 0, path: [spanId] };
      }
      let maxChild = { duration: 0, path: [] };
      for (const c of children) {
        const childPath = longestPath(c.spanId);
        if (childPath.duration > maxChild.duration) maxChild = childPath;
      }
      memo[spanId] = { duration: (span.duration || 0) + maxChild.duration, path: [spanId, ...maxChild.path] };
      return memo[spanId];
    };
    const rootSpans = spans.filter(s => !s.parentSpanId);
    let critical = { duration: 0, path: [] };
    for (const rs of rootSpans) {
      const cp = longestPath(rs.spanId);
      if (cp.duration > critical.duration) critical = cp;
    }
    return {
      traceId,
      criticalDuration: critical.duration,
      criticalPath: critical.path.map(id => ({
        spanId: id, name: spanMap[id]?.name,
        operation: spanMap[id]?.operation, duration: spanMap[id]?.duration,
      })),
    };
  }

  async getServiceDependencies(start, end) {
    const startDate = start ? new Date(start) : new Date(Date.now() - 86400000);
    const endDate = end ? new Date(end) : new Date();
    const spans = await Span.find({
      startTime: { $gte: startDate, $lte: endDate },
    }).populate('trace', 'service').lean();
    const deps = {};
    for (const span of spans) {
      if (!span.parentSpanId) continue;
      const parentSpan = spans.find(s => s.spanId === span.parentSpanId);
      if (!parentSpan || !parentSpan.trace || !span.trace) continue;
      const from = parentSpan.service || 'unknown';
      const to = span.service || 'unknown';
      if (from === to) continue;
      const key = `${from}->${to}`;
      if (!deps[key]) {
        deps[key] = { source: from, target: to, callCount: 0, totalDuration: 0, errors: 0 };
      }
      deps[key].callCount++;
      deps[key].totalDuration += span.duration || 0;
      if (span.status === 'error') deps[key].errors++;
    }
    return Object.values(deps).map(d => ({
      ...d,
      avgDuration: d.callCount > 0 ? Math.round(d.totalDuration / d.callCount) : 0,
      errorRate: d.callCount > 0 ? Math.round((d.errors / d.callCount) * 10000) / 100 : 0,
    }));
  }

  async getTraceAnalytics() {
    const [totalTraces, errorTraces, durationStats, serviceStats] = await Promise.all([
      Trace.countDocuments({}),
      Trace.countDocuments({ status: 'error' }),
      Trace.aggregate([
        { $match: { duration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' }, maxDuration: { $max: '$duration' }, minDuration: { $min: '$duration' }, count: { $sum: 1 } } },
      ]),
      Trace.aggregate([
        { $group: { _id: '$service', traceCount: { $sum: 1 }, errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } }, avgDuration: { $avg: '$duration' } } },
        { $sort: { avgDuration: -1 } },
      ]),
    ]);
    return {
      totalTraces, errorTraces,
      errorRate: totalTraces > 0 ? Math.round((errorTraces / totalTraces) * 10000) / 100 : 0,
      avgDuration: durationStats[0]?.avgDuration || 0,
      maxDuration: durationStats[0]?.maxDuration || 0,
      minDuration: durationStats[0]?.minDuration || 0,
      slowestServices: serviceStats.slice(0, 10),
    };
  }
}

export const distributedTracingService = new DistributedTracingService();
