import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

const mockNotification = {
  _id: mockId(), recipient: mockId(), type: 'order_update',
  title: { en: 'Order Shipped' }, body: { en: 'Your order has been shipped' },
  channels: ['in_app'], priority: 'medium', isRead: false,
  deliveryStatus: { in_app: 'pending', email: 'pending' },
  save: vi.fn(),
};

const mockUser = { _id: mockId(), name: 'Test', email: 'test@test.com', phone: '+1234567890' };

vi.mock('../models/Notification.js', () => ({
  Notification: {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('../models/userModel.js', () => ({
  default: { findById: vi.fn(), find: vi.fn() },
}));

describe('NotificationService', () => {
  let notificationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/notificationService.js');
    notificationService = mod.notificationService;
  });

  it('should send a notification', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.create.mockResolvedValue(mockNotification);
    Notification.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(mockNotification) });
    Notification.findByIdAndUpdate.mockResolvedValue(mockNotification);
    const result = await notificationService.send({
      recipient: mockUser._id, type: 'order_update',
      title: { en: 'Test' }, body: { en: 'Test body' },
    });
    expect(Notification.create).toHaveBeenCalled();
    expect(result._id).toBe(mockNotification._id);
  });

  it('should send notification to a role', async () => {
    const { default: User } = await import('../models/userModel.js');
    User.find.mockResolvedValue([mockUser]);
    const { Notification } = await import('../models/Notification.js');
    Notification.create.mockResolvedValue(mockNotification);
    Notification.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue(mockNotification) });
    Notification.findByIdAndUpdate.mockResolvedValue(mockNotification);
    const results = await notificationService.sendToRole({
      role: 'vendor', type: 'announcement', title: { en: 'Test' }, body: { en: 'Body' },
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('should mark notification as read', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.findOneAndUpdate.mockResolvedValue({ ...mockNotification, isRead: true });
    const result = await notificationService.markAsRead(mockNotification._id, mockUser._id);
    expect(Notification.findOneAndUpdate).toHaveBeenCalled();
  });

  it('should mark all as read', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.updateMany.mockResolvedValue({ modifiedCount: 5 });
    const result = await notificationService.markAllAsRead(mockUser._id);
    expect(result.modifiedCount).toBe(5);
  });

  it('should get unread count', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.countDocuments.mockResolvedValue(3);
    const count = await notificationService.getUnreadCount(mockUser._id);
    expect(count).toBe(3);
  });

  it('should get paginated notifications', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([mockNotification]) });
    Notification.countDocuments.mockResolvedValue(1);
    const result = await notificationService.getUserNotifications(mockUser._id, { page: 1, limit: 10 });
    expect(result.notifications).toBeDefined();
    expect(result.notifications).toHaveLength(1);
  });

  it('should archive a notification', async () => {
    const { Notification } = await import('../models/Notification.js');
    Notification.findOneAndUpdate.mockResolvedValue({ ...mockNotification, isArchived: true });
    const result = await notificationService.archive(mockNotification._id, mockUser._id);
    expect(result).toBeTruthy();
  });
});
