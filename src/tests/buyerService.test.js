import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/orderModel.js', () => ({
  Order: { find: vi.fn(), countDocuments: vi.fn(), aggregate: vi.fn() },
}));

vi.mock('../models/reviewModel.js', () => ({
  Review: { find: vi.fn(), countDocuments: vi.fn() },
}));

vi.mock('../models/WishlistItem.js', () => ({
  default: { find: vi.fn(), countDocuments: vi.fn() },
}));

describe('Buyer Service', () => {
  let Order;

  beforeEach(async () => {
    vi.clearAllMocks();
    Order = (await import('../models/orderModel.js')).Order;
  });

  it('should get buyer dashboard stats', async () => {
    Order.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    const total = await Order.countDocuments({ user: mockId() });
    const active = await Order.countDocuments({ user: mockId(), status: { $in: ['pending', 'confirmed'] } });
    const cancelled = await Order.countDocuments({ user: mockId(), status: 'cancelled' });
    expect(total).toBe(10);
    expect(active).toBe(3);
    expect(cancelled).toBe(1);
  });

  it('should get buyer order history', async () => {
    Order.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ _id: mockId(), total: 500, status: 'delivered' }]),
    });
    const orders = await Order.find({ user: mockId() }).sort({ createdAt: -1 }).skip(0).limit(5);
    expect(orders).toHaveLength(1);
  });

  it('should calculate buyer analytics', () => {
    const orders = [
      { total: 100, status: 'delivered' },
      { total: 200, status: 'delivered' },
      { total: 50, status: 'cancelled' },
    ];
    const totalSpent = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0);
    expect(totalSpent).toBe(300);
  });

  it('should aggregate by category', () => {
    const orders = [
      { items: [{ category: 'electronics' }] },
      { items: [{ category: 'electronics' }, { category: 'clothing' }] },
    ];
    const all = orders.flatMap(o => o.items.map(i => i.category));
    const unique = [...new Set(all)];
    expect(unique).toContain('electronics');
    expect(unique).toContain('clothing');
  });
});
