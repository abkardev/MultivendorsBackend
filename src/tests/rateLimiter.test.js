import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Rate Limiters', () => {
  let rateLimiters;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../middlewares/securityMiddleware.js');
    rateLimiters = mod;
  });

  it('should export globalRateLimit middleware', () => {
    expect(rateLimiters.globalRateLimit).toBeDefined();
    expect(typeof rateLimiters.globalRateLimit).toBe('function');
  });

  it('should export authRateLimit middleware', () => {
    expect(rateLimiters.authRateLimit).toBeDefined();
    expect(typeof rateLimiters.authRateLimit).toBe('function');
  });

  it('should export aiRateLimit middleware', () => {
    expect(rateLimiters.aiRateLimit).toBeDefined();
    expect(typeof rateLimiters.aiRateLimit).toBe('function');
  });

  it('should export paymentRateLimit middleware', () => {
    expect(rateLimiters.paymentRateLimit).toBeDefined();
    expect(typeof rateLimiters.paymentRateLimit).toBe('function');
  });

  it('should export uploadRateLimit middleware', () => {
    expect(rateLimiters.uploadRateLimit).toBeDefined();
    expect(typeof rateLimiters.uploadRateLimit).toBe('function');
  });

  it('should reject requests exceeding content-length limit', () => {
    const req = { headers: { 'content-length': '20971520' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    rateLimiters.requestSizeLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
  });

  it('should pass requests under content-length limit', () => {
    const req = { headers: { 'content-length': '1024' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    rateLimiters.requestSizeLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject suspicious injection patterns', () => {
    const req = { body: {}, query: { search: '1; DROP TABLE users' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    rateLimiters.injectionDetector(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should pass clean input through injection detector', () => {
    const req = { body: { name: 'test' }, query: { q: 'search term' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    rateLimiters.injectionDetector(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
