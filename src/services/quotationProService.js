import mongoose from 'mongoose';
import { QuotationTemplate } from '../models/QuotationTemplate.js';
import { QuotationVersion } from '../models/QuotationVersion.js';
import { logAuditEvent } from './auditService.js';

class QuotationProService {
  async createTemplate(vendorId, data) {
    const template = await QuotationTemplate.create({ ...data, vendor: vendorId });
    return template;
  }

  async getTemplates(vendorId) {
    return QuotationTemplate.find({ vendor: vendorId, isActive: true }).sort({ name: 1 });
  }

  async getTemplate(vendorId, templateId) {
    return QuotationTemplate.findOne({ _id: templateId, vendor: vendorId });
  }

  async updateTemplate(vendorId, templateId, data) {
    const template = await QuotationTemplate.findOneAndUpdate(
      { _id: templateId, vendor: vendorId },
      { $set: data },
      { new: true },
    );
    return template;
  }

  async deleteTemplate(vendorId, templateId) {
    return QuotationTemplate.findOneAndUpdate({ _id: templateId, vendor: vendorId }, { isActive: false }, { new: true });
  }

  async duplicateTemplate(vendorId, templateId) {
    const original = await QuotationTemplate.findOne({ _id: templateId, vendor: vendorId });
    if (!original) throw new Error('Template not found');
    const dup = await QuotationTemplate.create({
      ...original.toObject(),
      _id: undefined,
      name: `${original.name} (Copy)`,
      vendor: vendorId,
      usageCount: 0,
      lastUsedAt: null,
    });
    return dup;
  }

  async createVersion(quotationId, vendorId, data) {
    const version = await QuotationVersion.create({
      quotation: quotationId, vendor: vendorId, ...data,
    });
    return version;
  }

  async getVersions(quotationId) {
    return QuotationVersion.find({ quotation: quotationId }).sort({ version: -1 });
  }

  async getVersion(vendorId, quotationId, version) {
    return QuotationVersion.findOne({ quotation: quotationId, vendor: vendorId, version });
  }

  async getQuotationAnalytics(vendorId) {
    const { default: Quotation } = await import('../models/Quotation.js');
    const [total, sent, accepted, rejected, expired, totalAmount] = await Promise.all([
      Quotation.countDocuments({ vendor: vendorId }),
      Quotation.countDocuments({ vendor: vendorId, status: 'sent' }),
      Quotation.countDocuments({ vendor: vendorId, status: 'accepted' }),
      Quotation.countDocuments({ vendor: vendorId, status: 'rejected' }),
      Quotation.countDocuments({ vendor: vendorId, status: 'expired' }),
      Quotation.aggregate([
        { $match: { vendor: mongoose.Types.ObjectId.createFromHexString(vendorId) } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);
    return {
      total, sent, accepted, rejected, expired,
      acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      totalAmount: totalAmount[0]?.total || 0,
    };
  }

  async getExpiringQuotations(vendorId, days = 7) {
    const { default: Quotation } = await import('../models/Quotation.js');
    const expiryDate = new Date(Date.now() + days * 86400000);
    return Quotation.find({
      vendor: vendorId,
      status: 'sent',
      expiresAt: { $lte: expiryDate, $gte: new Date() },
    }).sort({ expiresAt: 1 });
  }
}

export const quotationProService = new QuotationProService();
