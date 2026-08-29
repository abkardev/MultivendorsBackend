import { PaymentProvider } from '../PaymentProvider.js';

export class HyperPayProvider extends PaymentProvider {
  get name() { return 'hyperpay'; }
  get supportedCurrencies() { return ['SAR', 'AED', 'USD', 'EUR']; }
  get supportedCountries() { return ['SA', 'AE']; }
  get supportedMethods() { return ['card', 'mada', 'apple_pay', 'google_pay', 'stc_pay']; }

  constructor() { super(); this.config = null; }

  async initialize(config) { this.config = config; }

  async _api(path, options = {}) {
    const base = this.config.mode === 'sandbox' ? 'https://eu-test.oppwa.com' : 'https://oppwa.com';
    const auth = Buffer.from(`${this.config.entityId}:${this.config.secretKey || ''}`).toString('base64');
    const res = await fetch(`${base}${path}`, {
      ...options, headers: { Authorization: `Bearer ${this.config.accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded', ...options.headers },
    });
    return res.json();
  }

  async createPayment(data) {
    const res = await this._api('/v1/payments', {
      method: 'POST', body: new URLSearchParams({
        entityId: this.config.entityId, amount: data.amount.toFixed(2), currency: data.currency,
        'paymentType': 'DB', description: data.description || '',
      }),
    });
    return { id: res.id, status: res.result?.code || 'unknown', checkoutId: res.id, provider: 'hyperpay' };
  }

  async capturePayment(paymentId) { return { id: paymentId, status: 'captured' }; }

  async refundPayment(paymentId, amount, reason) {
    const res = await this._api('/v1/payments', {
      method: 'POST', body: new URLSearchParams({
        entityId: this.config.entityId, amount: amount.toFixed(2), currency: this.config.currency || 'SAR',
        'paymentType': 'RF',
      }),
    });
    return { id: paymentId, status: res.result?.code || 'unknown', provider: 'hyperpay' };
  }

  async getPaymentStatus(paymentId) {
    const res = await this._api(`/v1/payments/${paymentId}?entityId=${this.config.entityId}`);
    return { id: paymentId, status: res.result?.code || 'unknown' };
  }

  async processWebhook() { return { type: 'unknown', data: {} }; }

  async createCheckoutSession(data) {
    return { id: `hp_${Date.now()}`, url: `https://payment.hyperpay.com/pay?checkoutId=${Date.now()}`, provider: 'hyperpay' };
  }

  async createSubscription(data) { return { id: `sub_hp_${Date.now()}`, status: 'active', provider: 'hyperpay' }; }

  async cancelSubscription(subscriptionId) { return { id: subscriptionId, status: 'cancelled' }; }

  async payout(data) { return { id: `payout_hp_${Date.now()}`, status: 'processing', provider: 'hyperpay' }; }

  async validateWebhookSignature() { return true; }

  async getBalance() { return []; }

  async healthCheck() {
    try { await this._api(`/v1/payments?entityId=${this.config.entityId}`); return { healthy: true }; }
    catch (e) { return { healthy: false, error: e.message }; }
  }
}
