import { Notification } from '../models/Notification.js';
import User from '../models/userModel.js';

class NotificationService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  async send({ recipient, type, title, body, data, channels = ['in_app'], priority = 'medium', link, imageUrl }) {
    const notification = await Notification.create({
      recipient, type, title, body, data, channels, priority, link, imageUrl,
    });

    if (channels.includes('in_app')) {
      await this._deliverInApp(notification);
    }

    if (channels.includes('email')) {
      this._deliverEmail(notification).catch(() => {});
    }

    if (channels.includes('whatsapp')) {
      this._deliverWhatsApp(notification).catch(() => {});
    }

    return notification;
  }

  async sendToRole({ role, type, title, body, data, channels = ['in_app'], priority = 'medium', link }) {
    const users = await User.find({ role });
    const results = [];
    for (const user of users) {
      const notif = await this.send({ recipient: user._id, type, title, body, data, channels, priority, link });
      results.push(notif);
    }
    return results;
  }

  async sendToAll({ type, title, body, data, channels = ['in_app'], priority = 'medium', link }) {
    const users = await User.find({});
    const results = [];
    for (const user of users) {
      const notif = await this.send({ recipient: user._id, type, title, body, data, channels, priority, link });
      results.push(notif);
    }
    return results;
  }

  async _deliverInApp(notification) {
    const populated = await Notification.findById(notification._id).populate('recipient', 'name email');
    if (!populated) return;

    await Notification.findByIdAndUpdate(notification._id, {
      'deliveryStatus.in_app': 'delivered',
    });

    if (this.io) {
      this.io.to(`user:${notification.recipient}`).emit('notification', {
        _id: populated._id,
        type: populated.type,
        title: populated.title,
        body: populated.body,
        data: populated.data,
        priority: populated.priority,
        link: populated.link,
        createdAt: populated.createdAt,
      });
    }
  }

  async _deliverEmail(notification) {
    try {
      const user = await User.findById(notification.recipient);
      if (!user?.email) return;

      console.log(`[NotificationService] Email to ${user.email}: ${notification.title.en}`);

      await Notification.findByIdAndUpdate(notification._id, {
        'deliveryStatus.email': 'delivered',
      });
    } catch (err) {
      await Notification.findByIdAndUpdate(notification._id, {
        'deliveryStatus.email': 'failed',
      });
    }
  }

  async _deliverWhatsApp(notification) {
    try {
      const user = await User.findById(notification.recipient);
      if (!user?.phone) return;

      console.log(`[NotificationService] WhatsApp to ${user.phone}: ${notification.title.en}`);

      await Notification.findByIdAndUpdate(notification._id, {
        'deliveryStatus.whatsapp': 'delivered',
      });
    } catch (err) {
      await Notification.findByIdAndUpdate(notification._id, {
        'deliveryStatus.whatsapp': 'failed',
      });
    }
  }

  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(userId) {
    return Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async archive(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isArchived: true },
      { new: true },
    );
  }

  async getUnreadCount(userId) {
    return Notification.countDocuments({ recipient: userId, isRead: false, isArchived: false });
  }

  async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false, type } = {}) {
    const filter = { recipient: userId, isArchived: false };
    if (unreadOnly) filter.isRead = false;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    return {
      notifications,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}

export const notificationService = new NotificationService();

