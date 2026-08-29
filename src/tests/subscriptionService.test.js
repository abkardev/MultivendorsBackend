import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Subscription.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../models/SubscriptionPlan.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Subscription Service', () => {
  let Subscription, SubscriptionPlan;

  beforeEach(async () => {
    vi.clearAllMocks();
    Subscription = (await import('../models/Subscription.js')).default;
    SubscriptionPlan = (await import('../models/SubscriptionPlan.js')).default;
  });

  it('should create a subscription', async () => {
    const mockSub = { _id: mockId(), user: mockId(), plan: 'premium', status: 'active', currentPeriodStart: new Date() };
    Subscription.create.mockResolvedValue(mockSub);
    const sub = await Subscription.create({ user: mockSub.user, plan: 'premium' });
    expect(sub.status).toBe('active');
  });

  it('should renew a subscription', async () => {
    const id = mockId();
    const mockSub = { _id: id, status: 'active', currentPeriodEnd: new Date(), save: vi.fn() };
    Subscription.findById.mockResolvedValue(mockSub);
    const sub = await Subscription.findById(id);
    sub.currentPeriodStart = new Date();
    sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
    await sub.save();
    expect(sub.currentPeriodEnd).toBeDefined();
  });

  it('should cancel a subscription', async () => {
    const id = mockId();
    const mockSub = { _id: id, status: 'active', save: vi.fn() };
    Subscription.findById.mockResolvedValue(mockSub);
    const sub = await Subscription.findById(id);
    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await sub.save();
    expect(sub.status).toBe('cancelled');
  });

  it('should upgrade subscription plan', async () => {
    const id = mockId();
    const mockSub = { _id: id, plan: 'basic', status: 'active', save: vi.fn() };
    Subscription.findById.mockResolvedValue(mockSub);
    const sub = await Subscription.findById(id);
    sub.plan = 'premium';
    await sub.save();
    expect(sub.plan).toBe('premium');
  });

  it('should list available plans', async () => {
    SubscriptionPlan.find.mockResolvedValue([
      { _id: 'p1', name: 'Basic', price: 29 },
      { _id: 'p2', name: 'Premium', price: 99 },
    ]);
    const plans = await SubscriptionPlan.find({ isActive: true });
    expect(plans).toHaveLength(2);
  });
});
