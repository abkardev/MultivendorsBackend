import { ModerationQueue } from '../models/ModerationQueue.js';
import { ModerationRule } from '../models/ModerationRule.js';
import { BlockedContent } from '../models/BlockedContent.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class ModerationService {
  async getModerationDashboard() {
    const queueStats = await ModerationQueue.aggregate([
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
      }},
    ]);
    const entityStats = await ModerationQueue.aggregate([
      { $group: {
        _id: { entityType: '$entityType', status: '$status' },
        count: { $sum: 1 },
      }},
      { $sort: { '_id.entityType': 1 } },
    ]);
    const pending = await ModerationQueue.countDocuments({ status: 'pending' });
    const escalated = await ModerationQueue.countDocuments({ status: 'escalated' });
    const inReview = await ModerationQueue.countDocuments({ status: 'in_review' });
    const priorityBreakdown = await ModerationQueue.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const rulesActive = await ModerationRule.countDocuments({ isActive: true });
    const blockedEntries = await BlockedContent.countDocuments({ isActive: true });
    return {
      total: queueStats.reduce((s, q) => s + q.count, 0),
      byStatus: Object.fromEntries(queueStats.map(q => [q._id, q.count])),
      byEntity: entityStats,
      pending,
      escalated,
      inReview,
      priorityBreakdown,
      rulesActive,
      blockedEntries,
    };
  }

  async getQueue(query = {}) {
    const filter = {};
    if (query.entityType) filter.entityType = query.entityType;
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.assignedTo) filter.assignedTo = query.assignedTo;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const [items, total] = await Promise.all([
      ModerationQueue.find(filter).sort({ priority: -1, createdAt: 1 }).skip((page - 1) * limit).limit(limit)
        .populate('reportedBy', 'name email')
        .populate('assignedTo', 'name email')
        .populate('reviewedBy', 'name email').lean(),
      ModerationQueue.countDocuments(filter),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async getQueueItem(id) {
    return ModerationQueue.findById(id)
      .populate('reportedBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('reviewedBy', 'name email')
      .lean();
  }

  async reportContent(entityType, entityId, reason, reportedBy) {
    const existing = await ModerationQueue.findOne({ entityType, entityId, status: { $in: ['pending', 'in_review', 'escalated'] } });
    if (existing) return existing;
    const autoFlags = [];
    const blocked = await BlockedContent.find({ isActive: true }).lean();
    for (const b of blocked) {
      if (reason.toLowerCase().includes(b.value.toLowerCase())) {
        autoFlags.push({ type: b.type, details: `Matches blocked ${b.type}: ${b.value}`, automated: true });
      }
    }
    const queue = await ModerationQueue.create({
      entityType, entityId, reason, reportedBy,
      flags: autoFlags,
      priority: autoFlags.length > 0 ? 'high' : 'medium',
    });
    return queue;
  }

  async assignModeration(id, userId) {
    const item = await ModerationQueue.findById(id);
    if (!item) throw new Error('Queue item not found');
    item.assignedTo = userId;
    item.status = 'in_review';
    await item.save();
    await logAuditEvent({ userId, action: 'assign_moderation', category: 'moderation', entityType: 'ModerationQueue', entityId: id, description: `Assigned to ${userId}`, status: 'success' });
    return item;
  }

  async approveContent(id) {
    const item = await ModerationQueue.findById(id);
    if (!item) throw new Error('Queue item not found');
    item.status = 'approved';
    item.reviewedAt = new Date();
    item.reviewedBy = item.assignedTo;
    await item.save();
    if (item.reportedBy) {
      await notificationService.send({
        recipient: item.reportedBy, type: 'moderation_approved',
        title: { en: 'Content Approved', ar: 'تمت الموافقة على المحتوى' },
        body: { en: `Your reported ${item.entityType} has been approved.`, ar: `تمت الموافقة على الإبلاغ ${item.entityType}.` },
        priority: 'low', channels: ['in_app'], link: '/admin/moderation',
      });
    }
    await logAuditEvent({ userId: item.reviewedBy, action: 'approve_moderation', category: 'moderation', entityType: 'ModerationQueue', entityId: id, description: `Content ${id} approved`, status: 'success' });
    return item;
  }

  async rejectContent(id, reason) {
    const item = await ModerationQueue.findById(id);
    if (!item) throw new Error('Queue item not found');
    item.status = 'rejected';
    item.notes = reason;
    item.reviewedAt = new Date();
    item.reviewedBy = item.assignedTo;
    await item.save();
    await logAuditEvent({ userId: item.reviewedBy, action: 'reject_moderation', category: 'moderation', entityType: 'ModerationQueue', entityId: id, description: `Rejected: ${reason}`, status: 'success' });
    return item;
  }

  async escalateContent(id, reason) {
    const item = await ModerationQueue.findById(id);
    if (!item) throw new Error('Queue item not found');
    item.status = 'escalated';
    item.notes = reason;
    item.priority = 'urgent';
    await item.save();
    await logAuditEvent({ userId: item.assignedTo, action: 'escalate_moderation', category: 'moderation', entityType: 'ModerationQueue', entityId: id, description: `Escalated: ${reason}`, status: 'success' });
    return item;
  }

  async bulkModerate(ids, action) {
    const results = { approved: 0, rejected: 0, skipped: 0 };
    for (const id of ids) {
      try {
        if (action === 'approve') { await this.approveContent(id); results.approved++; }
        else if (action === 'reject') { await this.rejectContent(id, 'Bulk moderation'); results.rejected++; }
        else results.skipped++;
      } catch { results.skipped++; }
    }
    return results;
  }

  async getModerationRules() {
    return ModerationRule.find().sort({ createdAt: -1 }).lean();
  }

  async createModerationRule(data) {
    return ModerationRule.create(data);
  }

  async updateModerationRule(id, data) {
    return ModerationRule.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async deleteModerationRule(id) {
    return ModerationRule.findByIdAndDelete(id);
  }

  async checkContent(text) {
    if (!text) return { isClean: true, flags: [], score: 0 };
    const rules = await ModerationRule.find({ isActive: true }).lean();
    const blocked = await BlockedContent.find({ isActive: true }).lean();
    const flags = [];
    const lower = text.toLowerCase();
    for (const rule of rules) {
      if (rule.type === 'keyword' && rule.pattern && lower.includes(rule.pattern.toLowerCase())) {
        flags.push({ rule: rule.name, type: 'keyword', pattern: rule.pattern, severity: rule.severity, action: rule.action });
      }
      if (rule.type === 'spam') {
        const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
        const repeatChars = (text.match(/(.)\1{4,}/g) || []).length;
        if (urlCount > 3) flags.push({ rule: rule.name, type: 'spam', details: `${urlCount} URLs`, severity: rule.severity, action: rule.action });
        if (repeatChars > 2) flags.push({ rule: rule.name, type: 'spam', details: `Repeated characters`, severity: rule.severity, action: rule.action });
      }
    }
    for (const b of blocked) {
      if (lower.includes(b.value.toLowerCase())) {
        flags.push({ type: `blocked_${b.type}`, value: b.value, reason: b.reason, severity: 'high', action: 'block' });
      }
    }
    const score = Math.min(flags.reduce((s, f) => {
      if (f.severity === 'critical') return s + 40;
      if (f.severity === 'high') return s + 25;
      if (f.severity === 'medium') return s + 10;
      return s + 5;
    }, 0), 100);
    return { isClean: flags.length === 0, flags, score, hasProfanity: flags.some(f => f.type === 'profanity'), hasSpam: flags.some(f => f.type === 'spam') };
  }

  async detectDuplicates(entityType, content) {
    if (!content) return { isDuplicate: false, matches: [] };
    const lower = content.toLowerCase().trim();
    const items = await ModerationQueue.find({ entityType, status: { $nin: ['rejected'] } }).lean();
    const matches = items.filter(item => {
      if (!item.reason) return false;
      const r = item.reason.toLowerCase().trim();
      return r.includes(lower) || lower.includes(r) || levenshtein(r, lower) < Math.ceil(lower.length * 0.3);
    });
    return { isDuplicate: matches.length > 0, count: matches.length, matches };
  }

  async getBlockedContent() {
    return BlockedContent.find({ isActive: true }).sort({ type: 1, value: 1 }).lean();
  }

  async addBlockedContent(data) {
    return BlockedContent.create(data);
  }

  async removeBlockedContent(id) {
    return BlockedContent.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async aiModerate(content, entityType) {
    const result = await this.checkContent(content);
    const rules = await ModerationRule.find({ isActive: true, aiAssisted: true, entityTypes: entityType }).lean();
    const aiFlags = [];
    for (const rule of rules) {
      if (rule.type === 'pattern') {
        try {
          const regex = new RegExp(rule.pattern, 'gi');
          const matches = content.match(regex);
          if (matches) aiFlags.push({ rule: rule.name, matches: matches.length, severity: rule.severity, action: rule.action });
        } catch {}
      }
      if (rule.type === 'duplicate') {
        const dup = await this.detectDuplicates(entityType, content);
        if (dup.isDuplicate) aiFlags.push({ rule: rule.name, matches: dup.count, severity: rule.severity, action: rule.action });
      }
    }
    result.aiFlags = aiFlags;
    result.aiScore = Math.min(result.score + aiFlags.reduce((s, f) => {
      if (f.severity === 'critical') return s + 30;
      if (f.severity === 'high') return s + 20;
      return s + 10;
    }, 0), 100);
    result.needsReview = result.aiScore > 50;
    return result;
  }
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export const moderationService = new ModerationService();
