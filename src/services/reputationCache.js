class ReputationCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttl = this.ttl) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  invalidate(key) {
    this.cache.delete(key);
    for (const k of this.cache.keys()) {
      if (k.startsWith(key)) {
        this.cache.delete(k);
      }
    }
  }

  invalidateVendor(vendorId) {
    this.invalidate(`vendor_reputation:${vendorId}`);
    this.invalidate(`vendor_badges:${vendorId}`);
    this.invalidate(`vendor_insights:${vendorId}`);
    this.invalidate(`ranking:vendor:${vendorId}`);
  }

  invalidateBuyer(userId) {
    this.invalidate(`buyer_reputation:${userId}`);
    this.invalidate(`buyer_insights:${userId}`);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const reputationCache = new ReputationCache();
