import expressAsyncHandler from 'express-async-handler';
import { Tender } from '../models/tenderModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const getTenders = expressAsyncHandler(async (req, res) => {
  const filter = { visibility: 'public', status: 'open' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  const tenders = await Tender.find(filter)
    .populate('buyer', 'name')
    .select('-bids')
    .sort({ createdAt: -1 });
  res.json({ status: true, data: tenders });
});

export const getTenderById = expressAsyncHandler(async (req, res) => {
  const tender = await Tender.findById(req.params.id)
    .populate('buyer', 'name')
    .populate('bids.vendor', 'storeName slug storeImage');
  if (!tender) throw new AppError('Tender not found', 404);
  // Only expose bids to the buyer who created the tender or admin
  const buyerId = tender.buyer?._id || tender.buyer;
  const isOwner = req.user && buyerId?.toString() === req.user._id.toString();
  const isAdmin = req.user && req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    tender.bids = undefined;
  }
  res.json({ status: true, data: tender });
});

export const createTender = expressAsyncHandler(async (req, res) => {
  const tender = await Tender.create({ ...req.body, buyer: req.user._id });
  res.status(201).json({ status: true, data: tender });
});

export const updateTender = expressAsyncHandler(async (req, res) => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) throw new AppError('Tender not found', 404);
  if (tender.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Not authorized', 403);
  Object.assign(tender, req.body);
  await tender.save();
  res.json({ status: true, data: tender });
});

export const deleteTender = expressAsyncHandler(async (req, res) => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) throw new AppError('Tender not found', 404);
  if (tender.buyer.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new AppError('Not authorized', 403);
  await tender.deleteOne();
  res.json({ status: true, message: 'Tender removed' });
});

export const getMyTenders = expressAsyncHandler(async (req, res) => {
  const tenders = await Tender.find({ buyer: req.user._id })
    .sort({ createdAt: -1 });
  res.json({ status: true, data: tenders });
});

export const submitBid = expressAsyncHandler(async (req, res) => {
  const tender = await Tender.findById(req.params.id);
  if (!tender) throw new AppError('Tender not found', 404);
  if (tender.status !== 'open') throw new AppError('Tender is closed for bids', 400);
  if (new Date() > new Date(tender.deadline)) throw new AppError('Tender deadline has passed', 400);

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const alreadyBid = tender.bids.find(b => b.vendor.toString() === vendor._id.toString());
  if (alreadyBid) throw new AppError('You have already submitted a bid', 400);

  tender.bids.push({ vendor: vendor._id, ...req.body });
  await tender.save();
  res.status(201).json({ status: true, data: tender });
});

export const getMyBids = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError('Vendor profile not found', 404);
  const tenders = await Tender.find({ 'bids.vendor': vendor._id })
    .populate('buyer', 'name')
    .select('title description deadline status bids.$ category');
  res.json({ status: true, data: tenders });
});

export const awardTender = expressAsyncHandler(async (req, res) => {
  const { bidId } = req.body;
  const tender = await Tender.findById(req.params.id);
  if (!tender) throw new AppError('Tender not found', 404);
  if (tender.buyer.toString() !== req.user._id.toString())
    throw new AppError('Not authorized', 403);
  if (tender.status !== 'open' && tender.status !== 'under_review')
    throw new AppError('Tender cannot be awarded', 400);

  const bid = tender.bids.id(bidId);
  if (!bid) throw new AppError('Bid not found', 404);

  tender.status = 'awarded';
  tender.awardedBid = bid._id;
  tender.awardedTo = bid.vendor;
  tender.awardedAt = new Date();
  bid.status = 'accepted';
  tender.bids.forEach(b => {
    if (b._id.toString() !== bidId) b.status = 'rejected';
  });
  await tender.save();
  res.json({ status: true, data: tender });
});
