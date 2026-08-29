import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/MobileSyncSession.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    distinct: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/MobilePushToken.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    updateMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/SyncConflict.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

describe('Mobile Support Service', () => {
  let mobileSupportService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/mobileSupportService.js');
    mobileSupportService = mod.mobileSupportService;
  });

  it('should create a sync session', async () => {
    const MobileSyncSession = (await import('../models/MobileSyncSession.js')).default;
    MobileSyncSession.findOne.mockResolvedValue(null);
    MobileSyncSession.create.mockResolvedValue({ _id: mockId(), user: 'u1', deviceId: 'dev1', deviceType: 'ios', syncToken: 'token', status: 'active', lastCursor: { timestamp: expect.any(String), sequence: 0 } });
    const session = await mobileSupportService.createSyncSession('u1', { deviceId: 'dev1', deviceType: 'ios' });
    expect(session.status).toBe('active');
  });

  it('should register push token', async () => {
    const MobilePushToken = (await import('../models/MobilePushToken.js')).default;
    MobilePushToken.findOne.mockResolvedValue(null);
    MobilePushToken.create.mockResolvedValue({ _id: mockId(), user: 'u1', token: 'push_token_abc', platform: 'ios', isActive: true });
    const pt = await mobileSupportService.registerPushToken('u1', { token: 'push_token_abc', platform: 'ios' });
    expect(pt.isActive).toBe(true);
  });

  it('should unregister push token', async () => {
    const MobilePushToken = (await import('../models/MobilePushToken.js')).default;
    const mockPt = { _id: mockId(), token: 'push_token_abc', platform: 'ios', isActive: true, save: vi.fn().mockResolvedValue(true) };
    MobilePushToken.findOne.mockResolvedValue(mockPt);
    const pt = await mobileSupportService.unregisterPushToken('u1', 'push_token_abc');
    expect(pt.isActive).toBe(false);
  });

  it('should revoke sync session', async () => {
    const MobileSyncSession = (await import('../models/MobileSyncSession.js')).default;
    const mockSession = { _id: mockId(), deviceId: 'dev1', status: 'active', save: vi.fn().mockResolvedValue(true) };
    MobileSyncSession.findOne.mockResolvedValue(mockSession);
    const MobilePushToken = (await import('../models/MobilePushToken.js')).default;
    MobilePushToken.updateMany.mockResolvedValue({ modifiedCount: 1 });
    const session = await mobileSupportService.revokeSyncSession('u1', mockSession._id);
    expect(session.status).toBe('revoked');
  });

  it('should resolve sync conflict', async () => {
    const SyncConflict = (await import('../models/SyncConflict.js')).default;
    const mockConflict = { _id: 'c1', resolution: 'pending', serverData: {}, save: vi.fn().mockResolvedValue(true) };
    SyncConflict.findOne.mockResolvedValue(mockConflict);
    const conflict = await mobileSupportService.resolveConflict('u1', 'c1', 'resolved_local', null);
    expect(conflict.resolution).toBe('resolved_local');
  });

  it('should send push notification', async () => {
    const MobilePushToken = (await import('../models/MobilePushToken.js')).default;
    MobilePushToken.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: 't1', token: 'tok1', platform: 'ios' }]) });
    MobilePushToken.updateMany.mockResolvedValue({ modifiedCount: 1 });
    const notif = await mobileSupportService.sendPushNotification('u1', 'Hello', 'Test message', { key: 'val' });
    expect(notif.status).toBe('sent');
  });

  it('should throw when no push tokens found', async () => {
    const MobilePushToken = (await import('../models/MobilePushToken.js')).default;
    MobilePushToken.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    await expect(mobileSupportService.sendPushNotification('u1', 'Hello', 'Test', {}))
      .rejects.toThrow('No active push tokens found');
  });
});
