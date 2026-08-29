import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey.js';
import { ClientApplication } from '../models/ClientApplication.js';
import { RatePlan } from '../models/RatePlan.js';
import { WebhookEndpoint } from '../models/WebhookEndpoint.js';
import { WebhookEvent } from '../models/WebhookEvent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ApiManagementService {
  constructor() {
    this.rateLimitCache = new Map();
    this.keyCache = new Map();
    this.CACHE_TTL = 60000;
  }

  async createApiKey(data, userId) {
    const generated = ApiKey.generateKey();
    const apiKey = await ApiKey.create({
      ...data,
      ...generated,
      user: userId,
      scopes: data.scopes || ['read'],
    });
    await logAuditEvent({
      userId, action: 'apikey.create', category: 'system',
      entityType: 'ApiKey', entityId: apiKey._id,
      newValue: { name: data.name, scopes: data.scopes },
      description: `Created API key: ${data.name}`,
    });
    return { apiKey, rawKey: generated.key };
  }

  async validateApiKey(key) {
    if (!key || !key.startsWith('mve_')) return null;
    const prefix = key.split('_').slice(0, 2).join('_');
    const cached = this.keyCache.get(prefix);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.apiKey;
    }
    const apiKey = await ApiKey.findOne({ keyPrefix: prefix, isActive: true });
    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;
    if (!apiKey.verifyKey(key)) return null;
    this.keyCache.set(prefix, { apiKey, timestamp: Date.now() });
    await ApiKey.findByIdAndUpdate(apiKey._id, {
      lastUsedAt: new Date(),
      $inc: { usageCount: 1 },
    });
    return apiKey;
  }

  async revokeApiKey(keyId, userId, reason) {
    const apiKey = await ApiKey.findByIdAndUpdate(
      keyId,
      { isActive: false, revokedAt: new Date(), revokedBy: userId, revokedReason: reason },
      { new: true },
    );
    if (apiKey) {
      this.keyCache.delete(apiKey.keyPrefix);
      await logAuditEvent({
        userId, action: 'apikey.revoke', category: 'system',
        entityType: 'ApiKey', entityId: apiKey._id,
        oldValue: { name: apiKey.name },
        description: `Revoked API key: ${apiKey.name} - ${reason}`,
      });
    }
    return apiKey;
  }

  async listApiKeys(userId) {
    return ApiKey.find({ user: userId }).sort({ createdAt: -1 });
  }

  async getApiKeyUsage(keyId) {
    return ApiKey.findById(keyId).select('usageCount lastUsedAt lastUsedIp');
  }

  async rotateApiKey(keyId, userId) {
    const existing = await ApiKey.findById(keyId);
    if (!existing) throw new Error('API key not found');
    const generated = ApiKey.generateKey();
    existing.key = generated.key;
    existing.hashedKey = generated.hashedKey;
    existing.keyPrefix = generated.keyPrefix;
    existing.lastUsedAt = null;
    await existing.save();
    await logAuditEvent({
      userId, action: 'apikey.rotate', category: 'system',
      entityType: 'ApiKey', entityId: existing._id,
      description: `Rotated API key: ${existing.name}`,
    });
    return { apiKey: existing, rawKey: generated.key };
  }

  async createClientApplication(data, userId) {
    const app = await ClientApplication.create({
      ...data,
      clientId: ClientApplication.generateClientId(),
      clientSecret: data.type !== 'public' ? ClientApplication.generateClientSecret() : undefined,
      owner: userId,
    });
    await logAuditEvent({
      userId, action: 'client.create', category: 'system',
      entityType: 'ClientApplication', entityId: app._id,
      newValue: { name: data.name, type: data.type },
      description: `Created client application: ${data.name}`,
    });
    return app;
  }

  async listClientApplications(userId) {
    return ClientApplication.find({ owner: userId }).sort({ createdAt: -1 });
  }

  async createRatePlan(data) {
    return RatePlan.create(data);
  }

  async listRatePlans() {
    return RatePlan.find({ isActive: true }).sort({ priority: -1 });
  }

  async getUsageStats() {
    const [totalKeys, activeKeys, totalApps, totalWebhooks] = await Promise.all([
      ApiKey.countDocuments(),
      ApiKey.countDocuments({ isActive: true }),
      ClientApplication.countDocuments(),
      WebhookEndpoint.countDocuments({ isActive: true }),
    ]);
    return { totalKeys, activeKeys, totalApps, totalWebhooks };
  }

  async createWebhookEndpoint(data, userId) {
    const endpoint = await WebhookEndpoint.create({
      ...data,
      secret: WebhookEndpoint.generateSecret(),
      user: userId,
    });
    await logAuditEvent({
      userId, action: 'webhook.create', category: 'system',
      entityType: 'WebhookEndpoint', entityId: endpoint._id,
      newValue: { name: data.name, url: data.url, events: data.events },
      description: `Created webhook endpoint: ${data.name}`,
    });
    return endpoint;
  }

  async updateWebhookEndpoint(id, data, userId) {
    const endpoint = await WebhookEndpoint.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (endpoint) {
      await logAuditEvent({
        userId, action: 'webhook.update', category: 'system',
        entityType: 'WebhookEndpoint', entityId: endpoint._id,
        newValue: data,
        description: `Updated webhook endpoint: ${endpoint.name}`,
      });
    }
    return endpoint;
  }

  async deleteWebhookEndpoint(id, userId) {
    const endpoint = await WebhookEndpoint.findById(id);
    if (endpoint) {
      endpoint.isActive = false;
      endpoint.isPaused = true;
      await endpoint.save();
      await logAuditEvent({
        userId, action: 'webhook.delete', category: 'system',
        entityType: 'WebhookEndpoint', entityId: endpoint._id,
        description: `Deleted webhook endpoint: ${endpoint.name}`,
      });
    }
    return endpoint;
  }

  async pauseWebhookEndpoint(id, userId, reason) {
    return WebhookEndpoint.findByIdAndUpdate(id, {
      isPaused: true, pausedAt: new Date(), pausedReason: reason,
    }, { new: true });
  }

  async resumeWebhookEndpoint(id, userId) {
    return WebhookEndpoint.findByIdAndUpdate(id, {
      isPaused: false, pausedAt: null, pausedReason: null,
      consecutiveFailures: 0,
    }, { new: true });
  }

  async listWebhookEndpoints(userId) {
    return WebhookEndpoint.find({ user: userId, isActive: true }).sort({ createdAt: -1 });
  }

  async deliverWebhook(endpointId, event, payload) {
    const endpoint = await WebhookEndpoint.findById(endpointId);
    if (!endpoint || !endpoint.isActive || endpoint.isPaused) return null;

    const webhookEvent = await WebhookEvent.create({
      endpoint: endpointId,
      event,
      payload,
      correlationId: `wh_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`,
      maxAttempts: endpoint.retryConfig.maxRetries + 1,
    });

    return this._attemptDelivery(webhookEvent, endpoint);
  }

  async _attemptDelivery(webhookEvent, endpoint) {
    const t0 = Date.now();
    webhookEvent.attempts++;
    webhookEvent.lastAttemptAt = new Date();

    try {
      const signature = crypto
        .createHmac('sha256', endpoint.secret)
        .update(JSON.stringify(webhookEvent.payload))
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': webhookEvent.event,
        'X-Webhook-ID': webhookEvent._id.toString(),
        'X-Webhook-Timestamp': Math.floor(Date.now() / 1000).toString(),
        ...Object.fromEntries(endpoint.headers || new Map()),
      };

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(webhookEvent.payload),
        timeout: 30000,
      });

      webhookEvent.responseStatusCode = response.status;
      webhookEvent.responseBody = await response.text().catch(() => '');
      webhookEvent.durationMs = Date.now() - t0;

      if (response.status >= 200 && response.status < 300) {
        webhookEvent.status = 'delivered';
        webhookEvent.deliveredAt = new Date();
        endpoint.lastDeliveryAt = new Date();
        endpoint.lastDeliveryStatus = 'success';
        endpoint.consecutiveFailures = 0;
      } else {
        throw new Error(`HTTP ${response.status}: ${webhookEvent.responseBody}`);
      }
    } catch (err) {
      webhookEvent.errorMessage = err.message;
      webhookEvent.durationMs = Date.now() - t0;

      if (webhookEvent.attempts < webhookEvent.maxAttempts) {
        const delay = endpoint.retryConfig.initialDelayMs *
          Math.pow(endpoint.retryConfig.backoffFactor, webhookEvent.attempts - 1);
        webhookEvent.status = 'retrying';
        webhookEvent.nextAttemptAt = new Date(Date.now() + delay);
      } else {
        webhookEvent.status = 'failed';
        endpoint.lastDeliveryStatus = 'failed';
        endpoint.consecutiveFailures++;
        if (endpoint.consecutiveFailures >= 10) {
          endpoint.isPaused = true;
          endpoint.pausedAt = new Date();
          endpoint.pausedReason = 'Auto-paused after 10 consecutive failures';
        }
      }
    }

    await webhookEvent.save();
    await endpoint.save();
    return webhookEvent;
  }

  async retryWebhookEvent(eventId) {
    const webhookEvent = await WebhookEvent.findById(eventId);
    if (!webhookEvent) throw new Error('Webhook event not found');
    const endpoint = await WebhookEndpoint.findById(webhookEvent.endpoint);
    if (!endpoint) throw new Error('Webhook endpoint not found');
    webhookEvent.status = 'pending';
    webhookEvent.attempts = 0;
    webhookEvent.errorMessage = null;
    await webhookEvent.save();
    return this._attemptDelivery(webhookEvent, endpoint);
  }

  async listWebhookEvents(endpointId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    const filter = { endpoint: endpointId };
    if (status) filter.status = status;
    const [events, total] = await Promise.all([
      WebhookEvent.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      WebhookEvent.countDocuments(filter),
    ]);
    return { events, total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async getWebhookStats(endpointId) {
    const [total, delivered, failed, retrying] = await Promise.all([
      WebhookEvent.countDocuments({ endpoint: endpointId }),
      WebhookEvent.countDocuments({ endpoint: endpointId, status: 'delivered' }),
      WebhookEvent.countDocuments({ endpoint: endpointId, status: 'failed' }),
      WebhookEvent.countDocuments({ endpoint: endpointId, status: 'retrying' }),
    ]);
    return { total, delivered, failed, retrying, successRate: total > 0 ? (delivered / total) * 100 : 100 };
  }

  async regenerateWebhookSecret(endpointId, userId) {
    const endpoint = await WebhookEndpoint.findById(endpointId);
    if (!endpoint) throw new Error('Webhook endpoint not found');
    endpoint.secret = WebhookEndpoint.generateSecret();
    await endpoint.save();
    await logAuditEvent({
      userId, action: 'webhook.secret.regenerate', category: 'system',
      entityType: 'WebhookEndpoint', entityId: endpoint._id,
      description: `Regenerated webhook secret: ${endpoint.name}`,
    });
    return endpoint;
  }
}

export const apiManagementService = new ApiManagementService();
