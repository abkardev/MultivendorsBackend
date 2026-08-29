import expressAsyncHandler from 'express-async-handler';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const submitVerification = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  if (vendor.verificationStatus === 'approved') throw new AppError('Already verified', 400);
  if (vendor.verificationStatus === 'pending') throw new AppError('Verification already pending', 400);

  const { docs } = req.body;
  if (!docs?.length) throw new AppError('At least one document is required', 400);

  vendor.verificationDocs = docs;
  vendor.verificationStatus = 'pending';
  await vendor.save();

  res.json({ status: true, data: vendor });
});

export const getVerificationStatus = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id }).select('isVerified verificationStatus verificationDocs verificationNotes verificationReviewedAt');
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  res.json({ status: true, data: vendor });
});

export const getPendingVerifications = expressAsyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ verificationStatus: 'pending' })
    .populate('user', 'name email')
    .select('storeName slug storeImage verificationStatus verificationDocs createdAt');
  res.json({ status: true, data: vendors });
});

export const reviewVerification = expressAsyncHandler(async (req, res) => {
  const { vendorId, action, notes } = req.body;
  if (!['approved', 'rejected'].includes(action)) throw new AppError('Action must be approved or rejected', 400);

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) throw new AppError('Vendor not found', 404);
  if (vendor.verificationStatus !== 'pending') throw new AppError('Vendor is not pending verification', 400);

  vendor.verificationStatus = action;
  vendor.isVerified = action === 'approved';
  vendor.verificationReviewedBy = req.user._id;
  vendor.verificationReviewedAt = new Date();
  if (notes) vendor.verificationNotes = notes;
  await vendor.save();

  res.json({ status: true, data: vendor });
});
