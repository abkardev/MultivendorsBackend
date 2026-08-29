import { createServer } from 'http';
import express from 'express';
import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../models/webhookLogModel.js', () => ({
  default: { findOne: vi.fn(), create: vi.fn().mockResolvedValue({ _id: 'log-1' }), updateOne: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../services/payment/PaymentOrchestrator.js', () => ({
  paymentOrchestrator: { processWebhook: vi.fn().mockResolvedValue({ type: 'payment_status', outcome: { handled: true } }) },
}));

const hmac = (secret, body) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex');

describe('POST /api/webhooks/moyasar/webhook — signature, replay, timestamp, state machine invocation', () => {
  let server;
  let url;
  let orchestrator;
  let WebhookLog;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.MOYASAR_WEBHOOK_SECRET = 'moy-webhook-secret';
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    const { default: webhookRouter } = await import('../routes/webhookRoutes.js');
    const app = express();
    app.use('/api/webhooks', webhookRouter);
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
    orchestrator = (await import('../services/payment/PaymentOrchestrator.js')).paymentOrchestrator;
    WebhookLog = (await import('../models/webhookLogModel.js')).default;
  });

  afterEach(async () => {
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    delete process.env.STRIPE_SECRET_KEY;
    await new Promise((resolve) => server.close(resolve));
  });

  it('accepts a correctly signed Moyasar payment webhook and forwards it to the state machine', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    WebhookLog.create.mockResolvedValue({ _id: 'log-1' });
    const payload = {
      id: 'evt_ok',
      type: 'payment_status',
      created: new Date().toISOString(),
      status: { id: 'moy-pay-1', status: 'paid', amount: 50000, currency: 'SAR' },
    };
    const body = JSON.stringify(payload);
    const res = await fetch(`${url}/api/webhooks/moyasar/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-moyasar-signature': hmac('moy-webhook-secret', body) },
      body,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.event).toBe('payment_status');
    expect(orchestrator.processWebhook).toHaveBeenCalledWith('moyasar', expect.any(Object), expect.any(Object));
    expect(WebhookLog.updateOne).toHaveBeenCalled();
  });

  it('rejects a webhook with an invalid signature (400)', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    const payload = { id: 'evt_bad', type: 'payment_status', status: { id: 'moy-pay-1', status: 'paid' } };
    const body = JSON.stringify(payload);
    const res = await fetch(`${url}/api/webhooks/moyasar/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-moyasar-signature': hmac('wrong-secret', body) },
      body,
    });
    expect(res.status).toBe(400);
    expect(orchestrator.processWebhook).not.toHaveBeenCalled();
  });

  it('rejects a replayed (duplicate) webhook', async () => {
    WebhookLog.findOne.mockResolvedValue({ _id: 'already' });
    const payload = { id: 'evt_replay', type: 'payment_status', status: { id: 'moy-pay-1', status: 'paid' } };
    const body = JSON.stringify(payload);
    const res = await fetch(`${url}/api/webhooks/moyasar/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-moyasar-signature': hmac('moy-webhook-secret', body) },
      body,
    });
    expect(res.status).toBe(400);
    expect(orchestrator.processWebhook).not.toHaveBeenCalled();
  });

  it('rejects an old webhook outside the timestamp window', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    const payload = {
      id: 'evt_old',
      type: 'payment_status',
      created: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: { id: 'moy-pay-1', status: 'paid' },
    };
    const body = JSON.stringify(payload);
    const res = await fetch(`${url}/api/webhooks/moyasar/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-moyasar-signature': hmac('moy-webhook-secret', body) },
      body,
    });
    expect(res.status).toBe(400);
    expect(orchestrator.processWebhook).not.toHaveBeenCalled();
  });

  it('rejects unknown providers before signature verification', async () => {
    WebhookLog.findOne.mockResolvedValue(null);
    const res = await fetch(`${url}/api/webhooks/nonexistent/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'x' }),
    });
    expect(res.status).toBe(400);
  });
});