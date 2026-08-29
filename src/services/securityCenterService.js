import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { FraudAlert } from '../models/FraudAlert.js';
import UserSession from '../models/UserSession.js';
import SecurityEvent from '../models/SecurityEvent.js';
import { logAuditEvent } from './auditService.js';

class SecurityCenterService {
  constructor() {
    this.blockedIps = new Map();
  }

  async getSecurityDashboard() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 86400000);
    const last7d = new Date(now.getTime() - 7 * 86400000);

    const [failedLogins, threats, blockedCount, activeSessions, securityEvents, openAlerts] = await Promise.all([
      AuditLog.countDocuments({ action: 'login', status: 'failure', createdAt: { $gte: last24h } }),
      FraudAlert.countDocuments({ severity: { $in: ['high', 'critical'] }, status: 'open', createdAt: { $gte: last7d } }),
      this.blockedIps.size,
      UserSession.countDocuments({ expiresAt: { $gte: now }, revokedAt: null }),
      SecurityEvent.countDocuments({ createdAt: { $gte: last7d } }),
      FraudAlert.countDocuments({ status: 'open' }),
    ]);

    const loginSuccess = await AuditLog.countDocuments({ action: 'login', status: 'success', createdAt: { $gte: last24h } });
    const totalLoginAttempts = failedLogins + loginSuccess;
    const topThreats = await FraudAlert.find({ severity: { $in: ['high', 'critical'] }, status: 'open' })
      .sort({ score: -1 }).limit(5).populate('vendor', 'storeName').populate('buyer', 'name').lean();

    return {
      overview: {
        failedLogins24h: failedLogins,
        activeThreats: threats,
        blockedIps: blockedCount,
        activeSessions,
        securityEvents7d: securityEvents,
        openAlerts,
        loginSuccessRate: totalLoginAttempts > 0 ? Math.round((loginSuccess / totalLoginAttempts) * 100) : 100,
      },
      topThreats: topThreats.map(t => ({
        id: t._id, type: t.type, severity: t.severity, score: t.score,
        description: t.description, entity: t.vendor?.storeName || t.buyer?.name || 'Unknown',
        detectedAt: t.createdAt,
      })),
      blockedIps: Array.from(this.blockedIps.entries()).map(([ip, data]) => ({ ip, ...data })),
      lastScan: new Date().toISOString(),
    };
  }

  async getThreats() {
    const threats = await FraudAlert.find({ status: { $in: ['open', 'investigating'] } })
      .sort({ score: -1 }).limit(50).populate('vendor', 'storeName').populate('buyer', 'name').lean();
    return threats.map(t => ({
      id: t._id, type: t.type, severity: t.severity, score: t.score,
      description: t.description, status: t.status,
      entity: t.vendor?.storeName || t.buyer?.name || 'Unknown',
      detectedAt: t.createdAt, evidence: t.evidence,
    }));
  }

  async getSecurityAlerts() {
    const alerts = await FraudAlert.find({ status: 'open' }).sort({ createdAt: -1 }).limit(50).lean();
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    const byType = {};
    for (const a of alerts) {
      bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
      byType[a.type] = (byType[a.type] || 0) + 1;
    }
    return { alerts, summary: { total: alerts.length, bySeverity, byType } };
  }

  async getBlockedIps() {
    return Array.from(this.blockedIps.entries()).map(([ip, data]) => ({
      ip, reason: data.reason, blockedAt: data.blockedAt, blockedBy: data.blockedBy,
      expiresAt: data.expiresAt, isExpired: data.expiresAt ? new Date(data.expiresAt) < new Date() : false,
    }));
  }

  async blockIp(ip, reason) {
    const data = { reason, blockedAt: new Date(), blockedBy: 'system', expiresAt: null };
    this.blockedIps.set(ip, data);
    await logAuditEvent({
      action: 'security.block_ip', category: 'system',
      entityType: 'BlockedIP', entityId: ip,
      newValue: { ip, reason },
      description: `IP blocked: ${ip} - ${reason}`,
    });
    return { ip, ...data };
  }

  async unblockIp(ip) {
    const existing = this.blockedIps.get(ip);
    if (!existing) return null;
    this.blockedIps.delete(ip);
    await logAuditEvent({
      action: 'security.unblock_ip', category: 'system',
      entityType: 'BlockedIP', entityId: ip,
      oldValue: existing,
      description: `IP unblocked: ${ip}`,
    });
    return { ip, unblockedAt: new Date() };
  }

  async getLoginAnalytics() {
    const last7d = new Date(Date.now() - 7 * 86400000);
    const [successCount, failedCount, dailyStats, byLocation] = await Promise.all([
      AuditLog.countDocuments({ action: 'login', status: 'success', createdAt: { $gte: last7d } }),
      AuditLog.countDocuments({ action: 'login', status: 'failure', createdAt: { $gte: last7d } }),
      AuditLog.aggregate([
        { $match: { action: 'login', createdAt: { $gte: last7d } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } } } },
        { $sort: { _id: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { action: 'login', createdAt: { $gte: last7d } } },
        { $group: { _id: '$ip', count: { $sum: 1 }, failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);
    const total = successCount + failedCount;
    return {
      totalAttempts: total, successCount, failedCount,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      dailyStats, byLocation,
    };
  }

  async getFailedLogins(query = {}) {
    const { startDate, endDate, limit = 50, ip } = query;
    const filter = { action: 'login', status: 'failure' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (ip) filter.ip = ip;
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit)
      .populate('userId', 'name email').lean();
    return logs.map(l => ({
      id: l._id, userId: l.userId, ip: l.ip, userAgent: l.userAgent,
      timestamp: l.createdAt, description: l.description,
    }));
  }

  async getAdminActions() {
    const logs = await AuditLog.find({ userRole: { $in: ['admin', 'super_admin'] } })
      .sort({ createdAt: -1 }).limit(100)
      .populate('userId', 'name email role').lean();
    return logs.map(l => ({
      id: l._id, admin: l.userId, action: l.action, category: l.category,
      entityType: l.entityType, entityId: l.entityId,
      description: l.description, timestamp: l.createdAt, ip: l.ip,
    }));
  }

  async getPasswordPolicies() {
    return {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      maxAge: 90,
      historySize: 5,
      lockoutThreshold: 5,
      lockoutDuration: 15,
    };
  }

  async updatePasswordPolicy(data) {
    await logAuditEvent({
      action: 'security.password_policy_update', category: 'system',
      newValue: data,
      description: 'Password policy updated',
    });
    return { ...data, updatedAt: new Date() };
  }

  async getActiveSessions() {
    const sessions = await UserSession.find({ expiresAt: { $gte: new Date() }, revokedAt: null })
      .populate('user', 'name email role').sort({ lastActivity: -1 }).lean();
    return sessions.map(s => ({
      id: s._id, user: s.user, deviceName: s.deviceName, browser: s.browser,
      os: s.os, ipAddress: s.ipAddress, country: s.country, city: s.city,
      lastActivity: s.lastActivity, isTrusted: s.isTrusted,
    }));
  }

  async terminateSession(sessionId) {
    const session = await UserSession.findByIdAndUpdate(sessionId,
      { revokedAt: new Date(), isCurrent: false }, { new: true });
    if (session) {
      await logAuditEvent({
        action: 'security.terminate_session', category: 'system',
        entityType: 'UserSession', entityId: sessionId,
        oldValue: { user: session.user, lastActivity: session.lastActivity },
        description: `Session terminated: ${sessionId}`,
      });
    }
    return session;
  }

  async getSecurityAudit() {
    const last30d = new Date(Date.now() - 30 * 86400000);
    const events = await AuditLog.find({
      $or: [
        { category: { $in: ['auth', 'system'] } },
        { action: { $regex: /^security\./ } },
        { action: { $in: ['login', 'logout', 'login_failed', 'password_changed', 'password_reset'] } },
      ],
      createdAt: { $gte: last30d },
    }).sort({ createdAt: -1 }).limit(200).populate('userId', 'name email').lean();
    const byAction = {};
    for (const e of events) { byAction[e.action] = (byAction[e.action] || 0) + 1; }
    return { events: events.map(e => this._formatSecurityEvent(e)), byAction, total: events.length };
  }

  async getIncidentTimeline() {
    const events = await SecurityEvent.find({}).sort({ createdAt: -1 }).limit(100)
      .populate('user', 'name email').lean();
    const timeline = events.map(e => ({
      id: e._id, user: e.user, action: e.action, status: e.status,
      ipAddress: e.ipAddress, details: e.details, timestamp: e.createdAt,
    }));
    const byAction = {};
    for (const e of timeline) { byAction[e.action] = (byAction[e.action] || 0) + 1; }
    return { timeline, summary: { total: timeline.length, byAction } };
  }

  _formatSecurityEvent(log) {
    return {
      id: log._id, timestamp: log.createdAt,
      user: log.userId ? { _id: log.userId._id, name: log.userId.name, email: log.userId.email } : null,
      action: log.action, category: log.category, description: log.description,
      ip: log.ip, userAgent: log.userAgent, status: log.status,
      oldValue: log.oldValue, newValue: log.newValue,
    };
  }
}

export const securityCenterService = new SecurityCenterService();
