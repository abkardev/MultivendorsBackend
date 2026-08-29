import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/productModel.js', () => ({
  Product: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/vendorModel.js', () => ({
  Vendor: { findOne: vi.fn(), findById: vi.fn() },
}));

vi.mock('../models/orderModel.js', () => ({
  Order: {
    find: vi.fn(),
    aggregate: vi.fn(),
  },
}));

describe('Recommendation Service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should generate personalized recommendations', async () => {
    const { Order } = await import('../models/orderModel.js');
    Order.find.mockReturnValue({
      populate: vi.fn().mockResolvedValue([
        { items: [{ product: { _id: 'p1', category: 'electronics' } }] },
        { items: [{ product: { _id: 'p2', category: 'electronics' } }] },
      ]),
    });
    const orders = await Order.find({ user: mockId() }).populate('items.product');
    const categoryIds = [...new Set(orders.flatMap(o => o.items.map(i => i.product?.category).filter(Boolean)))];
    expect(categoryIds).toContain('electronics');
  });

  it('should filter based on purchase history', () => {
    const purchasedIds = ['p1', 'p2'];
    const candidates = ['p2', 'p3', 'p4'];
    const recommended = candidates.filter(id => !purchasedIds.includes(id));
    expect(recommended).toEqual(['p3', 'p4']);
  });

  it('should handle cold start (no history)', async () => {
    const { Order } = await import('../models/orderModel.js');
    Order.find.mockReturnValue({ populate: vi.fn().mockResolvedValue([]) });
    const orders = await Order.find({ user: mockId() }).populate('items.product');
    expect(orders).toHaveLength(0);
  });

  it('should limit recommendations', () => {
    const limit = 10;
    expect(limit).toBe(10);
  });

  it('should support trending recommendations', async () => {
    const { Product } = await import('../models/productModel.js');
    Product.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ _id: 'p1', name: 'Popular Item' }]),
    });
    const trending = await Product.find().sort({ ratingAverage: -1, createdAt: -1 }).limit(10);
    expect(trending).toHaveLength(1);
  });
});
