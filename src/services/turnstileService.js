import { STORAGE_CONFIG } from '../config/storage.js';

class TurnstileService {
  constructor() {
    this.siteKey = STORAGE_CONFIG.cloudflare.turnstile.siteKey;
    this.secretKey = STORAGE_CONFIG.cloudflare.turnstile.secretKey;
    this.enabled = !!(this.siteKey && this.secretKey);
  }

  getSiteKey() {
    return this.siteKey;
  }

  isEnabled() {
    return this.enabled;
  }

  async verifyToken(token, ip) {
    if (!this.enabled) return { success: true, skipped: true };

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (ip) formData.append('remoteip', ip);

      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      return {
        success: data.success,
        error: data['error-codes']?.[0],
        hostname: data.hostname,
        action: data.action,
        cdata: data.cdata,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  createMiddleware() {
    return async (req, res, next) => {
      if (!this.enabled) return next();

      const token = req.body?.['cf-turnstile-response'] || req.headers['cf-turnstile-token'];
      if (!token) {
        return res.status(400).json({ status: false, message: 'Turnstile token required' });
      }

      const result = await this.verifyToken(token, req.ip);
      if (!result.success) {
        return res.status(403).json({ status: false, message: 'Security verification failed. Please try again.' });
      }

      next();
    };
  }
}

export const turnstileService = new TurnstileService();
export default turnstileService;
