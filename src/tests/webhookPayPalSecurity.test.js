import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../models/webhookLogModel.js', () => ({
  default: { findOne: vi.fn(), create: vi.fn().mockResolvedValue({}) },
}));

const ppHeaders = {
  'paypal-transmission-id': 'tx-1',
  'paypal-transmission-time': new Date().toISOString(),
  'paypal-transmission-sig': 'sig-abc',
  'paypal-cert-url': 'https://api-m.paypal.com/cert',
  'paypal-auth-algo': 'SHA256withRSA',
};

describe('PayPal webhook security (fail-closed)', () => {
  let webhookSecurityModule;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.PAYPAL_API_URL = 'https://api-m.sandbox.paypal.com';
    process.env.PAYPAL_CLIENT_ID = 'client-id';
    process.env.PAYPAL_CLIENT_SECRET = 'client-secret';
    webhookSecurityModule = await import('../middlewares/webhookSecurity.js');
  });

  afterEach(() => {
    delete process.env.PAYPAL_ENABLED;
    delete process.env.PAYPAL_API_URL;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_WEBHOOK_ID;
    vi.unstubAllGlobals();
  });

  it('rejects webhooks when PayPal is not enabled', async () => {
    const req = { body: { id: 'evt-1' }, headers: ppHeaders };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'PayPal webhooks are disabled'
    );
  });

  it('rejects webhooks when configured headers are missing', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    process.env.PAYPAL_WEBHOOK_ID = 'webhook-1';
    const req = { body: { id: 'evt-1' }, headers: {} };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'Missing PayPal webhook headers'
    );
  });

  it('rejects stale transmission timestamps', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    process.env.PAYPAL_WEBHOOK_ID = 'webhook-1';
    const stale = {
      ...ppHeaders,
      'paypal-transmission-time': new Date(Date.now() - 3600 * 1000).toISOString(),
    };
    const req = { body: { id: 'evt-1' }, headers: stale };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'out of window'
    );
  });

  it('accepts a webhook PayPal reports as SUCCESS', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    process.env.PAYPAL_WEBHOOK_ID = 'webhook-1';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'SUCCESS' }),
      }));
    const req = { body: { id: 'evt-1', event_type: 'PAYMENT.CAPTURE.COMPLETED' }, headers: ppHeaders };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).resolves.toBe(true);
  });

  it('rejects a webhook PayPal reports as FAILURE', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    process.env.PAYPAL_WEBHOOK_ID = 'webhook-1';
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'tok' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ verification_status: 'FAILURE' }),
      }));
    const req = { body: { id: 'evt-1' }, headers: ppHeaders };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'verification failed'
    );
  });

  it('rejects webhooks when the token request fails', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    process.env.PAYPAL_WEBHOOK_ID = 'webhook-1';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false, status: 401 }));
    const req = { body: { id: 'evt-1' }, headers: ppHeaders };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'token request failed'
    );
  });

  it('rejects webhooks when config is incomplete', async () => {
    process.env.PAYPAL_ENABLED = 'true';
    delete process.env.PAYPAL_CLIENT_ID;
    const req = { body: { id: 'evt-1' }, headers: ppHeaders };
    await expect(webhookSecurityModule.verifyPayPalWebhook(req, 'webhook-1')).rejects.toThrow(
      'PayPal webhooks are disabled'
    );
  });
});