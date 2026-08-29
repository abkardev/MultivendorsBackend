import { vi } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../services/logger.js', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn(), child: vi.fn(() => logger) };
  return {
    logger,
    getLogger: vi.fn(() => ({ ...logger })),
    default: logger,
    requestLogger: vi.fn((req, res, next) => next()),
    createRequestLogger: vi.fn(),
    childLogger: vi.fn(),
  };
});

vi.stubGlobal('createObjectId', () => new mongoose.Types.ObjectId());
vi.stubGlobal('createMockUser', (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  isActive: true,
  ...overrides,
}));
