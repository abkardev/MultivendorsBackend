import { EventStore } from '../models/EventStore.js';
import { EventSubscription } from '../models/EventSubscription.js';
import { EventDeadLetter } from '../models/EventDeadLetter.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class EventBusService {
  async publishEvent(eventType, payload, source = 'internal') {
    const event = await EventStore.create({
      eventType,
      source,
      producer: `service:${source}`,
      payload,
      status: 'published',
      publishedAt: new Date(),
    });
    await this.deliverEventToSubscribers(event._id).catch(() => {});
    return event;
  }

  async subscribe(eventType, consumer, endpoint, filters = {}) {
    const subscription = await EventSubscription.create({
      name: `${consumer}_${eventType}`,
      eventTypes: Array.isArray(eventType) ? eventType : [eventType],
      consumer,
      endpoint,
      protocol: endpoint.startsWith('http') ? 'webhook' : 'internal',
      filters,
      status: 'active',
    });
    await logAuditEvent({
      userId: subscription.createdBy, action: 'subscribe', category: 'event_bus',
      entityType: 'event_subscription', entityId: subscription._id,
      newValue: { eventType, consumer, endpoint },
      description: `Subscribed ${consumer} to ${eventType}`,
    });
    return subscription;
  }

  async getSubscriptions() {
    return EventSubscription.find().sort({ createdAt: -1 }).lean();
  }

  async updateSubscription(userId, id, data) {
    const sub = await EventSubscription.findById(id);
    if (!sub) throw new Error('Subscription not found');
    Object.assign(sub, data);
    await sub.save();
    await logAuditEvent({
      userId, action: 'update', category: 'event_bus',
      entityType: 'event_subscription', entityId: id,
      description: 'Updated event subscription',
    });
    return sub;
  }

  async unsubscribe(userId, id) {
    const sub = await EventSubscription.findById(id);
    if (!sub) throw new Error('Subscription not found');
    sub.status = 'disabled';
    await sub.save();
    await logAuditEvent({
      userId, action: 'unsubscribe', category: 'event_bus',
      entityType: 'event_subscription', entityId: id,
      description: `Disabled subscription: ${sub.name}`,
    });
    return { success: true };
  }

  async getEvents(filters = {}) {
    const { page = 1, limit = 50, eventType, status, source, startDate, endDate } = filters;
    const query = {};
    if (eventType) query.eventType = eventType;
    if (status) query.status = status;
    if (source) query.source = source;
    if (startDate || endDate) {
      query.publishedAt = {};
      if (startDate) query.publishedAt.$gte = new Date(startDate);
      if (endDate) query.publishedAt.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [events, total] = await Promise.all([
      EventStore.find(query).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
      EventStore.countDocuments(query),
    ]);
    return { events, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getEvent(id) {
    const event = await EventStore.findById(id).lean();
    if (!event) throw new Error('Event not found');
    return event;
  }

  async replayEvent(id) {
    const event = await EventStore.findById(id);
    if (!event) throw new Error('Event not found');
    event.retryCount += 1;
    event.status = 'published';
    event.publishedAt = new Date();
    await event.save();
    await this.deliverEventToSubscribers(event._id).catch(() => {});
    await logAuditEvent({
      userId: null, action: 'replay', category: 'event_bus',
      entityType: 'event_store', entityId: id,
      description: `Replayed event ${event.eventType}`,
    });
    return event;
  }

  async getDeadLetterQueue(filters = {}) {
    const { page = 1, limit = 50, status } = filters;
    const query = {};
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      EventDeadLetter.find(query)
        .populate('originalEvent')
        .populate('subscription')
        .sort({ lastAttemptAt: -1 }).skip(skip).limit(limit).lean(),
      EventDeadLetter.countDocuments(query),
    ]);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async retryDeadLetter(id) {
    const dlq = await EventDeadLetter.findById(id);
    if (!dlq) throw new Error('Dead letter entry not found');
    const event = await EventStore.findById(dlq.originalEvent);
    if (!event) throw new Error('Original event not found');
    event.retryCount += 1;
    event.status = 'published';
    event.publishedAt = new Date();
    await event.save();
    dlq.errorCount += 1;
    dlq.status = 'retrying';
    dlq.lastAttemptAt = new Date();
    await dlq.save();
    try {
      await this.deliverEventToSubscribers(event._id);
      dlq.status = 'archived';
      await dlq.save();
    } catch (err) {
      dlq.status = 'failed';
      dlq.error = err.message;
      await dlq.save();
      throw err;
    }
    await logAuditEvent({
      userId: null, action: 'retry_dead_letter', category: 'event_bus',
      entityType: 'event_dead_letter', entityId: id,
      description: `Retried dead letter for event ${event.eventType}`,
    });
    return dlq;
  }

  async getEventBusStats() {
    const [published, delivered, failed, byType, dlqCount] = await Promise.all([
      EventStore.countDocuments({ status: 'published' }),
      EventStore.countDocuments({ status: 'delivered' }),
      EventStore.countDocuments({ status: 'failed' }),
      EventStore.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 }, status: { $first: '$status' } } },
        { $sort: { count: -1 } },
      ]),
      EventDeadLetter.countDocuments({ status: { $ne: 'archived' } }),
    ]);
    const total = published + delivered + failed;
    return {
      totalEvents: total,
      published,
      delivered,
      failed,
      deadLetterCount: dlqCount,
      deliveryRate: total > 0 ? +((delivered / total) * 100).toFixed(2) : 0,
      failureRate: total > 0 ? +((failed / total) * 100).toFixed(2) : 0,
      byType,
    };
  }

  async deliverEventToSubscribers(eventId) {
    const event = await EventStore.findById(eventId);
    if (!event) throw new Error('Event not found');
    const subscriptions = await EventSubscription.find({
      eventTypes: event.eventType,
      status: 'active',
    });
    const results = [];
    for (const sub of subscriptions) {
      try {
        if (sub.filters) {
          const match = Object.entries(sub.filters).every(([key, value]) => {
            const payloadValue = key.split('.').reduce((obj, k) => obj?.[k], event.payload);
            return payloadValue === value;
          });
          if (!match) continue;
        }
        results.push({ subscription: sub.name, status: 'delivered' });
      } catch (err) {
        const dlq = await EventDeadLetter.create({
          originalEvent: eventId,
          subscription: sub._id,
          error: err.message,
          payload: event.payload,
          status: 'pending',
        });
        results.push({ subscription: sub.name, status: 'failed', deadLetterId: dlq._id, error: err.message });
      }
    }
    const hasFailures = results.some(r => r.status === 'failed');
    event.status = hasFailures ? 'failed' : 'delivered';
    event.deliveredAt = new Date();
    await event.save();
    return { eventId, results, status: event.status };
  }

  async cleanupOldEvents(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const expired = await EventStore.find({
      publishedAt: { $lt: cutoff },
      status: { $in: ['delivered', 'failed', 'expired'] },
    });
    const ids = expired.map(e => e._id);
    await EventStore.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'expired' } },
    );
    const deadLetters = await EventDeadLetter.find({
      createdAt: { $lt: cutoff },
      status: 'archived',
    });
    const dlIds = deadLetters.map(d => d._id);
    if (dlIds.length > 0) {
      await EventDeadLetter.updateMany(
        { _id: { $in: dlIds } },
        { $set: { status: 'archived' } },
      );
    }
    await logAuditEvent({
      userId: null, action: 'cleanup', category: 'event_bus',
      entityType: 'event_store',
      description: `Cleaned up events older than ${days} days`,
      newValue: { eventsExpired: ids.length, deadLettersArchived: dlIds.length, cutoff },
    });
    return { eventsExpired: ids.length, deadLettersArchived: dlIds.length, cutoff };
  }
}

export const eventBusService = new EventBusService();
