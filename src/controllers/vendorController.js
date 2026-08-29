import expressAsyncHandler from 'express-async-handler';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sanitizeBody } from '../utils/sanitize.js';
import { canAccess } from '../utils/ownership.js';

const ALLOWED_FIELDS = ['storeName', 'storeNameAr', 'slug', 'description', 'descriptionAr', 'logo', 'banner', 'phone', 'address', 'city', 'country', 'categories', 'businessType', 'commercialRegister', 'taxNumber', 'isActive'];

export const createVendor = expressAsyncHandler(async (req, res) => {
  const payload = { ...sanitizeBody(req.body, ALLOWED_FIELDS), user: req.body.user || req.user?._id };
  const newVendor = await Vendor.create(payload);
  res.status(201).json({ status: true, data: newVendor });
});

export const getVendors = expressAsyncHandler(async (_req, res) => {
  const vendors = await Vendor.find({ isActive: true }).populate('user', '-password');
  res.json({ status: true, data: vendors });
});

export const getVendorBySlug = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ slug: req.params.slug }).populate('user', '-password');
  if (!vendor) throw new AppError('Vendor not found', 404);
  res.json({ status: true, data: vendor });
});

export const updateVendor = expressAsyncHandler(async (req, res) => {
  const existing = await Vendor.findById(req.params.id);
  if (!existing) throw new AppError('Vendor not found', 404);
  if (!canAccess(req.user, existing.user)) {
    return res.status(403).json({ status: false, message: 'Forbidden' });
  }
  const data = sanitizeBody(req.body, ALLOWED_FIELDS);
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, data, {
    new: true,
    runValidators: true,
  });
  res.json({ status: true, data: vendor });
});

export const deleteVendor = expressAsyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ status: false, message: 'Forbidden' });
  }
  const vendor = await Vendor.findByIdAndDelete(req.params.id);
  if (!vendor) throw new AppError('Vendor not found', 404);
  res.json({ status: true, message: 'Vendor removed' });
});
