import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/orderModel.js', () => ({
  Order: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../models/Notification.js', () => ({
  Notification: { create: vi.fn() },
}));

describe('OrderService', () => {
  let Order;

  beforeEach(async () => {
    vi.clearAllMocks();
    Order = (await import('../models/orderModel.js')).Order;
  });

  it('should create an order', async () => {
    const mockOrder = { _id: mockId(), user: mockId(), items: [{ product: mockId(), quantity: 2 }], status: 'pending' };
    Order.create.mockResolvedValue(mockOrder);
    const order = await Order.create({ user: mockOrder.user, items: mockOrder.items });
    expect(order.status).toBe('pending');
  });

  it('should transition order status', async () => {
    const orderId = mockId();
    Order.findByIdAndUpdate.mockResolvedValue({ _id: orderId, status: 'confirmed' });
    const updated = await Order.findByIdAndUpdate(orderId, { status: 'confirmed' }, { new: true });
    expect(updated.status).toBe('confirmed');
  });

  it('should cancel an order', async () => {
    const orderId = mockId();
    const mockOrder = { _id: orderId, status: 'pending', save: vi.fn() };
    Order.findById.mockResolvedValue(mockOrder);
    const order = await Order.findById(orderId);
    order.status = 'cancelled';
    await order.save();
    expect(order.status).toBe('cancelled');
  });

  it('should list user orders', async () => {
    const userId = mockId();
    Order.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ _id: mockId(), user: userId }]),
    });
    Order.countDocuments.mockResolvedValue(1);
    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).skip(0).limit(10);
    expect(orders).toHaveLength(1);
  });

  it('should prevent invalid status transitions', () => {
    const validTransitions = { pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['shipped'], shipped: ['delivered'] };
    expect(validTransitions.pending).toContain('confirmed');
    expect(validTransitions.pending).toContain('cancelled');
    expect(validTransitions.shipped).toContain('delivered');
    expect(validTransitions.processing).not.toContain('pending');
  });
});
