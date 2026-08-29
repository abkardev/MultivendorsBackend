import expressAsyncHandler from 'express-async-handler';
import { AdCampaign } from '../models/adCampaignModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getCampaigns = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const campaigns = await AdCampaign.find({ vendor: vendor._id })
    .populate('product', 'name slug image')
    .sort({ createdAt: -1 });

  res.json({ status: true, data: campaigns });
});

export const getCampaignById = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const campaign = await AdCampaign.findOne({ _id: req.params.id, vendor: vendor._id })
    .populate('product', 'name slug image');
  if (!campaign) throw new AppError('Campaign not found', 404);

  res.json({ status: true, data: campaign });
});

export const createCampaign = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const campaign = await AdCampaign.create({ ...req.body, vendor: vendor._id });
  res.status(201).json({ status: true, data: campaign });
});

export const updateCampaign = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const campaign = await AdCampaign.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('product', 'name slug image');

  if (!campaign) throw new AppError('Campaign not found', 404);
  res.json({ status: true, data: campaign });
});

export const deleteCampaign = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const campaign = await AdCampaign.findOneAndDelete({ _id: req.params.id, vendor: vendor._id });
  if (!campaign) throw new AppError('Campaign not found', 404);
  res.json({ status: true, message: 'Campaign deleted' });
});

export const getAdStats = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const [totalResult, activeResult] = await Promise.all([
    AdCampaign.aggregate([
      { $match: { vendor: vendor._id } },
      { $group: { _id: null, total: { $sum: 1 }, totalBudget: { $sum: '$budget' }, totalSpent: { $sum: '$spent' }, totalImpressions: { $sum: '$impressions' }, totalClicks: { $sum: '$clicks' } } },
    ]),
    AdCampaign.countDocuments({ vendor: vendor._id, status: 'active' }),
  ]);

  const stats = totalResult[0] || { total: 0, totalBudget: 0, totalSpent: 0, totalImpressions: 0, totalClicks: 0 };

  res.json({
    status: true,
    data: {
      totalCampaigns: stats.total,
      activeCampaigns: activeResult || 0,
      totalBudget: stats.totalBudget,
      totalSpent: stats.totalSpent,
      totalImpressions: stats.totalImpressions,
      totalClicks: stats.totalClicks,
      ctr: stats.totalImpressions > 0 ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2) : '0.00',
    },
  });
});
