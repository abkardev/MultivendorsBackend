import Redis from 'ioredis';
import { logger } from './logger.js';

class CacheService {
  constructor() {
    this.redis = null;
    this.memory = new Map();
    this.memoryTTLs = new Map();
    this.stats = { hits: 0, misses: 0, redisHits: 0, redisMisses: 0, memoryHits: 0, memoryMisses: 0 };
    this.connected = false;
    this._connect();
  }

  _connect() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 100, 3000),
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        this.redis.on('connect', () => { this.connected = true; logger.info('Redis connected'); });
        this.redis.on('error', (err) => { this.connected = false; logger.warn('Redis error, using memory cache:', err.message); });
        this.redis.on('close', () => { this.connected = false; });
      } catch (err) {
        logger.warn('Redis connection failed, using memory cache:', err.message);
      }
    }
  }

  async get(key) {
    if (this.connected && this.redis) {
      try {
        const val = await this.redis.get(key);
        if (val) { this.stats.redisHits++; this.stats.hits++; return JSON.parse(val); }
        this.stats.redisMisses++;
      } catch {}
    }
    const memVal = this.memory.get(key);
    if (memVal !== undefined) {
      const ttl = this.memoryTTLs.get(key);
      if (ttl && ttl < Date.now()) { this.memory.delete(key); this.memoryTTLs.delete(key); }
      else { this.stats.memoryHits++; this.stats.hits++; return memVal; }
    }
    this.stats.memoryMisses++; this.stats.misses++;
    return null;
  }

  async set(key, value, ttlSeconds = 3600) {
    this.memory.set(key, value);
    this.memoryTTLs.set(key, Date.now() + ttlSeconds * 1000);
    if (this.connected && this.redis) {
      try {
        if (ttlSeconds) await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        else await this.redis.set(key, JSON.stringify(value));
      } catch {}
    }
  }

  async delete(key) {
    this.memory.delete(key);
    this.memoryTTLs.delete(key);
    if (this.connected && this.redis) { try { await this.redis.del(key); } catch {} }
  }

  async clear() {
    this.memory.clear();
    this.memoryTTLs.clear();
    if (this.connected && this.redis) { try { await this.redis.flushdb(); } catch {} }
  }

  async getOrSet(key, fetchFn, ttlSeconds = 3600) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const value = await fetchFn();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  async withCache(key, ttlSeconds, fn) {
    return this.getOrSet(key, fn, ttlSeconds);
  }

  async setWithTags(key, value, tags = [], ttlSeconds = 3600) {
    await this.set(key, value, ttlSeconds);
    if (this.connected && this.redis && tags.length) {
      try {
        const pipeline = this.redis.pipeline();
        for (const tag of tags) pipeline.sadd(`tag:${tag}`, key);
        await pipeline.exec();
      } catch {}
    }
    for (const tag of tags) {
      const tagKey = `_tag:${tag}`;
      const existing = this.memory.get(tagKey) || [];
      if (!existing.includes(key)) this.memory.set(tagKey, [...existing, key]);
    }
  }

  async invalidateTag(tag) {
    if (this.connected && this.redis) {
      try {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length) { const pipeline = this.redis.pipeline(); for (const k of keys) pipeline.del(k); pipeline.del(`tag:${tag}`); await pipeline.exec(); }
      } catch {}
    }
    const tagKey = `_tag:${tag}`;
    const keys = this.memory.get(tagKey) || [];
    for (const k of keys) { this.memory.delete(k); this.memoryTTLs.delete(k); }
    this.memory.delete(tagKey);
  }

  async invalidateGroup(group) {
    if (this.connected && this.redis) {
      try {
        const keys = await this.redis.keys(`${group}:*`);
        if (keys.length) { const pipeline = this.redis.pipeline(); for (const k of keys) pipeline.del(k); await pipeline.exec(); }
      } catch {}
    }
    for (const [key] of this.memory) {
      if (key.startsWith(`${group}:`)) { this.memory.delete(key); this.memoryTTLs.delete(key); }
    }
  }

  async increment(key, windowSeconds = 60, max = 100) {
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / windowSeconds)}`;
    const count = (await this.get(windowKey)) || 0;
    if (count >= max) return { allowed: false, current: count, max, resetIn: windowSeconds - (now % windowSeconds) };
    await this.set(windowKey, count + 1, windowSeconds);
    return { allowed: true, current: count + 1, max, resetIn: windowSeconds - (now % windowSeconds) };
  }

  async getSession(id) {
    return this.get(`session:${id}`);
  }

  async setSession(id, data, ttlSeconds = 86400) {
    return this.set(`session:${id}`, data, ttlSeconds);
  }

  async destroySession(id) {
    return this.delete(`session:${id}`);
  }

  async push(queue, item) {
    if (this.connected && this.redis) {
      try { await this.redis.lpush(`queue:${queue}`, JSON.stringify(item)); return; } catch {}
    }
    const key = `queue:${queue}`;
    const arr = this.memory.get(key) || [];
    arr.unshift(item);
    this.memory.set(key, arr);
  }

  async pop(queue) {
    if (this.connected && this.redis) {
      try {
        const val = await this.redis.rpop(`queue:${queue}`);
        if (val) return JSON.parse(val);
      } catch {}
    }
    const key = `queue:${queue}`;
    const arr = this.memory.get(key) || [];
    if (!arr.length) return null;
    const val = arr.pop();
    this.memory.set(key, arr);
    return val;
  }

  async queueLength(queue) {
    if (this.connected && this.redis) {
      try { return await this.redis.llen(`queue:${queue}`); } catch {}
    }
    const arr = this.memory.get(`queue:${queue}`) || [];
    return arr.length;
  }

  async mget(keys) {
    if (this.connected && this.redis) {
      try {
        const vals = await this.redis.mget(keys);
        return vals.map((v) => (v ? JSON.parse(v) : null));
      } catch {}
    }
    return keys.map((k) => this.memory.get(k) ?? null);
  }

  async mset(pairs) {
    if (this.connected && this.redis) {
      try {
        const pipeline = this.redis.pipeline();
        for (const [key, value, ttl] of pairs) {
          if (ttl) pipeline.setex(key, ttl, JSON.stringify(value));
          else pipeline.set(key, JSON.stringify(value));
        }
        await pipeline.exec();
      } catch {}
    }
    for (const [key, value, ttl] of pairs) {
      this.memory.set(key, value);
      if (ttl) this.memoryTTLs.set(key, Date.now() + ttl * 1000);
    }
  }

  getStats() {
    return {
      ...this.stats,
      memorySize: this.memory.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses || 1),
      redisConnected: this.connected,
    };
  }
}

export const cacheService = new CacheService();
