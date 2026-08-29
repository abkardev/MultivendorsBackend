import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuditLog = {
  _id: 'audit1',
  userId: 'u1',
  action: 'user.login',
  category: 'auth',
  entityType: 'user',
  entityId: 'u1',
  description: 'User logged in',
  status: 'success',
  createdAt: new Date(),
};

vi.mock('../models/AuditLog.js', () => ({
  default: { create: vi.fn() },
}));

describe('AuditService', () => {
  let auditService;

  beforeEach(async () => {
    vi.clearAllMocks();
    auditService = await import('../services/auditService.js');
  });

  it('should log an audit event', async () => {
    const AuditLog = (await import('../models/AuditLog.js')).default;
    AuditLog.create.mockResolvedValue(mockAuditLog);
    const result = await auditService.logAuditEvent({
      userId: 'u1', action: 'user.login', category: 'auth',
      entityType: 'user', entityId: 'u1',
    });
    expect(AuditLog.create).toHaveBeenCalled();
    expect(result._id).toBe('audit1');
  });

  it('should not throw when audit creation fails', async () => {
    const AuditLog = (await import('../models/AuditLog.js')).default;
    AuditLog.create.mockRejectedValue(new Error('DB error'));
    const result = await auditService.logAuditEvent({ action: 'test', category: 'test' });
    expect(result).toBeNull();
  });

  it('should generate a correlation ID', () => {
    const corrId = auditService.generateCorrelationId();
    expect(corrId).toMatch(/^CORR-/);
  });

  it('should return audit middleware function', () => {
    const middleware = auditService.auditMiddleware('orders', 'create');
    expect(typeof middleware).toBe('function');
  });

  it('should call next in audit middleware', () => {
    const middleware = auditService.auditMiddleware('test', 'action');
    const req = { user: { _id: 'u1' }, ip: '127.0.0.1', headers: {}, baseUrl: '/api/test', method: 'GET', originalUrl: '/api/test', params: {} };
    const res = { json: vi.fn(), statusCode: 200 };
    const next = vi.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
