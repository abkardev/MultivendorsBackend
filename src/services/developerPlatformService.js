import crypto from 'crypto';
import mongoose from 'mongoose';
import { DeveloperApp } from '../models/DeveloperApp.js';
import { ApiKey } from '../models/ApiKey.js';
import { WebhookEndpoint } from '../models/WebhookEndpoint.js';
import { ApiUsageLog } from '../models/ApiUsageLog.js';
import { logAuditEvent } from './auditService.js';

class DeveloperPlatformService {
  async createApp(userId, data) {
    const existing = await DeveloperApp.findOne({ name: data.name, developer: userId, status: { $ne: 'revoked' } });
    if (existing) throw new Error(`App "${data.name}" already exists`);

    const clientId = `app_${crypto.randomBytes(16).toString('hex')}`;
    const clientSecret = `sec_${crypto.randomBytes(32).toString('hex')}`;

    const app = await DeveloperApp.create({
      ...data,
      developer: userId,
      clientId,
      clientSecret,
      status: 'active',
    });

    await logAuditEvent({
      userId, action: 'developer.app_create', category: 'developer',
      entityType: 'DeveloperApp', entityId: app._id,
      newValue: { name: app.name, clientId: app.clientId },
      description: `Developer app created: ${app.name}`,
    });
    return app;
  }

  async getApps(userId) {
    const apps = await DeveloperApp.find({ developer: userId }).sort({ createdAt: -1 }).lean();
    const enriched = await Promise.all(apps.map(async (app) => {
      const keyCount = await ApiKey.countDocuments({ app: app._id, status: 'active' });
      const usage = await ApiUsageLog.aggregate([
        { $match: { app: app._id, timestamp: { $gte: new Date(Date.now() - 86400000) } } },
        { $group: { _id: null, count: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } } } },
      ]);
      return { ...app, clientSecret: undefined, keyCount, dailyRequests: usage[0]?.count || 0, dailyErrors: usage[0]?.errors || 0 };
    }));
    return enriched;
  }

  async getApp(id) {
    const app = await DeveloperApp.findById(id).populate('developer', 'name email').lean();
    if (!app) throw new Error('Developer app not found');

    const [keyCount, webhookCount, usageStats] = await Promise.all([
      ApiKey.countDocuments({ app: app._id, status: 'active' }),
      WebhookEndpoint.countDocuments({ app: app._id, status: { $ne: 'disabled' } }),
      ApiUsageLog.aggregate([
        { $match: { app: app._id } },
        { $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalErrors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgResponseTime: { $avg: '$responseTime' },
        } },
      ]),
    ]);

    return {
      ...app,
      clientSecret: undefined,
      stats: {
        activeKeys: keyCount,
        activeWebhooks: webhookCount,
        totalRequests: usageStats[0]?.totalRequests || 0,
        totalErrors: usageStats[0]?.totalErrors || 0,
        avgResponseTime: Math.round(usageStats[0]?.avgResponseTime || 0),
      },
    };
  }

  async updateApp(userId, id, data) {
    const app = await DeveloperApp.findById(id);
    if (!app) throw new Error('Developer app not found');
    if (app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    const oldStatus = app.status;
    Object.assign(app, data);
    await app.save();

    await logAuditEvent({
      userId, action: 'developer.app_update', category: 'developer',
      entityType: 'DeveloperApp', entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: app.status, name: app.name },
      description: `Developer app updated: ${app.name}`,
    });
    return app;
  }

  async deleteApp(userId, id) {
    const app = await DeveloperApp.findById(id);
    if (!app) throw new Error('Developer app not found');
    if (app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    app.status = 'revoked';
    await app.save();
    await ApiKey.updateMany({ app: id }, { status: 'revoked' });
    await WebhookEndpoint.updateMany({ app: id }, { status: 'disabled' });

    await logAuditEvent({
      userId, action: 'developer.app_revoke', category: 'developer',
      entityType: 'DeveloperApp', entityId: id,
      description: `Developer app revoked: ${app.name}`,
    });
    return { success: true, message: 'App revoked and all keys invalidated' };
  }

  async regenerateSecret(userId, id) {
    const app = await DeveloperApp.findById(id);
    if (!app) throw new Error('Developer app not found');
    if (app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    const oldSecret = app.clientSecret;
    app.clientSecret = `sec_${crypto.randomBytes(32).toString('hex')}`;
    await app.save();

    await logAuditEvent({
      userId, action: 'developer.secret_regenerate', category: 'developer',
      entityType: 'DeveloperApp', entityId: id,
      description: `Client secret regenerated for app: ${app.name}`,
    });
    return { clientId: app.clientId, clientSecret: app.clientSecret, message: 'Store this secret securely' };
  }

  async createApiKey(userId, data) {
    const rawKey = `mve_${crypto.randomBytes(24).toString('hex')}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await ApiKey.create({
      ...data,
      developer: userId,
      key: hashedKey,
      hashedKey,
      status: 'active',
    });

    await logAuditEvent({
      userId, action: 'developer.apikey_create', category: 'developer',
      entityType: 'ApiKey', entityId: apiKey._id,
      description: `API key "${data.name}" created`,
    });
    return { ...apiKey.toObject(), key: rawKey, hashedKey: undefined };
  }

  async getApiKeys(userId) {
    const keys = await ApiKey.find({ developer: userId })
      .populate('app', 'name')
      .sort({ createdAt: -1 }).lean();
    return keys.map(k => ({ ...k, key: `****${k.key.slice(-8)}`, hashedKey: undefined }));
  }

  async revokeApiKey(userId, id) {
    const key = await ApiKey.findById(id);
    if (!key) throw new Error('API key not found');
    if (key.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    key.status = 'revoked';
    await key.save();

    await logAuditEvent({
      userId, action: 'developer.apikey_revoke', category: 'developer',
      entityType: 'ApiKey', entityId: id,
      description: `API key revoked: ${key.name}`,
    });
    return { success: true, message: 'API key revoked' };
  }

  async getWebhookEndpoints(userId, appId) {
    const filter = { app: appId };
    if (userId) {
      const app = await DeveloperApp.findById(appId);
      if (!app || app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');
    }
    return WebhookEndpoint.find(filter).sort({ createdAt: -1 }).lean();
  }

  async createWebhookEndpoint(userId, data) {
    const app = await DeveloperApp.findById(data.app);
    if (!app || app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    const secret = `whsec_${crypto.randomBytes(16).toString('hex')}`;
    const webhook = await WebhookEndpoint.create({
      ...data,
      secret,
      status: 'active',
    });

    await logAuditEvent({
      userId, action: 'developer.webhook_create', category: 'developer',
      entityType: 'WebhookEndpoint', entityId: webhook._id,
      newValue: { name: webhook.name, url: webhook.url, events: webhook.events },
      description: `Webhook endpoint created: ${webhook.name}`,
    });
    return webhook;
  }

  async updateWebhookEndpoint(userId, id, data) {
    const webhook = await WebhookEndpoint.findById(id);
    if (!webhook) throw new Error('Webhook endpoint not found');

    const app = await DeveloperApp.findById(webhook.app);
    if (!app || app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    Object.assign(webhook, data);
    await webhook.save();

    await logAuditEvent({
      userId, action: 'developer.webhook_update', category: 'developer',
      entityType: 'WebhookEndpoint', entityId: id,
      description: `Webhook endpoint updated: ${webhook.name}`,
    });
    return webhook;
  }

  async deleteWebhookEndpoint(userId, id) {
    const webhook = await WebhookEndpoint.findById(id);
    if (!webhook) throw new Error('Webhook endpoint not found');

    const app = await DeveloperApp.findById(webhook.app);
    if (!app || app.developer.toString() !== userId.toString()) throw new Error('Unauthorized');

    webhook.status = 'disabled';
    await webhook.save();

    await logAuditEvent({
      userId, action: 'developer.webhook_delete', category: 'developer',
      entityType: 'WebhookEndpoint', entityId: id,
      description: `Webhook endpoint disabled: ${webhook.name}`,
    });
    return { success: true, message: 'Webhook endpoint disabled' };
  }

  async getApiUsageLogs(userId, filters = {}) {
    const apps = await DeveloperApp.find({ developer: userId }).select('_id').lean();
    const appIds = apps.map(a => a._id);

    const match = { app: { $in: appIds } };
    if (filters.appId) match.app = new mongoose.Types.ObjectId(filters.appId);
    if (filters.startDate) match.timestamp = { $gte: new Date(filters.startDate) };
    if (filters.endDate) match.timestamp = { ...match.timestamp, $lte: new Date(filters.endDate) };
    if (filters.statusCode) match.statusCode = parseInt(filters.statusCode);
    if (filters.method) match.method = filters.method.toUpperCase();
    if (filters.endpoint) match.endpoint = { $regex: filters.endpoint, $options: 'i' };

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 25));

    const [entries, total] = await Promise.all([
      ApiUsageLog.find(match).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('app', 'name').lean(),
      ApiUsageLog.countDocuments(match),
    ]);

    return { entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getDeveloperDashboard(userId) {
    const [apps, keys, usageStats, webhooks, errorStats, recentLogs] = await Promise.all([
      DeveloperApp.countDocuments({ developer: userId, status: { $ne: 'revoked' } }),
      ApiKey.countDocuments({ developer: userId, status: 'active' }),
      ApiUsageLog.aggregate([
        { $match: { developer: userId, timestamp: { $gte: new Date(Date.now() - 86400000) } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      WebhookEndpoint.countDocuments({ status: 'active' }),
      ApiUsageLog.aggregate([
        { $match: { developer: userId, timestamp: { $gte: new Date(Date.now() - 86400000) }, statusCode: { $gte: 400 } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]),
      ApiUsageLog.find({ developer: userId }).sort({ timestamp: -1 }).limit(10).lean(),
    ]);

    return {
      totalApps: apps,
      activeApiKeys: keys,
      activeWebhooks: webhooks,
      dailyRequests: usageStats[0]?.count || 0,
      dailyErrors: errorStats[0]?.count || 0,
      errorRate: usageStats[0]?.count > 0 ? Math.round(((errorStats[0]?.count || 0) / usageStats[0].count) * 100) : 0,
      recentActivity: recentLogs,
    };
  }

  async verifyApiKey(rawKey) {
    const hashed = crypto.createHash('sha256').update(rawKey).digest('hex');
    const key = await ApiKey.findOne({ hashedKey: hashed }).populate('app', 'name status');
    if (!key) return { valid: false, reason: 'Key not found' };
    if (key.status !== 'active') return { valid: false, reason: `Key status: ${key.status}` };
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { valid: false, reason: 'Key expired' };

    key.lastUsedAt = new Date();
    await key.save();

    return {
      valid: true,
      keyId: key._id,
      name: key.name,
      developer: key.developer,
      app: key.app,
      scopes: key.scopes,
      permissions: key.permissions,
      rateLimit: key.rateLimit,
    };
  }
}

export const developerPlatformService = new DeveloperPlatformService();
