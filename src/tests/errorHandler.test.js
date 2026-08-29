import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Error Handler', () => {
  let errorHandler, notFound, AppError, mongoose;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'development');
    const mod = await import('../middlewares/errorHandler.js');
    errorHandler = mod.errorHandler;
    notFound = mod.notFound;
    AppError = mod.AppError;
    mongoose = await import('mongoose');
  });

  it('should create an AppError with correct status', () => {
    const err = new AppError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.status).toBe(false);
    expect(err.isOperational).toBe(true);
  });

  it('should handle 404 via notFound middleware', () => {
    const req = { originalUrl: '/api/unknown' };
    const next = vi.fn();
    notFound(req, null, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('should return 500 for generic error', () => {
    const err = new Error('Something broke');
    const req = { correlationId: 'cid', user: { _id: 'u1' }, originalUrl: '/api/test', method: 'GET', ip: '127.0.0.1', headers: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should return 400 for Mongoose ValidationError', () => {
    const err = new mongoose.Error.ValidationError();
    err.message = 'Validation failed';
    const req = { correlationId: 'cid', user: { _id: 'u1' }, originalUrl: '/api/test', method: 'POST', ip: '127.0.0.1', headers: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 409 for duplicate key error', () => {
    const err = new Error('Duplicate key');
    err.code = 11000;
    const req = { correlationId: 'cid', user: { _id: 'u1' }, originalUrl: '/api/test', method: 'POST', ip: '127.0.0.1', headers: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('should return 400 for CastError', () => {
    const err = new mongoose.Error.CastError('ObjectId', 'invalid', '_id');
    err.message = 'Cast to ObjectId failed';
    const req = { correlationId: 'cid', user: { _id: 'u1' }, originalUrl: '/api/test', method: 'GET', ip: '127.0.0.1', headers: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    errorHandler(err, req, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should hide error details in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const err = new Error('Sensitive details');
    const req = { correlationId: 'cid', user: null, originalUrl: '/api/test', method: 'GET', ip: '127.0.0.1', headers: {} };
    const res = { status: vi.fn(() => res), json: vi.fn() };
    errorHandler(err, req, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Internal server error' }));
  });
});
