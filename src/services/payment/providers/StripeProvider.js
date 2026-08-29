import { PaymentProvider } from '../PaymentProvider.js';

export class StripeProvider extends PaymentProvider {
  get name() { return 'stripe'; }
  get supportedCurrencies() { return ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'TRY']; }
  get supportedCountries() { return ['SA', 'AE', 'US', 'GB', 'DE', 'FR', 'TR']; }
  get supportedMethods() { return ['card', 'apple_pay', 'google_pay']; }

  constructor() { super(); this.client = null; this.config = null; }

  async initialize(config) {
    this.config = config;
    const Stripe = (await import('stripe')).default;
    this.client = new Stripe(config.secretKey, { apiVersion: '2023-10-16' });
  }

  async createPayment(data) {
    const payment = await this.client.paymentIntents.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency.toLowerCase(),
      description: data.description,
      metadata: data.metadata || {},
      confirm: false,
    });
    return { id: payment.id, status: payment.status, clientSecret: payment.client_secret, provider: 'stripe' };
  }

  async capturePayment(paymentId, amount) {
    const capture = await this.client.paymentIntents.capture(paymentId, amount ? { amount_to_capture: Math.round(amount * 100) } : {});
    return { id: capture.id, status: capture.status };
  }

  async refundPayment(paymentId, amount, reason) {
    const refund = await this.client.refunds.create({
      payment_intent: paymentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: reason || undefined,
    });
    return { id: refund.id, status: refund.status, provider: 'stripe' };
  }

  async getPaymentStatus(paymentId) {
    const payment = await this.client.paymentIntents.retrieve(paymentId);
    return { id: payment.id, status: payment.status, amount: payment.amount / 100, currency: payment.currency };
  }

  async processWebhook(payload, headers) {
    const sig = headers['stripe-signature'];
    const event = this.client.webhooks.constructEvent(payload, sig, this.config.webhookSecret);
    return { type: event.type, data: event.data.object };
  }

  async createCheckoutSession(data) {
    const session = await this.client.checkout.sessions.create({
      mode: data.mode || 'payment',
      payment_method_types: ['card'],
      line_items: data.items.map(item => ({
        price_data: { currency: data.currency.toLowerCase(), product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
        quantity: item.quantity || 1,
      })),
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      metadata: data.metadata || {},
    });
    return { id: session.id, url: session.url, provider: 'stripe' };
  }

  async createSubscription(data) {
    const sub = await this.client.subscriptions.create({
      customer: data.customerId,
      items: [{ price: data.priceId }],
      metadata: data.metadata || {},
      trial_period_days: data.trialDays || 0,
    });
    return { id: sub.id, status: sub.status, provider: 'stripe' };
  }

  async cancelSubscription(subscriptionId) {
    const sub = await this.client.subscriptions.cancel(subscriptionId);
    return { id: sub.id, status: sub.status };
  }

  async payout(data) {
    const transfer = await this.client.transfers.create({
      amount: Math.round(data.amount * 100),
      currency: data.currency.toLowerCase(),
      destination: data.destination,
      description: data.description,
    });
    return { id: transfer.id, status: transfer.status, provider: 'stripe' };
  }

  async validateWebhookSignature(payload, signature) {
    try {
      this.client.webhooks.constructEvent(payload, signature, this.config.webhookSecret);
      return true;
    } catch { return false; }
  }

  async getBalance() {
    const balance = await this.client.balance.retrieve();
    return balance.available.map(b => ({ amount: b.amount / 100, currency: b.currency }));
  }

  async healthCheck() {
    try {
      await this.client.balance.retrieve();
      return { healthy: true, latency: 0 };
    } catch (e) { return { healthy: false, error: e.message }; }
  }
}
