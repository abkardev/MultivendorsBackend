import { Notification } from '../models/Notification.js';
import { NotificationTemplate } from '../models/NotificationTemplate.js';
import { notificationService } from './notificationService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EnterpriseNotificationService {
  constructor() {
    this.channelHandlers = new Map();
    this.digestQueue = new Map();
    this.io = null;
    this.notificationQueue = [];
    this.campaigns = new Map();
    this.failedQueue = [];
    this._registerChannels();
  }

  setSocketIO(io) {
    this.io = io;
    notificationService.setSocketIO(io);
  }

  _registerChannels() {
    this.channelHandlers.set('email', this._sendEmail.bind(this));
    this.channelHandlers.set('sms', this._sendSms.bind(this));
    this.channelHandlers.set('whatsapp', this._sendWhatsApp.bind(this));
    this.channelHandlers.set('push', this._sendPush.bind(this));
    this.channelHandlers.set('in_app', this._sendInApp.bind(this));
    this.channelHandlers.set('slack', this._sendSlack.bind(this));
    this.channelHandlers.set('webhook', this._sendWebhook.bind(this));
  }

  async sendFromTemplate(templateName, recipient, variables = {}, options = {}) {
    const template = await NotificationTemplate.findOne({ name: templateName, isActive: true });
    if (!template) throw new Error(`Template not found: ${templateName}`);

    const rendered = this._renderTemplate(template, variables);
    const channels = options.channels || template.channels || ['in_app'];

    const notification = await Notification.create({
      recipient,
      type: template.type,
      title: rendered.title,
      body: rendered.body,
      data: { ...variables, templateName },
      channels,
      priority: options.priority || template.defaultPriority || 'medium',
      link: options.link,
      imageUrl: options.imageUrl,
    });

    for (const channel of channels) {
      const handler = this.channelHandlers.get(channel);
      if (handler) {
        handler(notification, rendered, recipient).catch(err =>
          logger.error(`[Notification] ${channel} delivery failed:`, err),
        );
      }
    }

    return notification;
  }

  _renderTemplate(template, variables) {
    const rendered = {
      title: { en: template.title?.en || '', ar: template.title?.ar || '' },
      body: { en: template.body?.en || '', ar: template.body?.ar || '' },
      subject: { en: template.subject?.en || '', ar: template.subject?.ar || '' },
      smsBody: { en: template.smsBody?.en || '', ar: template.smsBody?.ar || '' },
      pushTitle: { en: template.pushTitle?.en || '', ar: template.pushTitle?.ar || '' },
      pushBody: { en: template.pushBody?.en || '', ar: template.pushBody?.ar || '' },
      emailHtml: { en: template.emailHtml?.en || '', ar: template.emailHtml?.ar || '' },
    };

    for (const [lang] of [['en'], ['ar']]) {
      for (const [field, val] of Object.entries(rendered)) {
        if (val[lang]) {
          rendered[field][lang] = val[lang].replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
        }
      }
    }

    return rendered;
  }

  async sendDigest(userId, period = 'daily') {
    const since = period === 'daily' ? new Date(Date.now() - 86400000)
      : period === 'weekly' ? new Date(Date.now() - 7 * 86400000)
      : new Date(Date.now() - 3600000);

    const notifications = await Notification.find({
      recipient: userId,
      createdAt: { $gte: since },
      isRead: false,
    }).sort({ createdAt: -1 }).limit(50);

    if (notifications.length === 0) return null;

    const digest = {
      userId,
      period,
      count: notifications.length,
      notifications: notifications.map(n => ({
        type: n.type, title: n.title, body: n.body,
        priority: n.priority, createdAt: n.createdAt,
      })),
      generatedAt: new Date(),
    };

    this.digestQueue.set(`${userId}_${period}`, digest);
    return digest;
  }

  async getDigest(userId, period = 'daily') {
    return this.digestQueue.get(`${userId}_${period}`) || null;
  }

  async _sendEmail(notification, rendered, recipient) {
    try {
      const { default: User } = await import('../models/userModel.js');
      const user = await User.findById(recipient);
      if (!user?.email) return;
      logger.info(`[Notification] Email to ${user.email}: ${rendered.subject?.en || rendered.title?.en}`);
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.email': 'delivered' });
    } catch (e) {
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.email': 'failed' });
    }
  }

  async _sendSms(notification, rendered, recipient) {
    try {
      const { default: User } = await import('../models/userModel.js');
      const user = await User.findById(recipient);
      if (!user?.phone) return;
      logger.info(`[Notification] SMS to ${user.phone}: ${rendered.smsBody?.en || rendered.body?.en}`);
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.in_app': 'delivered' });
    } catch (e) {
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.in_app': 'failed' });
    }
  }

  async _sendWhatsApp(notification, rendered, recipient) {
    try {
      const { default: User } = await import('../models/userModel.js');
      const user = await User.findById(recipient);
      if (!user?.phone) return;
      logger.info(`[Notification] WhatsApp to ${user.phone}: ${rendered.body?.en}`);
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.whatsapp': 'delivered' });
    } catch (e) {
      await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.whatsapp': 'failed' });
    }
  }

  async _sendPush(notification, rendered, recipient) {
    if (this.io) {
      this.io.to(`user:${recipient}`).emit('push_notification', {
        title: rendered.pushTitle || rendered.title,
        body: rendered.pushBody || rendered.body,
        data: notification.data,
      });
    }
    await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.in_app': 'delivered' });
  }

  async _sendInApp(notification, rendered, recipient) {
    if (this.io) {
      this.io.to(`user:${recipient}`).emit('notification', {
        _id: notification._id, type: notification.type,
        title: rendered.title, body: rendered.body,
        data: notification.data, priority: notification.priority,
        createdAt: notification.createdAt,
      });
    }
    await Notification.findByIdAndUpdate(notification._id, { 'deliveryStatus.in_app': 'delivered' });
  }

  async _sendSlack(notification, rendered, recipient) {
    logger.info(`[Notification] Slack webhook would be called for user ${recipient}`);
  }

  async _sendWebhook(notification, rendered, recipient) {
    logger.info(`[Notification] Webhook would be called for user ${recipient}`);
  }

  async sendEmail(recipient, template, data) {
    return this.sendFromTemplate(template, recipient, data, { channels: ['email'] });
  }

  async sendSms(recipient, message) {
    const notification = await Notification.create({
      recipient, type: 'system_announcement', title: { en: message, ar: message },
      body: { en: message, ar: message }, channels: ['in_app'], priority: 'medium',
    });
    await this._sendSms(notification, { smsBody: { en: message, ar: message }, body: { en: message, ar: message } }, recipient);
    return notification;
  }

  async sendWhatsApp(recipient, template, data) {
    return this.sendFromTemplate(template, recipient, data, { channels: ['whatsapp'] });
  }

  async sendPush(userId, title, body, data = {}) {
    const notification = await Notification.create({
      recipient: userId, type: 'system_announcement',
      title: { en: title, ar: title }, body: { en: body, ar: body },
      data, channels: ['in_app'], priority: 'high',
    });
    await this._sendPush(notification, { pushTitle: { en: title, ar: title }, pushBody: { en: body, ar: body } }, userId);
    return notification;
  }

  async sendSlack(webhookUrl, message) {
    try {
      const resp = await fetch(webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });
      return { success: resp.ok, status: resp.status };
    } catch (e) {
      logger.error('[Notification] Slack delivery failed:', e);
      return { success: false, error: e.message };
    }
  }

  async sendWebhook(url, event, payload) {
    try {
      const resp = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });
      return { success: resp.ok, status: resp.status };
    } catch (e) {
      logger.error('[Notification] Webhook delivery failed:', e);
      return { success: false, error: e.message };
    }
  }

  async scheduleNotification(recipient, template, data, scheduledAt) {
    const scheduled = { recipient, template, data, scheduledAt, status: 'scheduled', createdAt: new Date() };
    this.notificationQueue.push(scheduled);
    const delay = new Date(scheduledAt).getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.sendFromTemplate(template, recipient, data);
          scheduled.status = 'sent';
        } catch (e) {
          scheduled.status = 'failed';
          this.failedQueue.push(scheduled);
        }
      }, delay);
    }
    return scheduled;
  }

  async createCampaign(data) {
    const campaign = {
      id: `camp_${Date.now()}`,
      ...data,
      status: 'draft',
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
    };
    this.campaigns.set(campaign.id, campaign);
    return campaign;
  }

  async sendCampaign(campaignId) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error(`Campaign not found: ${campaignId}`);
    campaign.status = 'sending';
    const { recipients, template, variables } = campaign;
    for (const recipient of recipients) {
      try {
        await this.sendFromTemplate(template, recipient, variables || {});
        campaign.sentCount++;
      } catch (e) {
        campaign.failedCount++;
        this.failedQueue.push({ recipient, template, error: e.message, failedAt: new Date() });
      }
    }
    campaign.status = 'completed';
    campaign.completedAt = new Date();
    return campaign;
  }

  async getNotificationAnalytics(options = {}) {
    const { startDate, endDate } = options;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const [total, byType, byChannel, byPriority, deliveryStats, readRate] = await Promise.all([
      Notification.countDocuments(match),
      Notification.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Notification.aggregate([{ $match: match }, { $unwind: '$channels' }, { $group: { _id: '$channels', count: { $sum: 1 } } }]),
      Notification.aggregate([{ $match: match }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Notification.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            emailDelivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus.email', 'delivered'] }, 1, 0] } },
            emailFailed: { $sum: { $cond: [{ $eq: ['$deliveryStatus.email', 'failed'] }, 1, 0] } },
            inAppDelivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus.in_app', 'delivered'] }, 1, 0] } },
            whatsappDelivered: { $sum: { $cond: [{ $eq: ['$deliveryStatus.whatsapp', 'delivered'] }, 1, 0] } },
          },
        },
      ]),
      Notification.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: 1 }, read: { $sum: { $cond: ['$isRead', 1, 0] } } } },
      ]),
    ]);
    return { total, byType, byChannel, byPriority, deliveryStats: deliveryStats[0] || {}, readRate: readRate[0] || {} };
  }

  async getQueue() {
    return {
      pending: this.notificationQueue.filter(n => n.status === 'scheduled'),
      failed: this.failedQueue,
      campaigns: Array.from(this.campaigns.values()).map(c => ({ id: c.id, name: c.name, status: c.status, sentCount: c.sentCount, failedCount: c.failedCount, createdAt: c.createdAt })),
    };
  }

  async retryFailed(id) {
    const item = this.failedQueue.find(n => n._id === id || n.recipient === id);
    if (!item) throw new Error(`Failed notification not found: ${id}`);
    try {
      await this.sendFromTemplate(item.template, item.recipient, item.data || {});
      this.failedQueue = this.failedQueue.filter(n => n !== item);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  async listTemplates() {
    return NotificationTemplate.find({ isActive: true }).sort({ name: 1 });
  }

  async createTemplate(data, userId) {
    return NotificationTemplate.create({ ...data, createdBy: userId });
  }

  async updateTemplate(id, data) {
    return NotificationTemplate.findByIdAndUpdate(id, { $set: data, $inc: { version: 1 } }, { new: true });
  }
}

export const enterpriseNotificationService = new EnterpriseNotificationService();
