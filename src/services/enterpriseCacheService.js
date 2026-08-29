import { CacheMetrics } from '../models/CacheMetrics.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseCacheService {
  constructor() {
    this.backend = null;
    this.memoryCache = new Map();
    this.memoryTimestamps = new Map();
    this.stats = {
      hits: 0, misses: 0, sets: 0, evictions: 0, invalidations: 0,
    };
    this.TTL = 300000;
    this.DEFAULT_GROUP = 'default';
    this.groups = new Map();
    this.dependencies = new Map();
    this.initialized = false;
  }

  async initialize(options = {}) {
    this.TTL = options.defaultTtl || 300000;
    this.backendType = options.backend || 'memory';
    if (options.redisUrl) {
      try {
        const { createClient } = await import('redis');
        this.backend = createClient({ url: options.redisUrl });
        await this.backend.connect();
        this.backendType = 'redis';
      } catch (err) {
        console.warn('[CacheService] Redis unavailable, falling back to memory:', err.message);
        this.backendType = 'memory';
      }
    }
    if (options.hybrid) {
      this.backendType = 'hybrid';
    }
    this.initialized = true;
    if (options.groups) {
      for (const g of options.groups) {
        this.groups.set(g.name, g);
      }
    }
  }

  _getGroupConfig(group) {
    return this.groups.get(group) || { ttl: this.TTL, compression: false };
  }

  async get(key, group = this.DEFAULT_GROUP) {
    const t0 = Date.now();
    if (this.backendType === 'redis' || this.backendType === 'hybrid') {
      try {
        let value = await this.backend.get(`cache:${group}:${key}`);
        if (value) {
          value = JSON.parse(value);
          this.stats.hits++;
          await this._recordMetrics(group, Date.now() - t0);
          return value;
        }
      } catch (e) { /* fall through */ }
    }
    const memKey = `${group}:${key}`;
    const cached = this.memoryCache.get(memKey);
    const ts = this.memoryTimestamps.get(memKey);
    if (cached !== undefined && ts && (Date.now() - ts) < this.TTL) {
      this.stats.hits++;
      await this._recordMetrics(group, Date.now() - t0);
      return cached;
    }
    this.stats.misses++;
    await this._recordMetrics(group, Date.now() - t0);
    return null;
  }

  async set(key, value, group = this.DEFAULT_GROUP, ttl) {
    const t0 = Date.now();
    const actualTtl = ttl || this._getGroupConfig(group).ttl || this.TTL;
    const memKey = `${group}:${key}`;
    this.memoryCache.set(memKey, value);
    this.memoryTimestamps.set(memKey, Date.now());
    if (this.backendType === 'redis' || this.backendType === 'hybrid') {
      try {
        await this.backend.setEx(`cache:${group}:${key}`, Math.ceil(actualTtl / 1000), JSON.stringify(value));
      } catch (e) { /* ignore */ }
    }
    this.stats.sets++;
    const groupConfig = this._getGroupConfig(group);
    if (groupConfig.compression && typeof value === 'object') {
    }
    await this._recordMetrics(group, Date.now() - t0);
    return true;
  }

  async del(key, group = this.DEFAULT_GROUP) {
    const memKey = `${group}:${key}`;
    this.memoryCache.delete(memKey);
    this.memoryTimestamps.delete(memKey);
    if (this.backendType === 'redis' || this.backendType === 'hybrid') {
      try {
        await this.backend.del(`cache:${group}:${key}`);
      } catch (e) { /* ignore */ }
    }
    this.stats.invalidations++;
  }

  async invalidateGroup(group) {
    const keysToDelete = [];
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${group}:`)) {
        keysToDelete.push(key);
      }
    }
    for (const k of keysToDelete) {
      this.memoryCache.delete(k);
      this.memoryTimestamps.delete(k);
    }
    if (this.backendType === 'redis' || this.backendType === 'hybrid') {
      try {
        const scanResult = await this.backend.keys(`cache:${group}:*`);
        if (scanResult.length > 0) {
          await this.backend.del(scanResult);
        }
      } catch (e) { /* ignore */ }
    }
    this.stats.invalidations += keysToDelete.length;
  }

  async invalidateTag(tag) {
    const deps = this.dependencies.get(tag) || [];
    for (const { key, group } of deps) {
      await this.del(key, group);
    }
    this.dependencies.delete(tag);
  }

  addDependency(tag, key, group = this.DEFAULT_GROUP) {
    if (!this.dependencies.has(tag)) {
      this.dependencies.set(tag, []);
    }
    this.dependencies.get(tag).push({ key, group });
  }

  async invalidateDependency(key, group = this.DEFAULT_GROUP) {
    for (const [tag, deps] of this.dependencies.entries()) {
      const filtered = deps.filter(d => d.key !== key || d.group !== group);
      if (filtered.length === 0) {
        this.dependencies.delete(tag);
      } else {
        this.dependencies.set(tag, filtered);
      }
    }
    await this.del(key, group);
  }

  async warmup(entries) {
    for (const { key, value, group, ttl } of entries) {
      await this.set(key, value, group, ttl);
    }
  }

  async prefetch(keys, fetcher, group = this.DEFAULT_GROUP) {
    const results = {};
    const missing = [];
    for (const key of keys) {
      const cached = await this.get(key, group);
      if (cached !== null) {
        results[key] = cached;
      } else {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      const fetched = await fetcher(missing);
      for (const [key, value] of Object.entries(fetched)) {
        await this.set(key, value, group);
        results[key] = value;
      }
    }
    return results;
  }

  async getStats() {
    const metrics = await CacheMetrics.find()
      .sort({ periodEnd: -1 })
      .limit(24)
      .lean();
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    return {
      ...this.stats,
      hitRate: (totalHits + totalMisses) > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0,
      memoryItems: this.memoryCache.size,
      backendType: this.backendType,
      groups: Array.from(this.groups.keys()),
      groupCount: this.groups.size,
      dependencyCount: this.dependencies.size,
      history: metrics,
    };
  }

  async _recordMetrics(group, latencyMs) {
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
      const periodEnd = new Date(periodStart.getTime() + 3600000);
      await CacheMetrics.updateOne(
        { group, periodStart },
        {
          $inc: {
            hits: this.stats.hits > 0 ? 1 : 0,
            misses: this.stats.misses > 0 ? 1 : 0,
            sets: 1,
          },
          $set: {
            periodEnd,
            hitRate: (this.stats.hits + this.stats.misses) > 0
              ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 : 0,
            itemCount: this.memoryCache.size,
          },
          $avg: { avgLatencyMs: latencyMs },
        },
        { upsert: true },
      );
    } catch (e) { /* metrics collection is non-critical */ }
  }

  async clear() {
    this.memoryCache.clear();
    this.memoryTimestamps.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, invalidations: 0 };
    if (this.backendType === 'redis' || this.backendType === 'hybrid') {
      try {
        await this.backend.flushDb();
      } catch (e) { /* ignore */ }
    }
  }

  getMemoryUsage() {
    return {
      items: this.memoryCache.size,
      estimatedBytes: this.memoryCache.size * 1024,
      dependencies: this.dependencies.size,
    };
  }
}

export const enterpriseCacheService = new EnterpriseCacheService();
