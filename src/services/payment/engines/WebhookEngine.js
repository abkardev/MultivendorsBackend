import { WebhookEvent } from '../models/WebhookEvent.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';

export class WebhookEngine {
  async receive(provider, payload, headers) {
    const event = await WebhookEvent.create({
      provider, eventType: payload.type || headers['x-event-type'] || 'unknown',
      status: 'received', payload, headers, signature: headers['x-signature'] || headers['stripe-signature'] || '',
    });
    return event;
  }

  async process(eventId) {
    const event = await WebhookEvent.findById(eventId);
    if (!event || event.status !== 'received') throw new Error('Event not found or already processed');
    event.status = 'processing';
    event.processingAttempts += 1;
    await event.save();
    try {
      const result = await this._handleEvent(event);
      event.status = 'completed';
      event.processedAt = new Date();
      event.processedBy = 'webhook-engine';
      await event.save();
      return result;
    } catch (err) {
      event.status = event.processingAttempts >= event.maxAttempts ? 'failed' : 'received';
      event.lastError = err.message;
      await event.save();
      throw err;
    }
  }

  async _handleEvent(event) {
    const { provider, payload } = event;
    if (provider === 'stripe') {
      if (payload.type === 'payment_intent.succeeded') {
        await PaymentTransaction.findOneAndUpdate(
          { providerTransactionId: payload.data.object.id },
          { status: 'captured', capturedAt: new Date(), gatewayResponse: payload.data.object },
        );
      } else if (payload.type === 'payment_intent.payment_failed') {
        await PaymentTransaction.findOneAndUpdate(
          { providerTransactionId: payload.data.object.id },
          { status: 'failed', failureReason: payload.data.object.last_payment_error?.message, gatewayResponse: payload.data.object },
        );
      } else if (payload.type === 'charge.refunded') {
        await PaymentTransaction.findOneAndUpdate(
          { providerTransactionId: payload.data.object.payment_intent },
          { status: 'refunded', refundedAt: new Date(), gatewayResponse: payload.data.object },
        );
      }
    }
    if (provider === 'paypal') {
      if (event.eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        await PaymentTransaction.findOneAndUpdate(
          { providerTransactionId: payload.resource?.id },
          { status: 'captured', capturedAt: new Date(), gatewayResponse: payload },
        );
      } else if (event.eventType === 'PAYMENT.CAPTURE.DENIED') {
        await PaymentTransaction.findOneAndUpdate(
          { providerTransactionId: payload.resource?.id },
          { status: 'failed', failureReason: 'Payment denied', gatewayResponse: payload },
        );
      }
    }
    return { provider: event.provider, eventType: event.eventType, processed: true };
  }

  async listEvents(filter = {}) {
    return WebhookEvent.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  }

  async retryFailed(maxAttempts = 5) {
    const failed = await WebhookEvent.find({ status: 'failed', processingAttempts: { $lt: maxAttempts } }).limit(10);
    const results = [];
    for (const event of failed) {
      try { results.push(await this.process(event._id)); }
      catch { results.push({ eventId: event._id, error: 'Retry failed' }); }
    }
    return results;
  }
}

export const webhookEngine = new WebhookEngine();
