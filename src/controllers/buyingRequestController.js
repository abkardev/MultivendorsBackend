import expressAsyncHandler from 'express-async-handler';
import { BuyingRequest } from '../models/buyingRequestModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getBuyingRequests = expressAsyncHandler(async (req, res) => {
  const filter = { status: 'open' };
  if (req.query.category) filter.category = req.query.category;
  const requests = await BuyingRequest.find(filter)
    .populate('buyer', 'name')
    .select('-quotes')
    .sort({ createdAt: -1 });
  res.json({ status: true, data: requests });
});

export const getBuyingRequestById = expressAsyncHandler(async (req, res) => {
  const request = await BuyingRequest.findById(req.params.id)
    .populate('buyer', 'name')
    .populate('quotes.vendor', 'storeName slug storeImage');
  if (!request) throw new AppError('Buying request not found', 404);
  // Only expose quotes to the buyer who created the request or admin
  const buyerId = request.buyer?._id || request.buyer;
  const isOwner = req.user && buyerId?.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    request.quotes = undefined;
  }
  res.json({ status: true, data: request });
});

export const createBuyingRequest = expressAsyncHandler(async (req, res) => {
  const request = await BuyingRequest.create({ ...req.body, buyer: req.user._id });
  res.status(201).json({ status: true, data: request });
});

export const updateBuyingRequest = expressAsyncHandler(async (req, res) => {
  const request = await BuyingRequest.findById(req.params.id);
  if (!request) throw new AppError('Buying request not found', 404);
  if (request.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Not authorized', 403);
  Object.assign(request, req.body);
  await request.save();
  res.json({ status: true, data: request });
});

export const deleteBuyingRequest = expressAsyncHandler(async (req, res) => {
  const request = await BuyingRequest.findById(req.params.id);
  if (!request) throw new AppError('Buying request not found', 404);
  if (request.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Not authorized', 403);
  await request.deleteOne();
  res.json({ status: true, message: 'Buying request removed' });
});

export const getMyBuyingRequests = expressAsyncHandler(async (req, res) => {
  const requests = await BuyingRequest.find({ buyer: req.user._id }).sort({ createdAt: -1 });
  res.json({ status: true, data: requests });
});

export const submitQuote = expressAsyncHandler(async (req, res) => {
  const request = await BuyingRequest.findById(req.params.id);
  if (!request) throw new AppError('Buying request not found', 404);
  if (request.status !== 'open') throw new AppError('This request is closed', 400);

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const alreadyQuoted = request.quotes.find(q => q.vendor.toString() === vendor._id.toString());
  if (alreadyQuoted) throw new AppError('You have already quoted this request', 400);

  request.quotes.push({ vendor: vendor._id, ...req.body });
  request.status = 'quoted';
  await request.save();
  res.status(201).json({ status: true, data: request });
});

export const getMyQuotes = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  const requests = await BuyingRequest.find({ 'quotes.vendor': vendor._id })
    .populate('buyer', 'name')
    .sort({ createdAt: -1 });
  res.json({ status: true, data: requests });
});
