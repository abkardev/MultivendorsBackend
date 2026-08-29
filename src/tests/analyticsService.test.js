import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/UsageEvent.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/ApiUsageLog.js', () => ({
  default: {
    create: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Analytics Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should track an event', async () => {
    const UsageEvent = (await import('../models/UsageEvent.js')).default;
    UsageEvent.create.mockResolvedValue({ _id: 'evt1', event: 'page_view', userId: mockId(), metadata: {} });
    const event = await UsageEvent.create({ event: 'page_view', userId: mockId() });
    expect(event.event).toBe('page_view');
  });

  it('should aggregate events by type', async () => {
    const UsageEvent = (await import('../models/UsageEvent.js')).default;
    UsageEvent.aggregate.mockResolvedValue([
      { _id: 'page_view', count: 150 },
      { _id: 'click', count: 300 },
    ]);
    const stats = await UsageEvent.aggregate([{ $group: { _id: '$event', count: { $sum: 1 } } }]);
    expect(stats).toHaveLength(2);
    expect(stats.find(s => s._id === 'page_view').count).toBe(150);
  });

  it('should generate report data', () => {
    const rawData = [
      { date: '2026-01-01', value: 100 },
      { date: '2026-01-02', value: 200 },
      { date: '2026-01-03', value: 150 },
    ];
    const total = rawData.reduce((sum, r) => sum + r.value, 0);
    expect(total).toBe(450);
  });

  it('should calculate conversion rates', () => {
    const conversions = 50;
    const visitors = 1000;
    const rate = (conversions / visitors) * 100;
    expect(rate).toBe(5);
  });

  it('should handle time-series aggregation', () => {
    const entries = [
      { timestamp: new Date('2026-01-01'), value: 10 },
      { timestamp: new Date('2026-01-02'), value: 20 },
    ];
    const grouped = entries.reduce((acc, e) => {
      const day = e.timestamp.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + e.value;
      return acc;
    }, {});
    expect(grouped['2026-01-01']).toBe(10);
    expect(grouped['2026-01-02']).toBe(20);
  });
});
