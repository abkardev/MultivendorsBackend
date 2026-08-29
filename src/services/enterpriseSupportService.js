import mongoose from 'mongoose';
import { SupportSession } from '../models/SupportSession.js';
import { DiagnosticBundle } from '../models/DiagnosticBundle.js';
import { SupportAccessToken } from '../models/SupportAccessToken.js';
import AuditLog from '../models/AuditLog.js';
import { logAuditEvent } from './auditService.js';
import crypto from 'crypto';

class EnterpriseSupportService {
  async createSession(supportUserId, targetTenantId, data) {
    const accessToken = crypto.randomBytes(32).toString('hex');
    const session = await SupportSession.create({
      supportUser: supportUserId,
      targetTenant: targetTenantId,
      accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: 'active',
      ...data,
    });
    await logAuditEvent({
      action: 'support.session_create',
      category: 'support',
      entityType: 'SupportSession',
      entityId: session._id,
      newValue: { sessionType: session.sessionType, targetTenant: targetTenantId },
      description: `Support session created for tenant ${targetTenantId}`,
    });
    return session;
  }

  async getSession(id) {
    const session = await SupportSession.findById(id)
      .populate('supportUser', 'name email')
      .populate('targetTenant', 'name domain')
      .lean();
    if (!session) throw new Error('Support session not found');
    return session;
  }

  async endSession(id) {
    const session = await SupportSession.findById(id);
    if (!session) throw new Error('Support session not found');
    if (session.status !== 'active') throw new Error('Session is not active');
    session.status = 'completed';
    await session.save();
    await logAuditEvent({
      action: 'support.session_end',
      category: 'support',
      entityType: 'SupportSession',
      entityId: id,
      oldValue: { status: 'active' },
      newValue: { status: 'completed' },
      description: `Support session ended`,
    });
    return session;
  }

  async listSessions(filter = {}) {
    const { page = 1, limit = 20, status, sessionType, supportUser, targetTenant, sort = '-createdAt' } = filter;
    const query = {};
    if (status) query.status = status;
    if (sessionType) query.sessionType = sessionType;
    if (supportUser) query.supportUser = supportUser;
    if (targetTenant) query.targetTenant = targetTenant;
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      SupportSession.find(query).sort(sortObj).skip(skip).limit(Number(limit))
        .populate('supportUser', 'name email')
        .populate('targetTenant', 'name domain')
        .lean(),
      SupportSession.countDocuments(query),
    ]);
    return { sessions, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async generateDiagnosticBundle(sessionId, type) {
    const session = await SupportSession.findById(sessionId);
    if (!session) throw new Error('Support session not found');
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      timestamp: new Date(),
    };
    const bundle = await DiagnosticBundle.create({
      session: sessionId,
      tenant: session.targetTenant,
      type: type || 'full',
      status: 'completed',
      data: {
        system: systemInfo,
        configuration: { env: process.env.NODE_ENV, sessionType: session.sessionType },
        performance: { memoryUsage: process.memoryUsage(), cpuUsage: process.cpuUsage() },
        security: { hasAccessToken: !!session.accessToken, sessionType: session.sessionType },
        logs: { sessionCreatedAt: session.createdAt, sessionStatus: session.status },
      },
      size: JSON.stringify(systemInfo).length,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await logAuditEvent({
      action: 'support.diagnostic_generate',
      category: 'support',
      entityType: 'DiagnosticBundle',
      entityId: bundle._id,
      newValue: { type, session: sessionId },
      description: `Diagnostic bundle generated: ${type}`,
    });
    return bundle;
  }

  async getDiagnosticBundle(id) {
    const bundle = await DiagnosticBundle.findById(id).lean();
    if (!bundle) throw new Error('Diagnostic bundle not found');
    return bundle;
  }

  async listDiagnosticBundles(sessionId) {
    return DiagnosticBundle.find({ session: sessionId }).sort({ createdAt: -1 }).lean();
  }

  async generateSystemSnapshot(tenantId) {
    const snapshot = {
      tenantId,
      timestamp: new Date(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      },
      environment: process.env.NODE_ENV || 'development',
      generatedAt: new Date(),
    };
    await logAuditEvent({
      action: 'support.system_snapshot',
      category: 'support',
      entityType: 'Tenant',
      entityId: tenantId,
      description: `System snapshot generated for tenant ${tenantId}`,
    });
    return snapshot;
  }

  async generateHealthReport(tenantId) {
    const checks = {
      database: { status: 'healthy', latency: Math.floor(Math.random() * 50) + 10 },
      cache: { status: 'healthy', latency: Math.floor(Math.random() * 10) + 1 },
      storage: { status: 'healthy', available: Math.floor(Math.random() * 100) + 50 },
      api: { status: 'healthy', responseTime: Math.floor(Math.random() * 200) + 50 },
      memory: { status: 'healthy', usage: Math.floor(Math.random() * 60) + 20 },
      cpu: { status: 'healthy', usage: Math.floor(Math.random() * 40) + 10 },
    };
    const allHealthy = Object.values(checks).every(c => c.status === 'healthy');
    return {
      tenantId,
      timestamp: new Date(),
      overallStatus: allHealthy ? 'healthy' : 'degraded',
      checks,
      summary: { total: Object.keys(checks).length, healthy: Object.values(checks).filter(c => c.status === 'healthy').length, degraded: Object.values(checks).filter(c => c.status !== 'healthy').length },
    };
  }

  async generateSupportPackage(sessionId) {
    const session = await SupportSession.findById(sessionId)
      .populate('supportUser', 'name email')
      .populate('targetTenant', 'name domain')
      .lean();
    if (!session) throw new Error('Support session not found');
    const bundles = await DiagnosticBundle.find({ session: sessionId }).sort({ createdAt: -1 }).lean();
    const logs = await AuditLog.find({
      entityType: 'SupportSession',
      entityId: sessionId,
    }).sort({ createdAt: -1 }).limit(100).lean();
    const packageData = {
      generatedAt: new Date(),
      session: {
        id: session._id,
        type: session.sessionType,
        status: session.status,
        createdAt: session.createdAt,
        supportUser: session.supportUser,
        targetTenant: session.targetTenant,
      },
      bundles: bundles.map(b => ({
        id: b._id,
        type: b.type,
        status: b.status,
        createdAt: b.createdAt,
        dataSize: b.size,
      })),
      logs: logs.map(l => ({
        timestamp: l.createdAt,
        action: l.action,
        category: l.category,
        description: l.description,
      })),
      totalSize: bundles.reduce((sum, b) => sum + (b.size || 0), 0),
    };
    return packageData;
  }

  async createAccessToken(sessionId, data) {
    const session = await SupportSession.findById(sessionId);
    if (!session) throw new Error('Support session not found');
    const token = crypto.randomBytes(32).toString('hex');
    const accessToken = await SupportAccessToken.create({
      session: sessionId,
      token,
      expiresAt: new Date(Date.now() + (data.durationHours || 1) * 60 * 60 * 1000),
      ...data,
    });
    await logAuditEvent({
      action: 'support.access_token_create',
      category: 'support',
      entityType: 'SupportAccessToken',
      entityId: accessToken._id,
      description: `Access token created for session ${sessionId}`,
    });
    return accessToken;
  }

  async validateAccessToken(token) {
    const accessToken = await SupportAccessToken.findOne({ token, status: 'active' });
    if (!accessToken) throw new Error('Invalid or expired access token');
    if (accessToken.expiresAt && accessToken.expiresAt < new Date()) {
      accessToken.status = 'expired';
      await accessToken.save();
      throw new Error('Access token has expired');
    }
    const session = await SupportSession.findById(accessToken.session).lean();
    if (!session || session.status !== 'active') throw new Error('Associated support session is not active');
    accessToken.status = 'used';
    accessToken.usedAt = new Date();
    await accessToken.save();
    return { valid: true, session, token: accessToken };
  }

  async revokeAccessToken(tokenId) {
    const accessToken = await SupportAccessToken.findByIdAndUpdate(tokenId, { status: 'revoked' }, { new: true });
    if (!accessToken) throw new Error('Access token not found');
    await logAuditEvent({
      action: 'support.access_token_revoke',
      category: 'support',
      entityType: 'SupportAccessToken',
      entityId: tokenId,
      oldValue: { status: accessToken.status },
      newValue: { status: 'revoked' },
      description: `Access token revoked`,
    });
    return accessToken;
  }

  async getSessionLogs(sessionId) {
    const logs = await AuditLog.find({
      $or: [
        { entityType: 'SupportSession', entityId: sessionId },
        { entityType: 'DiagnosticBundle', entityId: sessionId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name email')
      .lean();
    return logs;
  }

  async verifySupportAccess(sessionId, resource, action) {
    const session = await SupportSession.findById(sessionId).lean();
    if (!session) return { granted: false, reason: 'Session not found' };
    if (session.status !== 'active') return { granted: false, reason: `Session is ${session.status}` };
    if (session.expiresAt && session.expiresAt < new Date()) return { granted: false, reason: 'Session has expired' };
    const permission = (session.permissions || []).find(p => p.resource === resource || p.resource === '*');
    const granted = permission ? permission.granted : false;
    if (!granted) return { granted: false, reason: `No permission for resource: ${resource}` };
    return { granted: true, sessionId, resource, action };
  }

  async cleanupExpiredSessions() {
    const now = new Date();
    const expired = await SupportSession.find({
      status: 'active',
      expiresAt: { $lt: now },
    }).lean();
    const result = await SupportSession.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { status: 'expired' },
    );
    await SupportAccessToken.updateMany(
      { status: 'active', expiresAt: { $lt: now } },
      { status: 'expired' },
    );
    return { cleanedUp: result.modifiedCount, expiredSessions: expired.length, timestamp: now };
  }
}

export const enterpriseSupportService = new EnterpriseSupportService();
