import { StripeProvider } from './providers/StripeProvider.js';
import { PayPalProvider } from './providers/PayPalProvider.js';
import { BankTransferProvider } from './providers/BankTransferProvider.js';
import { HyperPayProvider } from './providers/HyperPayProvider.js';
import { PayTabsProvider } from './providers/PayTabsProvider.js';
import { AdyenProvider } from './providers/AdyenProvider.js';
import { MoyasarProvider } from './providers/MoyasarProvider.js';
import { PaymentProviderConfig } from './models/PaymentProviderModel.js';

const PROVIDER_MAP = {
  stripe: StripeProvider,
  paypal: PayPalProvider,
  bank_transfer: BankTransferProvider,
  hyperpay: HyperPayProvider,
  paytabs: PayTabsProvider,
  adyen: AdyenProvider,
  moyasar: MoyasarProvider,
};

const legacyFieldName = (cfg) => cfg.provider || cfg.name;

// Env-driven configuration allows providers to be activated without a DB record
// (e.g. containerised deployments). DB config always wins when present.
const envConfigProvider = {
  moyasar: () => {
    const apiKey = process.env.MOYASAR_API_KEY;
    if (!apiKey) return null;
    return {
      provider: 'moyasar',
      credentials: { apiKey },
      mode: process.env.MOYASAR_MODE || 'sandbox',
      webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET,
    };
  },
  hyperpay: () => {
    const entityId = process.env.HYPERPAY_ENTITY_ID;
    const accessToken = process.env.HYPERPAY_ACCESS_TOKEN;
    if (!entityId || !accessToken) return null;
    return {
      provider: 'hyperpay',
      credentials: {
        entityId,
        accessToken,
        secretKey: process.env.HYPERPAY_SECRET_KEY || '',
        mode: process.env.HYPERPAY_MODE || 'sandbox',
      },
      webhookSecret: process.env.HYPERPAY_WEBHOOK_SECRET,
    };
  },
  paytabs: () => {
    const serverKey = process.env.PAYTABS_SERVER_KEY;
    const profileId = process.env.PAYTABS_PROFILE_ID;
    if (!serverKey || !profileId) return null;
    return {
      provider: 'paytabs',
      credentials: { serverKey, profileId },
      mode: process.env.PAYTABS_MODE || 'sandbox',
      webhookSecret: serverKey,
    };
  },
  paypal: () => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      provider: 'paypal',
      credentials: { clientId, clientSecret, sandbox: process.env.PAYPAL_MODE !== 'production' },
      mode: process.env.PAYPAL_MODE || 'sandbox',
    };
  },
};

class ProviderRegistry {
  constructor() {
    this._instances = new Map();
  }

  _envConfig(name) {
    const build = envConfigProvider[name];
    return build ? build() : null;
  }

  async _findConfig(name) {
    // Canonical field is `provider`. If a legacy record used `name`, treat it
    // as equivalent so the registry keeps working until the migration runs.
    const doc = await PaymentProviderConfig.findOne({
      provider: name, isActive: true,
    }).lean();
    if (doc) return doc;
    const legacy = await PaymentProviderConfig.findOne({
      name: name, isActive: true,
    }).lean();
    if (legacy) return legacy;
    return this._envConfig(name);
  }

  async getProvider(name) {
    if (this._instances.has(name)) return this._instances.get(name);
    const ProviderClass = PROVIDER_MAP[name];
    if (!ProviderClass) throw new Error(`Unknown payment provider: ${name}`);
    const dbConfig = await this._findConfig(name);
    if (!dbConfig) throw new Error(`Payment provider "${name}" not configured or inactive`);
    const provider = new ProviderClass();
    await provider.initialize(dbConfig.credentials || dbConfig.settings);
    const initialised = provider;
    this._instances.set(name, initialised);
    return initialised;
  }

  async loadAllActive() {
    const configs = await PaymentProviderConfig.find({ isActive: true }).lean();
    for (const cfg of configs) {
      const key = legacyFieldName(cfg);
      const ProviderClass = PROVIDER_MAP[key];
      if (!ProviderClass) continue;
      const provider = new ProviderClass();
      try {
        await provider.initialize(cfg.credentials || cfg.settings);
        this._instances.set(key, provider);
      } catch (err) {
        console.warn(`[ProviderRegistry] Failed to init ${key}: ${err.message}`);
      }
    }
    return [...this._instances.keys()];
  }

  async refreshProvider(name) {
    this._instances.delete(name);
    return this.getProvider(name);
  }

  getAvailableProviders() {
    return Object.keys(PROVIDER_MAP);
  }

  clearCache() { this._instances.clear(); }
}

export const providerRegistry = new ProviderRegistry();
