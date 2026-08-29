import { providerRegistry } from './ProviderRegistry.js';
import { handleVerifiedWebhook } from './paymentWebhookHandler.js';

class PaymentOrchestrator {
  async _selectProvider(buyerCountry, vendorCountry, currency, amount, method) {
    const avail = providerRegistry.getAvailableProviders();
    const candidates = [];
    for (const name of avail) {
      let provider;
      try { provider = await providerRegistry.getProvider(name); } catch { continue; }
      const curOk = provider.supportedCurrencies.includes(currency);
      if (!curOk) continue;
      const methodOk = provider.supportedMethods.includes(method);
      if (!methodOk) continue;
      const countryOk = provider.supportedCountries.includes(vendorCountry) || provider.supportedCountries.includes(buyerCountry);
      if (!countryOk) continue;
      const hc = await provider.healthCheck();
      if (!hc.healthy) continue;
      candidates.push({ name, provider, priority: this._priorityOrder(name) });
    }
    if (candidates.length === 0) throw new Error('No available payment provider for this transaction');
    const ordered = candidates.sort((a, b) => a.priority - b.priority);
    const best = ordered[0];
    return best;
  }

  _priorityOrder(name) {
    const map = { stripe: 1, adyen: 2, paypal: 2, hyperpay: 3, paytabs: 3, moyasar: 3, bank_transfer: 5 };
    return map[name] || 9;
  }

  async createPayment(data) {
    const { buyerCountry, vendorCountry, currency, amount, method = 'card' } = data;
    if (data.provider) {
      const provider = await providerRegistry.getProvider(data.provider);
      return provider.createPayment(data);
    }
    const selected = await this._selectProvider(buyerCountry, vendorCountry, currency, amount, method);
    return selected.provider.createPayment(data);
  }

  async capturePayment(paymentId, amount, providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.capturePayment(paymentId, amount);
  }

  async refundPayment(paymentId, amount, reason, providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.refundPayment(paymentId, amount, reason);
  }

  async getPaymentStatus(paymentId, providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.getPaymentStatus(paymentId);
  }

  async processWebhook(providerName, payload, headers) {
    const provider = await providerRegistry.getProvider(providerName);
    const event = await provider.processWebhook(payload, headers);
    // Signature verification already succeeded in webhookSecurity middleware.
    // Apply the verified event to payment/escrow/order state (idempotent).
    const outcome = await handleVerifiedWebhook({ provider: providerName, type: event?.type, payload });
    return { ...event, outcome };
  }

  async createCheckoutSession(data) {
    const { buyerCountry, vendorCountry, currency, amount, method = 'card' } = data;
    if (data.provider) {
      const provider = await providerRegistry.getProvider(data.provider);
      return provider.createCheckoutSession(data);
    }
    const selected = await this._selectProvider(buyerCountry, vendorCountry, currency, amount, method);
    return selected.provider.createCheckoutSession(data);
  }

  async createSubscription(data) {
    const providerName = data.provider || 'stripe';
    const provider = await providerRegistry.getProvider(providerName);
    return provider.createSubscription(data);
  }

  async cancelSubscription(subscriptionId, providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.cancelSubscription(subscriptionId);
  }

  async payout(data) {
    const providerName = data.provider || 'bank_transfer';
    const provider = await providerRegistry.getProvider(providerName);
    return provider.payout(data);
  }

  async getBalance(providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.getBalance();
  }

  async healthCheck(providerName) {
    const provider = await providerRegistry.getProvider(providerName);
    return provider.healthCheck();
  }
}

export const paymentOrchestrator = new PaymentOrchestrator();
