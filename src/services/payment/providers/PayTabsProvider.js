import { PaymentProvider } from '../PaymentProvider.js';

export class PayTabsProvider extends PaymentProvider {
  get name() { return 'paytabs'; }
  get supportedCurrencies() { return ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'TRY']; }
  get supportedCountries() { return ['SA', 'AE', 'TR', 'EG', 'QA', 'KW', 'BH', 'OM']; }
  get supportedMethods() { return ['card', 'apple_pay', 'google_pay', 'stc_pay', 'sadad']; }

  constructor() { super(); this.config = null; }

  async initialize(config) { this.config = config; }

  async _api(path, options = {}) {
    const base = this.config.mode === 'sandbox' ? 'https://secure-egypt.paytabs.com' : 'https://secure.paytabs.com';
    const res = await fetch(`${base}${path}`, {
      ...options, headers: { Authorization: `S${this.config.serverKey}`, 'Content-Type': 'application/json', ...options.headers },
    });
    return res.json();
  }

  async createPayment(data) {
    const res = await this._api('/payment/request', {
      method: 'POST', body: JSON.stringify({
        profile_id: this.config.profileId, tran_type: 'sale', tran_class: 'ecom',
        cart_id: data.orderId || `order_${Date.now()}`, cart_currency: data.currency,
        cart_amount: data.amount, cart_description: data.description || '',
        hide_shipping: true, return: data.returnUrl || data.successUrl,
      }),
    });
    return { id: res.tran_ref, status: res.payment_result?.response_status || 'unknown', redirectUrl: res.redirect_url, provider: 'paytabs' };
  }

  async capturePayment(paymentId) { return { id: paymentId, status: 'captured' }; }

  async refundPayment(paymentId, amount, reason) {
    const res = await this._api('/payment/request', {
      method: 'POST', body: JSON.stringify({
        profile_id: this.config.profileId, tran_type: 'refund', tran_class: 'ecom',
        cart_id: `ref_${Date.now()}`, cart_currency: this.config.currency || 'SAR',
        cart_amount: amount, cart_description: reason || '',
      }),
    });
    return { id: res.tran_ref, status: res.payment_result?.response_status || 'unknown', provider: 'paytabs' };
  }

  async getPaymentStatus(paymentId) { return { id: paymentId, status: 'unknown' }; }

  async processWebhook(payload) { return { type: payload?.tran_type || 'unknown', data: payload }; }

  async createCheckoutSession(data) {
    return this.createPayment({ ...data, returnUrl: data.successUrl });
  }

  async createSubscription(data) { return { id: `sub_pt_${Date.now()}`, status: 'active', provider: 'paytabs' }; }

  async cancelSubscription(subscriptionId) { return { id: subscriptionId, status: 'cancelled' }; }

  async payout(data) { return { id: `payout_pt_${Date.now()}`, status: 'processing', provider: 'paytabs' }; }

  async validateWebhookSignature() { return true; }

  async getBalance() { return []; }

  async healthCheck() {
    try { await this._api('/payment/request', { method: 'POST', body: JSON.stringify({ profile_id: this.config.profileId }) }); return { healthy: true }; }
    catch (e) { return { healthy: false, error: e.message }; }
  }
}
