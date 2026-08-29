import { PaymentProvider } from '../PaymentProvider.js';

export class BankTransferProvider extends PaymentProvider {
  get name() { return 'bank_transfer'; }
  get supportedCurrencies() { return ['SAR', 'USD', 'EUR', 'GBP', 'AED']; }
  get supportedCountries() { return ['SA', 'AE', 'US', 'GB', 'DE', 'FR']; }
  get supportedMethods() { return ['bank_transfer']; }

  async initialize(config) { this.config = config; }

  async createPayment(data) {
    return { id: `bt_${Date.now()}_${Math.random().toString(36).slice(2)}`, status: 'pending', provider: 'bank_transfer', reference: `BT-${Date.now()}` };
  }

  async capturePayment(paymentId) { return { id: paymentId, status: 'captured' }; }

  async refundPayment(paymentId, amount, reason) {
    return { id: `ref_bt_${Date.now()}`, status: 'pending', provider: 'bank_transfer' };
  }

  async getPaymentStatus(paymentId) { return { id: paymentId, status: 'pending' }; }

  async processWebhook() { return { type: 'unknown', data: {} }; }

  async createCheckoutSession(data) {
    return { id: `bt_${Date.now()}`, url: null, provider: 'bank_transfer', reference: `BT-${Date.now()}` };
  }

  async createSubscription(data) {
    return { id: `sub_bt_${Date.now()}`, status: 'active', provider: 'bank_transfer' };
  }

  async cancelSubscription(subscriptionId) { return { id: subscriptionId, status: 'cancelled' }; }

  async payout(data) {
    return { id: `payout_bt_${Date.now()}`, status: 'processing', provider: 'bank_transfer' };
  }

  async validateWebhookSignature() { return false; }

  async getBalance() { return [{ amount: 0, currency: this.config?.currency || 'SAR' }]; }

  async healthCheck() { return { healthy: true }; }
}
