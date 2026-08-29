import { PaymentProvider } from '../PaymentProvider.js';

export class PayPalProvider extends PaymentProvider {
  get name() { return 'paypal'; }
  get supportedCurrencies() { return ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SAR']; }
  get supportedCountries() { return ['US', 'GB', 'DE', 'FR', 'AU', 'CA', 'SA']; }
  get supportedMethods() { return ['paypal', 'card', 'paypal_credit']; }

  constructor() { super(); this.accessToken = null; this.config = null; }

  async _getAccessToken() {
    const auth = Buffer.from(`${this.config.clientId}:${this.config.secretKey}`).toString('base64');
    const res = await fetch(`${this.config.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'}/v1/oauth2/token`, {
      method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    this.accessToken = data.access_token;
    return data.access_token;
  }

  async initialize(config) { this.config = config; }

  async _api(path, options = {}) {
    if (!this.accessToken) await this._getAccessToken();
    const base = this.config.mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const res = await fetch(`${base}${path}`, {
      ...options, headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json', ...options.headers },
    });
    if (res.status === 401) { this.accessToken = null; return this._api(path, options); }
    return res.json();
  }

  async createPayment(data) {
    const order = await this._api('/v2/checkout/orders', {
      method: 'POST', body: JSON.stringify({
        intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: data.currency, value: data.amount.toFixed(2) }, description: data.description }],
      }),
    });
    return { id: order.id, status: order.status, provider: 'paypal' };
  }

  async capturePayment(paymentId) {
    const capture = await this._api(`/v2/checkout/orders/${paymentId}/capture`, { method: 'POST' });
    return { id: paymentId, status: capture.status };
  }

  async refundPayment(paymentId, amount, reason) {
    const refund = await this._api(`/v2/payments/captures/${paymentId}/refund`, {
      method: 'POST', body: JSON.stringify({ amount: { value: amount.toFixed(2), currency_code: 'USD' } }),
    });
    return { id: refund.id, status: refund.status, provider: 'paypal' };
  }

  async getPaymentStatus(paymentId) {
    const order = await this._api(`/v2/checkout/orders/${paymentId}`);
    return { id: order.id, status: order.status };
  }

  async processWebhook(payload, headers) { return { type: headers['paypal-event-type'] || 'unknown', data: payload }; }

  async createCheckoutSession(data) {
    const order = await this._api('/v2/checkout/orders', {
      method: 'POST', body: JSON.stringify({
        intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: data.currency, value: data.amount.toFixed(2) } }],
        application_context: { return_url: data.successUrl, cancel_url: data.cancelUrl },
      }),
    });
    const link = order.links?.find(l => l.rel === 'approve');
    return { id: order.id, url: link?.href, provider: 'paypal' };
  }

  async createSubscription(data) {
    const sub = await this._api('/v1/billing/subscriptions', {
      method: 'POST', body: JSON.stringify({ plan_id: data.priceId, subscriber: { email_address: data.customerEmail } }),
    });
    return { id: sub.id, status: sub.status, provider: 'paypal' };
  }

  async cancelSubscription(subscriptionId) {
    await this._api(`/v1/billing/subscriptions/${subscriptionId}/cancel`, { method: 'POST' });
    return { id: subscriptionId, status: 'CANCELLED' };
  }

  async payout(data) {
    const payout = await this._api('/v1/payments/payouts', {
      method: 'POST', body: JSON.stringify({
        sender_batch_header: { sender_batch_id: `payout_${Date.now()}`, email_subject: 'Payout from Marketplace' },
        items: [{ recipient_type: 'EMAIL', amount: { value: data.amount.toFixed(2), currency: data.currency }, receiver: data.destination, note: data.description }],
      }),
    });
    return { id: payout.batch_header?.payout_batch_id, status: payout.batch_header?.batch_status, provider: 'paypal' };
  }

  async validateWebhookSignature(payload, headers) { return true; }

  async getBalance() {
    const bal = await this._api('/v1/reporting/balances');
    return (bal.balances || []).map(b => ({ amount: parseFloat(b.total_balance?.value || 0), currency: b.total_balance?.currency_code }));
  }

  async healthCheck() {
    try { await this._getAccessToken(); return { healthy: true }; }
    catch (e) { return { healthy: false, error: e.message }; }
  }
}
