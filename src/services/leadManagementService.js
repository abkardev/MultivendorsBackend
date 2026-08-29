import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { SellerCustomer } from '../models/SellerCustomer.js';
import { logAuditEvent } from './auditService.js';

class LeadManagementService {
  async createLead(vendorId, data) {
    const lead = await Lead.create({ ...data, vendor: vendorId });
    await logAuditEvent({
      userId: vendorId, action: 'lead.create', category: 'vendor',
      entityType: 'Lead', entityId: lead._id,
      newValue: { company: data.company, stage: 'new' },
    });
    return lead;
  }

  async getLeads(vendorId, options = {}) {
    const { stage, search, source, scoreMin, scoreMax, page = 1, limit = 20 } = options;
    const filter = { vendor: vendorId, isActive: true };
    if (stage) filter.stage = stage;
    if (source) filter.source = source;
    if (search) filter.$or = [{ company: new RegExp(search, 'i') }, { contactName: new RegExp(search, 'i') }];
    if (scoreMin || scoreMax) {
      filter.score = {};
      if (scoreMin) filter.score.$gte = parseInt(scoreMin);
      if (scoreMax) filter.score.$lte = parseInt(scoreMax);
    }
    const skip = (page - 1) * limit;
    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ score: -1, createdAt: -1 }).skip(skip).limit(limit),
      Lead.countDocuments(filter),
    ]);
    return { leads, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getLead(vendorId, leadId) {
    return Lead.findOne({ _id: leadId, vendor: vendorId });
  }

  async updateLead(vendorId, leadId, data) {
    const lead = await Lead.findOneAndUpdate({ _id: leadId, vendor: vendorId }, { $set: data }, { new: true });
    if (lead) {
      await logAuditEvent({
        userId: vendorId, action: 'lead.update', category: 'vendor',
        entityType: 'Lead', entityId: lead._id,
        newValue: data,
      });
    }
    return lead;
  }

  async updateStage(vendorId, leadId, stage, data = {}) {
    const update = { stage, ...data };
    if (stage === 'won') update.convertedAt = new Date();
    if (stage === 'lost') update.lostAt = new Date();
    const lead = await Lead.findOneAndUpdate({ _id: leadId, vendor: vendorId }, { $set: update }, { new: true });
    if (lead && stage === 'won' && data.buyerId) {
      await SellerCustomer.findOneAndUpdate(
        { vendor: vendorId, buyer: data.buyerId },
        { $setOnInsert: { vendor: vendorId, buyer: data.buyerId, company: lead.company } },
        { upsert: true },
      );
      lead.convertedToCustomer = data.buyerId;
      await lead.save();
    }
    return lead;
  }

  async deleteLead(vendorId, leadId) {
    return Lead.findOneAndUpdate({ _id: leadId, vendor: vendorId }, { isActive: false }, { new: true });
  }

  async aiQualify(vendorId, leadId) {
    const lead = await Lead.findOne({ _id: leadId, vendor: vendorId });
    if (!lead) throw new Error('Lead not found');
    let score = 50;
    let summary = '';
    const recommendations = [];
    if (lead.expectedRevenue > 10000) { score += 10; recommendations.push('High value lead - prioritize'); }
    if (lead.industry) { score += 5; recommendations.push('Industry identified - target vertical'); }
    if (lead.email) { score += 5; recommendations.push('Contact information complete'); }
    if (lead.country) { score += 3; }
    if (score > 70) summary = 'Highly qualified lead with strong potential';
    else if (score > 40) summary = 'Moderately qualified lead - needs nurturing';
    else summary = 'Low qualification score - verify lead quality';
    lead.score = Math.min(score, 100);
    lead.aiQualification = { score: lead.score, summary, recommendations, qualifiedAt: new Date() };
    await lead.save();
    return lead;
  }

  async getPipelineAnalytics(vendorId) {
    const stages = ['new', 'qualified', 'contacted', 'negotiating', 'waiting', 'won', 'lost'];
    const pipeline = [];
    for (const stage of stages) {
      const count = await Lead.countDocuments({ vendor: vendorId, stage, isActive: true });
      const totalValue = await Lead.aggregate([
        { $match: { vendor: mongoose.Types.ObjectId.createFromHexString(vendorId), stage, isActive: true } },
        { $group: { _id: null, total: { $sum: '$expectedRevenue' } } },
      ]);
      pipeline.push({ stage, count, totalValue: totalValue[0]?.total || 0 });
    }
    const totalLeads = await Lead.countDocuments({ vendor: vendorId, isActive: true });
    const wonLeads = await Lead.countDocuments({ vendor: vendorId, stage: 'won', isActive: true });
    const totalRevenue = await Lead.aggregate([
      { $match: { vendor: mongoose.Types.ObjectId.createFromHexString(vendorId), stage: 'won' } },
      { $group: { _id: null, total: { $sum: '$expectedRevenue' } } },
    ]);
    return {
      pipeline,
      totalLeads,
      wonLeads,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      totalRevenue: totalRevenue[0]?.total || 0,
      averageScore: (await Lead.aggregate([
        { $match: { vendor: mongoose.Types.ObjectId.createFromHexString(vendorId), isActive: true } },
        { $group: { _id: null, avg: { $avg: '$score' } } },
      ]))[0]?.avg || 0,
    };
  }
}

export const leadManagementService = new LeadManagementService();
