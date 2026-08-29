import expressAsyncHandler from 'express-async-handler';
import { CrmContact } from '../models/crmContactModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getContacts = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const { status, search } = req.query;
  const filter = { vendor: vendor._id };

  if (status && status !== 'all') filter.status = status;
  if (search) {
    filter.$or = [
      { company: { $regex: search, $options: 'i' } },
      { 'buyer.name': { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const contacts = await CrmContact.find(filter)
    .populate('buyer', 'name email avatar')
    .sort({ updatedAt: -1 });

  res.json({ status: true, data: contacts });
});

export const getContactById = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const contact = await CrmContact.findOne({ _id: req.params.id, vendor: vendor._id })
    .populate('buyer', 'name email avatar');
  if (!contact) throw new AppError('Contact not found', 404);

  res.json({ status: true, data: contact });
});

export const updateContact = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const contact = await CrmContact.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('buyer', 'name email avatar');

  if (!contact) throw new AppError('Contact not found', 404);
  res.json({ status: true, data: contact });
});

export const addNote = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const { text } = req.body;
  if (!text) throw new AppError('Note text is required', 400);

  const contact = await CrmContact.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    { $push: { notes: { text } } },
    { new: true }
  ).populate('buyer', 'name email avatar');

  if (!contact) throw new AppError('Contact not found', 404);
  res.json({ status: true, data: contact });
});

export const addInteraction = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const { type, description, relatedId } = req.body;
  if (!type || !description) throw new AppError('Type and description are required', 400);

  const contact = await CrmContact.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    { $push: { interactions: { type, description, relatedId } } },
    { new: true }
  ).populate('buyer', 'name email avatar');

  if (!contact) throw new AppError('Contact not found', 404);
  res.json({ status: true, data: contact });
});

export const getCrmStats = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const total = await CrmContact.countDocuments({ vendor: vendor._id });
  const active = await CrmContact.countDocuments({ vendor: vendor._id, status: 'active' });
  const lead = await CrmContact.countDocuments({ vendor: vendor._id, status: 'lead' });
  const inactive = await CrmContact.countDocuments({ vendor: vendor._id, status: 'inactive' });

  res.json({ status: true, data: { total, active, lead, inactive } });
});
