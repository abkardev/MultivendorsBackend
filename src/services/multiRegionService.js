import { DeploymentRegion } from '../models/DeploymentRegion.js';
import { RegionPolicy } from '../models/RegionPolicy.js';
import { RegionReplication } from '../models/RegionReplication.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class MultiRegionService {
  async createRegion(data) {
    const region = await DeploymentRegion.create(data);
    await logAuditEvent({
      action: 'region.create', category: 'system',
      entityType: 'DeploymentRegion', entityId: region._id,
      description: `Created deployment region: ${data.name} (${data.code})`,
      status: 'success',
    });
    return region;
  }

  async updateRegion(id, data) {
    const region = await DeploymentRegion.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'region.update', category: 'system',
      entityType: 'DeploymentRegion', entityId: id,
      description: `Updated deployment region: ${region?.name || id}`,
      status: 'success',
    });
    return region;
  }

  async getRegion(id) {
    return DeploymentRegion.findById(id).lean();
  }

  async listRegions(filter) {
    const { provider, status, isActive, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (provider) query.provider = provider;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      DeploymentRegion.find(query).sort({ priority: 1 }).skip(offset).limit(limit).lean(),
      DeploymentRegion.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async deleteRegion(id) {
    const region = await DeploymentRegion.findByIdAndUpdate(id, { isActive: false }, { new: true });
    await logAuditEvent({
      action: 'region.delete', category: 'system',
      entityType: 'DeploymentRegion', entityId: id,
      description: `Soft deleted deployment region: ${region?.name || id}`,
      status: 'success',
    });
    return region;
  }

  async setPreferredRegion(regionId) {
    await DeploymentRegion.updateMany({}, { isPreferred: false });
    const region = await DeploymentRegion.findByIdAndUpdate(regionId, { isPreferred: true, priority: 0 }, { new: true });
    await logAuditEvent({
      action: 'region.set_preferred', category: 'system',
      entityType: 'DeploymentRegion', entityId: regionId,
      description: `Set preferred region to ${region?.name || regionId}`,
      status: 'success',
    });
    return region;
  }

  async createPolicy(data) {
    const policy = await RegionPolicy.create(data);
    await logAuditEvent({
      action: 'region.policy.create', category: 'system',
      entityType: 'RegionPolicy', entityId: policy._id,
      description: `Created region policy: ${data.name} for region ${data.region}`,
      status: 'success',
    });
    return policy;
  }

  async updatePolicy(id, data) {
    const policy = await RegionPolicy.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'region.policy.update', category: 'system',
      entityType: 'RegionPolicy', entityId: id,
      description: `Updated region policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async getPolicies(regionId) {
    return RegionPolicy.find({ region: regionId }).sort({ type: 1 }).lean();
  }

  async createReplication(sourceId, targetId, data) {
    const replication = await RegionReplication.create({ source: sourceId, target: targetId, ...data });
    await logAuditEvent({
      action: 'region.replication.create', category: 'system',
      entityType: 'RegionReplication', entityId: replication._id,
      description: `Created replication from ${sourceId} to ${targetId}`,
      status: 'success',
    });
    return replication;
  }

  async updateReplication(id, data) {
    const replication = await RegionReplication.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'region.replication.update', category: 'system',
      entityType: 'RegionReplication', entityId: id,
      description: `Updated replication ${id}`,
      status: 'success',
    });
    return replication;
  }

  async getReplications(regionId) {
    return RegionReplication.find({ $or: [{ source: regionId }, { target: regionId }] }).lean();
  }

  async getRegionTopology() {
    const regions = await DeploymentRegion.find({ isActive: true }).lean();
    const replications = await RegionReplication.find({ status: 'active' }).lean();
    const nodes = regions.map(r => ({
      id: r._id, name: r.name, code: r.code, provider: r.provider,
      status: r.status, isPreferred: r.isPreferred, latency: r.latency,
    }));
    const edges = replications.map(r => ({
      source: r.source, target: r.target, type: r.type,
      status: r.status, latency: r.latency, lag: r.lag,
    }));
    return { nodes, edges, nodeCount: nodes.length, edgeCount: edges.length };
  }

  async getFailoverPlan(regionId) {
    const region = await DeploymentRegion.findById(regionId).lean();
    if (!region) throw new Error('Region not found');
    const policies = await RegionPolicy.find({ region: regionId, isActive: true, type: 'failover' }).lean();
    const failoverTargets = [];
    for (const policy of policies) {
      if (policy.failoverPriority && policy.failoverPriority.length > 0) {
        const targets = await DeploymentRegion.find({ _id: { $in: policy.failoverPriority }, isActive: true }).lean();
        failoverTargets.push(...targets.map((t, i) => ({ order: i + 1, regionId: t._id, name: t.name, code: t.code })));
      }
    }
    return {
      primaryRegion: { id: region._id, name: region.name, code: region.code },
      failoverOrder: failoverTargets.sort((a, b) => a.order - b.order),
      totalFailoverTargets: failoverTargets.length,
    };
  }

  async validateDataResidency(dataType, regionId) {
    const region = await DeploymentRegion.findById(regionId).lean();
    if (!region) throw new Error('Region not found');
    const policies = await RegionPolicy.find({ region: regionId, isActive: true, type: 'data_residency' }).lean();
    const compliant = policies.length > 0 ? policies.some(p => p.rules?.some(r => r.condition === dataType && r.active !== false)) : true;
    return {
      dataType, regionId: region._id, regionName: region.name, compliant,
      policies: policies.map(p => ({ name: p.name, rules: p.rules })),
    };
  }

  async getLatencyProfile(regionId) {
    const region = await DeploymentRegion.findById(regionId).lean();
    if (!region) throw new Error('Region not found');
    const replications = await RegionReplication.find({ $or: [{ source: regionId }, { target: regionId }] }).lean();
    const peerLatencies = [];
    for (const rep of replications) {
      const peerId = rep.source.toString() === regionId.toString() ? rep.target : rep.source;
      const peer = await DeploymentRegion.findById(peerId).lean();
      peerLatencies.push({
        peerId: peer?._id, peerName: peer?.name || 'Unknown',
        replicationLatency: rep.latency, replicationLag: rep.lag,
      });
    }
    return {
      regionId: region._id, regionName: region.name,
      selfLatency: region.latency,
      peerLatencies,
    };
  }

  async getPreferredRegion() {
    return DeploymentRegion.findOne({ isPreferred: true, isActive: true }).lean();
  }
}

export const multiRegionService = new MultiRegionService();
