import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn(), flushdb: vi.fn(),
    keys: vi.fn().mockResolvedValue([]), sadd: vi.fn(),
    smembers: vi.fn().mockResolvedValue([]), lpush: vi.fn(), rpop: vi.fn(),
    llen: vi.fn().mockResolvedValue(0), mget: vi.fn().mockResolvedValue([]),
    pipeline: vi.fn(() => ({ sadd: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn(), exec: vi.fn().mockResolvedValue([]) })),
    on: vi.fn(),
  }));
  return { default: MockRedis };
});

describe('CacheService', () => {
  let cacheService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('REDIS_URL', '');
    const mod = await import('../services/cacheService.js');
    cacheService = mod.cacheService;
  });

  it('should set and get a value', async () => {
    await cacheService.set('test-key', { data: 123 });
    const val = await cacheService.get('test-key');
    expect(val).toEqual({ data: 123 });
  });

  it('should return null for missing key', async () => {
    const val = await cacheService.get('non-existent');
    expect(val).toBeNull();
  });

  it('should delete a value', async () => {
    await cacheService.set('del-key', 'value');
    await cacheService.delete('del-key');
    const val = await cacheService.get('del-key');
    expect(val).toBeNull();
  });

  it('should clear all values', async () => {
    await cacheService.set('a', 1);
    await cacheService.set('b', 2);
    await cacheService.clear();
    const va = await cacheService.get('a');
    const vb = await cacheService.get('b');
    expect(va).toBeNull();
    expect(vb).toBeNull();
  });

  it('should use getOrSet to fetch and cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue('computed');
    const result = await cacheService.getOrSet('compute-key', fetchFn);
    expect(result).toBe('computed');
    expect(fetchFn).toHaveBeenCalled();
  });

  it('should support withCache alias', async () => {
    const fn = vi.fn().mockResolvedValue('data');
    const result = await cacheService.withCache('alias-key', 3600, fn);
    expect(result).toBe('data');
  });

  it('should provide stats', () => {
    const stats = cacheService.getStats();
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('memorySize');
  });

  it('should handle multi-get', async () => {
    await cacheService.set('k1', 'v1');
    await cacheService.set('k2', 'v2');
    const vals = await cacheService.mget(['k1', 'k2', 'k3']);
    expect(vals).toEqual(['v1', 'v2', null]);
  });

  it('should handle multi-set', async () => {
    await cacheService.mset([['mk1', 'mv1', 3600], ['mk2', 'mv2']]);
    const v1 = await cacheService.get('mk1');
    const v2 = await cacheService.get('mk2');
    expect(v1).toBe('mv1');
    expect(v2).toBe('mv2');
  });

  it('should handle queue operations', async () => {
    await cacheService.push('queue', 'item1');
    await cacheService.push('queue', 'item2');
    expect(await cacheService.queueLength('queue')).toBe(2);
    const item = await cacheService.pop('queue');
    expect(item).toBe('item1');
  });

  it('should handle session operations', async () => {
    await cacheService.setSession('s1', { user: 'u1' });
    const session = await cacheService.getSession('s1');
    expect(session.user).toBe('u1');
    await cacheService.destroySession('s1');
    expect(await cacheService.getSession('s1')).toBeNull();
  });
});
