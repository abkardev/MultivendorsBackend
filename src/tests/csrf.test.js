import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CSRF Protection', () => {
  let csrfProtection;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../middlewares/securityMiddleware.js');
    csrfProtection = mod.csrfProtection;
  });

  it('should skip validation for GET requests', () => {
    const req = { method: 'GET', headers: {}, cookies: {} };
    const next = vi.fn();
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('should skip validation for HEAD requests', () => {
    const req = { method: 'HEAD', headers: {}, cookies: {} };
    const next = vi.fn();
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('should skip validation for OPTIONS requests', () => {
    const req = { method: 'OPTIONS', headers: {}, cookies: {} };
    const next = vi.fn();
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('should return 403 when CSRF token is missing from headers', () => {
    const req = { method: 'POST', headers: {}, cookies: { csrfToken: 'abc123' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 403 when CSRF token is missing from cookies', () => {
    const req = { method: 'POST', headers: { 'x-csrf-token': 'abc123' }, cookies: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 403 when tokens do not match', () => {
    const req = { method: 'POST', headers: { 'x-csrf-token': 'token1' }, cookies: { csrfToken: 'token2' } };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    const next = vi.fn();
    csrfProtection(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should accept valid CSRF token', () => {
    const req = { method: 'POST', headers: { 'x-csrf-token': 'valid-token' }, cookies: { csrfToken: 'valid-token' } };
    const next = vi.fn();
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalled();
  });

  it('should also accept x-xsrf-token header', () => {
    const req = { method: 'POST', headers: { 'x-xsrf-token': 'xsrf-token' }, cookies: { csrfToken: 'xsrf-token' } };
    const next = vi.fn();
    csrfProtection(req, {}, next);
    expect(next).toHaveBeenCalled();
  });
});
