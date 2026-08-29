import { PaymentProvider } from '../PaymentProvider.js';

export class MoyasarProvider extends PaymentProvider {
  get name() { return 'moyasar'; }
  get supportedCurrencies() { return ['SAR', 'AED', 'USD']; }
  get supportedCountries() { return ['SA', 'AE']; }
  get supportedMethods() { return ['card', 'apple_pay', 'google_pay', 'stc_pay', 'sadad']; }

  async initialize(config) { this.config = config; }

  async _api(path, options = {}) {
    const auth = Buffer.from(this.config.apiKey + ':').toString('base64');
    const res = await fetch(`https://api.moyasar.com/v1${path}`, {
      ...options, headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', ...options.headers },
    });
    return res.json();
  }

  async createPayment(data) {
    const res = await this._api('/payments', {
      method: 'POST', body: JSON.stringify({
        amount: Math.round(data.amount * 100), currency: data.currency,
        description: data.description, source: { type: 'creditcard' },
        callback_url: data.returnUrl || data.successUrl,
      }),
    });
    return { id: res.id, status: res.status, sourceUrl: res.source?.transaction_url, provider: 'moyasar' };
  }

  async capturePayment(paymentId) { return { id: paymentId, status: 'captured' }; }

  async refundPayment(paymentId, amount, reason) {
    const res = await this._api(`/payments/${paymentId}/refund`, { method: 'POST' });
    return { id: paymentId, status: res.status, provider: 'moyasar' };
  }

  async getPaymentStatus(paymentId) {
    const res = await this._api(`/payments/${paymentId}`);
    return { id: res.id, status: res.status };
  }

  async processWebhook(payload) { return { type: payload?.type || 'unknown', data: payload }; }
  async createCheckoutSession(data) { return this.createPayment(data); }
  async createSubscription(data) { return { id: `sub_moy_${Date.now()}`, status: 'active', provider: 'moyasar' }; }
  async cancelSubscription(subscriptionId) { return { id: subscriptionId, status: 'cancelled' }; }
  async payout(data) { return { id: `payout_moy_${Date.now()}`, status: 'processing', provider: 'moyasar' }; }
  async validateWebhookSignature() { return true; }
  async getBalance() { return []; }

  async healthCheck() {
    try { await this._api('/payments'); return { healthy: true }; }
    catch (e) { return { healthy: false, error: e.message }; }
  }
}
