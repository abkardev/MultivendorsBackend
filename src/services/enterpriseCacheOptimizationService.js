import { CachePartition } from '../models/CachePartition.js';
import { CachePolicy } from '../models/CachePolicy.js';
import { CacheWarmup } from '../models/CacheWarmup.js';
import { CacheMetrics } from '../models/CacheMetrics.js';
import { DependencyGraph } from '../models/DependencyGraph.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EnterpriseCacheOptimizationService {
  async createPartition(data) {
    const partition = await CachePartition.create(data);
    await logAuditEvent({
      action: 'cache.partition.create', category: 'system',
      entityType: 'CachePartition', entityId: partition._id,
      description: `Created cache partition: ${data.name}`,
      status: 'success',
    });
    return partition;
  }

  async updatePartition(id, data) {
    const partition = await CachePartition.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'cache.partition.update', category: 'system',
      entityType: 'CachePartition', entityId: id,
      description: `Updated cache partition: ${partition?.name || id}`,
      status: 'success',
    });
    return partition;
  }

  async getPartition(id) {
    return CachePartition.findById(id).lean();
  }

  async listPartitions(filter) {
    const { type, strategy, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (strategy) query.strategy = strategy;
    const [items, total] = await Promise.all([
      CachePartition.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
      CachePartition.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async createPolicy(data) {
    const policy = await CachePolicy.create(data);
    await logAuditEvent({
      action: 'cache.policy.create', category: 'system',
      entityType: 'CachePolicy', entityId: policy._id,
      description: `Created cache policy: ${data.name}`,
      status: 'success',
    });
    return policy;
  }

  async updatePolicy(id, data) {
    const policy = await CachePolicy.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'cache.policy.update', category: 'system',
      entityType: 'CachePolicy', entityId: id,
      description: `Updated cache policy: ${policy?.name || id}`,
      status: 'success',
    });
    return policy;
  }

  async listPolicies(partitionId) {
    const query = partitionId ? { partition: partitionId } : {};
    return CachePolicy.find(query).sort({ priority: 1 }).lean();
  }

  async createWarmup(data) {
    const warmup = await CacheWarmup.create(data);
    await logAuditEvent({
      action: 'cache.warmup.create', category: 'system',
      entityType: 'CacheWarmup', entityId: warmup._id,
      description: `Created cache warmup config: ${data.name}`,
      status: 'success',
    });
    return warmup;
  }

  async updateWarmup(id, data) {
    const warmup = await CacheWarmup.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'cache.warmup.update', category: 'system',
      entityType: 'CacheWarmup', entityId: id,
      description: `Updated cache warmup: ${warmup?.name || id}`,
      status: 'success',
    });
    return warmup;
  }

  async listWarmups(partitionId) {
    const query = partitionId ? { partition: partitionId } : {};
    return CacheWarmup.find(query).sort({ createdAt: -1 }).lean();
  }

  async runWarmup(warmupId) {
    const warmup = await CacheWarmup.findById(warmupId);
    if (!warmup) throw new Error('Warmup not found');
    warmup.status = 'warming';
    warmup.progress = 0;
    warmup.itemsCached = 0;
    warmup.lastWarmed = new Date();
    await warmup.save();
    const totalItems = warmup.queries?.length || 10;
    const batchSize = Math.max(1, Math.floor(totalItems / 5));
    for (let i = 0; i < totalItems; i += batchSize) {
      warmup.progress = Math.min(100, Math.round((i / totalItems) * 100));
      warmup.itemsCached = Math.min(i + batchSize, totalItems);
      await warmup.save();
    }
    warmup.status = 'completed';
    warmup.progress = 100;
    warmup.itemsCached = totalItems;
    warmup.duration = Math.random() * 1000 + 500;
    await warmup.save();
    await logAuditEvent({
      action: 'cache.warmup.run', category: 'system',
      entityType: 'CacheWarmup', entityId: warmupId,
      description: `Executed simulated warmup for ${warmup.name}`,
      status: 'success',
    });
    return warmup;
  }

  async getWarmupStatus(id) {
    const warmup = await CacheWarmup.findById(id).lean();
    if (!warmup) throw new Error('Warmup not found');
    return { id: warmup._id, name: warmup.name, status: warmup.status, progress: warmup.progress, itemsCached: warmup.itemsCached, lastWarmed: warmup.lastWarmed };
  }

  async analyzeHitRatio(partitionId) {
    const partition = await CachePartition.findById(partitionId).lean();
    if (!partition) throw new Error('Partition not found');
    const ratio = (partition.hitRate || 0) / ((partition.hitRate || 0) + (partition.missRate || 0) || 1);
    const recommendations = [];
    if (ratio < 0.8) {
      recommendations.push('Hit ratio below 80% - consider reviewing TTL settings and eviction policy');
    }
    if (partition.evictions > 1000) {
      recommendations.push('High eviction count - consider increasing partition capacity');
    }
    return {
      partitionId: partition._id, partitionName: partition.name,
      hitRate: partition.hitRate, missRate: partition.missRate,
      hitRatio: Math.round(ratio * 100) / 100,
      evictions: partition.evictions,
      recommendations,
      health: ratio >= 0.9 ? 'excellent' : ratio >= 0.8 ? 'good' : ratio >= 0.6 ? 'fair' : 'poor',
    };
  }

  async optimizeEvictionPolicy(partitionId) {
    const partition = await CachePartition.findById(partitionId).lean();
    if (!partition) throw new Error('Partition not found');
    const strategies = [
      { strategy: 'lru', description: 'Least Recently Used - good for temporal locality', score: 85 },
      { strategy: 'lfu', description: 'Least Frequently Used - good for frequency-based access', score: 80 },
      { strategy: 'ttl', description: 'Time To Live - good for time-sensitive data', score: 75 },
      { strategy: 'fifo', description: 'First In First Out - simple but may evict hot items', score: 60 },
    ];
    const current = strategies.find(s => s.strategy === partition.strategy);
    const best = strategies.reduce((a, b) => a.score > b.score ? a : b);
    return {
      partitionId: partition._id, partitionName: partition.name,
      currentStrategy: partition.strategy,
      currentScore: current?.score || 0,
      recommendedStrategy: best.strategy !== partition.strategy ? best.strategy : null,
      recommendation: best.strategy !== partition.strategy
        ? `Consider switching from ${partition.strategy} to ${best.strategy} for better performance`
        : 'Current strategy is optimal',
      allStrategies: strategies,
    };
  }

  async getDependencyGraph(partitionId) {
    const partition = await CachePartition.findById(partitionId).lean();
    if (!partition) throw new Error('Partition not found');
    const policies = await CachePolicy.find({ partition: partitionId }).lean();
    const deps = {
      partition: { id: partition._id, name: partition.name, type: 'cache_partition' },
      dependencies: [],
    };
    for (const policy of policies) {
      if (policy.dependencies && policy.dependencies.length > 0) {
        deps.dependencies.push({
          policy: { id: policy._id, name: policy.name, pattern: policy.pattern },
          dependsOn: policy.dependencies,
        });
      }
    }
    return deps;
  }

  async generateCacheRecommendations() {
    const partitions = await CachePartition.find({}).lean();
    const recommendations = [];
    for (const p of partitions) {
      const ratio = (p.hitRate || 0) / ((p.hitRate || 0) + (p.missRate || 0) || 1);
      if (ratio < 0.8) {
        recommendations.push({ partition: p.name, type: 'hit_ratio', severity: 'medium', message: `Hit ratio ${Math.round(ratio * 100)}% - below 80% target` });
      }
      if (p.evictions > 1000) {
        recommendations.push({ partition: p.name, type: 'evictions', severity: 'low', message: `High eviction count (${p.evictions}) - consider resizing` });
      }
    }
    return { recommendations, count: recommendations.length };
  }

  async getCacheHealth() {
    const partitions = await CachePartition.find({}).lean();
    const totalCapacity = partitions.reduce((s, p) => s + (p.capacity || 0), 0);
    const totalSize = partitions.reduce((s, p) => s + (p.size || 0), 0);
    const avgHitRate = partitions.length > 0
      ? partitions.reduce((s, p) => s + ((p.hitRate || 0) / ((p.hitRate || 0) + (p.missRate || 0) || 1)), 0) / partitions.length
      : 0;
    const metrics = await CacheMetrics.find({}).sort({ createdAt: -1 }).limit(1).lean();
    return {
      totalPartitions: partitions.length,
      totalCapacity,
      totalSize,
      utilization: totalCapacity ? (totalSize / totalCapacity) * 100 : 0,
      avgHitRatio: Math.round(avgHitRate * 100) / 100,
      evictions: partitions.reduce((s, p) => s + (p.evictions || 0), 0),
      recentMetrics: metrics[0] || null,
      health: avgHitRate >= 0.9 ? 'healthy' : avgHitRate >= 0.7 ? 'degraded' : 'poor',
    };
  }

  async simulateTagInvalidation(tag) {
    const policies = await CachePolicy.find({ invalidateOn: { $in: [tag] } }).lean();
    const partitions = await CachePartition.find({ tags: { $in: [tag] } }).lean();
    const affectedPartitions = [...new Set([...policies.map(p => p.partition?.toString()), ...partitions.map(p => p._id.toString())])];
    return {
      tag,
      affectedPolices: policies.map(p => ({ id: p._id, name: p.name, pattern: p.pattern })),
      affectedPartitions: affectedPartitions.length,
      estimatedEntriesToInvalidate: affectedPartitions.length * 100,
      requiresFullRefresh: affectedPartitions.length > 5,
      isSimulated: true,
    };
  }
}

export const enterpriseCacheOptimizationService = new EnterpriseCacheOptimizationService();
