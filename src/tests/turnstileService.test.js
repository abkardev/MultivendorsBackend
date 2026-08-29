import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Turnstile service — server-side token verification', () => {
  let service;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.CF_TURNSTILE_SITE_KEY = '0x4AAAAAAA_test_site';
    process.env.CF_TURNSTILE_SECRET_KEY = '0x4AAAAAAA_test_secret';
    const mod = await import('../services/turnstileService.js');
    service = mod.turnstileService;
  });

  afterEach(() => {
    delete process.env.CF_TURNSTILE_SITE_KEY;
    delete process.env.CF_TURNSTILE_SECRET_KEY;
    vi.unstubAllGlobals();
  });

  it('passes through when no keys are configured (dev/disabled)', async () => {
    delete process.env.CF_TURNSTILE_SITE_KEY;
    delete process.env.CF_TURNSTILE_SECRET_KEY;
    vi.resetModules();
    const mod = await import('../services/turnstileService.js');
    const svc = mod.turnstileService;
    expect(svc.isEnabled()).toBe(false);
    expect(await svc.verifyToken('anything')).toEqual({ success: true, skipped: true });
  });

  it('rejects a missing token with 400', async () => {
    const mw = service.createMiddleware();
    const req = { body: {}, headers: {}, ip: '1.2.3.4' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token verified by the Cloudflare API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ success: true, hostname: 'example.com', 'error-codes': [] }),
    }));
    const result = await service.verifyToken('token-ok', '1.2.3.4');
    expect(result.success).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }));
    const result = await service.verifyToken('bad-token');
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid-input-response');
  });

  it('rejects an expired token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['timeout-or-duplicate'] }),
    }));
    const result = await service.verifyToken('expired-token');
    expect(result.success).toBe(false);
  });

  it('rejects malformed tokens without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }));
    const result = await service.verifyToken(undefined);
    expect(result.success).toBe(false);
  });

  it('fails closed when the Cloudflare API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const result = await service.verifyToken('tok');
    expect(result.success).toBe(false);
    expect(result.error).toBe('network down');
  });

  it('blocks with 403 when verification fails (never trusts frontend only)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    }));
    const mw = service.createMiddleware();
    const req = { body: { 'cf-turnstile-response': 'bad' }, headers: {}, ip: '1.2.3.4' };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});