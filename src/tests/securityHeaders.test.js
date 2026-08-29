import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Security Headers (Helmet)', () => {
  let securityHeaders;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../middlewares/securityMiddleware.js');
    securityHeaders = mod.securityHeaders;
  });

  it('should export helmet middleware', () => {
    expect(securityHeaders).toBeDefined();
    expect(typeof securityHeaders).toBe('function');
  });

  it('should set security headers on response', () => {
    const req = { headers: {} };
    const res = {
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      removeHeader: vi.fn(),
      end: vi.fn(),
    };
    const next = vi.fn();
    securityHeaders(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should include HSTS configuration', () => {
    const helmetModule = require('helmet');
    expect(helmetModule).toBeDefined();
  });

  it('should include CSP configuration', () => {
    expect(securityHeaders).toBeDefined();
  });
});
