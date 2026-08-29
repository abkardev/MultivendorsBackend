import { Notification } from '../models/Notification.js';
import { notificationService } from '../services/notificationService.js';

export const listNotifications = async (req, res) => {
  try {
    const { page, limit, unreadOnly, type } = req.query;
    const result = await notificationService.getUserNotifications(req.user._id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      unreadOnly: unreadOnly === 'true',
      type,
    });
    res.json({ status: true, ...result });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ status: true, count });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ status: false, message: 'Notification not found' });
    res.json({ status: true, data: notification });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user._id);
    res.json({ status: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const archiveNotification = async (req, res) => {
  try {
    const notification = await notificationService.archive(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ status: false, message: 'Notification not found' });
    res.json({ status: true, data: notification });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const sendTestNotification = async (req, res) => {
  try {
    const { type, title, body, channels } = req.body;
    await notificationService.send({
      recipient: req.user._id,
      type: type || 'system_announcement',
      title: title || { en: 'Test Notification', ar: 'إشعار تجريبي' },
      body: body || { en: 'This is a test notification', ar: 'هذا إشعار تجريبي' },
      channels: channels || ['in_app'],
      link: '/dashboard',
    });
    res.json({ status: true, message: 'Test notification sent' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id },
      { isArchived: true },
    );
    res.json({ status: true, message: 'All notifications archived' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
