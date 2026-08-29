import expressAsyncHandler from 'express-async-handler';
import { VendorPaymentGateway } from '../models/VendorPaymentGateway.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getMyGateway = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const gateway = await VendorPaymentGateway.findOne({ vendor: vendor._id });
  res.json({ status: true, data: gateway || null });
});

export const saveGateway = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const { gateway, isActive, credentials, bankAccount, payoutSettings } = req.body;

  let record = await VendorPaymentGateway.findOne({ vendor: vendor._id });
  if (record) {
    if (gateway) record.gateway = gateway;
    if (isActive !== undefined) record.isActive = isActive;
    if (credentials) record.credentials = { ...record.credentials, ...credentials };
    if (bankAccount) record.bankAccount = { ...record.bankAccount, ...bankAccount };
    if (payoutSettings) record.payoutSettings = { ...record.payoutSettings, ...payoutSettings };
    await record.save();
  } else {
    record = await VendorPaymentGateway.create({
      vendor: vendor._id,
      gateway: gateway || 'bank_transfer',
      isActive: isActive !== undefined ? isActive : true,
      credentials: credentials || {},
      bankAccount: bankAccount || {},
      payoutSettings: payoutSettings || { autoPayout: false, payoutSchedule: 'manual', minimumPayout: 100 },
    });
  }

  res.json({ status: true, data: record, message: 'Payment gateway saved' });
});

export const deleteGateway = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  await VendorPaymentGateway.findOneAndDelete({ vendor: vendor._id });
  res.json({ status: true, message: 'Payment gateway removed' });
});
