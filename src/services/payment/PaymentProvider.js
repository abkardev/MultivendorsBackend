/**
 * PaymentProvider — abstract interface for all payment gateway providers.
 * No business logic may reference any concrete provider.
 * Providers are interchangeable via this interface.
 */

export class PaymentProvider {
  get name() { throw new Error('Not implemented'); }
  get supportedCurrencies() { throw new Error('Not implemented'); }
  get supportedCountries() { throw new Error('Not implemented'); }
  get supportedMethods() { throw new Error('Not implemented'); }
  get isActive() { return true; }

  async initialize(config) { throw new Error('Not implemented'); }
  async createPayment(data) { throw new Error('Not implemented'); }
  async capturePayment(paymentId, amount) { throw new Error('Not implemented'); }
  async refundPayment(paymentId, amount, reason) { throw new Error('Not implemented'); }
  async getPaymentStatus(paymentId) { throw new Error('Not implemented'); }
  async processWebhook(payload, headers) { throw new Error('Not implemented'); }
  async createCheckoutSession(data) { throw new Error('Not implemented'); }
  async createSubscription(data) { throw new Error('Not implemented'); }
  async cancelSubscription(subscriptionId) { throw new Error('Not implemented'); }
  async payout(data) { throw new Error('Not implemented'); }
  async validateWebhookSignature(payload, signature) { throw new Error('Not implemented'); }
  async getBalance() { throw new Error('Not implemented'); }
  async healthCheck() { throw new Error('Not implemented'); }
}

export default PaymentProvider;
