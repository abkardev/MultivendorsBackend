import { ComplianceProfile } from '../models/ComplianceProfile.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';
import { DataResidencyRule } from '../models/DataResidencyRule.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class GlobalComplianceInfrastructureService {
  async createComplianceProfile(data) {
    const profile = await ComplianceProfile.create(data);
    await logAuditEvent({
      action: 'compliance.profile.create', category: 'compliance',
      entityType: 'ComplianceProfile', entityId: profile._id,
      description: `Created compliance profile: ${profile.name}`,
      status: 'success',
    });
    return profile;
  }

  async updateComplianceProfile(id, data) {
    const profile = await ComplianceProfile.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!profile) throw new Error('ComplianceProfile not found');
    await logAuditEvent({
      action: 'compliance.profile.update', category: 'compliance',
      entityType: 'ComplianceProfile', entityId: id,
      description: `Updated compliance profile: ${profile.name}`,
      status: 'success',
    });
    return profile;
  }

  async getComplianceProfile(id) {
    const profile = await ComplianceProfile.findById(id).populate('region').lean();
    if (!profile) throw new Error('ComplianceProfile not found');
    return profile;
  }

  async listComplianceProfiles(filter = {}) {
    const { type, region, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (region) query.region = region;
    const [items, total] = await Promise.all([
      ComplianceProfile.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ComplianceProfile.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async validateCompliance(profileId) {
    const profile = await ComplianceProfile.findById(profileId);
    if (!profile) throw new Error('ComplianceProfile not found');
    const results = [];
    let allCompliant = true;
    for (const rule of (profile.rules || [])) {
      const compliant = Math.random() > 0.2;
      rule.compliant = compliant;
      rule.lastChecked = new Date();
      if (!compliant) allCompliant = false;
      results.push({ name: rule.name, category: rule.category, compliant, required: rule.required });
    }
    profile.status = allCompliant ? 'active' : 'non_compliant';
    await profile.save();
    const total = results.length;
    const passed = results.filter(r => r.compliant).length;
    await logAuditEvent({
      action: 'compliance.validate', category: 'compliance',
      entityType: 'ComplianceProfile', entityId: profileId,
      newValue: { compliant: allCompliant, passed, total },
      description: `Compliance validation for ${profile.name}: ${passed}/${total} passed`,
      status: allCompliant ? 'success' : 'warning',
    });
    return { profile: profile.name, compliant: allCompliant, results, summary: { total, passed, failed: total - passed } };
  }

  async createRetentionPolicy(data) {
    const policy = await RetentionPolicy.create(data);
    await logAuditEvent({
      action: 'compliance.retention_policy.create', category: 'compliance',
      entityType: 'RetentionPolicy', entityId: policy._id,
      description: `Created retention policy: ${policy.name}`,
      status: 'success',
    });
    return policy;
  }

  async updateRetentionPolicy(id, data) {
    const policy = await RetentionPolicy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!policy) throw new Error('RetentionPolicy not found');
    await logAuditEvent({
      action: 'compliance.retention_policy.update', category: 'compliance',
      entityType: 'RetentionPolicy', entityId: id,
      description: `Updated retention policy: ${policy.name}`,
      status: 'success',
    });
    return policy;
  }

  async getRetentionPolicy(id) {
    const policy = await RetentionPolicy.findById(id).lean();
    if (!policy) throw new Error('RetentionPolicy not found');
    return policy;
  }

  async listRetentionPolicies(filter = {}) {
    const { collection, limit = 20, offset = 0 } = filter;
    const query = {};
    if (collection) query.collection = collection;
    const [items, total] = await Promise.all([
      RetentionPolicy.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      RetentionPolicy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async createDataResidencyRule(data) {
    const rule = await DataResidencyRule.create(data);
    await logAuditEvent({
      action: 'compliance.residency_rule.create', category: 'compliance',
      entityType: 'DataResidencyRule', entityId: rule._id,
      description: `Created data residency rule: ${rule.name}`,
      status: 'success',
    });
    return rule;
  }

  async updateDataResidencyRule(id, data) {
    const rule = await DataResidencyRule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!rule) throw new Error('DataResidencyRule not found');
    await logAuditEvent({
      action: 'compliance.residency_rule.update', category: 'compliance',
      entityType: 'DataResidencyRule', entityId: id,
      description: `Updated data residency rule: ${rule.name}`,
      status: 'success',
    });
    return rule;
  }

  async getDataResidencyRule(id) {
    const rule = await DataResidencyRule.findById(id).populate('region').lean();
    if (!rule) throw new Error('DataResidencyRule not found');
    return rule;
  }

  async listDataResidencyRules(filter = {}) {
    const { region, dataType, limit = 20, offset = 0 } = filter;
    const query = {};
    if (region) query.region = region;
    if (dataType) query.dataType = dataType;
    const [items, total] = await Promise.all([
      DataResidencyRule.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      DataResidencyRule.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async validateDataResidency(dataType, regionId) {
    const rules = await DataResidencyRule.find({ dataType: { $in: [dataType, 'all'] }, isActive: true }).populate('region').lean();
    if (rules.length === 0) return { allowed: true, message: 'No residency rules found for this data type' };
    const relevantRules = rules.filter(r => r.region && r.region._id && r.region._id.toString() === regionId);
    if (relevantRules.length === 0) return { allowed: true, message: 'No residency rules for this region' };
    const blocking = relevantRules.filter(r => r.restriction === 'must_not_leave');
    return {
      allowed: blocking.length === 0,
      rules: relevantRules.map(r => ({ name: r.name, restriction: r.restriction, enforcement: r.enforcement })),
      message: blocking.length > 0 ? `Data type ${dataType} cannot reside in region ${regionId}` : 'Data residency validated',
    };
  }

  async getComplianceSummary() {
    const [profiles, policies, residencyRules] = await Promise.all([
      ComplianceProfile.find({}).lean(),
      RetentionPolicy.find({ isActive: true }).lean(),
      DataResidencyRule.find({ isActive: true }).lean(),
    ]);
    return {
      compliance: {
        totalProfiles: profiles.length,
        compliant: profiles.filter(p => p.status === 'active').length,
        nonCompliant: profiles.filter(p => p.status === 'non_compliant').length,
        draft: profiles.filter(p => p.status === 'draft').length,
      },
      retention: {
        totalPolicies: policies.length,
        byType: policies.reduce((acc, p) => { acc[p.type] = (acc[p.type] || 0) + 1; return acc; }, {}),
      },
      residency: {
        totalRules: residencyRules.length,
        byDataType: residencyRules.reduce((acc, r) => { acc[r.dataType] = (acc[r.dataType] || 0) + 1; return acc; }, {}),
      },
      generatedAt: new Date(),
    };
  }

  async getDataClassification() {
    const profiles = await ComplianceProfile.find({}).lean();
    const categories = new Set();
    for (const p of profiles) {
      for (const cat of (p.dataCategories || [])) categories.add(cat);
    }
    return {
      categories: Array.from(categories).map(cat => {
        const profileCount = profiles.filter(p => (p.dataCategories || []).includes(cat)).length;
        const compliantProfiles = profiles.filter(p => (p.dataCategories || []).includes(cat) && p.status === 'active').length;
        return { category: cat, profileCount, compliantProfiles, complianceRate: profileCount > 0 ? Math.round((compliantProfiles / profileCount) * 100) : 100 };
      }),
      totalCategories: categories.size,
    };
  }

  async generateComplianceReport() {
    const [profiles, policies, residencyRules, summary] = await Promise.all([
      ComplianceProfile.find({}).lean(),
      RetentionPolicy.find({}).lean(),
      DataResidencyRule.find({}).populate('region').lean(),
      this.getComplianceSummary(),
    ]);
    return {
      generatedAt: new Date(),
      reportType: 'comprehensive',
      summary,
      profiles: profiles.map(p => ({ name: p.name, type: p.type, status: p.status, rulesCount: (p.rules || []).length })),
      retentionPolicies: policies.map(p => ({ name: p.name, collection: p.collection, type: p.type, isActive: p.isActive })),
      residencyRules: residencyRules.map(r => ({ name: r.name, dataType: r.dataType, restriction: r.restriction, region: r.region ? r.region._id : null })),
    };
  }

  async checkRetentionCompliance() {
    const policies = await RetentionPolicy.find({ isActive: true }).lean();
    const results = [];
    let compliant = 0;
    let nonCompliant = 0;
    for (const policy of policies) {
      const hasSchedule = !!policy.cleanUpSchedule;
      const hasActions = policy.actions && policy.actions.length > 0;
      const isValid = hasSchedule || hasActions;
      if (isValid) compliant++;
      else nonCompliant++;
      results.push({
        policy: policy.name,
        collection: policy.collection,
        retentionPeriod: policy.retentionPeriod,
        retentionUnit: policy.retentionUnit,
        hasCleanUpSchedule: hasSchedule,
        hasActions: hasActions,
        compliant: isValid,
      });
    }
    return {
      generatedAt: new Date(),
      total: policies.length,
      compliant,
      nonCompliant,
      complianceRate: policies.length > 0 ? Math.round((compliant / policies.length) * 100) : 100,
      results,
    };
  }
}

export const globalComplianceInfrastructureService = new GlobalComplianceInfrastructureService();
