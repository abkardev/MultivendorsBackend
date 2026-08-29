import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ioredis', () => {
  const MockRedis = vi.fn(() => ({
    get: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn(), flushdb: vi.fn(),
    keys: vi.fn().mockResolvedValue([]), pipeline: vi.fn(() => ({ sadd: vi.fn(), set: vi.fn(), setex: vi.fn(), del: vi.fn(), exec: vi.fn().mockResolvedValue([]) })),
    on: vi.fn(),
  }));
  return { default: MockRedis };
});

describe('Cache Performance', () => {
  let cacheService;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('REDIS_URL', '');
    const mod = await import('../services/cacheService.js');
    cacheService = mod.cacheService;
  });

  it('should track cache hit rate', async () => {
    await cacheService.set('hit-key', 'value');
    await cacheService.get('hit-key');
    await cacheService.get('miss-key');
    const stats = cacheService.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.5);
  });

  it('should handle concurrent set operations', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(cacheService.set(`concurrent-${i}`, `val-${i}`));
    }
    await Promise.all(promises);
    const vals = await cacheService.mget(Array.from({ length: 10 }, (_, i) => `concurrent-${i}`));
    expect(vals).toHaveLength(10);
    expect(vals[0]).toBe('val-0');
    expect(vals[9]).toBe('val-9');
  });

  it('should handle cache stampede via getOrSet', async () => {
    const fetchFn = vi.fn().mockResolvedValue('expensive-value');
    const results = await Promise.all([
      cacheService.getOrSet('stampede-key', fetchFn),
      cacheService.getOrSet('stampede-key', fetchFn),
      cacheService.getOrSet('stampede-key', fetchFn),
    ]);
    expect(results).toEqual(['expensive-value', 'expensive-value', 'expensive-value']);
  });

  it('should handle large cache operations', async () => {
    const largeObj = { data: 'x'.repeat(10000), nested: { array: new Array(100).fill('test') } };
    await cacheService.set('large-key', largeObj);
    const retrieved = await cacheService.get('large-key');
    expect(retrieved.data.length).toBe(10000);
    expect(retrieved.nested.array).toHaveLength(100);
  });

  it('should track memory size', async () => {
    const before = cacheService.getStats().memorySize;
    await cacheService.set('size-test-1', 'a');
    await cacheService.set('size-test-2', 'b');
    await cacheService.set('size-test-3', 'c');
    const stats = cacheService.getStats();
    expect(stats.memorySize).toBe(before + 3);
  });

  it('should handle empty queue pop', async () => {
    const item = await cacheService.pop('empty-queue');
    expect(item).toBeNull();
  });

  it('should handle group invalidation', async () => {
    await cacheService.set('group:a', 1);
    await cacheService.invalidateGroup('group');
    const val = await cacheService.get('group:a');
    expect(val).toBeNull();
  });
});
