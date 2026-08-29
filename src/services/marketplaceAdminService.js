import mongoose from 'mongoose';
import { Company } from '../models/Company.js';
import { Department } from '../models/Department.js';
import { Team } from '../models/Team.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import User from '../models/userModel.js';
import { VerificationRequest } from '../models/VerificationRequest.js';
import { Certificate } from '../models/Certificate.js';
import { Brand } from '../models/brandModel.js';
import { Category } from '../models/categoryModel.js';
import Dispute from '../models/Dispute.js';
import { TaxRule } from '../models/TaxRule.js';
import { Incoterm } from '../models/Incoterm.js';
import { Country } from '../models/Warehouse.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class MarketplaceAdminService {
  async getDashboard() {
    const [companies, users, categories, brands, verifications, disputes] = await Promise.all([
      Company.countDocuments({ isActive: true }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Category.countDocuments(),
      Brand.countDocuments(),
      VerificationRequest.countDocuments({ status: 'pending', isActive: true }),
      Dispute.countDocuments({ status: { $nin: ['closed', 'resolved_refund', 'resolved_release'] } }),
    ]);
    const roleCounts = { buyers: 0, suppliers: 0, admins: 0 };
    for (const r of users) {
      if (r._id === 'admin') roleCounts.admins = r.count;
      else if (r._id === 'vendor') roleCounts.suppliers = r.count;
      else roleCounts.buyers += r.count;
    }
    return { companies, ...roleCounts, categories, brands, pendingVerifications: verifications, activeDisputes: disputes };
  }

  async getCompanies(query = {}) {
    const { search, status, type, country, page = 1, limit = 20 } = query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (country) filter.country = country;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { legalName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Company.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getCompany(id) {
    const company = await Company.findById(id).lean();
    if (!company) throw new Error('Company not found');
    const [users, teams, departments] = await Promise.all([
      User.find({ companyName: company.name }).select('name email role isActive').lean(),
      Team.find({ company: id, isActive: true }).lean(),
      Department.find({ company: id, isActive: true }).lean(),
    ]);
    return { ...company, users, teams, departments };
  }

  async createCompany(data, userId) {
    const company = await Company.create(data);
    await logAuditEvent({
      userId, action: 'marketplace.company.create', category: 'admin',
      entityType: 'company', entityId: company._id,
      newValue: { name: company.name, type: company.type },
      description: `Company ${company.name} created`,
    });
    return company;
  }

  async updateCompany(id, data, userId) {
    const old = await Company.findById(id);
    if (!old) throw new Error('Company not found');
    const company = await Company.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'marketplace.company.update', category: 'admin',
      entityType: 'company', entityId: id,
      oldValue: { name: old.name, status: old.status },
      newValue: { name: company.name, status: company.status },
      description: `Company ${company.name} updated`,
    });
    return company;
  }

  async deleteCompany(id, userId) {
    const company = await Company.findById(id);
    if (!company) throw new Error('Company not found');
    company.isActive = false;
    await company.save();
    await logAuditEvent({
      userId, action: 'marketplace.company.delete', category: 'admin',
      entityType: 'company', entityId: id,
      oldValue: { name: company.name, isActive: true },
      newValue: { isActive: false },
      description: `Company ${company.name} soft-deleted`,
    });
    return { message: 'Company deleted', id };
  }

  async restoreCompany(id, userId) {
    const company = await Company.findById(id);
    if (!company) throw new Error('Company not found');
    company.isActive = true;
    await company.save();
    await logAuditEvent({
      userId, action: 'marketplace.company.restore', category: 'admin',
      entityType: 'company', entityId: id,
      description: `Company ${company.name} restored`,
    });
    return company;
  }

  async bulkAction(ids, action, userId) {
    const results = { success: [], failed: [] };
    for (const id of ids) {
      try {
        if (action === 'delete') await this.deleteCompany(id, userId);
        else if (action === 'restore') await this.restoreCompany(id, userId);
        else if (action === 'verify') {
          await Company.findByIdAndUpdate(id, { $set: { status: 'verified', verifiedAt: new Date(), verifiedBy: userId } });
        }
        results.success.push(id);
      } catch (e) {
        results.failed.push({ id, error: e.message });
      }
    }
    await logAuditEvent({
      userId, action: `marketplace.company.bulk_${action}`, category: 'admin',
      entityType: 'company',
      newValue: { ids, successCount: results.success.length },
      description: `Bulk ${action} on ${ids.length} companies`,
    });
    return results;
  }

  async getStats() {
    const [users, vendors, products, orders, revenueAgg, disputes] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'vendor', isActive: true }),
      (async () => {
        const { default: Product } = await import('../models/productModel.js');
        return Product.countDocuments({ isActive: true });
      })(),
      (async () => {
        const { Order } = await import('../models/orderModel.js');
        const [total, agg] = await Promise.all([
          Order.countDocuments(),
          Order.aggregate([
            { $match: { status: { $in: ['delivered', 'completed'] } } },
            { $group: { _id: null, totalRevenue: { $sum: { $toDouble: '$totalPrice' } } } },
          ]),
        ]);
        return { total, revenue: agg[0]?.totalRevenue || 0 };
      })(),
      (async () => {
        const { MarketplaceRevenue } = await import('../models/MarketplaceRevenue.js');
        return MarketplaceRevenue.aggregate([
          { $match: { status: 'cleared' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
      })(),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    ]);
    return {
      totalUsers: users, totalVendors: vendors, totalProducts: products,
      totalOrders: orders.total, totalRevenue: orders.revenue,
      platformRevenue: revenueAgg[0]?.total || 0, activeDisputes: disputes,
    };
  }

  async getCountries() { return Country.find({ isActive: true }).sort('name.en').lean(); }
  async createCountry(data, userId) {
    const country = await Country.create(data);
    await logAuditEvent({ userId, action: 'marketplace.country.create', category: 'admin', entityType: 'country', entityId: country._id, newValue: { code: country.code }, description: `Country ${country.code} created` });
    return country;
  }
  async updateCountry(id, data, userId) {
    const country = await Country.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!country) throw new Error('Country not found');
    await logAuditEvent({ userId, action: 'marketplace.country.update', category: 'admin', entityType: 'country', entityId: id, description: `Country ${country.code} updated` });
    return country;
  }
  async deleteCountry(id, userId) {
    const country = await Country.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!country) throw new Error('Country not found');
    await logAuditEvent({ userId, action: 'marketplace.country.delete', category: 'admin', entityType: 'country', entityId: id, description: `Country ${country.code} deactivated` });
    return { message: 'Country deactivated' };
  }

  async getCities(country) {
    const c = await Country.findOne({ code: country }).lean();
    return c?.regions || [];
  }
  async createCity(country, data, userId) {
    const c = await Country.findOne({ code: country });
    if (!c) throw new Error('Country not found');
    c.regions.push(data);
    await c.save();
    await logAuditEvent({ userId, action: 'marketplace.city.create', category: 'admin', entityType: 'city', description: `City created in ${country}` });
    return c.regions;
  }
  async updateCity(country, cityId, data, userId) {
    const c = await Country.findOne({ code: country });
    if (!c) throw new Error('Country not found');
    const region = c.regions.id(cityId);
    if (!region) throw new Error('City not found');
    Object.assign(region, data);
    await c.save();
    await logAuditEvent({ userId, action: 'marketplace.city.update', category: 'admin', entityType: 'city', description: `City updated in ${country}` });
    return c.regions;
  }
  async deleteCity(country, cityId, userId) {
    const c = await Country.findOne({ code: country });
    if (!c) throw new Error('Country not found');
    c.regions.pull(cityId);
    await c.save();
    await logAuditEvent({ userId, action: 'marketplace.city.delete', category: 'admin', entityType: 'city', description: `City deleted from ${country}` });
    return { message: 'City deleted' };
  }

  async getCurrencies() {
    const setting = await PlatformSetting.findOne({ key: 'currencies' }).lean();
    return setting?.value || [];
  }
  async createCurrency(data, userId) {
    const setting = await PlatformSetting.findOne({ key: 'currencies' }) || new PlatformSetting({ key: 'currencies', value: [], type: 'json', category: 'marketplace', label: { en: 'Currencies', ar: 'العملات' } });
    setting.value.push(data);
    await setting.save();
    await logAuditEvent({ userId, action: 'marketplace.currency.create', category: 'admin', entityType: 'currency', newValue: data, description: `Currency ${data.code} created` });
    return setting.value;
  }
  async updateCurrency(code, data, userId) {
    const setting = await PlatformSetting.findOne({ key: 'currencies' });
    if (!setting) throw new Error('No currencies found');
    const idx = setting.value.findIndex(c => c.code === code);
    if (idx === -1) throw new Error('Currency not found');
    setting.value[idx] = { ...setting.value[idx], ...data };
    await setting.save();
    await logAuditEvent({ userId, action: 'marketplace.currency.update', category: 'admin', entityType: 'currency', description: `Currency ${code} updated` });
    return setting.value;
  }

  async getLanguages() {
    const setting = await PlatformSetting.findOne({ key: 'languages' }).lean();
    return setting?.value || [];
  }
  async createLanguage(data, userId) {
    const setting = await PlatformSetting.findOne({ key: 'languages' }) || new PlatformSetting({ key: 'languages', value: [], type: 'json', category: 'localization', label: { en: 'Languages', ar: 'اللغات' } });
    setting.value.push(data);
    await setting.save();
    await logAuditEvent({ userId, action: 'marketplace.language.create', category: 'admin', entityType: 'language', newValue: data, description: `Language ${data.code} created` });
    return setting.value;
  }

  async getIndustries() {
    const setting = await PlatformSetting.findOne({ key: 'industries' }).lean();
    return setting?.value || [];
  }
  async createIndustry(data, userId) {
    const setting = await PlatformSetting.findOne({ key: 'industries' }) || new PlatformSetting({ key: 'industries', value: [], type: 'json', category: 'marketplace', label: { en: 'Industries', ar: 'الصناعات' } });
    setting.value.push(data);
    await setting.save();
    await logAuditEvent({ userId, action: 'marketplace.industry.create', category: 'admin', entityType: 'industry', newValue: data, description: `Industry ${data.name} created` });
    return setting.value;
  }

  async getTaxRules() { return TaxRule.find({ isActive: true }).sort('-createdAt').lean(); }
  async createTaxRule(data, userId) {
    const rule = await TaxRule.create(data);
    await logAuditEvent({ userId, action: 'marketplace.tax_rule.create', category: 'admin', entityType: 'tax_rule', entityId: rule._id, newValue: { name: rule.name, rate: rule.rate }, description: `Tax rule ${rule.name} created` });
    return rule;
  }
  async updateTaxRule(id, data, userId) {
    const rule = await TaxRule.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!rule) throw new Error('Tax rule not found');
    await logAuditEvent({ userId, action: 'marketplace.tax_rule.update', category: 'admin', entityType: 'tax_rule', entityId: id, description: `Tax rule ${rule.name} updated` });
    return rule;
  }
  async deleteTaxRule(id, userId) {
    const rule = await TaxRule.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!rule) throw new Error('Tax rule not found');
    await logAuditEvent({ userId, action: 'marketplace.tax_rule.delete', category: 'admin', entityType: 'tax_rule', entityId: id, description: `Tax rule ${rule.name} deleted` });
    return { message: 'Tax rule deleted' };
  }

  async getIncoterms() { return Incoterm.find({ isActive: true }).sort('code').lean(); }
  async createIncoterm(data, userId) {
    const term = await Incoterm.create(data);
    await logAuditEvent({ userId, action: 'marketplace.incoterm.create', category: 'admin', entityType: 'incoterm', entityId: term._id, newValue: { code: term.code }, description: `Incoterm ${term.code} created` });
    return term;
  }
  async updateIncoterm(id, data, userId) {
    const term = await Incoterm.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!term) throw new Error('Incoterm not found');
    await logAuditEvent({ userId, action: 'marketplace.incoterm.update', category: 'admin', entityType: 'incoterm', entityId: id, description: `Incoterm ${term.code} updated` });
    return term;
  }

  async getDepartments() { return Department.find({ isActive: true }).populate('headOf', 'name email').sort('name').lean(); }
  async createDepartment(data, userId) {
    const dept = await Department.create(data);
    await logAuditEvent({ userId, action: 'marketplace.department.create', category: 'admin', entityType: 'department', entityId: dept._id, newValue: { name: dept.name }, description: `Department ${dept.name} created` });
    return dept;
  }
  async updateDepartment(id, data, userId) {
    const dept = await Department.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!dept) throw new Error('Department not found');
    await logAuditEvent({ userId, action: 'marketplace.department.update', category: 'admin', entityType: 'department', entityId: id, description: `Department ${dept.name} updated` });
    return dept;
  }
  async deleteDepartment(id, userId) {
    const dept = await Department.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!dept) throw new Error('Department not found');
    await Team.updateMany({ department: id }, { $set: { isActive: false } });
    await logAuditEvent({ userId, action: 'marketplace.department.delete', category: 'admin', entityType: 'department', entityId: id, description: `Department ${dept.name} deactivated` });
    return { message: 'Department deactivated' };
  }

  async getTeams() { return Team.find({ isActive: true }).populate('lead', 'name email').populate('members.user', 'name email').sort('name').lean(); }
  async createTeam(data, userId) {
    const team = await Team.create(data);
    await logAuditEvent({ userId, action: 'marketplace.team.create', category: 'admin', entityType: 'team', entityId: team._id, newValue: { name: team.name }, description: `Team ${team.name} created` });
    return team;
  }
  async updateTeam(id, data, userId) {
    const team = await Team.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!team) throw new Error('Team not found');
    await logAuditEvent({ userId, action: 'marketplace.team.update', category: 'admin', entityType: 'team', entityId: id, description: `Team ${team.name} updated` });
    return team;
  }
  async deleteTeam(id, userId) {
    const team = await Team.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!team) throw new Error('Team not found');
    await logAuditEvent({ userId, action: 'marketplace.team.delete', category: 'admin', entityType: 'team', entityId: id, description: `Team ${team.name} deactivated` });
    return { message: 'Team deactivated' };
  }

  async getSettings() { return PlatformSetting.find().sort('category key').lean(); }
  async updateSetting(key, value, userId) {
    const setting = await PlatformSetting.findOneAndUpdate(
      { key }, { $set: { value } }, { new: true, upsert: true }
    );
    await logAuditEvent({ userId, action: 'marketplace.setting.update', category: 'admin', entityType: 'setting', entityId: key, newValue: { key, value }, description: `Setting ${key} updated` });
    return setting;
  }

  async getAnnouncements() {
    const { Announcement } = await import('../models/announcementModel.js');
    return Announcement.find().sort('-createdAt').populate('buyer', 'name email').lean();
  }
  async createAnnouncement(data, userId) {
    const { Announcement } = await import('../models/announcementModel.js');
    const announcement = await Announcement.create({ ...data, buyer: userId });
    await logAuditEvent({ userId, action: 'marketplace.announcement.create', category: 'admin', entityType: 'announcement', entityId: announcement._id, newValue: { title: announcement.title }, description: `Announcement created` });
    return announcement;
  }
  async updateAnnouncement(id, data, userId) {
    const { Announcement } = await import('../models/announcementModel.js');
    const announcement = await Announcement.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!announcement) throw new Error('Announcement not found');
    await logAuditEvent({ userId, action: 'marketplace.announcement.update', category: 'admin', entityType: 'announcement', entityId: id, description: `Announcement updated` });
    return announcement;
  }
  async deleteAnnouncement(id, userId) {
    const { Announcement } = await import('../models/announcementModel.js');
    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) throw new Error('Announcement not found');
    await logAuditEvent({ userId, action: 'marketplace.announcement.delete', category: 'admin', entityType: 'announcement', entityId: id, description: `Announcement deleted` });
    return { message: 'Announcement deleted' };
  }

  async toggleMaintenanceMode(enabled, message, userId) {
    await PlatformSetting.findOneAndUpdate(
      { key: 'maintenance_mode' },
      { $set: { value: { enabled, message: message || '' }, type: 'json', category: 'general', label: { en: 'Maintenance Mode', ar: 'وضع الصيانة' } } },
      { upsert: true, new: true }
    );
    await logAuditEvent({
      userId, action: enabled ? 'marketplace.maintenance.enable' : 'marketplace.maintenance.disable',
      category: 'admin', entityType: 'system',
      newValue: { enabled, message },
      description: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
    });
    return { enabled, message };
  }

  async search(query, filters = {}) {
    const results = { companies: [], users: [], categories: [] };
    const regex = new RegExp(query, 'i');
    if (!filters.skipCompanies) {
      results.companies = await Company.find({ name: regex, isActive: true }).limit(10).lean();
    }
    if (!filters.skipUsers) {
      results.users = await User.find({ $or: [{ name: regex }, { email: regex }], isActive: true }).select('name email role').limit(10).lean();
    }
    if (!filters.skipCategories) {
      results.categories = await Category.find({ 'name.en': regex }).limit(10).lean();
    }
    return results;
  }

  async exportCsv(entityType, filters = {}) {
    let data;
    switch (entityType) {
      case 'companies':
        data = await Company.find(filters).lean();
        break;
      case 'users':
        data = await User.find(filters).select('-password').lean();
        break;
      case 'tax_rules':
        data = await TaxRule.find(filters).lean();
        break;
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
    if (data.length === 0) return { columns: [], rows: [] };
    const columns = Object.keys(data[0]).filter(k => !['__v', 'password'].includes(k));
    const rows = data.map(item => columns.map(c => JSON.stringify(item[c] ?? '')).join(','));
    return { columns, rows: [columns.join(','), ...rows].join('\n') };
  }

  async importCsv(entityType, records, userId) {
    const results = { imported: 0, errors: [] };
    for (let i = 0; i < records.length; i++) {
      try {
        switch (entityType) {
          case 'companies':
            await Company.create(records[i]);
            break;
          case 'tax_rules':
            await TaxRule.create(records[i]);
            break;
          default:
            throw new Error(`Unsupported entity type: ${entityType}`);
        }
        results.imported++;
      } catch (e) {
        results.errors.push({ row: i + 1, error: e.message });
      }
    }
    await logAuditEvent({
      userId, action: 'marketplace.csv.import', category: 'admin',
      entityType, newValue: { imported: results.imported, errors: results.errors.length },
      description: `CSV import of ${entityType}: ${results.imported} imported, ${results.errors.length} errors`,
    });
    return results;
  }
}

export const marketplaceAdminService = new MarketplaceAdminService();
