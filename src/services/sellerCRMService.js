import { SellerCustomer } from '../models/SellerCustomer.js';
import { CustomerActivity } from '../models/CustomerActivity.js';
import { CustomerTag } from '../models/CustomerTag.js';
import { CustomerPipeline } from '../models/CustomerPipeline.js';
import { CustomerReminder } from '../models/CustomerReminder.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class SellerCRMService {
  async getCustomers(vendorId, options = {}) {
    const { search, tag, priority, country, industry, isFavorite, page = 1, limit = 20 } = options;
    const filter = { vendor: vendorId };
    if (search) filter.$or = [
      { company: new RegExp(search, 'i') },
      { 'buyer.name': new RegExp(search, 'i') },
    ];
    if (tag) filter.tags = tag;
    if (priority) filter.priority = priority;
    if (country) filter.country = country;
    if (industry) filter.industry = industry;
    if (isFavorite !== undefined) filter.isFavorite = isFavorite === 'true';
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      SellerCustomer.find(filter).populate('buyer', 'name email company country').sort({ createdAt: -1 }).skip(skip).limit(limit),
      SellerCustomer.countDocuments(filter),
    ]);
    return { customers, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCustomer(vendorId, customerId) {
    const customer = await SellerCustomer.findOne({ _id: customerId, vendor: vendorId })
      .populate('buyer', 'name email phone company country industry')
      .populate('tags');
    if (!customer) return null;
    const [activities, pipeline, reminders] = await Promise.all([
      CustomerActivity.find({ vendor: vendorId, buyer: customer.buyer._id }).sort({ createdAt: -1 }).limit(20),
      CustomerPipeline.findOne({ vendor: vendorId, buyer: customer.buyer._id }),
      CustomerReminder.find({ vendor: vendorId, buyer: customer.buyer._id, isCompleted: false }).sort({ dueAt: 1 }),
    ]);
    return { customer, activities, pipeline, reminders };
  }

  async createCustomer(vendorId, data) {
    const existing = await SellerCustomer.findOne({ vendor: vendorId, buyer: data.buyer });
    if (existing) return { customer: existing, isNew: false };
    const customer = await SellerCustomer.create({ ...data, vendor: vendorId });
    await this._logActivity(vendorId, data.buyer, 'note', 'Customer added to CRM');
    return { customer, isNew: true };
  }

  async updateCustomer(vendorId, customerId, data) {
    const customer = await SellerCustomer.findOneAndUpdate(
      { _id: customerId, vendor: vendorId },
      { $set: data },
      { new: true },
    );
    if (customer) {
      await logAuditEvent({
        userId: vendorId, action: 'crm.customer.update', category: 'vendor',
        entityType: 'SellerCustomer', entityId: customer._id,
        newValue: data,
      });
    }
    return customer;
  }

  async addActivity(vendorId, buyerId, data) {
    const activity = await CustomerActivity.create({ ...data, vendor: vendorId, buyer: buyerId });
    await SellerCustomer.findOneAndUpdate(
      { vendor: vendorId, buyer: buyerId },
      { lastContactAt: new Date() },
    );
    return activity;
  }

  async getActivities(vendorId, customerId, options = {}) {
    const customer = await SellerCustomer.findOne({ _id: customerId, vendor: vendorId });
    if (!customer) throw new Error('Customer not found');
    return CustomerActivity.find({ vendor: vendorId, buyer: customer.buyer })
      .sort({ createdAt: -1 }).limit(parseInt(options.limit) || 50);
  }

  async createTag(vendorId, data) {
    const tag = await CustomerTag.create({ ...data, vendor: vendorId });
    return tag;
  }

  async getTags(vendorId) {
    return CustomerTag.find({ vendor: vendorId }).sort({ name: 1 });
  }

  async deleteTag(vendorId, tagId) {
    const tag = await CustomerTag.findOneAndDelete({ _id: tagId, vendor: vendorId });
    if (tag) {
      await SellerCustomer.updateMany({ vendor: vendorId, tags: tagId }, { $pull: { tags: tagId } });
    }
    return tag;
  }

  async addTagToCustomer(vendorId, customerId, tagId) {
    return SellerCustomer.findOneAndUpdate(
      { _id: customerId, vendor: vendorId },
      { $addToSet: { tags: tagId } },
      { new: true },
    ).populate('tags');
  }

  async removeTagFromCustomer(vendorId, customerId, tagId) {
    return SellerCustomer.findOneAndUpdate(
      { _id: customerId, vendor: vendorId },
      { $pull: { tags: tagId } },
      { new: true },
    );
  }

  async createReminder(vendorId, data) {
    const reminder = await CustomerReminder.create({ ...data, vendor: vendorId });
    if (reminder.dueAt) {
      const delay = reminder.dueAt.getTime() - Date.now();
      if (delay > 0 && delay < 86400000) {
        setTimeout(async () => {
          await notificationService.send({
            recipient: reminder.assignedTo || vendorId,
            type: 'system_announcement',
            title: { en: reminder.title, ar: reminder.title },
            body: { en: reminder.description, ar: reminder.description },
            data: { reminderId: reminder._id, type: reminder.type },
            channels: ['in_app'],
          });
        }, delay);
      }
    }
    return reminder;
  }

  async getReminders(vendorId, options = {}) {
    const filter = { vendor: vendorId };
    if (options.isCompleted !== undefined) filter.isCompleted = options.isCompleted === 'true';
    if (options.type) filter.type = options.type;
    if (options.overdue) filter.dueAt = { $lte: new Date() };
    return CustomerReminder.find(filter).sort({ dueAt: 1 }).limit(parseInt(options.limit) || 50);
  }

  async completeReminder(vendorId, reminderId) {
    return CustomerReminder.findOneAndUpdate(
      { _id: reminderId, vendor: vendorId },
      { isCompleted: true, completedAt: new Date() },
      { new: true },
    );
  }

  async getPipeline(vendorId) {
    return CustomerPipeline.find({ vendor: vendorId }).populate('buyer', 'name email company').sort({ leadScore: -1 });
  }

  async updatePipelineStage(vendorId, pipelineId, stage) {
    const pipeline = await CustomerPipeline.findOneAndUpdate(
      { _id: pipelineId, vendor: vendorId },
      { stage, enteredStageAt: new Date(), ...(stage === 'won' ? { wonAt: new Date() } : {}), ...(stage === 'lost' ? { lostAt: new Date() } : {}) },
      { new: true },
    );
    return pipeline;
  }

  async getCustomerSegments(vendorId) {
    const customers = await SellerCustomer.find({ vendor: vendorId });
    const total = customers.length;
    return {
      byPriority: this._groupBy(customers, 'priority'),
      byCountry: this._groupBy(customers, 'country'),
      byIndustry: this._groupBy(customers, 'industry'),
      byHealth: {
        high: customers.filter(c => c.healthScore >= 70).length,
        medium: customers.filter(c => c.healthScore >= 40 && c.healthScore < 70).length,
        low: customers.filter(c => c.healthScore < 40).length,
      },
      totalCustomers: total,
      activeCustomers: customers.filter(c => c.isActive).length,
      vipCustomers: customers.filter(c => c.priority === 'vip').length,
      averageHealth: total > 0 ? Math.round(customers.reduce((s, c) => s + c.healthScore, 0) / total) : 0,
      totalRevenue: customers.reduce((s, c) => s + c.totalRevenue, 0),
    };
  }

  async exportCustomers(vendorId) {
    const customers = await SellerCustomer.find({ vendor: vendorId })
      .populate('buyer', 'name email phone company country')
      .populate('tags', 'name')
      .lean();
    return customers.map(c => ({
      company: c.company, buyerName: c.buyer?.name, email: c.buyer?.email,
      phone: c.phone || c.buyer?.phone, country: c.country, industry: c.industry,
      priority: c.priority, totalOrders: c.totalOrders, totalRevenue: c.totalRevenue,
      lifetimeValue: c.lifetimeValue, healthScore: c.healthScore, churnRisk: c.churnRisk,
      lastContactAt: c.lastContactAt, tags: c.tags?.map(t => t.name).join(', '),
      createdAt: c.createdAt,
    }));
  }

  _groupBy(arr, key) {
    const grouped = {};
    for (const item of arr) {
      const val = item[key] || 'unknown';
      if (!grouped[val]) grouped[val] = { count: 0, revenue: 0 };
      grouped[val].count++;
      grouped[val].revenue += item.totalRevenue || 0;
    }
    return grouped;
  }

  async createPipeline(vendorId, data) {
    return CustomerPipeline.create({ ...data, vendor: vendorId });
  }

  async assignToPipeline(vendorId, customerId, pipelineId) {
    const customer = await SellerCustomer.findOne({ _id: customerId, vendor: vendorId });
    if (!customer) throw new Error('Customer not found');
    const pipeline = await CustomerPipeline.findOneAndUpdate(
      { _id: pipelineId, vendor: vendorId, buyer: customer.buyer },
      { $setOnInsert: { vendor: vendorId, buyer: customer.buyer } },
      { upsert: true, new: true },
    );
    return pipeline;
  }

  async listCustomers(vendorId, options = {}) {
    return this.getCustomers(vendorId, options);
  }

  async getCustomerTags(vendorId) {
    return this.getTags(vendorId);
  }

  async createCustomerTag(vendorId, data) {
    return this.createTag(vendorId, data);
  }

  async deleteCustomerTag(vendorId, tagId) {
    return this.deleteTag(vendorId, tagId);
  }

  async addCustomerActivity(vendorId, buyerId, data) {
    return this.addActivity(vendorId, buyerId, data);
  }

  async getCustomerActivities(vendorId, customerId, options = {}) {
    return this.getActivities(vendorId, customerId, options);
  }

  async getCustomerPipelines(vendorId) {
    return this.getPipeline(vendorId);
  }

  async updateCustomerPipeline(vendorId, pipelineId, data) {
    return this.updatePipelineStage(vendorId, pipelineId, data.stage || data);
  }

  async getCustomerReminders(vendorId, options = {}) {
    return this.getReminders(vendorId, options);
  }

  async createCustomerReminder(vendorId, data) {
    return this.createReminder(vendorId, data);
  }

  async _logActivity(vendorId, buyerId, type, description, metadata) {
    return CustomerActivity.create({ vendor: vendorId, buyer: buyerId, type, description, metadata });
  }
}

export const sellerCRMService = new SellerCRMService();
