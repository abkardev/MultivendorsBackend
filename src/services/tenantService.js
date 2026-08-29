import Tenant from '../models/Tenant.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { logAuditEvent } from './auditService.js';

class TenantService {
  constructor() {
    this.tenants = new Map();
  }

  async createTenant(data) {
    const existing = await Tenant.findOne({ slug: data.slug });
    if (existing) throw new Error(`Tenant with slug "${data.slug}" already exists`);

    if (data.plan) {
      const plan = await SubscriptionPlan.findById(data.plan);
      if (plan) {
        data.quotas = { ...plan.limits };
      }
    }

    const tenant = await Tenant.create(data);
    this.tenants.set(tenant.slug, tenant);

    await logAuditEvent({
      userId: data.owner, action: 'tenant.create', category: 'system',
      entityType: 'Tenant', entityId: tenant._id,
      newValue: { name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      description: `Tenant created: ${tenant.name} (${tenant.slug})`,
    });
    return tenant;
  }

  async getTenants() {
    const tenants = await Tenant.find({ isActive: true })
      .populate('plan', 'name type code')
      .populate('owner', 'name email')
      .sort({ createdAt: -1 }).lean();
    return tenants.map(t => ({
      _id: t._id, name: t.name, slug: t.slug, status: t.status,
      plan: t.plan, owner: t.owner, domains: t.domains,
      usage: t.usage, quotas: t.quotas, createdAt: t.createdAt,
    }));
  }

  async getTenant(slug) {
    const tenant = await Tenant.findOne({ slug })
      .populate('plan', 'name type code price features')
      .populate('owner', 'name email')
      .lean();
    if (!tenant) return null;
    return tenant;
  }

  async updateTenant(slug, data) {
    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { $set: data },
      { new: true, runValidators: true },
    );
    if (tenant) {
      this.tenants.set(slug, tenant);
      await logAuditEvent({
        action: 'tenant.update', category: 'system',
        entityType: 'Tenant', entityId: tenant._id,
        newValue: data,
        description: `Tenant updated: ${slug}`,
      });
    }
    return tenant;
  }

  async suspendTenant(slug) {
    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { status: 'suspended', isActive: false },
      { new: true },
    );
    if (tenant) {
      this.tenants.delete(slug);
      await logAuditEvent({
        action: 'tenant.suspend', category: 'system',
        entityType: 'Tenant', entityId: tenant._id,
        oldValue: { status: 'active' },
        newValue: { status: 'suspended' },
        description: `Tenant suspended: ${slug}`,
      });
    }
    return tenant;
  }

  async activateTenant(slug) {
    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { status: 'active', isActive: true },
      { new: true },
    );
    if (tenant) {
      this.tenants.set(slug, tenant);
      await logAuditEvent({
        action: 'tenant.activate', category: 'system',
        entityType: 'Tenant', entityId: tenant._id,
        newValue: { status: 'active' },
        description: `Tenant activated: ${slug}`,
      });
    }
    return tenant;
  }

  async getTenantUsage(slug) {
    const tenant = await Tenant.findOne({ slug }).lean();
    if (!tenant) return null;
    return {
      slug: tenant.slug,
      name: tenant.name,
      usage: tenant.usage || {},
      quotas: tenant.quotas || {},
      usagePercentages: {
        products: tenant.quotas?.products > 0 ? Math.round(((tenant.usage?.products || 0) / tenant.quotas.products) * 100) : 0,
        orders: tenant.quotas?.orders > 0 ? Math.round(((tenant.usage?.orders || 0) / tenant.quotas.orders) * 100) : 0,
        storage: tenant.quotas?.storage > 0 ? Math.round(((tenant.usage?.storage || 0) / tenant.quotas.storage) * 100) : 0,
        apiCalls: tenant.quotas?.apiCalls > 0 ? Math.round(((tenant.usage?.apiCalls || 0) / tenant.quotas.apiCalls) * 100) : 0,
        users: tenant.quotas?.users > 0 ? Math.round(((tenant.usage?.users || 0) / tenant.quotas.users) * 100) : 0,
      },
    };
  }

  async checkTenantQuota(slug, metric) {
    const tenant = await Tenant.findOne({ slug }).lean();
    if (!tenant) return { allowed: false, reason: 'Tenant not found' };
    const usage = tenant.usage?.[metric] || 0;
    const quota = tenant.quotas?.[metric] || 0;
    if (quota === 0) return { allowed: true, usage, quota, percentUsed: 0 };
    const percentUsed = (usage / quota) * 100;
    return {
      allowed: percentUsed < 100,
      usage, quota, percentUsed: Math.round(percentUsed * 100) / 100,
      remaining: quota - usage,
    };
  }

  async getTenantBranding(slug) {
    const tenant = await Tenant.findOne({ slug }).select('branding name slug').lean();
    if (!tenant) return null;
    return tenant.branding || {};
  }

  async updateTenantBranding(slug, branding) {
    const tenant = await Tenant.findOneAndUpdate(
      { slug },
      { $set: { branding } },
      { new: true },
    );
    if (tenant) {
      await logAuditEvent({
        action: 'tenant.branding_update', category: 'system',
        entityType: 'Tenant', entityId: tenant._id,
        newValue: branding,
        description: `Branding updated for tenant: ${slug}`,
      });
    }
    return tenant?.branding || null;
  }

  async getUsageStats() {
    const tenants = await Tenant.find({ isActive: true }).lean();
    const total = {
      tenants: tenants.length,
      totalProducts: 0, totalOrders: 0, totalStorage: 0,
      totalApiCalls: 0, totalUsers: 0,
      activeTenants: 0, suspendedTenants: 0, trialingTenants: 0,
    };
    for (const t of tenants) {
      if (t.usage) {
        total.totalProducts += t.usage.products || 0;
        total.totalOrders += t.usage.orders || 0;
        total.totalStorage += t.usage.storage || 0;
        total.totalApiCalls += t.usage.apiCalls || 0;
        total.totalUsers += t.usage.users || 0;
      }
      if (t.status === 'active') total.activeTenants++;
      else if (t.status === 'suspended') total.suspendedTenants++;
      else if (t.status === 'trialing') total.trialingTenants++;
    }
    return total;
  }
}

export const tenantService = new TenantService();
