import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import FeaturePackage from '../models/FeaturePackage.js';
import UsageQuota from '../models/UsageQuota.js';
import WhiteLabelConfig from '../models/WhiteLabelConfig.js';
import { logAuditEvent } from './auditService.js';

class SaasFoundationService {
  async getTenants(filters = {}) {
    const { search, status, packageId, page = 1, limit = 20 } = filters;
    const query = {};
    if (status) query.status = status;
    if (packageId) query.features = packageId;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { domain: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .sort({ createdAt: -1 })
        .skip(skip).limit(Number(limit))
        .populate('createdBy', 'name email')
        .lean(),
      Tenant.countDocuments(query),
    ]);
    return { tenants, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getTenant(id) {
    const tenant = await Tenant.findById(id).populate('createdBy', 'name email').lean();
    if (!tenant) throw new Error('Tenant not found');
    const [usage, whiteLabel, packages] = await Promise.all([
      UsageQuota.find({ tenant: id }).sort({ period: -1 }).limit(6).lean(),
      WhiteLabelConfig.findOne({ tenant: id }).lean(),
      FeaturePackage.find({ code: { $in: tenant.features || [] } }).lean(),
    ]);
    return { ...tenant, usage, whiteLabel: whiteLabel || null, packages };
  }

  async createTenant(userId, data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Tenant.findOne({ $or: [{ slug }, { domain: data.domain }].filter(Boolean) });
    if (existing) throw new Error(`Tenant with slug '${slug}' or domain '${data.domain}' already exists`);
    const tenant = await Tenant.create({ ...data, slug, createdBy: userId, status: 'active' });
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);
    await UsageQuota.create({
      tenant: tenant._id, period: periodKey,
      limits: { apiCalls: 10000, storage: 1073741824, users: 10, integrations: 5, plugins: 3, aiTokens: 100000 },
      lastResetAt: new Date(),
      nextResetAt: nextReset,
      exceeded: [],
    });
    await logAuditEvent({
      userId, action: 'tenant.create', category: 'saas',
      entityType: 'Tenant', entityId: tenant._id,
      newValue: { name: tenant.name, slug: tenant.slug, domain: tenant.domain },
      description: `Tenant provisioned: ${tenant.name}`,
    });
    return tenant;
  }

  async updateTenant(userId, id, data) {
    const old = await Tenant.findById(id);
    if (!old) throw new Error('Tenant not found');
    const restrictedFields = ['createdBy', 'slug', 'status'];
    for (const field of restrictedFields) delete data[field];
    if (data.domain && data.domain !== old.domain) {
      const domainExists = await Tenant.findOne({ domain: data.domain, _id: { $ne: id } });
      if (domainExists) throw new Error(`Domain '${data.domain}' is already in use`);
    }
    const tenant = await Tenant.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'tenant.update', category: 'saas',
      entityType: 'Tenant', entityId: id,
      oldValue: { name: old.name, domain: old.domain, status: old.status },
      newValue: { name: tenant.name, domain: tenant.domain, status: tenant.status },
      description: `Tenant updated: ${tenant.name}`,
    });
    return tenant;
  }

  async suspendTenant(userId, id) {
    const tenant = await Tenant.findById(id);
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'suspended') throw new Error('Tenant is already suspended');
    tenant.status = 'suspended';
    await tenant.save();
    await logAuditEvent({
      userId, action: 'tenant.suspend', category: 'saas',
      entityType: 'Tenant', entityId: id,
      oldValue: { status: tenant.status }, newValue: { status: 'suspended' },
      description: `Tenant suspended: ${tenant.name}`,
    });
    return tenant;
  }

  async activateTenant(userId, id) {
    const tenant = await Tenant.findById(id);
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'active') throw new Error('Tenant is already active');
    if (tenant.status === 'cancelled') throw new Error('Cannot activate a cancelled tenant');
    tenant.status = 'active';
    await tenant.save();
    await logAuditEvent({
      userId, action: 'tenant.activate', category: 'saas',
      entityType: 'Tenant', entityId: id,
      oldValue: { status: tenant.status }, newValue: { status: 'active' },
      description: `Tenant activated: ${tenant.name}`,
    });
    return tenant;
  }

  async getFeaturePackages() {
    const packages = await FeaturePackage.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    for (const pkg of packages) {
      const tenantCount = await Tenant.countDocuments({ features: pkg.code });
      pkg.tenantCount = tenantCount;
    }
    return packages;
  }

  async createFeaturePackage(userId, data) {
    const existing = await FeaturePackage.findOne({ code: data.code });
    if (existing) throw new Error(`Feature package with code '${data.code}' already exists`);
    const pkg = await FeaturePackage.create(data);
    await logAuditEvent({
      userId, action: 'feature_package.create', category: 'saas',
      entityType: 'FeaturePackage', entityId: pkg._id,
      newValue: { name: pkg.name, code: pkg.code, price: pkg.price },
      description: `Feature package created: ${pkg.name}`,
    });
    return pkg;
  }

  async updateFeaturePackage(userId, id, data) {
    const old = await FeaturePackage.findById(id);
    if (!old) throw new Error('Feature package not found');
    delete data.code;
    const pkg = await FeaturePackage.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'feature_package.update', category: 'saas',
      entityType: 'FeaturePackage', entityId: id,
      oldValue: { name: old.name, price: old.price },
      newValue: { name: pkg.name, price: pkg.price },
      description: `Feature package updated: ${pkg.name}`,
    });
    return pkg;
  }

  async assignPackage(userId, tenantId, packageId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const pkg = await FeaturePackage.findById(packageId);
    if (!pkg) throw new Error('Feature package not found');
    const oldFeatures = [...(tenant.features || [])];
    if (!tenant.features.includes(pkg.code)) {
      tenant.features.push(pkg.code);
    }
    if (pkg.limits) {
      tenant.settings.maxUsers = pkg.limits.users || tenant.settings.maxUsers;
      tenant.settings.storageLimit = pkg.limits.storage || tenant.settings.storageLimit;
    }
    await tenant.save();
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    await UsageQuota.findOneAndUpdate(
      { tenant: tenantId, period: periodKey },
      { $set: { limits: { ...pkg.limits } } },
      { upsert: true },
    );
    await logAuditEvent({
      userId, action: 'tenant.assign_package', category: 'saas',
      entityType: 'Tenant', entityId: tenantId,
      oldValue: { features: oldFeatures },
      newValue: { features: tenant.features, packageName: pkg.name },
      description: `Package "${pkg.name}" assigned to tenant "${tenant.name}"`,
    });
    return { tenant, package: pkg };
  }

  async getUsageQuota(tenantId, period) {
    const periodKey = period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    let quota = await UsageQuota.findOne({ tenant: tenantId, period: periodKey }).lean();
    if (!quota) {
      const tenant = await Tenant.findById(tenantId).lean();
      if (!tenant) throw new Error('Tenant not found');
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);
      nextReset.setDate(1);
      nextReset.setHours(0, 0, 0, 0);
      quota = await UsageQuota.create({
        tenant: tenantId, period: periodKey,
        limits: { apiCalls: 10000, storage: 1073741824, users: 10, integrations: 5, plugins: 3, aiTokens: 100000 },
        lastResetAt: new Date(),
        nextResetAt: nextReset,
        exceeded: [],
      });
      quota = quota.toObject();
    }
    const usagePercent = {};
    for (const key of Object.keys(quota.usage || {})) {
      if (quota.limits?.[key] && quota.limits[key] > 0) {
        usagePercent[key] = Math.round(((quota.usage[key] || 0) / quota.limits[key]) * 10000) / 100;
      } else {
        usagePercent[key] = 0;
      }
    }
    return { ...quota, usagePercent };
  }

  async trackUsage(tenantId, feature, amount) {
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const quota = await UsageQuota.findOneAndUpdate(
      { tenant: tenantId, period: periodKey },
      { $inc: { [`usage.${feature}`]: amount } },
      { upsert: true, new: true },
    );
    const featureLimit = quota.limits?.[feature];
    const featureUsage = quota.usage?.[feature] || 0;
    if (featureLimit && featureUsage > featureLimit && !quota.exceeded.includes(feature)) {
      quota.exceeded.push(feature);
      await quota.save();
    }
    return { tenant: tenantId, feature, currentUsage: featureUsage, limit: featureLimit };
  }

  async checkQuota(tenantId, feature) {
    const periodKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const quota = await UsageQuota.findOne({ tenant: tenantId, period: periodKey }).lean();
    if (!quota) return { allowed: true, usage: 0, limit: null, remaining: null };
    const featureLimit = quota.limits?.[feature];
    const featureUsage = quota.usage?.[feature] || 0;
    if (!featureLimit) return { allowed: true, usage: featureUsage, limit: null, remaining: null };
    const allowed = featureUsage < featureLimit;
    return {
      allowed,
      usage: featureUsage,
      limit: featureLimit,
      remaining: Math.max(0, featureLimit - featureUsage),
      exceeded: quota.exceeded?.includes(feature) || false,
    };
  }

  async getWhiteLabelConfig(tenantId) {
    const config = await WhiteLabelConfig.findOne({ tenant: tenantId }).lean();
    if (!config) throw new Error('White label configuration not found for this tenant');
    return config;
  }

  async upsertWhiteLabelConfig(userId, tenantId, data) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');
    const config = await WhiteLabelConfig.findOneAndUpdate(
      { tenant: tenantId },
      { $set: { ...data, tenant: tenantId } },
      { upsert: true, new: true, runValidators: true },
    );
    if (data.customDomain) {
      tenant.domain = data.customDomain;
      await tenant.save();
    }
    await logAuditEvent({
      userId, action: 'whitelabel.upsert', category: 'saas',
      entityType: 'WhiteLabelConfig', entityId: config._id,
      newValue: { tenantId, hasCustomDomain: !!data.customDomain },
      description: `White label config updated for tenant "${tenant.name}"`,
    });
    return config;
  }

  async getTenantByDomain(domain) {
    if (!domain) throw new Error('Domain is required');
    const tenant = await Tenant.findOne({ domain, status: { $ne: 'cancelled' } }).lean();
    if (!tenant) throw new Error(`No active tenant found for domain: ${domain}`);
    const whiteLabel = await WhiteLabelConfig.findOne({ tenant: tenant._id, isActive: true }).lean();
    return { ...tenant, whiteLabel: whiteLabel || null };
  }

  async getTenantAnalytics() {
    const [total, byStatus, byPackage, usageSummary] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Tenant.aggregate([
        { $unwind: { path: '$features', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$features', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      UsageQuota.aggregate([
        {
          $group: {
            _id: null,
            totalApiCalls: { $sum: '$usage.apiCalls' },
            totalAiTokens: { $sum: '$usage.aiTokens' },
            avgStorage: { $avg: '$usage.storage' },
            exceededCount: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$exceeded', []] } }, 0] }, 1, 0] } },
          },
        },
      ]),
    ]);
    return {
      totalTenants: total,
      activeTenants: await Tenant.countDocuments({ status: 'active' }),
      suspendedTenants: await Tenant.countDocuments({ status: 'suspended' }),
      trialTenants: await Tenant.countDocuments({ status: 'trial' }),
      cancelledTenants: await Tenant.countDocuments({ status: 'cancelled' }),
      byStatus: byStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      byPackage: byPackage.filter(p => p._id).reduce((acc, p) => { acc[p._id] = p.count; return acc; }, {}),
      unassignedTenants: await Tenant.countDocuments({ $or: [{ features: { $exists: false } }, { features: [] }] }),
      usage: usageSummary[0] || { totalApiCalls: 0, totalAiTokens: 0, avgStorage: 0, exceededCount: 0 },
    };
  }

  async getPlatformOverview() {
    const [tenants, packages, whitelabelCount, totalQuotas, monthlyActive] = await Promise.all([
      Tenant.countDocuments(),
      FeaturePackage.countDocuments({ isActive: true }),
      WhiteLabelConfig.countDocuments({ isActive: true }),
      UsageQuota.aggregate([
        { $group: { _id: null, totalApi: { $sum: '$usage.apiCalls' }, totalStorage: { $sum: '$usage.storage' }, totalAi: { $sum: '$usage.aiTokens' } } },
      ]),
      Tenant.countDocuments({ updatedAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    ]);
    const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const periodQuotas = await UsageQuota.find({ period: currentPeriod }).lean();
    const totalLimitApi = periodQuotas.reduce((s, q) => s + (q.limits?.apiCalls || 0), 0);
    const totalUsageApi = periodQuotas.reduce((s, q) => s + (q.usage?.apiCalls || 0), 0);
    return {
      tenants: {
        total: tenants,
        monthlyActive,
        mrr: await this._calculateMRR(),
      },
      packages: {
        total: packages,
        assignedTenants: await FeaturePackage.aggregate([
          { $lookup: { from: 'tenants', localField: 'code', foreignField: 'features', as: 'tenants' } },
          { $project: { name: 1, tenantCount: { $size: '$tenants' } } },
        ]),
      },
      whitelabel: { total: whitelabelCount },
      usage: {
        currentPeriod,
        totalApiCalls: totalUsageApi,
        totalApiLimit: totalLimitApi,
        apiUtilization: totalLimitApi > 0 ? Math.round((totalUsageApi / totalLimitApi) * 10000) / 100 : 0,
        ...totalQuotas[0] || { totalApi: 0, totalStorage: 0, totalAi: 0 },
        exceededTenants: periodQuotas.filter(q => (q.exceeded || []).length > 0).length,
      },
      timestamp: new Date(),
    };
  }

  async _calculateMRR() {
    const activeTenants = await Tenant.find({ status: 'active' }).lean();
    const packages = await FeaturePackage.find({ isActive: true }).lean();
    const pkgMap = {};
    for (const p of packages) pkgMap[p.code] = p;
    let totalMonthly = 0;
    for (const tenant of activeTenants) {
      for (const featureCode of tenant.features || []) {
        const pkg = pkgMap[featureCode];
        if (pkg && pkg.billing === 'monthly') totalMonthly += pkg.price || 0;
        else if (pkg && pkg.billing === 'yearly') totalMonthly += (pkg.price || 0) / 12;
      }
    }
    return Math.round(totalMonthly * 100) / 100;
  }
}

export const saasFoundationService = new SaasFoundationService();
