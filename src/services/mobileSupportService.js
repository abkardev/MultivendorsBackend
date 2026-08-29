import mongoose from 'mongoose';
import MobileSyncSession from '../models/MobileSyncSession.js';
import MobilePushToken from '../models/MobilePushToken.js';
import SyncConflict from '../models/SyncConflict.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';
import crypto from 'crypto';

class MobileSupportService {
  async createSyncSession(userId, deviceInfo) {
    const { deviceId, deviceType, appVersion, metadata } = deviceInfo;
    if (!deviceId || !deviceType) throw new Error('deviceId and deviceType are required');
    if (!['ios', 'android', 'web'].includes(deviceType)) throw new Error('Invalid device type');
    const existing = await MobileSyncSession.findOne({ user: userId, deviceId });
    if (existing && existing.status === 'active') {
      existing.lastSyncAt = new Date();
      existing.appVersion = appVersion || existing.appVersion;
      existing.metadata = { ...existing.metadata, ...metadata };
      await existing.save();
      return existing;
    }
    if (existing) {
      existing.status = 'expired';
      await existing.save();
    }
    const syncToken = crypto.randomUUID();
    const session = await MobileSyncSession.create({
      user: userId, deviceId, deviceType,
      appVersion: appVersion || '1.0.0',
      syncToken, status: 'active', lastSyncAt: new Date(),
      lastCursor: { timestamp: new Date().toISOString(), sequence: 0 },
      metadata,
    });
    await logAuditEvent({
      userId, action: 'mobile.sync_session.create', category: 'mobile',
      entityType: 'MobileSyncSession', entityId: session._id,
      newValue: { deviceId, deviceType, appVersion },
      description: `Sync session created for ${deviceType} device ${deviceId}`,
    });
    return session;
  }

  async getSyncSessions(userId) {
    const sessions = await MobileSyncSession.find({ user: userId })
      .sort({ lastSyncAt: -1 })
      .lean();
    return sessions;
  }

  async revokeSyncSession(userId, id) {
    const session = await MobileSyncSession.findOne({ _id: id, user: userId });
    if (!session) throw new Error('Sync session not found');
    if (session.status === 'revoked') throw new Error('Session is already revoked');
    session.status = 'revoked';
    await session.save();
    await MobilePushToken.updateMany(
      { user: userId, deviceId: session.deviceId },
      { isActive: false },
    );
    await logAuditEvent({
      userId, action: 'mobile.sync_session.revoke', category: 'mobile',
      entityType: 'MobileSyncSession', entityId: id,
      oldValue: { status: session.status }, newValue: { status: 'revoked' },
      description: `Sync session revoked for device ${session.deviceId}`,
    });
    return session;
  }

  async registerPushToken(userId, data) {
    const { token, platform, deviceId } = data;
    if (!token || !platform) throw new Error('token and platform are required');
    if (!['ios', 'android', 'web'].includes(platform)) throw new Error('Invalid platform');
    const existing = await MobilePushToken.findOne({ token });
    if (existing) {
      existing.user = userId;
      existing.platform = platform;
      existing.deviceId = deviceId || existing.deviceId;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      await existing.save();
      return existing;
    }
    const pushToken = await MobilePushToken.create({
      user: userId, token, platform, deviceId, isActive: true, lastUsedAt: new Date(),
    });
    await logAuditEvent({
      userId, action: 'mobile.push_token.register', category: 'mobile',
      entityType: 'MobilePushToken', entityId: pushToken._id,
      newValue: { platform, deviceId },
      description: `Push token registered for ${platform}`,
    });
    return pushToken;
  }

  async unregisterPushToken(userId, token) {
    const pushToken = await MobilePushToken.findOne({ token, user: userId });
    if (!pushToken) throw new Error('Push token not found');
    pushToken.isActive = false;
    await pushToken.save();
    await logAuditEvent({
      userId, action: 'mobile.push_token.unregister', category: 'mobile',
      entityType: 'MobilePushToken', entityId: pushToken._id,
      description: `Push token unregistered for ${pushToken.platform}`,
    });
    return pushToken;
  }

  async getPushTokens(userId) {
    const tokens = await MobilePushToken.find({ user: userId, isActive: true })
      .sort({ lastUsedAt: -1 })
      .lean();
    return tokens;
  }

  async getChangesSince(sessionId, cursor, entityType) {
    const session = await MobileSyncSession.findById(sessionId);
    if (!session) throw new Error('Sync session not found');
    if (session.status !== 'active') throw new Error('Sync session is not active');
    const cursorTs = cursor?.timestamp || session.lastCursor?.timestamp || new Date(0).toISOString();
    const cursorSeq = cursor?.sequence || session.lastCursor?.sequence || 0;
    const entityTypes = entityType ? [entityType] : ['orders', 'products', 'contacts', 'messages', 'settings'];
    const changes = {};
    let totalChanges = 0;
    for (const et of entityTypes) {
      const mockChanges = [];
      const changeCount = Math.floor(Math.random() * 5);
      for (let i = 0; i < changeCount; i++) {
        mockChanges.push({
          entityType: et, entityId: `${et}_${crypto.randomUUID().slice(0, 8)}`,
          operation: ['created', 'updated', 'deleted'][Math.floor(Math.random() * 3)],
          data: { id: crypto.randomUUID().slice(0, 8), syncedAt: new Date().toISOString() },
          sequence: cursorSeq + totalChanges + i + 1,
          timestamp: new Date().toISOString(),
        });
      }
      changes[et] = mockChanges;
      totalChanges += changeCount;
    }
    const newCursor = {
      timestamp: new Date().toISOString(),
      sequence: cursorSeq + totalChanges,
    };
    session.lastCursor = newCursor;
    session.lastSyncAt = new Date();
    await session.save();
    return { changes, cursor: newCursor, totalChanges, sessionId };
  }

  async applyChanges(userId, sessionId, changes) {
    const session = await MobileSyncSession.findOne({ _id: sessionId, user: userId });
    if (!session) throw new Error('Sync session not found');
    if (session.status !== 'active') throw new Error('Sync session is not active');
    const conflicts = [];
    const applied = [];
    for (const change of changes || []) {
      const { entityType, entityId, operation, data, version } = change;
      const existingConflict = await SyncConflict.findOne({
        user: userId, entityType, entityId,
        resolution: 'pending',
      });
      if (existingConflict) {
        conflicts.push({
          conflictId: existingConflict._id, entityType, entityId,
          message: `Conflict exists for ${entityType}:${entityId}`,
        });
        continue;
      }
      if (version && Math.random() < 0.1) {
        const conflict = await SyncConflict.create({
          user: userId, entityType, entityId,
          localVersion: data,
          serverVersion: { version, message: 'Server has a newer version' },
          localData: data,
          serverData: { syncedAt: new Date().toISOString(), version },
          resolution: 'pending',
        });
        conflicts.push({
          conflictId: conflict._id, entityType, entityId,
          message: `Version conflict detected for ${entityType}:${entityId}`,
        });
      } else {
        applied.push({
          entityType, entityId, operation,
          appliedAt: new Date().toISOString(),
        });
      }
    }
    session.lastSyncAt = new Date();
    await session.save();
    await logAuditEvent({
      userId, action: 'mobile.changes.apply', category: 'mobile',
      entityType: 'MobileSyncSession', entityId: sessionId,
      newValue: { appliedCount: applied.length, conflictCount: conflicts.length },
      description: `${applied.length} changes applied, ${conflicts.length} conflicts detected`,
    });
    return { applied, conflicts, sessionId };
  }

  async resolveConflict(userId, conflictId, resolution, data) {
    const conflict = await SyncConflict.findOne({ _id: conflictId, user: userId });
    if (!conflict) throw new Error('Conflict not found');
    if (conflict.resolution !== 'pending') throw new Error('Conflict is already resolved');
    if (!['resolved_local', 'resolved_server', 'resolved_manual', 'ignored'].includes(resolution)) {
      throw new Error('Invalid resolution strategy');
    }
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = userId;
    if (resolution === 'resolved_manual' && data) {
      conflict.serverData = { ...conflict.serverData, resolvedValue: data };
    }
    await conflict.save();
    await logAuditEvent({
      userId, action: 'mobile.conflict.resolve', category: 'mobile',
      entityType: 'SyncConflict', entityId: conflictId,
      oldValue: { resolution: 'pending' }, newValue: { resolution },
      description: `Conflict resolved with strategy: ${resolution}`,
    });
    return conflict;
  }

  async getConflicts(userId) {
    const conflicts = await SyncConflict.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
    return conflicts;
  }

  async getSyncAnalytics() {
    const [totalSessions, activeSessions, totalDevices, platformBreakdown, conflictStats] = await Promise.all([
      MobileSyncSession.countDocuments(),
      MobileSyncSession.countDocuments({ status: 'active' }),
      MobileSyncSession.distinct('deviceId').then(ids => ids.length),
      MobileSyncSession.aggregate([
        { $group: { _id: '$deviceType', count: { $sum: 1 } } },
      ]),
      SyncConflict.aggregate([
        { $group: { _id: '$resolution', count: { $sum: 1 } } },
      ]),
    ]);
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sessions24h = await MobileSyncSession.countDocuments({ lastSyncAt: { $gte: last24h } });
    const totalTokens = await MobilePushToken.countDocuments({ isActive: true });
    return {
      totalSessions,
      activeSessions,
      revokedSessions: await MobileSyncSession.countDocuments({ status: 'revoked' }),
      expiredSessions: await MobileSyncSession.countDocuments({ status: 'expired' }),
      uniqueDevices: totalDevices,
      sessionsLast24h: sessions24h,
      activePushTokens: totalTokens,
      byPlatform: platformBreakdown.reduce((acc, p) => { acc[p._id] = p.count; return acc; }, {}),
      conflicts: {
        total: await SyncConflict.countDocuments(),
        pending: await SyncConflict.countDocuments({ resolution: 'pending' }),
        resolved: await SyncConflict.countDocuments({ resolution: { $ne: 'pending' } }),
        byType: conflictStats.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {}),
      },
    };
  }

  async sendPushNotification(userId, title, body, data) {
    const tokens = await MobilePushToken.find({ user: userId, isActive: true }).lean();
    if (tokens.length === 0) throw new Error('No active push tokens found for this user');
    const notification = {
      id: generateCorrelationId(),
      title, body, data: data || {},
      tokens: tokens.map(t => ({ token: t.token, platform: t.platform })),
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    console.log(`[PUSH SIMULATED] Notification sent to user ${userId}:`, JSON.stringify(notification));
    await MobilePushToken.updateMany(
      { _id: { $in: tokens.map(t => t._id) } },
      { $set: { lastUsedAt: new Date() } },
    );
    await logAuditEvent({
      userId, action: 'mobile.push.send', category: 'mobile',
      entityType: 'PushNotification', entityId: notification.id,
      newValue: { title, body, deviceCount: tokens.length },
      description: `Push notification sent: ${title}`,
    });
    return notification;
  }

  async broadcastPushNotification(userIds, title, body, data) {
    const tokens = await MobilePushToken.find({ user: { $in: userIds }, isActive: true }).lean();
    if (tokens.length === 0) throw new Error('No active push tokens found for any of the specified users');
    const userIdTokenMap = {};
    for (const token of tokens) {
      const uid = token.user.toString();
      if (!userIdTokenMap[uid]) userIdTokenMap[uid] = [];
      userIdTokenMap[uid].push({ token: token.token, platform: token.platform });
    }
    const notification = {
      id: generateCorrelationId(),
      title, body, data: data || {},
      targetUsers: userIds.length,
      tokensDelivered: tokens.length,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };
    console.log(`[PUSH BROADCAST SIMULATED] Broadcast to ${userIds.length} users, ${tokens.length} devices:`, JSON.stringify(notification));
    const tokenIds = tokens.map(t => t._id);
    await MobilePushToken.updateMany(
      { _id: { $in: tokenIds } },
      { $set: { lastUsedAt: new Date() } },
    );
    await logAuditEvent({
      userId: userIds[0], action: 'mobile.push.broadcast', category: 'mobile',
      entityType: 'PushNotification', entityId: notification.id,
      newValue: { title, targetUsers: userIds.length, deviceCount: tokens.length },
      description: `Push broadcast sent: ${title} to ${userIds.length} users`,
    });
    return notification;
  }
}

export const mobileSupportService = new MobileSupportService();
