import { STORAGE_CONFIG } from '../../config/storage.js';
import { CloudflareR2Provider } from './CloudflareR2Provider.js';

class StorageProviderRegistry {
  constructor() {
    this.providers = new Map();
    this._default = null;
  }

  register(name, provider) {
    this.providers.set(name, provider);
  }

  get(name) {
    return this.providers.get(name);
  }

  getDefault() {
    if (!this._default) {
      throw new Error('No default storage provider configured');
    }
    return this._default;
  }

  initialize() {
    const r2Provider = new CloudflareR2Provider();
    this.register('cloudflare_r2', r2Provider);

    const defaultName = STORAGE_CONFIG.provider || 'cloudflare_r2';
    this._default = this.providers.get(defaultName);
    if (!this._default) {
      throw new Error(`Configured storage provider "${defaultName}" not registered`);
    }

    console.log(`[Storage] Default provider: ${this._default.name}`);
    return this._default;
  }
}

export const storageRegistry = new StorageProviderRegistry();
export default storageRegistry;
