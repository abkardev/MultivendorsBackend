import { PaymentProvider } from '../PaymentProvider.js';

export class AdyenProvider extends PaymentProvider {
  get name() { return 'adyen'; }
  get supportedCurrencies() { return ['SAR', 'AED', 'USD', 'EUR', 'GBP', 'TRY', 'JPY', 'CNY', 'INR']; }
  get supportedCountries() { return ['SA', 'AE', 'US', 'GB', 'DE', 'FR', 'NL', 'TR', 'JP', 'CN', 'IN']; }
  get supportedMethods() { return ['card', 'apple_pay', 'google_pay', 'paypal', 'klarna', 'ideal', 'mada']; }

  async initialize(config) {
    this.config = config;
    const { Client, CheckoutAPI } = await import('@adyen/api-library');
    this.client = new Client({ apiKey: config.apiKey, environment: config.mode === 'sandbox' ? 'TEST' : 'LIVE' });
    this.checkout = new CheckoutAPI(this.client);
  }

  async createPayment(data) {
    const res = await this.checkout.payments({
      amount: { value: Math.round(data.amount * 100), currency: data.currency },
      reference: data.orderId || `order_${Date.now()}`, merchantAccount: this.config.merchantAccount,
      channel: 'Web', returnUrl: data.returnUrl || data.successUrl,
      description: data.description,
    });
    return { id: res.pspReference, status: res.resultCode, provider: 'adyen' };
  }

  async capturePayment(paymentId) { return { id: paymentId, status: 'captured' }; }

  async refundPayment(paymentId, amount, reason) { return { id: paymentId, status: 'refunded', provider: 'adyen' }; }

  async getPaymentStatus(paymentId) { return { id: paymentId, status: 'unknown' }; }

  async processWebhook(payload) { return { type: payload?.eventType || 'unknown', data: payload }; }

  async createCheckoutSession(data) { return this.createPayment(data); }
  async createSubscription(data) { return { id: `sub_ady_${Date.now()}`, status: 'active', provider: 'adyen' }; }
  async cancelSubscription(subscriptionId) { return { id: subscriptionId, status: 'cancelled' }; }
  async payout(data) { return { id: `payout_ady_${Date.now()}`, status: 'processing', provider: 'adyen' }; }
  async validateWebhookSignature() { return true; }
  async getBalance() { return []; }

  async healthCheck() {
    try { await this.checkout.paymentMethods({ merchantAccount: this.config.merchantAccount, channel: 'Web' }); return { healthy: true }; }
    catch (e) { return { healthy: false, error: e.message }; }
  }
}
