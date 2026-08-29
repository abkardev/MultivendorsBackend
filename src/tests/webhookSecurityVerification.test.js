import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

vi.mock('../models/webhookLogModel.js', () => ({
  default: { findOne: vi.fn(), create: vi.fn().mockResolvedValue({}) },
}));

const hmac = (secret, body) =>
  crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');

describe('Webhook security middleware', () => {
  let webhookSecurityModule;
  let WebhookLog;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.HYPERPAY_WEBHOOK_SECRET = 'hp-secret';
    process.env.MOYASAR_WEBHOOK_SECRET = 'moy-secret';
    webhookSecurityModule = await import('../middlewares/webhookSecurity.js');
    WebhookLog = (await import('../models/webhookLogModel.js')).default;
  });

  afterEach(() => {
    delete process.env.HYPERPAY_WEBHOOK_SECRET;
    delete process.env.MOYASAR_WEBHOOK_SECRET;
  });

  it('accepts a valid HyperPay signature', () => {
    const body = { id: 'test-123', amount: 100 };
    const req = { body, headers: { 'x-signature': hmac('hp-secret', body) } };
    expect(webhookSecurityModule.verifyHyperPayWebhook(req)).toBe(true);
  });

  it('rejects a tampered HyperPay signature', () => {
    const req = { body: { id: 'test-123' }, headers: { 'x-signature': hmac('hp-secret', { id: 'tampered' }) } };
    expect(() => webhookSecurityModule.verifyHyperPayWebhook(req)).toThrow('Invalid HyperPay signature');
  });

  it('rejects a HyperPay webhook with no signature', () => {
    const req = { body: {}, headers: {} };
    expect(() => webhookSecurityModule.verifyHyperPayWebhook(req)).toThrow('Missing HyperPay signature');
  });

  it('accepts a valid Moyasar signature', () => {
    const body = { type: 'payment_paid', id: 'moy-1' };
    const req = { body, headers: { 'x-moyasar-signature': hmac('moy-secret', body) } };
    expect(webhookSecurityModule.verifyMoyasarWebhook(req)).toBe(true);
  });

  it('rejects an invalid Moyasar signature', () => {
    const req = { body: { type: 'payment_paid' }, headers: { 'x-moyasar-signature': hmac('moy-secret', { type: 'x' }) } };
    expect(() => webhookSecurityModule.verifyMoyasarWebhook(req)).toThrow('Invalid Moyasar signature');
  });

  it('blocks duplicate (replayed) webhooks', async () => {
    WebhookLog.findOne.mockResolvedValue({ _id: 'exists' });
    await expect(webhookSecurityModule.checkReplay('evt_123')).rejects.toThrow(/Duplicate webhook/);
  });

  it('allows first occurrence of a webhook', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    expect(await webhookSecurityModule.checkReplay('evt_123')).toBe(true);
  });

  it('rejects webhooks older than the timestamp window', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    const oldTs = new Date(Date.now() - 3600 * 1000).toISOString();
    const mw = webhookSecurityModule.webhookSecurity('moyasar');
    const req = {
      body: { id: 'evt_old', created: oldTs },
      headers: { 'x-moyasar-signature': hmac('moy-secret', { id: 'evt_old', created: oldTs }) },
    };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
    expect(WebhookLog.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});