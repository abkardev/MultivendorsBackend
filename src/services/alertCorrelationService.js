import mongoose from 'mongoose';
import { AlertGroup } from '../models/AlertGroup.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { logAuditEvent } from './auditService.js';

class AlertCorrelationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
    this.TIME_PROXIMITY_MS = 5 * 60 * 1000;
    this.CASCADE_DEPTH = 3;
  }

  async correlateAlerts(alerts) {
    if (!alerts || alerts.length === 0) return [];
    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const groups = [];
    const assigned = new Set();

    for (let i = 0; i < sorted.length; i++) {
      if (assigned.has(i)) continue;
      const group = [sorted[i]];
      assigned.add(i);
      const baseTime = new Date(sorted[i].timestamp).getTime();
      const baseSource = sorted[i].source || '';

      for (let j = i + 1; j < sorted.length; j++) {
        if (assigned.has(j)) continue;
        const itemTime = new Date(sorted[j].timestamp).getTime();
        const timeDiff = Math.abs(itemTime - baseTime);
        const sourceMatch = sorted[j].source && baseSource && (
          sorted[j].source === baseSource ||
          sorted[j].source.startsWith(baseSource.split('.')[0])
        );
        if (timeDiff <= this.TIME_PROXIMITY_MS || sourceMatch) {
          group.push(sorted[j]);
          assigned.add(j);
        }
      }
      if (group.length > 1) {
        const severity = group.some(a => a.severity === 'critical') ? 'critical'
          : group.some(a => a.severity === 'high') ? 'high'
          : group.some(a => a.severity === 'medium') ? 'medium' : 'low';
        groups.push({
          alerts: group.map(a => ({
            alertId: a.alertId || a._id?.toString(),
            source: a.source,
            message: a.message || `${a.type} alert`,
            severity: a.severity,
            timestamp: a.timestamp,
          })),
          correlationCount: group.length,
          timeSpan: Math.abs(new Date(group[group.length - 1].timestamp).getTime() - new Date(group[0].timestamp).getTime()),
          severity,
          sources: [...new Set(group.map(a => a.source).filter(Boolean))],
        });
      }
    }
    return groups;
  }

  async mergeRelatedAlerts(alerts) {
    const correlations = await this.correlateAlerts(alerts);
    const merged = [];
    for (const group of correlations) {
      const sources = group.sources;
      const types = group.alerts.map(a => a.alertId);
      let rootCause = '';
      if (sources.length === 1) {
        rootCause = `Single source ${sources[0]} generated ${group.alerts.length} related alerts`;
      } else {
        rootCause = `Multiple sources [${sources.join(', ')}] correlated within ${Math.round(group.timeSpan / 1000)}s window`;
      }
      const name = `Correlated Alert Group: ${sources.slice(0, 3).join(', ')}${sources.length > 3 ? ` +${sources.length - 3} more` : ''}`;
      merged.push({ name, rootCause, ...group });
    }
    return merged;
  }

  async detectCascadeFailures(alerts) {
    if (!alerts || alerts.length < 2) return [];
    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const chains = [];

    for (let i = 0; i < sorted.length; i++) {
      const chain = [sorted[i]];
      for (let j = i + 1; j < sorted.length && chain.length < this.CASCADE_DEPTH; j++) {
        const prev = chain[chain.length - 1];
        const curr = sorted[j];
        const timeGap = new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime();
        if (timeGap > 0 && timeGap <= this.TIME_PROXIMITY_MS * 2) {
          const depMatch = !prev.source || !curr.source || prev.source !== curr.source;
          if (depMatch) {
            chain.push(curr);
          }
        }
      }
      if (chain.length >= 2) {
        chains.push({
          propagationChain: chain.map(a => ({
            alertId: a.alertId || a._id?.toString(),
            source: a.source,
            severity: a.severity,
            timestamp: a.timestamp,
            message: a.message || `${a.type} alert`,
          })),
          chainLength: chain.length,
          timeSpanMs: new Date(chain[chain.length - 1].timestamp).getTime() - new Date(chain[0].timestamp).getTime(),
          initialSource: chain[0].source,
          terminalSource: chain[chain.length - 1].source,
          escalation: chain[0].severity !== chain[chain.length - 1].severity
            ? `Escalated from ${chain[0].severity} to ${chain[chain.length - 1].severity}`
            : 'Consistent severity',
        });
      }
    }
    return chains;
  }

  async createAlertGroup(alerts, rootCause) {
    const correlations = await this.correlateAlerts(alerts);
    if (correlations.length === 0) {
      const severity = alerts.some(a => a.severity === 'critical') ? 'critical'
        : alerts.some(a => a.severity === 'high') ? 'high' : 'medium';
      const group = await AlertGroup.create({
        name: `Alert Group (${alerts.length} alerts)`,
        alerts: alerts.map(a => ({
          alertId: a.alertId || a._id?.toString(),
          source: a.source,
          message: a.message || a.type,
          severity: a.severity || 'medium',
          timestamp: a.timestamp,
        })),
        severity,
        status: 'open',
        rootCause: rootCause || 'No correlation detected',
        timeline: [{ event: 'group_created', timestamp: new Date(), detail: `Group with ${alerts.length} alerts` }],
        mergedAt: new Date(),
      });
      return group;
    }
    const groups = [];
    for (const corr of correlations) {
      const group = await AlertGroup.create({
        name: corr.name || `Correlated group (${corr.alerts.length} alerts from ${corr.sources.length} sources)`,
        alerts: corr.alerts,
        severity: corr.severity,
        status: 'open',
        rootCause: rootCause || corr.rootCause || 'Correlated alerts',
        timeline: [{ event: 'group_created', timestamp: new Date(), detail: `Correlated ${corr.alerts.length} alerts` }],
        mergedAt: new Date(),
      });
      groups.push(group);
    }
    await logAuditEvent({
      action: 'create_alert_group',
      category: 'alert_correlation',
      entityType: 'AlertGroup',
      entityId: groups.map(g => g._id.toString()).join(','),
      description: `Created ${groups.length} alert groups from ${alerts.length} alerts`,
      status: 'success',
    });
    return groups.length === 1 ? groups[0] : groups;
  }

  async resolveAlertGroup(userId, id) {
    const group = await AlertGroup.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolver: new mongoose.Types.ObjectId(userId),
        $push: {
          timeline: { event: 'resolved', timestamp: new Date(), detail: `Resolved by user ${userId}` },
        },
      },
      { new: true }
    );
    if (!group) throw new Error('Alert group not found');
    await logAuditEvent({
      userId,
      action: 'resolve_alert_group',
      category: 'alert_correlation',
      entityType: 'AlertGroup',
      entityId: id,
      description: `Resolved alert group: ${group.name}`,
      status: 'success',
    });
    return group;
  }

  async getAlertGroups(filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    if (filters.rootCause) query.rootCause = { $regex: filters.rootCause, $options: 'i' };
    const sort = filters.sort || { createdAt: -1 };
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AlertGroup.find(query).sort(sort).skip(skip).limit(limit).lean(),
      AlertGroup.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getAlertGroup(id) {
    const group = await AlertGroup.findById(id).lean();
    if (!group) throw new Error('Alert group not found');
    const telemetryEvents = await TelemetryEvent.find({
      timestamp: {
        $gte: new Date(new Date(group.createdAt).getTime() - 3600000),
        $lte: group.resolvedAt || new Date(),
      },
    }).sort({ timestamp: 1 }).limit(50).lean();
    return { ...group, telemetryTimeline: telemetryEvents };
  }

  async getAlertCorrelationDashboard() {
    const [stats, recentGroups, latestTelemetry, serviceHealth] = await Promise.all([
      AlertGroup.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
            investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          },
        },
      ]),
      AlertGroup.find().sort({ createdAt: -1 }).limit(20).lean(),
      TelemetryEvent.aggregate([
        { $match: { timestamp: { $gte: new Date(Date.now() - 3600000) } } },
        { $group: { _id: '$type', count: { $sum: 1 }, avgValue: { $avg: '$value' } } },
        { $sort: { count: -1 } },
      ]),
      ServiceHealth.find({ status: { $ne: 'healthy' } }).lean(),
    ]);
    return {
      summary: stats[0] || { total: 0, open: 0, investigating: 0, resolved: 0, critical: 0, high: 0, medium: 0, low: 0 },
      recentAlertGroups: recentGroups,
      telemetrySummary: latestTelemetry,
      unhealthyServices: serviceHealth,
      correlationRules: {
        timeProximityMs: this.TIME_PROXIMITY_MS,
        cascadeDepth: this.CASCADE_DEPTH,
      },
      generatedAt: new Date(),
    };
  }
}

export default new AlertCorrelationService();
