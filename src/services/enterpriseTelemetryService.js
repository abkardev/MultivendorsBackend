import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { MetricSeries } from '../models/MetricSeries.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { ResourceUsage } from '../models/ResourceUsage.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EnterpriseTelemetryService {
  async collectEvent(type, value, source, tags, metadata) {
    const event = await TelemetryEvent.create({
      type, value, source,
      unit: type.includes('latency') ? 'ms' : type === 'request_volume' ? 'count' : type,
      tags: tags || {},
      metadata: metadata || {},
    });
    await logAuditEvent({
      action: 'telemetry.event.collect', category: 'system',
      entityType: 'TelemetryEvent', entityId: event._id,
      description: `Collected telemetry event: ${type}=${value} from ${source}`,
      status: 'success',
    });
    return event;
  }

  async recordMetric(name, value, type, tags) {
    const snapshot = await MetricSnapshot.findOneAndUpdate(
      { name, type },
      {
        $inc: { count: 1, sum: value },
        $min: { min: value },
        $max: { max: value },
        $setOnInsert: { tags: tags || [], timestamp: new Date() },
      },
      { upsert: true, new: true }
    );
    const count = (snapshot.count || 1);
    snapshot.avg = snapshot.sum / count;
    snapshot.value = snapshot.max;
    const granularity = 'minute';
    const bucketStart = new Date();
    bucketStart.setSeconds(0, 0);
    let series = await MetricSeries.findOne({ name, granularity });
    if (!series) {
      series = await MetricSeries.create({
        name, granularity,
        retention: new Date(Date.now() + 30 * 86400000),
        tags: tags || [],
        values: [],
      });
    }
    series.values.push({ timestamp: new Date(), value, count: 1 });
    const maxVals = 1440;
    if (series.values.length > maxVals) series.values = series.values.slice(-maxVals);
    await series.save();
    await snapshot.save();
    return snapshot;
  }

  async getMetrics(filters) {
    const { names, types, granularity, start, end, tags, limit = 100, offset = 0 } = filters || {};
    const query = {};
    if (names) query.name = { $in: Array.isArray(names) ? names : [names] };
    if (types) query.type = { $in: Array.isArray(types) ? types : [types] };
    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start);
      if (end) query.timestamp.$lte = new Date(end);
    }
    const [items, total] = await Promise.all([
      MetricSnapshot.find(query).sort({ timestamp: -1 }).skip(offset).limit(limit).lean(),
      MetricSnapshot.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getMetricHistory(name, granularity, start, end) {
    const series = await MetricSeries.findOne({
      name,
      granularity: granularity || 'hour',
    }).lean();
    if (!series) return { name, values: [] };
    let values = series.values || [];
    if (start) values = values.filter(v => new Date(v.timestamp) >= new Date(start));
    if (end) values = values.filter(v => new Date(v.timestamp) <= new Date(end));
    return { name, granularity: series.granularity, values };
  }

  async getPercentiles(name, start, end) {
    const filter = { type: 'histogram' };
    if (start) filter.timestamp = { ...filter.timestamp, $gte: new Date(start) };
    if (end) filter.timestamp = { ...filter.timestamp, $lte: new Date(end) };

    const events = await TelemetryEvent.find({ type: name, ...filter }).sort({ value: 1 }).lean();
    const values = events.map(e => e.value).sort((a, b) => a - b);
    if (values.length === 0) return { name, p50: 0, p90: 0, p95: 0, p99: 0, count: 0 };

    const p = (idx) => values[Math.min(Math.floor(idx), values.length - 1)];
    return {
      name, count: values.length,
      p50: p(values.length * 0.5),
      p90: p(values.length * 0.9),
      p95: p(values.length * 0.95),
      p99: p(values.length * 0.99),
    };
  }

  async getHeatmap(name, start, end, buckets) {
    const numBuckets = buckets || 20;
    const events = await TelemetryEvent.find({
      type: name,
      timestamp: { $gte: start ? new Date(start) : new Date(Date.now() - 86400000), $lte: end ? new Date(end) : new Date() },
    }).lean();
    if (events.length === 0) return { name, buckets: [] };

    const values = events.map(e => e.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const bucketSize = (max - min) / numBuckets || 1;
    const heatmap = Array.from({ length: numBuckets }, (_, i) => ({
      bucketStart: min + i * bucketSize,
      bucketEnd: min + (i + 1) * bucketSize,
      count: 0,
    }));
    for (const v of values) {
      const idx = Math.min(Math.floor((v - min) / bucketSize), numBuckets - 1);
      heatmap[idx].count++;
    }
    return { name, min, max, buckets: heatmap };
  }

  async getRollingAverage(name, window) {
    const windowSize = window || 10;
    const events = await TelemetryEvent.find({ type: name })
      .sort({ timestamp: -1 }).limit(windowSize).lean();
    if (events.length === 0) return { name, average: 0, count: 0 };
    const sum = events.reduce((s, e) => s + e.value, 0);
    return { name, average: sum / events.length, count: events.length, window: windowSize };
  }

  async reportServiceHealth(service, status, latency, errorRate) {
    const existing = await ServiceHealth.findOne({ service });
    const previousStatus = existing ? existing.status : null;
    const record = await ServiceHealth.findOneAndUpdate(
      { service },
      {
        service, status, latency, errorRate,
        lastChecked: new Date(),
        previousStatus,
        $inc: status === 'healthy' ? { uptime: 1 } : {},
      },
      { upsert: true, new: true }
    );
    if (previousStatus && previousStatus !== status) {
      await logAuditEvent({
        action: 'service.health.change', category: 'system',
        entityType: 'ServiceHealth', entityId: record._id,
        newValue: { service, from: previousStatus, to: status },
        description: `Service ${service} changed from ${previousStatus} to ${status}`,
      });
    }
    return record;
  }

  async getServiceHealth(service) {
    if (service) return ServiceHealth.findOne({ service }).lean();
    const all = await ServiceHealth.find({}).sort({ service: 1 }).lean();
    const statusCounts = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
    for (const s of all) statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    return { services: all, summary: statusCounts, total: all.length };
  }

  async reportResourceUsage(resource, value, usage, limit) {
    const record = await ResourceUsage.create({
      resource, value,
      unit: resource === 'memory' ? 'MB' : resource === 'disk' ? 'GB' : '%',
      usage, limit,
    });
    return record;
  }

  async getResourceUsage(resource, period) {
    const query = {};
    if (resource) query.resource = resource;
    if (period) {
      const start = new Date();
      start.setDate(start.getDate() - period);
      query.timestamp = { $gte: start };
    }
    return ResourceUsage.find(query).sort({ timestamp: -1 }).limit(1000).lean();
  }

  async getTelemetryDashboard() {
    const [latestMetrics, serviceHealth, resourceSummary, recentEvents] = await Promise.all([
      MetricSnapshot.find({}).sort({ timestamp: -1 }).limit(20).lean(),
      ServiceHealth.find({}).lean(),
      ResourceUsage.aggregate([
        { $group: { _id: '$resource', avgUsage: { $avg: '$usage' }, maxUsage: { $max: '$usage' }, count: { $sum: 1 } } },
      ]),
      TelemetryEvent.find({}).sort({ timestamp: -1 }).limit(50).lean(),
    ]);
    const healthSummary = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
    for (const h of serviceHealth) healthSummary[h.status] = (healthSummary[h.status] || 0) + 1;
    return {
      metrics: latestMetrics,
      serviceHealth: { services: serviceHealth, summary: healthSummary },
      resourceSummary,
      recentEvents,
    };
  }

  async aggregateMetrics(granularity) {
    const g = granularity || 'hour';
    const now = new Date();
    const start = new Date(now);
    switch (g) {
      case 'minute': start.setMinutes(start.getMinutes() - 1); break;
      case 'hour': start.setHours(start.getHours() - 1); break;
      case 'day': start.setDate(start.getDate() - 1); break;
      default: start.setHours(start.getHours() - 1);
    }
    const events = await TelemetryEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: now } } },
      { $group: {
        _id: { type: '$type', source: '$source' },
        avg: { $avg: '$value' }, min: { $min: '$value' }, max: { $max: '$value' },
        sum: { $sum: '$value' }, count: { $sum: 1 },
      } },
    ]);
    let aggregated = 0;
    for (const e of events) {
      await this.recordMetric(e._id.type, e.avg, 'gauge');
      aggregated++;
    }
    logger.info({ granularity: g, aggregated }, 'Metrics aggregation complete');
    return { granularity: g, aggregated, start, end: now };
  }
}

export const enterpriseTelemetryService = new EnterpriseTelemetryService();
