import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Input Sanitizer Middleware', () => {
  let inputSanitizer;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../middlewares/securityMiddleware.js');
    inputSanitizer = mod.inputSanitizer;
  });

  it('should strip NoSQL injection operators ($ne, $gt, etc.)', () => {
    const req = {
      body: { email: 'test@test.com', password: { '$ne': '' } },
      query: {},
      params: {},
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(req.body.email).toBe('test@test.com');
    expect(Object.keys(req.body.password)).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it('should strip keys starting with $', () => {
    const req = {
      body: { name: 'test', '$where': '1=1', '$gt': '' },
      query: {},
      params: {},
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(req.body.$where).toBeUndefined();
    expect(req.body.$gt).toBeUndefined();
    expect(req.body.name).toBe('test');
  });

  it('should strip constructor and prototype keys', () => {
    const req = {
      body: { name: 'test', constructor: { prototype: { polluted: true } }, prototype: { polluted: true } },
      query: {},
      params: {},
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(Object.hasOwn(req.body, 'constructor')).toBe(false);
    expect(Object.hasOwn(req.body, 'prototype')).toBe(false);
    expect(req.body.name).toBe('test');
  });

  it('should sanitize nested objects recursively', () => {
    const req = {
      body: { user: { name: 'test', '$where': '1=1', profile: { '$ne': null } } },
      query: {},
      params: {},
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(req.body.user.$where).toBeUndefined();
    expect(req.body.user.profile.$ne).toBeUndefined();
    expect(req.body.user.name).toBe('test');
  });

  it('should sanitize query params and params', () => {
    const req = {
      body: {},
      query: { '$ne': 'admin' },
      params: { id: { '$gt': '' } },
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(req.query.$ne).toBeUndefined();
    expect(req.params.id.$gt).toBeUndefined();
  });

  it('should pass through valid data unchanged', () => {
    const valid = { name: 'Test', email: 'test@test.com', age: 25 };
    const req = { body: { ...valid }, query: {}, params: {} };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(req.body).toEqual(valid);
  });

  it('should handle arrays', () => {
    const req = {
      body: [{ name: 'test', '$ne': 'admin' }],
      query: {},
      params: {},
    };
    const next = vi.fn();
    inputSanitizer(req, {}, next);
    expect(Array.isArray(req.body)).toBe(true);
    expect(req.body[0].name).toBe('test');
    expect(req.body[0].$ne).toBeUndefined();
  });
});
