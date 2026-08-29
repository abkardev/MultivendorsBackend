import AuditLog from '../models/AuditLog.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseAuditCenterService {
  async getAuditTimeline(query = {}) {
    const { entityType, action, userId, startDate, endDate, limit = 50, offset = 0, category } = query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit)
        .populate('userId', 'name email role').lean(),
      AuditLog.countDocuments(filter),
    ]);
    return {
      logs: logs.map(l => this._formatLog(l)),
      total, page: Math.floor(offset / limit) + 1, limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getEntityHistory(entityType, entityId) {
    const logs = await AuditLog.find({ entityType, entityId })
      .sort({ createdAt: -1 }).populate('userId', 'name email').lean();
    return logs.map(l => this._formatLog(l));
  }

  async getUserHistory(userId) {
    const logs = await AuditLog.find({ userId })
      .sort({ createdAt: -1 }).limit(100).lean();
    return logs.map(l => this._formatLog(l));
  }

  async getActionHistory(action) {
    const logs = await AuditLog.find({ action: new RegExp(action, 'i') })
      .sort({ createdAt: -1 }).limit(100).populate('userId', 'name email').lean();
    return logs.map(l => this._formatLog(l));
  }

  async getSecurityEvents() {
    const securityCategories = ['auth', 'system'];
    const securityActions = ['login', 'logout', 'login_failed', 'password_changed', 'password_reset',
      'security.brute_force', 'security.suspicious_activity', 'security.impossible_travel',
      'security.account_takeover', 'security.admin_approval'];
    const logs = await AuditLog.find({
      $or: [
        { category: { $in: securityCategories } },
        { action: { $in: securityActions } },
      ],
    }).sort({ createdAt: -1 }).limit(100).populate('userId', 'name email').lean();
    return logs.map(l => this._formatLog(l));
  }

  async getConfigurationChanges() {
    const logs = await AuditLog.find({
      $or: [
        { action: { $in: ['config.update', 'config.create', 'config.delete', 'config.rollback', 'runtime.override'] } },
        { category: 'system', entityType: 'PlatformSetting' },
      ],
    }).sort({ createdAt: -1 }).limit(100).populate('userId', 'name email').lean();
    return logs.map(l => this._formatLog(l));
  }

  async getPermissionChanges() {
    const logs = await AuditLog.find({
      $or: [
        { action: { $regex: /role|permission|rbac|access|grant|revoke/i } },
        { entityType: { $in: ['Role', 'Permission', 'RBAC'] } },
      ],
    }).sort({ createdAt: -1 }).limit(100).populate('userId', 'name email').lean();
    return logs.map(l => this._formatLog(l));
  }

  async correlateEvents(criteria) {
    const { userId, ip, timeWindowMinutes = 60, action } = criteria;
    const since = new Date(Date.now() - timeWindowMinutes * 60000);
    const filter = { createdAt: { $gte: since } };
    if (userId) filter.userId = userId;
    if (ip) filter.ip = ip;
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter).sort({ createdAt: 1 }).lean();
    const correlations = [];
    for (let i = 0; i < logs.length; i++) {
      for (let j = i + 1; j < logs.length; j++) {
        const timeDiff = Math.abs(new Date(logs[j].createdAt) - new Date(logs[i].createdAt)) / 1000;
        if (timeDiff < 300 && logs[i].action !== logs[j].action) {
          correlations.push({
            events: [this._formatLog(logs[i]), this._formatLog(logs[j])],
            timeDiffSeconds: Math.round(timeDiff),
            type: logs[i].entityType === logs[j].entityType ? 'same_entity' : 'related_activity',
          });
        }
      }
    }
    return { correlations: correlations.slice(0, 50), totalEvents: logs.length };
  }

  async getDiff(entityType, entityId, version1, version2) {
    const log1 = version1 ? await AuditLog.findById(version1).lean() : null;
    const log2 = version2 ? await AuditLog.findById(version2).lean() : null;
    if (!log1 && !log2) {
      const logs = await AuditLog.find({ entityType, entityId })
        .sort({ createdAt: -1 }).limit(2).lean();
      return this._computeDiff(logs[1] || {}, logs[0] || {});
    }
    return this._computeDiff(log1 || {}, log2 || {});
  }

  _computeDiff(oldLog, newLog) {
    const oldVal = oldLog.newValue || {};
    const newVal = newLog.newValue || {};
    const changes = [];
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
    for (const key of allKeys) {
      const oldStr = JSON.stringify(oldVal[key]);
      const newStr = JSON.stringify(newVal[key]);
      if (oldStr !== newStr) {
        changes.push({ field: key, oldValue: oldVal[key], newValue: newVal[key], changeType: oldVal[key] === undefined ? 'added' : newVal[key] === undefined ? 'removed' : 'modified' });
      }
    }
    return {
      oldVersion: { timestamp: oldLog.createdAt, user: oldLog.userId, action: oldLog.action },
      newVersion: { timestamp: newLog.createdAt, user: newLog.userId, action: newLog.action },
      changes,
      totalChanges: changes.length,
    };
  }

  async searchAuditLogs(query, options = {}) {
    const { limit = 50, offset = 0 } = options;
    const searchRegex = new RegExp(query, 'i');
    const filter = {
      $or: [
        { action: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
        { entityType: searchRegex },
      ],
    };
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).populate('userId', 'name email').lean(),
      AuditLog.countDocuments(filter),
    ]);
    return { logs: logs.map(l => this._formatLog(l)), total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async getCorrelatedEvents(correlationId) {
    const logs = await AuditLog.find({ correlationId }).sort({ createdAt: 1 }).lean();
    return logs.map(l => this._formatLog(l));
  }

  async getComplianceReport(startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const [totalEvents, byCategory, byAction, byUser, failedEvents, dailyActivity] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      AuditLog.aggregate([{ $match: filter }, { $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 30 }]),
      AuditLog.aggregate([{ $match: filter }, { $group: { _id: '$userId', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      AuditLog.countDocuments({ ...filter, status: 'failure' }),
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } } } },
        { $sort: { _id: -1 } },
      ]),
    ]);
    return { totalEvents, byCategory, byAction, byUser, failedEvents, failureRate: totalEvents > 0 ? (failedEvents / totalEvents) * 100 : 0, dailyActivity, period: { startDate, endDate } };
  }

  async exportCsv(query = {}) {
    const data = await this.getAuditTimeline({ ...query, limit: 10000 });
    const headers = ['Timestamp', 'User', 'User Role', 'Action', 'Category', 'Entity Type', 'Entity ID', 'Description', 'IP', 'Status', 'User Agent'];
    const rows = data.logs.map(l => [
      l.timestamp, l.user?.name || l.user?._id || 'N/A', l.userRole,
      l.action, l.category, l.entityType, l.entityId,
      l.description, l.ip, l.status, l.userAgent,
    ]);
    return { headers, rows, total: data.total };
  }

  _formatLog(log) {
    return {
      id: log._id,
      timestamp: log.createdAt,
      user: log.userId ? { _id: log.userId._id, name: log.userId.name, email: log.userId.email, role: log.userId.role } : null,
      userRole: log.userRole,
      ip: log.ip,
      userAgent: log.userAgent,
      action: log.action,
      category: log.category,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      description: log.description,
      status: log.status,
      correlationId: log.correlationId,
      referenceNumber: log.referenceNumber,
    };
  }
}

export const enterpriseAuditCenterService = new EnterpriseAuditCenterService();
