import { GovernancePolicy } from '../models/GovernancePolicy.js';
import { GovernanceAudit } from '../models/GovernanceAudit.js';
import { ApprovalMatrix } from '../models/ApprovalMatrix.js';
import User from '../models/userModel.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class GovernanceService {
  async getGovernanceDashboard() {
    const policyStats = await GovernancePolicy.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
        archived: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
      }},
    ]);
    const byType = await GovernancePolicy.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const matrixCount = await ApprovalMatrix.countDocuments({ isActive: true });
    const auditCount = await GovernanceAudit.countDocuments();
    const recentPolicies = await GovernancePolicy.find().sort({ updatedAt: -1 }).limit(5)
      .populate('createdBy', 'name email').lean();
    return {
      policies: policyStats[0] || { total: 0, active: 0, draft: 0, archived: 0 },
      byType, approvalMatrices: matrixCount, auditEvents: auditCount, recentPolicies,
    };
  }

  async getPolicies(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const [policies, total] = await Promise.all([
      GovernancePolicy.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('createdBy', 'name email').populate('approvedBy', 'name email').lean(),
      GovernancePolicy.countDocuments(filter),
    ]);
    return { policies, total, page, pages: Math.ceil(total / limit) };
  }

  async getPolicy(id) {
    const policy = await GovernancePolicy.findById(id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email').lean();
    if (!policy) throw new Error('Policy not found');
    const versionHistory = await GovernanceAudit.find({ policy: id })
      .sort({ createdAt: -1 }).populate('user', 'name email').lean();
    return { ...policy, versionHistory };
  }

  async createPolicy(data, userId) {
    const policy = await GovernancePolicy.create({ ...data, createdBy: userId, version: 1 });
    await GovernanceAudit.create({ policy: policy._id, action: 'created', user: userId, notes: 'Policy created' });
    await logAuditEvent({ userId, action: 'create_policy', category: 'governance', entityType: 'GovernancePolicy', entityId: policy._id, description: `Policy ${policy.code} created`, status: 'success' });
    return policy;
  }

  async updatePolicy(id, data, userId) {
    const policy = await GovernancePolicy.findById(id);
    if (!policy) throw new Error('Policy not found');
    const changes = [];
    for (const [key, value] of Object.entries(data)) {
      if (String(policy[key]) !== String(value)) {
        changes.push({ field: key, oldValue: policy[key], newValue: value });
      }
    }
    policy.version = (policy.version || 1) + 1;
    Object.assign(policy, data);
    await policy.save();
    await GovernanceAudit.create({ policy: id, action: 'updated', user: userId, changes, notes: data.description || 'Policy updated' });
    await logAuditEvent({ userId, action: 'update_policy', category: 'governance', entityType: 'GovernancePolicy', entityId: id, description: `Policy ${policy.code} updated to v${policy.version}`, status: 'success' });
    return policy;
  }

  async archivePolicy(id) {
    const policy = await GovernancePolicy.findById(id);
    if (!policy) throw new Error('Policy not found');
    policy.status = 'archived';
    policy.isActive = false;
    await policy.save();
    return policy;
  }

  async approvePolicy(id, userId) {
    const policy = await GovernancePolicy.findById(id);
    if (!policy) throw new Error('Policy not found');
    policy.status = 'active';
    policy.approvedBy = userId;
    policy.approvedAt = new Date();
    policy.effectiveFrom = new Date();
    await policy.save();
    await GovernanceAudit.create({ policy: id, action: 'approved', user: userId });
    await logAuditEvent({ userId, action: 'approve_policy', category: 'governance', entityType: 'GovernancePolicy', entityId: id, description: `Policy ${policy.code} approved`, status: 'success' });
    await notificationService.send({
      recipient: policy.createdBy, type: 'policy_approved',
      title: { en: 'Policy Approved', ar: 'تمت الموافقة على السياسة' },
      body: { en: `Policy ${policy.code} has been approved.`, ar: `تمت الموافقة على السياسة ${policy.code}.` },
      priority: 'high', channels: ['in_app', 'email'], link: '/admin/governance/policies',
    });
    return policy;
  }

  async getPolicyVersions(id) {
    return GovernanceAudit.find({ policy: id }).sort({ createdAt: -1 })
      .populate('user', 'name email').lean();
  }

  async getApprovalMatrices() {
    return ApprovalMatrix.find().sort({ entityType: 1, name: 1 })
      .populate('approvers.user', 'name email').lean();
  }

  async createApprovalMatrix(data) {
    return ApprovalMatrix.create(data);
  }

  async updateApprovalMatrix(id, data) {
    return ApprovalMatrix.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async deleteApprovalMatrix(id) {
    return ApprovalMatrix.findByIdAndDelete(id);
  }

  async checkApprovalRequired(entityType, entity, userId) {
    const matrices = await ApprovalMatrix.find({ entityType, isActive: true }).lean();
    for (const matrix of matrices) {
      if (matrix.autoApproveIf && entity[matrix.autoApproveIf]) {
        return { required: false, matrix: null, reason: 'Auto-approved by rule' };
      }
      const conditionsMet = matrix.conditions.every(c => {
        const val = entity[c.field];
        if (val === undefined) return false;
        switch (c.operator) {
          case 'eq': return val === c.value;
          case 'neq': return val !== c.value;
          case 'gt': return Number(val) > Number(c.value);
          case 'gte': return Number(val) >= Number(c.value);
          case 'lt': return Number(val) < Number(c.value);
          case 'lte': return Number(val) <= Number(c.value);
          case 'in': return Array.isArray(c.value) && c.value.includes(val);
          case 'contains': return String(val).toLowerCase().includes(String(c.value).toLowerCase());
          default: return false;
        }
      });
      if (conditionsMet) {
        const userInApprovers = matrix.approvers.some(a => String(a.user) === String(userId));
        return {
          required: true, matrix, isApprover: userInApprovers,
          minApprovals: matrix.minApprovals,
          approvers: matrix.approvers.map(a => ({ user: a.user, order: a.order, type: a.type })),
        };
      }
    }
    return { required: false, matrix: null, reason: 'No matching approval matrix' };
  }

  async getEscalationRules() {
    return ApprovalMatrix.find({ escalationAfter: { $gt: 0 }, isActive: true })
      .populate('approvers.user', 'name email').lean();
  }

  async getGovernanceAudit(query = {}) {
    const filter = {};
    if (query.policyId) filter.policy = query.policyId;
    if (query.action) filter.action = query.action;
    if (query.userId) filter.user = query.userId;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const [events, total] = await Promise.all([
      GovernanceAudit.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('user', 'name email').populate('policy', 'name code').lean(),
      GovernanceAudit.countDocuments(filter),
    ]);
    return { events, total, page, pages: Math.ceil(total / limit) };
  }

  async getSlaSummary() {
    const policies = await GovernancePolicy.find({ status: 'active', type: 'sla' }).lean();
    const policiesWithCompliance = policies.map(p => {
      const grade = Math.min(100, Math.max(0, (p.version || 1) * 20));
      return { policy: p.name, code: p.code, complianceRate: grade, effectiveFrom: p.effectiveFrom };
    });
    const avgCompliance = policiesWithCompliance.length > 0
      ? Math.round(policiesWithCompliance.reduce((s, p) => s + p.complianceRate, 0) / policiesWithCompliance.length)
      : 0;
    return {
      totalSLAs: policies.length,
      averageCompliance: avgCompliance,
      compliant: policiesWithCompliance.filter(p => p.complianceRate >= 80).length,
      atRisk: policiesWithCompliance.filter(p => p.complianceRate < 80 && p.complianceRate >= 50).length,
      breached: policiesWithCompliance.filter(p => p.complianceRate < 50).length,
      details: policiesWithCompliance,
    };
  }
}

export const governanceService = new GovernanceService();
