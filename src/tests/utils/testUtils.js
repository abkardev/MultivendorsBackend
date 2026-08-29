import mongoose from 'mongoose';
import { vi } from 'vitest';

export const mockId = () => new mongoose.Types.ObjectId();

export const mockReq = (overrides = {}) => ({
  user: { _id: mockId(), role: 'admin', isActive: true, name: 'Test User', email: 'test@example.com' },
  params: {},
  query: {},
  body: {},
  headers: {},
  ip: '127.0.0.1',
  originalUrl: '/api/test',
  method: 'GET',
  correlationId: 'test-correlation-id',
  ...overrides,
});

export const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
};

export const mockNext = vi.fn();

export const createMockUser = (overrides = {}) => ({
  _id: mockId(),
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  isActive: true,
  isVerified: true,
  forcePasswordReset: false,
  lockedByAdmin: false,
  failedLoginAttempts: 0,
  twoFactorEnabled: false,
  save: vi.fn().mockResolvedValue(true),
  comparePassword: vi.fn(),
  isLocked: vi.fn().mockReturnValue(false),
  incrementFailedLogins: vi.fn(),
  resetFailedLogins: vi.fn(),
  ...overrides,
});

export const mockModel = {
  create: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  findByIdAndUpdate: vi.fn(),
  findByIdAndDelete: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn(),
  countDocuments: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  aggregate: vi.fn(),
  distinct: vi.fn(),
  lean: vi.fn(),
  save: vi.fn(),
  populate: vi.fn(),
  sort: vi.fn(),
  skip: vi.fn(),
  limit: vi.fn(),
  exec: vi.fn(),
};

export const mockPaginatedResult = (items = [], total = 0, page = 1, limit = 20) => ({
  data: items,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
