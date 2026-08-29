import { ScalingPolicy } from '../models/ScalingPolicy.js';
import { ScalingEvent } from '../models/ScalingEvent.js';
import { ResourceGroup } from '../models/ResourceGroup.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ScalingManagerService {
  async createPolicy(data) {
    const policy = await ScalingPolicy.create(data);
    await logAuditEvent({
      action: 'scaling.policy.create', category: 'system',
      entityType: 'ScalingPolicy', entityId: policy._id,
      description: `Created scaling policy: ${data.name}`,
      status: 'success',
    });
    return policy;
  }

  async updatePolicy(id, data) {
    const policy = await ScalingPolicy.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'scaling.policy.update', category: 'system',
      entityType: 'ScalingPolicy', entityId: id,
      description: `Updated scaling policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async getPolicy(id) {
    return ScalingPolicy.findById(id).lean();
  }

  async listPolicies(filter) {
    const { type, target, isActive, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (target) query.target = target;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      ScalingPolicy.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ScalingPolicy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async deletePolicy(id) {
    const policy = await ScalingPolicy.findByIdAndDelete(id);
    await logAuditEvent({
      action: 'scaling.policy.delete', category: 'system',
      entityType: 'ScalingPolicy', entityId: id,
      description: `Deleted scaling policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async simulateScaling(policyId, currentMetrics) {
    const policy = await ScalingPolicy.findById(policyId).lean();
    if (!policy) throw new Error('Policy not found');
    const metricValue = currentMetrics[policy.metric] || 0;
    let action = 'none';
    let reason = '';
    let from = policy.minInstances;
    let to = policy.minInstances;
    if (metricValue >= (policy.scaleUpThreshold || 80)) {
      action = 'scale_up';
      reason = `${policy.metric} ${metricValue} exceeds scale up threshold ${policy.scaleUpThreshold}`;
      to = Math.min(policy.maxInstances, from + (policy.scaleUpBy || 1));
    } else if (metricValue <= (policy.scaleDownThreshold || 20)) {
      action = 'scale_down';
      reason = `${policy.metric} ${metricValue} below scale down threshold ${policy.scaleDownThreshold}`;
      to = Math.max(policy.minInstances, from - (policy.scaleDownBy || 1));
    }
    return { policyId, policyName: policy.name, metric: policy.metric, currentValue: metricValue, action, from, to, reason };
  }

  async recordScalingEvent(data) {
    const event = await ScalingEvent.create(data);
    await logAuditEvent({
      action: 'scaling.event.record', category: 'system',
      entityType: 'ScalingEvent', entityId: event._id,
      newValue: { type: data.type, direction: data.direction, from: data.from, to: data.to },
      description: `Recorded scaling event: ${data.type} ${data.direction} from ${data.from} to ${data.to}`,
      status: 'success',
    });
    return event;
  }

  async getScalingHistory(filter) {
    const { policy, type, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (policy) query.policy = policy;
    if (type) query.type = type;
    const [items, total] = await Promise.all([
      ScalingEvent.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ScalingEvent.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getResourceGroups(filter) {
    const { type, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    const [items, total] = await Promise.all([
      ResourceGroup.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
      ResourceGroup.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getResourceGroup(id) {
    return ResourceGroup.findById(id).lean();
  }

  async updateResourceUtilization(groupId, metrics) {
    const group = await ResourceGroup.findById(groupId);
    if (!group) throw new Error('Resource group not found');
    group.utilization = metrics.utilization !== undefined ? metrics.utilization : group.utilization;
    if (metrics.capacity) {
      group.capacity = { ...group.capacity, ...metrics.capacity };
    }
    await group.save();
    return group;
  }

  async getScalingRecommendations() {
    const policies = await ScalingPolicy.find({ isActive: true }).lean();
    const groups = await ResourceGroup.find({}).lean();
    const recommendations = [];
    for (const policy of policies) {
      const group = groups.find(g => g.type === policy.target);
      if (group && group.utilization > (policy.scaleUpThreshold || 80)) {
        recommendations.push({
          policyId: policy._id, policyName: policy.name,
          target: policy.target, metric: policy.metric,
          currentUtilization: group.utilization,
          threshold: policy.scaleUpThreshold,
          action: 'scale_up',
          priority: 'high',
        });
      }
      if (group && group.utilization < (policy.scaleDownThreshold || 20)) {
        recommendations.push({
          policyId: policy._id, policyName: policy.name,
          target: policy.target, metric: policy.metric,
          currentUtilization: group.utilization,
          threshold: policy.scaleDownThreshold,
          action: 'scale_down',
          priority: 'low',
        });
      }
    }
    return { recommendations, count: recommendations.length };
  }

  async forecastResources(days) {
    const groups = await ResourceGroup.find({}).lean();
    const forecasts = groups.map(g => {
      const dailyGrowth = g.capacity?.used ? (g.capacity.used * 0.05) : 0;
      return {
        groupId: g._id,
        name: g.name,
        type: g.type,
        currentUsed: g.capacity?.used || 0,
        currentAvailable: g.capacity?.available || 0,
        projectedUsed: (g.capacity?.used || 0) + dailyGrowth * days,
        projectedTotal: (g.capacity?.total || 0) + dailyGrowth * days,
        estimatedExhaustionDays: dailyGrowth > 0 ? Math.floor((g.capacity?.available || 0) / dailyGrowth) : -1,
      };
    });
    return { days, forecasts };
  }

  async evaluatePolicy(policyId, metrics) {
    const policy = await ScalingPolicy.findById(policyId).lean();
    if (!policy) throw new Error('Policy not found');
    const metricValue = metrics[policy.metric] || 0;
    const shouldScaleUp = metricValue >= (policy.scaleUpThreshold || 80);
    const shouldScaleDown = metricValue <= (policy.scaleDownThreshold || 20);
    const action = shouldScaleUp ? 'scale_up' : shouldScaleDown ? 'scale_down' : 'none';
    return {
      policyId: policy._id, policyName: policy.name,
      metric: policy.metric, currentValue: metricValue,
      scaleUpThreshold: policy.scaleUpThreshold,
      scaleDownThreshold: policy.scaleDownThreshold,
      shouldScaleUp, shouldScaleDown,
      triggered: action !== 'none', action,
    };
  }

  async getScaleUpRecommendations() {
    const groups = await ResourceGroup.find({}).lean();
    return groups
      .filter(g => g.utilization > 70)
      .map(g => ({
        groupId: g._id, name: g.name, type: g.type,
        utilization: g.utilization,
        recommendation: 'Consider scaling up - utilization exceeds 70%',
      }));
  }

  async getScaleDownRecommendations() {
    const groups = await ResourceGroup.find({}).lean();
    return groups
      .filter(g => g.utilization < 30)
      .map(g => ({
        groupId: g._id, name: g.name, type: g.type,
        utilization: g.utilization,
        recommendation: 'Consider scaling down - utilization below 30%',
      }));
  }

  async markAsSimulation(eventId) {
    const event = await ScalingEvent.findByIdAndUpdate(eventId, { $set: { type: 'simulation', simulated: true } }, { new: true });
    await logAuditEvent({
      action: 'scaling.event.mark_simulation', category: 'system',
      entityType: 'ScalingEvent', entityId: eventId,
      description: `Marked scaling event ${eventId} as simulation`,
      status: 'success',
    });
    return event;
  }
}

export const scalingManagerService = new ScalingManagerService();
