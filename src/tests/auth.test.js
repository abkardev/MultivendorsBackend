import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';

const mockUser = { _id: '507f191e810c19729de860ea', name: 'Test', email: 'test@test.com', role: 'admin', isActive: true, lockedByAdmin: false };

vi.mock('../models/userModel.js', () => ({
  default: {
    findById: vi.fn(() => Promise.resolve(mockUser)),
  },
}));

vi.mock('../services/sessionService.js', () => ({
  validateSession: vi.fn(() => Promise.resolve({ _id: 'session1' })),
}));

describe('Auth Middleware', () => {
  let auth, mockReq, mockRes, mockNext;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('JWT_SECRET', 'test-secret-key');
    const mod = await import('../middlewares/auth.js');
    auth = mod.auth;
    mockReq = (overrides = {}) => ({
      headers: { authorization: 'Bearer valid-token' },
      user: null,
      tokenId: null,
      ...overrides,
    });
    mockRes = () => {
      const r = {};
      r.status = vi.fn().mockReturnValue(r);
      r.json = vi.fn().mockReturnValue(r);
      return r;
    };
    mockNext = vi.fn();
  });

  it('should return 401 when no token is provided', async () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('should return 401 when token is expired', async () => {
    vi.spyOn(jwt, 'verify').mockImplementation(() => { const e = new Error('jwt expired'); e.name = 'TokenExpiredError'; throw e; });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 for malformed token', async () => {
    vi.spyOn(jwt, 'verify').mockImplementation(() => { throw new Error('invalid token'); });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next() with valid token and active user', async () => {
    vi.spyOn(jwt, 'verify').mockReturnValue({ id: '507f191e810c19729de860ea', tokenId: 't1' });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 403 when user is deactivated', async () => {
    const { default: User } = await import('../models/userModel.js');
    User.findById.mockResolvedValue({ ...mockUser, isActive: false });
    vi.spyOn(jwt, 'verify').mockReturnValue({ id: '507f191e810c19729de860ea', tokenId: 't1' });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should return 423 when user is locked by admin', async () => {
    const { default: User } = await import('../models/userModel.js');
    User.findById.mockResolvedValue({ ...mockUser, lockedByAdmin: true });
    vi.spyOn(jwt, 'verify').mockReturnValue({ id: '507f191e810c19729de860ea', tokenId: 't1' });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(423);
  });
});
