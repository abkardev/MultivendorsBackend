import expressAsyncHandler from 'express-async-handler';
import { RfqTemplate } from '../models/rfqTemplateModel.js';
import { Announcement } from '../models/announcementModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

// --- RFQ Templates ---

export const getTemplates = expressAsyncHandler(async (req, res) => {
  const templates = await RfqTemplate.find({ user: req.user._id }).sort({ updatedAt: -1 });
  res.json({ status: true, data: templates });
});

export const getTemplateById = expressAsyncHandler(async (req, res) => {
  const template = await RfqTemplate.findOne({ _id: req.params.id, user: req.user._id });
  if (!template) throw new AppError('Template not found', 404);
  res.json({ status: true, data: template });
});

export const createTemplate = expressAsyncHandler(async (req, res) => {
  const template = await RfqTemplate.create({ ...req.body, user: req.user._id });
  res.status(201).json({ status: true, data: template });
});

export const updateTemplate = expressAsyncHandler(async (req, res) => {
  const template = await RfqTemplate.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!template) throw new AppError('Template not found', 404);
  res.json({ status: true, data: template });
});

export const deleteTemplate = expressAsyncHandler(async (req, res) => {
  const template = await RfqTemplate.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!template) throw new AppError('Template not found', 404);
  res.json({ status: true, message: 'Deleted' });
});

// --- Auto-match: find vendors matching an RFQ category ---

export const autoMatchVendors = expressAsyncHandler(async (req, res) => {
  const { rfqId } = req.params;
  const rfq = await Announcement.findById(rfqId).populate('category');
  if (!rfq) throw new AppError('RFQ not found', 404);

  const filter = { isActive: true };
  if (rfq.category) {
    // Find vendors whose products match the RFQ category
    filter.products = { $exists: true, $not: { $size: 0 } };
  }

  const vendors = await Vendor.find(filter)
    .populate('user', 'name email')
    .sort({ isVerified: -1 })
    .limit(20);

  res.json({ status: true, data: vendors, rfq });
});

// --- RFQ Analytics ---

export const getRfqAnalytics = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const totalRfqs = await Announcement.countDocuments({ buyer: userId });
  const openRfqs = await Announcement.countDocuments({ buyer: userId, status: 'open' });
  const closedRfqs = await Announcement.countDocuments({ buyer: userId, status: 'closed' });

  const rfqsWithResponses = await Announcement.find({ buyer: userId, 'responses.0': { $exists: true } });
  const totalResponses = rfqsWithResponses.reduce((s, r) => s + (r.responses?.length || 0), 0);
  const avgResponses = totalRfqs > 0 ? (totalResponses / totalRfqs).toFixed(1) : '0';

  res.json({
    status: true,
    data: {
      totalRfqs,
      openRfqs,
      closedRfqs,
      totalResponses,
      avgResponses,
      responseRate: totalRfqs > 0 ? ((rfqsWithResponses.length / totalRfqs) * 100).toFixed(1) : '0',
    },
  });
});
