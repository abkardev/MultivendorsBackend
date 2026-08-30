import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = { _id: '507f191e810c19729de860ea', name: 'New User', email: 'new@example.com', role: 'user' };

vi.mock('../models/userModel.js', () => ({
  default: { findOne: vi.fn(), create: vi.fn() },
  sanitizeUserWire: vi.fn((u) => u),
}));

vi.mock('../models/vendorModel.js', () => ({
  Vendor: { create: vi.fn() },
}));

vi.mock('../services/sessionService.js', () => ({
  createSession: vi.fn(async () => ({ tokenId: 'tok1' })),
  revokeSession: vi.fn(),
  revokeAllSessions: vi.fn(),
  listSessions: vi.fn(),
  validateSession: vi.fn(),
}));

vi.mock('../services/totpService.js', () => ({
  generateSecret: vi.fn(),
  generateQRCode: vi.fn(),
  verifyTOTP: vi.fn(),
  encryptSecret: vi.fn(),
  decryptSecret: vi.fn(),
  generateRecoveryCodes: vi.fn(),
  generateEmailVerificationCode: vi.fn(),
}));

vi.mock('../services/securityAuditService.js', () => ({
  logSecurityEvent: vi.fn(async () => {}),
  logLoginAttempt: vi.fn(async () => {}),
  getLoginHistory: vi.fn(),
  getAccountStatus: vi.fn(),
  getSecurityEvents: vi.fn(),
}));

vi.mock('../services/emailService.js', () => ({
  sendEmail: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  sendPasswordChangedEmail: vi.fn(async () => {}),
  sendTwoFactorEnabledEmail: vi.fn(async () => {}),
  sendTwoFactorDisabledEmail: vi.fn(async () => {}),
  sendNewDeviceLoginEmail: vi.fn(async () => {}),
  sendRecoveryCodesUsedEmail: vi.fn(async () => {}),
}));

describe('Auth Controller - registerUser', () => {
  let registerUser, User, Vendor, createSession, logSecurityEvent, logLoginAttempt;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('JWT_SECRET', 'test-secret-key');
    const mod = await import('../controllers/authController.js');
    registerUser = mod.registerUser;
    User = (await import('../models/userModel.js')).default;
    Vendor = (await import('../models/vendorModel.js')).Vendor;
    createSession = (await import('../services/sessionService.js')).createSession;
    logSecurityEvent = (await import('../services/securityAuditService.js')).logSecurityEvent;
    logLoginAttempt = (await import('../services/securityAuditService.js')).logLoginAttempt;
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(mockUser);
  });

  const mockRes = () => {
    const r = {};
    r.status = vi.fn().mockReturnValue(r);
    r.json = vi.fn().mockReturnValue(r);
    return r;
  };

  const mockReq = (body = {}) => ({
    ip: '127.0.0.1',
    headers: { 'user-agent': 'vitest', 'x-device-name': 'unit' },
    body: {
      name: 'New User',
      email: 'New@Example.com',
      password: 'Str0ng!Pass1',
      ...body,
    },
  });

  it('should register a valid user and return 201 with token', async () => {
    const req = mockReq();
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toMatchObject({ tokenId: 'tok1', requiresTwoFactor: false });
    expect(typeof payload.data.token).toBe('string');
    expect(payload.data.token.split('.').length).toBe(3);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', role: 'user' }));
    expect(createSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rememberMe: false, ipAddress: '127.0.0.1', userAgent: 'vitest' }));
    expect(logSecurityEvent).toHaveBeenCalled();
    expect(logLoginAttempt).toHaveBeenCalled();
  });

  it('should return 400 when email is already registered', async () => {
    User.findOne.mockResolvedValue(mockUser);
    const req = mockReq();
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'User already exists' }));
    expect(User.create).not.toHaveBeenCalled();
  });

  it('should return 400 when password fails validation', async () => {
    const req = mockReq({ password: 'short' });
    const res = mockRes();
    await registerUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: expect.stringContaining('Password must be at least 8 characters') }));
    expect(User.findOne).not.toHaveBeenCalled();
  });
});