import mongoose from 'mongoose';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class SecurityService {
  constructor() {
    this.failedAttempts = new Map();
    this.suspiciousIps = new Map();
    this.ipAllowList = new Set();
    this.BRUTE_FORCE_THRESHOLD = 5;
    this.BRUTE_FORCE_WINDOW = 300000;
    this.IMPOSSIBLE_TRAVEL_SPEED_KMH = 1000;
  }

  setIpAllowList(ips) {
    this.ipAllowList = new Set(ips);
  }

  isIpAllowed(ip) {
    if (this.ipAllowList.size === 0) return true;
    return this.ipAllowList.has(ip);
  }

  async recordFailedAttempt(ip, userId, action) {
    const now = Date.now();
    if (!this.failedAttempts.has(ip)) {
      this.failedAttempts.set(ip, []);
    }
    const attempts = this.failedAttempts.get(ip);
    attempts.push({ timestamp: now, userId, action });
    const recent = attempts.filter(a => now - a.timestamp < this.BRUTE_FORCE_WINDOW);
    this.failedAttempts.set(ip, recent);
    if (recent.length >= this.BRUTE_FORCE_THRESHOLD) {
      await this._handleBruteForce(ip, userId);
    }
    return recent.length;
  }

  async _handleBruteForce(ip, userId) {
    logger.warn(`Brute force detected from IP: ${ip}`);
    await logAuditEvent({
      userId, action: 'security.brute_force', category: 'system',
      description: `Brute force detected from IP: ${ip}`,
      status: 'failure',
    });
    this.suspiciousIps.set(ip, { detectedAt: Date.now(), type: 'brute_force', userId });
  }

  async detectImpossibleTravel(userId, currentIp, currentUserAgent) {
    try {
      const AuditLog = mongoose.model('AuditLog');
      const lastLogin = await AuditLog.findOne({
        userId, action: 'login', status: 'success',
      }).sort({ createdAt: -1 }).skip(1);
      if (!lastLogin || !lastLogin.ip || !lastLogin.createdAt) return null;
      const hoursSince = (Date.now() - new Date(lastLogin.createdAt).getTime()) / 3600000;
      if (hoursSince < 1 && lastLogin.ip !== currentIp) {
        await logAuditEvent({
          userId, action: 'security.impossible_travel', category: 'system',
          oldValue: { ip: lastLogin.ip, timestamp: lastLogin.createdAt },
          newValue: { ip: currentIp, userAgent: currentUserAgent },
          description: `Impossible travel detected for user ${userId}: ${lastLogin.ip} -> ${currentIp} in ${Math.round(hoursSince * 60)}min`,
          status: 'failure',
        });
        return { detected: true, previousIp: lastLogin.ip, currentIp };
      }
    } catch (e) { logger.error('Impossible travel check failed', e); }
    return null;
  }

  async detectSuspiciousActivity(data) {
    const { userId, ip, userAgent, action, resource } = data;
    const alerts = [];
    if (this.suspiciousIps.has(ip)) {
      alerts.push({ type: 'suspicious_ip', severity: 'high', message: `Request from suspicious IP: ${ip}` });
    }
    if (alerts.length > 0) {
      await logAuditEvent({
        userId, action: 'security.suspicious_activity', category: 'system',
        newValue: { ip, userAgent, action, resource, alerts },
        description: `Suspicious activity: ${alerts.map(a => a.type).join(', ')}`,
        status: 'failure',
      });
    }
    return alerts;
  }

  async detectApiAbuse(ip, endpoint) {
    const now = Date.now();
    const key = `${ip}:${endpoint}`;
    const windowMs = 60000;
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, []);
    }
    const requests = this.failedAttempts.get(key);
    requests.push(now);
    const recent = requests.filter(t => now - t < windowMs);
    this.failedAttempts.set(key, recent);
    if (recent.length > 100) {
      return { abuse: true, count: recent.length, windowMs };
    }
    return { abuse: false, count: recent.length };
  }

  async detectCredentialStuffing(ip, usernames) {
    if (usernames.length > 10) {
      await logAuditEvent({
        action: 'security.credential_stuffing', category: 'system',
        newValue: { ip, usernameCount: usernames.length, usernames },
        description: `Credential stuffing detected from IP: ${ip} with ${usernames.length} usernames`,
        status: 'failure',
      });
      return { detected: true, count: usernames.length };
    }
    return { detected: false, count: usernames.length };
  }

  async detectAccountTakeover(userId, currentIp, currentUserAgent, deviceFingerprint) {
    try {
      const AuditLog = mongoose.model('AuditLog');
      const recentLogins = await AuditLog.find({
        userId, action: 'login', status: 'success',
        createdAt: { $gte: new Date(Date.now() - 86400000) },
      }).sort({ createdAt: -1 }).limit(5);
      const uniqueIps = new Set(recentLogins.map(l => l.ip).filter(Boolean));
      const uniqueAgents = new Set(recentLogins.map(l => l.userAgent).filter(Boolean));
      if (uniqueIps.size > 3 || uniqueAgents.size > 3) {
        const alert = {
          detected: true,
          uniqueIps: uniqueIps.size,
          uniqueAgents: uniqueAgents.size,
          severity: 'high',
        };
        await logAuditEvent({
          userId, action: 'security.account_takeover', category: 'system',
          newValue: { currentIp, currentUserAgent, ...alert },
          description: `Potential account takeover detected for user ${userId}`,
          status: 'failure',
        });
        return alert;
      }
    } catch (e) { logger.error('Account takeover check failed', e); }
    return { detected: false };
  }

  async getSecurityReport() {
    const AuditLog = mongoose.model('AuditLog');
    const [totalEvents, failedLogins, suspiciousActivities, bruteForceAttempts] = await Promise.all([
      AuditLog.countDocuments({ category: 'system' }),
      AuditLog.countDocuments({ action: 'login', status: 'failure', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      AuditLog.countDocuments({ action: /^security\./, createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      AuditLog.countDocuments({ action: 'security.brute_force', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    const [failedLoginsByIp, recentEvents] = await Promise.all([
      AuditLog.aggregate([
        { $match: { action: 'login', status: 'failure', createdAt: { $gte: new Date(Date.now() - 86400000) } } },
        { $group: { _id: '$ip', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AuditLog.find({ category: 'system', createdAt: { $gte: new Date(Date.now() - 3600000) } })
        .sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    return {
      totalEvents, failedLogins, suspiciousActivities, bruteForceAttempts,
      failedLoginsByIp, recentEvents,
      suspiciousIps: Array.from(this.suspiciousIps.entries()).map(([ip, data]) => ({ ip, ...data })),
    };
  }

  async requireAdminApproval(action, userId, adminId) {
    await logAuditEvent({
      userId, action: `security.admin_approval.${action}`, category: 'system',
      oldValue: { requestedBy: userId },
      newValue: { approvedBy: adminId },
      description: `Admin approval for ${action} by ${adminId}`,
    });
    return { approved: true, approvedBy: adminId, approvedAt: new Date() };
  }

  getSecurityHeaders() {
    return {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss:;",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    };
  }
}

export const securityService = new SecurityService();
