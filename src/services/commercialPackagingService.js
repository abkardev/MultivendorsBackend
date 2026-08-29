import mongoose from 'mongoose';
import { DemoEnvironment } from '../models/DemoEnvironment.js';
import { DemoDataset } from '../models/DemoDataset.js';
import { SampleCompany } from '../models/SampleCompany.js';
import { logAuditEvent } from './auditService.js';

class CommercialPackagingService {
  async createDemoEnvironment(data) {
    const env = await DemoEnvironment.create({
      ...data,
      status: 'creating',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await logAuditEvent({
      action: 'demo.environment_create',
      category: 'demo',
      entityType: 'DemoEnvironment',
      entityId: env._id,
      newValue: { name: env.name, type: env.type, tenant: env.tenant },
      description: `Demo environment created: ${env.name}`,
    });
    return env;
  }

  async getDemoEnvironment(id) {
    const env = await DemoEnvironment.findById(id).populate('dataset', 'name type').lean();
    if (!env) throw new Error('Demo environment not found');
    await DemoEnvironment.findByIdAndUpdate(id, { lastAccessed: new Date() });
    return env;
  }

  async listDemoEnvironments(filter = {}) {
    const { page = 1, limit = 20, status, type, tenant, search, sort = '-createdAt' } = filter;
    const query = { status: { $ne: 'deleted' } };
    if (status) query.status = status;
    if (type) query.type = type;
    if (tenant) query.tenant = tenant;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'accessCredentials.username': { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [environments, total] = await Promise.all([
      DemoEnvironment.find(query).sort(sortObj).skip(skip).limit(Number(limit))
        .populate('dataset', 'name type')
        .populate('tenant', 'name domain')
        .lean(),
      DemoEnvironment.countDocuments(query),
    ]);
    return { environments, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async deleteDemoEnvironment(id) {
    const env = await DemoEnvironment.findById(id);
    if (!env) throw new Error('Demo environment not found');
    env.status = 'deleted';
    await env.save();
    await logAuditEvent({
      action: 'demo.environment_delete',
      category: 'demo',
      entityType: 'DemoEnvironment',
      entityId: id,
      oldValue: { status: env.status },
      newValue: { status: 'deleted' },
      description: `Demo environment deleted: ${env.name}`,
    });
    return { success: true, message: 'Environment deleted' };
  }

  async extendDemoEnvironment(id, days) {
    const env = await DemoEnvironment.findById(id);
    if (!env) throw new Error('Demo environment not found');
    const oldExpiry = env.expiresAt;
    env.expiresAt = new Date((env.expiresAt || new Date()).getTime() + days * 24 * 60 * 60 * 1000);
    await env.save();
    await logAuditEvent({
      action: 'demo.environment_extend',
      category: 'demo',
      entityType: 'DemoEnvironment',
      entityId: id,
      oldValue: { expiresAt: oldExpiry },
      newValue: { expiresAt: env.expiresAt },
      description: `Demo environment extended by ${days} days`,
    });
    return env;
  }

  async createDataset(data) {
    const dataset = await DemoDataset.create(data);
    await logAuditEvent({
      action: 'demo.dataset_create',
      category: 'demo',
      entityType: 'DemoDataset',
      entityId: dataset._id,
      newValue: { name: dataset.name, type: dataset.type },
      description: `Demo dataset created: ${dataset.name}`,
    });
    return dataset;
  }

  async getDataset(id) {
    const dataset = await DemoDataset.findById(id).lean();
    if (!dataset) throw new Error('Dataset not found');
    const companies = await SampleCompany.find({ dataset: id }).lean();
    return { ...dataset, sampleCompanies: companies };
  }

  async listDatasets(filter = {}) {
    const { page = 1, limit = 20, type, search, sort = '-createdAt' } = filter;
    const query = {};
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [datasets, total] = await Promise.all([
      DemoDataset.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      DemoDataset.countDocuments(query),
    ]);
    return { datasets, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createSampleCompany(datasetId, data) {
    const dataset = await DemoDataset.findById(datasetId);
    if (!dataset) throw new Error('Dataset not found');
    const company = await SampleCompany.create({ dataset: datasetId, ...data });
    return company;
  }

  async _generateDatasetData(type) {
    const datasets = {
      manufacturing: {
        name: `Manufacturing Demo ${Date.now()}`,
        description: 'Pre-built manufacturing industry demo dataset with suppliers, products, and procurement data',
        type: 'manufacturing',
        includes: ['companies', 'suppliers', 'products', 'categories', 'orders', 'procurement_plans', 'rfqs'],
        companies: [
          { name: 'Precision Auto Parts Inc.', type: 'manufacturing', companyData: { industry: 'Automotive', size: '500-1000', revenue: '$50M-100M', employees: 750 }, contacts: [{ name: 'John Smith', email: 'john@precisionauto.com', role: 'CEO' }] },
          { name: 'AeroTech Manufacturing', type: 'manufacturing', companyData: { industry: 'Aerospace', size: '1000-5000', revenue: '$200M-500M', employees: 2500 }, contacts: [{ name: 'Sarah Chen', email: 'sarah@aerotech.com', role: 'Procurement Director' }] },
          { name: 'SteelCo Supply Chain', type: 'supplier', companyData: { industry: 'Metals', size: '200-500', revenue: '$30M-80M', employees: 300 }, contacts: [{ name: 'Mike Johnson', email: 'mike@steelco.com', role: 'Sales Manager' }] },
          { name: 'Global Logistics Partners', type: 'distributor', companyData: { industry: 'Logistics', size: '500-1000', revenue: '$100M-200M', employees: 600 }, contacts: [{ name: 'Lisa Park', email: 'lisa@globallogistics.com', role: 'Operations Head' }] },
          { name: 'TechComponents Ltd', type: 'supplier', companyData: { industry: 'Electronics', size: '100-200', revenue: '$10M-30M', employees: 150 }, contacts: [{ name: 'David Wong', email: 'david@techcomponents.com', role: 'Director' }] },
        ],
      },
      retail: {
        name: `Retail Demo ${Date.now()}`,
        description: 'Comprehensive retail industry demo dataset with multi-channel commerce data',
        type: 'retail',
        includes: ['companies', 'suppliers', 'buyers', 'products', 'categories', 'orders', 'analytics'],
        companies: [
          { name: 'MegaMart Retail Chain', type: 'buyer', companyData: { industry: 'Retail', size: '5000+', revenue: '$1B-5B', employees: 12000 }, contacts: [{ name: 'James Wilson', email: 'james@megamart.com', role: 'VP Procurement' }] },
          { name: 'FashionHub Online', type: 'buyer', companyData: { industry: 'E-commerce', size: '200-500', revenue: '$50M-100M', employees: 350 }, contacts: [{ name: 'Emma Davis', email: 'emma@fashionhub.com', role: 'Supply Chain Manager' }] },
          { name: 'FreshFoods Distribution', type: 'distributor', companyData: { industry: 'Food & Beverage', size: '500-1000', revenue: '$100M-300M', employees: 800 }, contacts: [{ name: 'Carlos Rivera', email: 'carlos@freshfoods.com', role: 'CEO' }] },
          { name: 'HomeGoods Wholesale', type: 'supplier', companyData: { industry: 'Home & Living', size: '100-500', revenue: '$20M-50M', employees: 250 }, contacts: [{ name: 'Amy Chen', email: 'amy@homegoods.com', role: 'Sales Director' }] },
          { name: 'GreenLeaf Organics', type: 'supplier', companyData: { industry: 'Organic Food', size: '50-100', revenue: '$5M-15M', employees: 80 }, contacts: [{ name: 'Tom Green', email: 'tom@greenleaf.com', role: 'Founder' }] },
        ],
      },
      general: {
        name: `General Demo ${Date.now()}`,
        description: 'General purpose demo dataset with diverse sample data for any industry evaluation',
        type: 'general',
        includes: ['companies', 'suppliers', 'buyers', 'products', 'categories', 'rfqs', 'orders'],
        companies: [
          { name: 'Acme Corporation', type: 'manufacturing', companyData: { industry: 'Industrial', size: '500-1000', revenue: '$100M-250M', employees: 900 }, contacts: [{ name: 'Alice Brown', email: 'alice@acmecorp.com', role: 'CEO' }] },
          { name: 'Beta Enterprises', type: 'buyer', companyData: { industry: 'Technology', size: '200-500', revenue: '$50M-100M', employees: 400 }, contacts: [{ name: 'Bob Martin', email: 'bob@betaent.com', role: 'Procurement Lead' }] },
          { name: 'Gamma Supply Co', type: 'supplier', companyData: { industry: 'Industrial Supplies', size: '100-200', revenue: '$10M-30M', employees: 150 }, contacts: [{ name: 'Grace Lee', email: 'grace@gammasupply.com', role: 'Sales Manager' }] },
          { name: 'Delta Services Inc', type: 'distributor', companyData: { industry: 'Services', size: '50-100', revenue: '$5M-15M', employees: 75 }, contacts: [{ name: 'Dan Wilson', email: 'dan@deltaservices.com', role: 'Director' }] },
        ],
      },
    };
    return datasets[type] || datasets.general;
  }

  async generateManufacturingDataset() {
    const data = await this._generateDatasetData('manufacturing');
    return this._persistDataset(data);
  }

  async generateRetailDataset() {
    const data = await this._generateDatasetData('retail');
    return this._persistDataset(data);
  }

  async generateGeneralDataset() {
    const data = await this._generateDatasetData('general');
    return this._persistDataset(data);
  }

  async _persistDataset(data) {
    const { companies, ...datasetData } = data;
    const dataset = await DemoDataset.create({
      ...datasetData,
      recordCount: companies.length,
      version: '1.0',
    });
    for (const company of companies) {
      await SampleCompany.create({ dataset: dataset._id, ...company });
    }
    await logAuditEvent({
      action: 'demo.dataset_generate',
      category: 'demo',
      entityType: 'DemoDataset',
      entityId: dataset._id,
      newValue: { name: dataset.name, type: dataset.type, companies: companies.length },
      description: `Demo dataset generated: ${dataset.name} (${dataset.type}, ${companies.length} companies)`,
    });
    return dataset;
  }

  async populateDemoEnvironment(envId, datasetId) {
    const env = await DemoEnvironment.findById(envId);
    if (!env) throw new Error('Demo environment not found');
    const dataset = await DemoDataset.findById(datasetId).lean();
    if (!dataset) throw new Error('Dataset not found');
    env.dataset = datasetId;
    env.status = 'ready';
    env.configuration = { ...env.configuration, sampleData: true };
    await env.save();
    await logAuditEvent({
      action: 'demo.environment_populate',
      category: 'demo',
      entityType: 'DemoEnvironment',
      entityId: envId,
      newValue: { dataset: dataset.name, status: 'ready' },
      description: `Demo environment populated with dataset: ${dataset.name}`,
    });
    return env;
  }

  async getDemoAnalytics() {
    const [totalEnvironments, activeEnvironments, expiredEnvironments, byType, byStatus, totalDatasets] = await Promise.all([
      DemoEnvironment.countDocuments(),
      DemoEnvironment.countDocuments({ status: { $in: ['ready', 'active'] } }),
      DemoEnvironment.countDocuments({ status: 'expired' }),
      DemoEnvironment.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      DemoEnvironment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      DemoDataset.countDocuments(),
    ]);
    return {
      environments: { total: totalEnvironments, active: activeEnvironments, expired: expiredEnvironments },
      byType: byType.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
      byStatus: byStatus.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      datasets: { total: totalDatasets },
    };
  }

  async cleanupExpiredEnvironments() {
    const now = new Date();
    const expired = await DemoEnvironment.find({ expiresAt: { $lt: now }, status: { $ne: 'deleted' } }).lean();
    const result = await DemoEnvironment.updateMany(
      { expiresAt: { $lt: now }, status: { $ne: 'deleted' } },
      { status: 'expired' },
    );
    return { cleanedUp: result.modifiedCount, expiredEnvironments: expired.length, timestamp: now };
  }

  async getDemoStatus(envId) {
    const env = await DemoEnvironment.findById(envId).populate('dataset', 'name type recordCount').lean();
    if (!env) throw new Error('Demo environment not found');
    const now = new Date();
    const expiresAt = env.expiresAt ? new Date(env.expiresAt) : null;
    const daysRemaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / (24 * 60 * 60 * 1000))) : null;
    return {
      id: env._id,
      name: env.name,
      type: env.type,
      status: env.status,
      isExpired: expiresAt ? expiresAt < now : false,
      daysRemaining,
      expiresAt: env.expiresAt,
      lastAccessed: env.lastAccessed,
      dataset: env.dataset,
      accessUrl: env.accessUrl,
      isIsolated: env.isIsolated,
      configuration: env.configuration,
    };
  }

  async markAllAsDemo(data) {
    const result = await DemoEnvironment.updateMany(
      {},
      { $set: { isIsolated: true, ...data } },
    );
    return { modified: result.modifiedCount, matched: result.matchedCount };
  }
}

export const commercialPackagingService = new CommercialPackagingService();
