import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/EventStore.js', () => ({
  EventStore: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/EventSubscription.js', () => ({
  EventSubscription: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/EventDeadLetter.js', () => ({
  EventDeadLetter: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

describe('Event Bus Service', () => {
  let eventBusService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/eventBusService.js');
    eventBusService = mod.eventBusService;
  });

  it('should publish an event', async () => {
    const { EventStore } = await import('../models/EventStore.js');
    EventStore.create.mockResolvedValue({ _id: 'evt1', eventType: 'order.created', source: 'internal', payload: { orderId: '123' }, status: 'published' });
    const event = await eventBusService.publishEvent('order.created', { orderId: '123' });
    expect(event.status).toBe('published');
  });

  it('should subscribe to events', async () => {
    const { EventSubscription } = await import('../models/EventSubscription.js');
    EventSubscription.create.mockResolvedValue({ _id: 'sub1', name: 'service_order_created', eventTypes: ['order.created'], consumer: 'service', status: 'active' });
    const sub = await eventBusService.subscribe('order.created', 'service', 'http://webhook.example.com');
    expect(sub.status).toBe('active');
  });

  it('should get event by id', async () => {
    const { EventStore } = await import('../models/EventStore.js');
    EventStore.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'evt1', eventType: 'order.created' }) });
    const event = await eventBusService.getEvent('evt1');
    expect(event.eventType).toBe('order.created');
  });

  it('should throw on non-existent event', async () => {
    const { EventStore } = await import('../models/EventStore.js');
    EventStore.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });
    await expect(eventBusService.getEvent('nonexistent')).rejects.toThrow('Event not found');
  });

  it('should unsubscribe from events', async () => {
    const { EventSubscription } = await import('../models/EventSubscription.js');
    const mockSub = { _id: 'sub1', name: 'test', status: 'active', save: vi.fn() };
    EventSubscription.findById.mockResolvedValue(mockSub);
    const result = await eventBusService.unsubscribe('user1', 'sub1');
    expect(result.success).toBe(true);
  });

  it('should replay an event', async () => {
    const { EventStore } = await import('../models/EventStore.js');
    const mockEvent = { _id: 'evt1', eventType: 'order.created', retryCount: 0, status: 'delivered', save: vi.fn() };
    EventStore.findById.mockResolvedValue(mockEvent);
    const event = await eventBusService.replayEvent('evt1');
    expect(event.status).toBe('published');
  });

  it('should get dead letter queue', async () => {
    const { EventDeadLetter } = await import('../models/EventDeadLetter.js');
    EventDeadLetter.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: 'dl1', status: 'pending' }]),
    });
    EventDeadLetter.countDocuments.mockResolvedValue(1);
    const dlq = await eventBusService.getDeadLetterQueue({ page: 1, limit: 50 });
    expect(dlq.items).toHaveLength(1);
  });

  it('should get subscriptions', async () => {
    const { EventSubscription } = await import('../models/EventSubscription.js');
    EventSubscription.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: 'sub1' }]) });
    const subs = await eventBusService.getSubscriptions();
    expect(subs).toHaveLength(1);
  });
});
