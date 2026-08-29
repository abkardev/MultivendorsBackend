import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function clear() {
  for (const k of [
    'NODE_ENV', 'JWT_SECRET', 'MONGODB_URI', 'FRONTEND_URL',
    'STORAGE_PROVIDER', 'CF_ACCOUNT_ID', 'CF_R2_ACCESS_KEY_ID', 'CF_R2_SECRET_ACCESS_KEY', 'CF_R2_PUBLIC_URL',
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_ENABLED',
    'PAYMENT_MODE', 'MOYASAR_API_KEY', 'MOYASAR_WEBHOOK_SECRET',
    'HYPERPAY_ENTITY_ID', 'HYPERPAY_ACCESS_TOKEN', 'HYPERPAY_WEBHOOK_SECRET',
    'CF_TURNSTILE_SITE_KEY', 'CF_TURNSTILE_SECRET_KEY', 'REDIS_URL',
  ]) delete process.env[k];
}

function setFullProduction() {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'x'.repeat(64);
  process.env.MONGODB_URI = 'mongodb://localhost:27017/marketplace';
  process.env.FRONTEND_URL = 'https://yourdomain.com';
  process.env.CF_ACCOUNT_ID = 'acct';
  process.env.CF_R2_ACCESS_KEY_ID = 'ak';
  process.env.CF_R2_SECRET_ACCESS_KEY = 'sk';
  process.env.CF_R2_PUBLIC_URL = 'https://cdn.yourdomain.com';
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.PAYMENT_MODE = 'live';
  process.env.MOYASAR_API_KEY = 'sk_live_x';
  process.env.MOYASAR_WEBHOOK_SECRET = 'whsec-x';
  process.env.CF_TURNSTILE_SITE_KEY = '0x4AAAAAA';
  process.env.CF_TURNSTILE_SECRET_KEY = '0x4AAAAAA';
}

describe('productionConfigValidator', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clear();
  });

  afterEach(clear);

  it('is lenient outside production', async () => {
    process.env.NODE_ENV = 'development';
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.ok).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it('passes with a complete production configuration', async () => {
    setFullProduction();
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.ok).toBe(true);
    expect(r.missing).toHaveLength(0);
  });

  it('refuses to start without a payment provider', async () => {
    setFullProduction();
    delete process.env.MOYASAR_API_KEY;
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.ok).toBe(false);
    expect(r.missing.map(m => m.name)).toContain('MOYASAR_API_KEY|HYPERPAY_ENTITY_ID');
  });

  it('refuses PAYMENT_MODE=test in production', async () => {
    setFullProduction();
    process.env.PAYMENT_MODE = 'test';
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.missing.map(m => m.name)).toContain('PAYMENT_MODE');
  });

  it('skips SMTP requirement when explicitly disabled', async () => {
    setFullProduction();
    process.env.SMTP_ENABLED = 'false';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => w.includes('SMTP_ENABLED=false'))).toBe(true);
  });

  it('skips R2 requirements for a legacy storage provider', async () => {
    setFullProduction();
    process.env.STORAGE_PROVIDER = 'bunnycdn';
    for (const k of ['CF_ACCOUNT_ID', 'CF_R2_ACCESS_KEY_ID', 'CF_R2_SECRET_ACCESS_KEY', 'CF_R2_PUBLIC_URL']) delete process.env[k];
    const { validateProductionConfig } = await import('../utils/productionConfigValidator.js');
    const r = validateProductionConfig();
    expect(r.ok).toBe(true);
  });

  it('enforceProductionConfig exits when config is incomplete', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
    setFullProduction();
    delete process.env.MOYASAR_API_KEY;
    delete process.env.MOYASAR_WEBHOOK_SECRET;
    const { enforceProductionConfig } = await import('../utils/productionConfigValidator.js');
    enforceProductionConfig();
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});