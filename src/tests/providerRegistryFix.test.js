import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/payment/models/PaymentProviderModel.js', () => ({
  PaymentProviderConfig: { findOne: vi.fn(), find: vi.fn() },
}));

let providerRegistry;
let paymentConfig;

const q = (value) => ({ lean: vi.fn().mockResolvedValue(value) });

describe('ProviderRegistry — canonical provider field', () => {
  beforeEach(async () => {
    vi.resetModules();
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.MOYASAR_API_KEY;
    const reg = await import('../services/payment/ProviderRegistry.js');
    providerRegistry = reg.providerRegistry;
    paymentConfig = (await import('../services/payment/models/PaymentProviderModel.js')).PaymentProviderConfig;
  });

  afterEach(() => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.MOYASAR_API_KEY;
  });

  it('resolves config by canonical provider field', async () => {
    paymentConfig.findOne.mockReturnValue(q({ provider: 'moyasar', credentials: { apiKey: 'sk_test_x' } }));
    const cfg = await providerRegistry._findConfig('moyasar');
    expect(cfg.provider).toBe('moyasar');
    expect(paymentConfig.findOne).toHaveBeenCalledWith(expect.objectContaining({ provider: 'moyasar' }));
  });

  it('falls back to a legacy name-keyed record', async () => {
    paymentConfig.findOne
      .mockReturnValueOnce(q(null))
      .mockReturnValueOnce(q({ name: 'moyasar', credentials: { apiKey: 'sk_test_x' } }));
    const cfg = await providerRegistry._findConfig('moyasar');
    expect(cfg.name).toBe('moyasar');
  });

  it('uses env-driven config when no DB record exists', async () => {
    paymentConfig.findOne.mockReturnValue(q(null));
    process.env.PAYPAL_CLIENT_ID = 'test-client';
    process.env.PAYPAL_CLIENT_SECRET = 'test-secret';
    const cfg = await providerRegistry._findConfig('paypal');
    expect(cfg.credentials.clientId).toBe('test-client');
    expect(cfg.mode).toBe('sandbox');
  });

  it('throws with clear message when nothing is configured', async () => {
    paymentConfig.findOne.mockReturnValue(q(null));
    await expect(providerRegistry.getProvider('paytabs')).rejects.toThrow(/not configured or inactive/);
  });
});