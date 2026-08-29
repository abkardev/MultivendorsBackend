import { CircuitBreaker } from '../models/CircuitBreaker.js';
import { RetryPolicy } from '../models/RetryPolicy.js';
import { BulkheadPolicy } from '../models/BulkheadPolicy.js';
import { ReliabilityIncident } from '../models/ReliabilityIncident.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ReliabilityEngineeringService {
  async createCircuitBreaker(data) {
    const cb = await CircuitBreaker.create(data);
    await logAuditEvent({
      action: 'circuit_breaker.create', category: 'system',
      entityType: 'CircuitBreaker', entityId: cb._id,
      description: `Created circuit breaker: ${data.name} for ${data.service}`,
      status: 'success',
    });
    return cb;
  }

  async getCircuitBreaker(id) {
    return CircuitBreaker.findById(id).lean();
  }

  async listCircuitBreakers(filter) {
    const { service, state, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (service) query.service = service;
    if (state) query.state = state;
    const [items, total] = await Promise.all([
      CircuitBreaker.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
      CircuitBreaker.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async updateCircuitBreakerState(id, state) {
    const cb = await CircuitBreaker.findByIdAndUpdate(
      id,
      { $set: { state, lastStateChange: new Date() } },
      { new: true }
    );
    await logAuditEvent({
      action: 'circuit_breaker.state.change', category: 'system',
      entityType: 'CircuitBreaker', entityId: id,
      newValue: { state },
      description: `Circuit breaker ${cb?.name || id} state changed to ${state}`,
      status: 'success',
    });
    return cb;
  }

  async recordFailure(circuitId) {
    const cb = await CircuitBreaker.findById(circuitId);
    if (!cb) throw new Error('Circuit breaker not found');
    cb.failureCount = (cb.failureCount || 0) + 1;
    cb.lastFailure = new Date();
    if (cb.state === 'closed' && cb.failureCount >= (cb.failureThreshold || 5)) {
      cb.state = 'open';
      cb.lastStateChange = new Date();
    } else if (cb.state === 'half_open') {
      cb.state = 'open';
      cb.lastStateChange = new Date();
    }
    await cb.save();
    if (cb.state === 'open') {
      await logAuditEvent({
        action: 'circuit_breaker.opened', category: 'system',
        entityType: 'CircuitBreaker', entityId: circuitId,
        description: `Circuit breaker ${cb.name} opened after ${cb.failureCount} failures`,
        status: 'warning',
      });
    }
    return cb;
  }

  async recordSuccess(circuitId) {
    const cb = await CircuitBreaker.findById(circuitId);
    if (!cb) throw new Error('Circuit breaker not found');
    cb.successCount = (cb.successCount || 0) + 1;
    cb.lastSuccess = new Date();
    if (cb.state === 'half_open' && cb.successCount >= (cb.successThreshold || 3)) {
      cb.state = 'closed';
      cb.lastStateChange = new Date();
      cb.failureCount = 0;
      cb.successCount = 0;
    } else if (cb.state === 'open') {
      const timeSinceOpen = Date.now() - new Date(cb.lastStateChange || Date.now()).getTime();
      if (timeSinceOpen >= (cb.halfOpenTimeout || 10000)) {
        cb.state = 'half_open';
        cb.lastStateChange = new Date();
      }
    }
    await cb.save();
    return cb;
  }

  async createRetryPolicy(data) {
    const policy = await RetryPolicy.create(data);
    await logAuditEvent({
      action: 'retry_policy.create', category: 'system',
      entityType: 'RetryPolicy', entityId: policy._id,
      description: `Created retry policy: ${data.name}`,
      status: 'success',
    });
    return policy;
  }

  async updateRetryPolicy(id, data) {
    const policy = await RetryPolicy.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'retry_policy.update', category: 'system',
      entityType: 'RetryPolicy', entityId: id,
      description: `Updated retry policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async listRetryPolicies(filter) {
    const { service, isActive, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (service) query.service = service;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      RetryPolicy.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
      RetryPolicy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async calculateRetryDelay(policyId, attempt) {
    const policy = await RetryPolicy.findById(policyId).lean();
    if (!policy) throw new Error('Retry policy not found');
    const baseDelay = (policy.initialDelay || 1000) * Math.pow(policy.backoffMultiplier || 2, attempt - 1);
    const delay = Math.min(baseDelay, policy.maxDelay || 30000);
    if (policy.jitter) {
      const jitterAmount = delay * 0.1 * (Math.random() * 2 - 1);
      return Math.round(delay + jitterAmount);
    }
    return Math.round(delay);
  }

  async createBulkheadPolicy(data) {
    const policy = await BulkheadPolicy.create(data);
    await logAuditEvent({
      action: 'bulkhead.create', category: 'system',
      entityType: 'BulkheadPolicy', entityId: policy._id,
      description: `Created bulkhead policy: ${data.name} for ${data.service}`,
      status: 'success',
    });
    return policy;
  }

  async updateBulkheadPolicy(id, data) {
    const policy = await BulkheadPolicy.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'bulkhead.update', category: 'system',
      entityType: 'BulkheadPolicy', entityId: id,
      description: `Updated bulkhead policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async listBulkheadPolicies(filter) {
    const { service, type, isActive, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (service) query.service = service;
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      BulkheadPolicy.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
      BulkheadPolicy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async checkBulkheadCapacity(bulkheadId) {
    const policy = await BulkheadPolicy.findById(bulkheadId).lean();
    if (!policy) throw new Error('Bulkhead policy not found');
    const available = (policy.maxConcurrent || 10) - (policy.currentLoad || 0);
    return {
      bulkheadId: policy._id,
      name: policy.name,
      service: policy.service,
      maxConcurrent: policy.maxConcurrent,
      currentLoad: policy.currentLoad,
      available,
      queueAvailable: (policy.maxQueue || 100) - (policy.rejectedCount || 0),
      canAccept: available > 0,
    };
  }

  async recordReliabilityIncident(data) {
    const incident = await ReliabilityIncident.create({
      ...data,
      timeline: [{ timestamp: new Date(), action: 'detected', description: data.description || 'Incident detected' }],
    });
    await logAuditEvent({
      action: 'reliability.incident.record', category: 'system',
      entityType: 'ReliabilityIncident', entityId: incident._id,
      description: `Recorded reliability incident: ${data.title} (${data.severity})`,
      status: 'success',
    });
    return incident;
  }

  async updateIncident(id, data) {
    const incident = await ReliabilityIncident.findById(id);
    if (!incident) throw new Error('Incident not found');
    if (data.addTimelineEntry) {
      incident.timeline.push({
        timestamp: new Date(),
        action: data.addTimelineEntry.action,
        user: data.addTimelineEntry.user,
        description: data.addTimelineEntry.description,
      });
      delete data.addTimelineEntry;
    }
    Object.assign(incident, data);
    await incident.save();
    await logAuditEvent({
      action: 'reliability.incident.update', category: 'system',
      entityType: 'ReliabilityIncident', entityId: id,
      description: `Updated incident: ${incident.title}`,
      status: 'success',
    });
    return incident;
  }

  async getIncident(id) {
    return ReliabilityIncident.findById(id).lean();
  }

  async listIncidents(filter) {
    const { service, severity, status, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (service) query.service = service;
    if (severity) query.severity = severity;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ReliabilityIncident.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ReliabilityIncident.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async calculateSLA(service, period) {
    const start = new Date(Date.now() - (period || 30) * 86400000);
    const incidents = await ReliabilityIncident.find({
      service, createdAt: { $gte: start },
    }).lean();
    const totalDowntime = incidents.reduce((s, i) => s + (i.impact?.duration || 0), 0);
    const totalPeriod = (period || 30) * 86400000;
    const uptimePercent = Math.max(0, ((totalPeriod - totalDowntime) / totalPeriod) * 100);
    const slaTarget = 99.9;
    return {
      service, period: period || 30,
      totalIncidents: incidents.length,
      totalDowntimeMs: totalDowntime,
      uptimePercent: Math.round(uptimePercent * 100) / 100,
      slaMet: uptimePercent >= slaTarget,
      slaTarget,
    };
  }

  async getReliabilityScore(service) {
    const incidents = await ReliabilityIncident.find({ service }).sort({ createdAt: -1 }).limit(100).lean();
    const recent = incidents.filter(i => new Date(i.createdAt) > new Date(Date.now() - 30 * 86400000));
    const severityWeights = { critical: 40, major: 20, minor: 10, warning: 5 };
    let penalty = recent.reduce((s, i) => s + (severityWeights[i.severity] || 5), 0);
    const circuitBreakers = await CircuitBreaker.find({ service, state: { $ne: 'closed' } }).lean();
    penalty += circuitBreakers.length * 15;
    const score = Math.max(0, Math.min(100, 100 - penalty));
    return { service, score, totalIncidents: incidents.length, recentIncidents: recent.length, openCircuits: circuitBreakers.length, assessment: score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor' };
  }

  async generateReliabilityReport() {
    const [circuitBreakers, retryPolicies, bulkheads, incidents] = await Promise.all([
      CircuitBreaker.find({}).lean(),
      RetryPolicy.find({ isActive: true }).lean(),
      BulkheadPolicy.find({ isActive: true }).lean(),
      ReliabilityIncident.find({}).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    const openBreakers = circuitBreakers.filter(c => c.state === 'open');
    const criticalIncidents = incidents.filter(i => i.severity === 'critical');
    return {
      generatedAt: new Date(),
      summary: {
        totalPolicies: circuitBreakers.length + retryPolicies.length + bulkheads.length,
        openCircuitBreakers: openBreakers.length,
        activeRetryPolicies: retryPolicies.length,
        activeBulkheads: bulkheads.length,
        totalIncidents: incidents.length,
        criticalIncidents: criticalIncidents.length,
      },
      reliabilityScore: Math.max(0, 100 - openBreakers.length * 10 - criticalIncidents.length * 20),
      recommendations: [
        ...(openBreakers.length > 0 ? [{ type: 'circuit_breaker', action: 'Investigate open circuit breakers', count: openBreakers.length }] : []),
        ...(criticalIncidents.length > 0 ? [{ type: 'incident', action: 'Review critical incidents for root cause', count: criticalIncidents.length }] : []),
      ],
    };
  }
}

export const reliabilityEngineeringService = new ReliabilityEngineeringService();
