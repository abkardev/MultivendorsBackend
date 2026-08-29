import expressAsyncHandler from 'express-async-handler';
import { Quotation } from '../models/Quotation.js';
import { ProcurementDocument } from '../models/ProcurementDocument.js';
import { AppError } from '../middlewares/errorHandler.js';

function generateQuoteNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 9000) + 1000);
  return `Q-${y}${m}${d}-${r}`;
}

// @desc Create a quotation
const createQuotation = expressAsyncHandler(async (req, res) => {
  const data = { ...req.body, buyer: req.body.buyer, vendor: req.body.vendor, quoteNumber: generateQuoteNumber(), createdBy: req.user._id, status: 'draft' };
  if (!data.buyer) throw new AppError('Buyer is required', 400);
  if (!data.vendor) throw new AppError('Vendor is required', 400);
  const quote = await Quotation.create(data);
  res.status(201).json({ status: true, data: quote });
});

// @desc Get quotations (buyer sees theirs, vendor sees theirs, admin sees all)
const getQuotations = expressAsyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'buyer') filter.buyer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.rfq) filter.rfq = req.query.rfq;
  const quotes = await Quotation.find(filter).populate('buyer vendor', 'name email').sort({ createdAt: -1 });
  res.status(200).json({ status: true, data: quotes });
});

// @desc Get single quotation
const getQuotationById = expressAsyncHandler(async (req, res) => {
  const quote = await Quotation.findById(req.params.id).populate('buyer vendor', 'name email companyName');
  if (!quote) throw new AppError('Quotation not found', 404);
  if (req.user.role !== 'admin' && quote.buyer._id.toString() !== req.user._id.toString() && quote.vendor._id.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized', 403);
  }
  res.status(200).json({ status: true, data: quote });
});

// @desc Update quotation (only draft and sent status)
const updateQuotation = expressAsyncHandler(async (req, res) => {
  const quote = await Quotation.findById(req.params.id);
  if (!quote) throw new AppError('Quotation not found', 404);
  if (quote.status !== 'draft' && quote.status !== 'sent') throw new AppError('Cannot modify quotation in current status', 400);
  if (req.user.role !== 'admin' && quote.vendor._id.toString() !== req.user._id.toString()) throw new AppError('Not authorized', 403);
  Object.assign(quote, req.body, { updatedBy: req.user._id });
  await quote.save();
  res.status(200).json({ status: true, data: quote });
});

// @desc Submit quotation (draft -> sent)
const submitQuotation = expressAsyncHandler(async (req, res) => {
  const quote = await Quotation.findById(req.params.id);
  if (!quote) throw new AppError('Quotation not found', 404);
  if (quote.status !== 'draft') throw new AppError('Only draft quotations can be submitted', 400);
  quote.status = 'sent';
  quote.submittedAt = new Date();
  quote.updatedBy = req.user._id;
  await quote.save();
  res.status(200).json({ status: true, data: quote });
});

// @desc Accept quotation (buyer action)
const acceptQuotation = expressAsyncHandler(async (req, res) => {
  const quote = await Quotation.findById(req.params.id);
  if (!quote) throw new AppError('Quotation not found', 404);
  if (quote.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new AppError('Not authorized', 403);
  if (quote.status !== 'sent' && quote.status !== 'pending') throw new AppError('Quotation cannot be accepted in current status', 400);
  quote.status = 'accepted';
  quote.acceptedAt = new Date();
  quote.acceptedBy = req.user._id;
  quote.respondedAt = new Date();
  await quote.save();
  res.status(200).json({ status: true, data: quote });
});

// @desc Reject quotation (buyer action)
const rejectQuotation = expressAsyncHandler(async (req, res) => {
  const quote = await Quotation.findById(req.params.id);
  if (!quote) throw new AppError('Quotation not found', 404);
  if (quote.buyer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') throw new AppError('Not authorized', 403);
  if (quote.status !== 'sent' && quote.status !== 'pending') throw new AppError('Quotation cannot be rejected in current status', 400);
  quote.status = 'rejected';
  quote.respondedAt = new Date();
  await quote.save();
  res.status(200).json({ status: true, data: quote });
});

// @desc Compare quotations (side-by-side)
const compareQuotations = expressAsyncHandler(async (req, res) => {
  const { ids } = req.query;
  if (!ids) throw new AppError('Quotation IDs are required (comma-separated)', 400);
  const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
  if (idList.length < 2) throw new AppError('At least 2 quotations are needed for comparison', 400);
  const quotes = await Quotation.find({ _id: { $in: idList } }).populate('vendor', 'name email companyName storeName');
  if (quotes.length < 2) throw new AppError('Could not find enough quotations for comparison', 404);
  const matrix = quotes.map(q => ({
    _id: q._id,
    quoteNumber: q.quoteNumber,
    vendor: q.vendor,
    totalAmount: q.totalAmount,
    currency: q.currency,
    paymentTerms: q.paymentTerms,
    incoterms: q.incoterms,
    leadTimeMin: q.leadTimeMin,
    leadTimeMax: q.leadTimeMax,
    countryOfOrigin: q.countryOfOrigin,
    certifications: q.certifications,
    warranty: q.warranty,
    deliveryTime: q.deliveryTime,
    moq: q.items?.length > 0 ? Math.min(...q.items.map(i => i.moq || Infinity)) : undefined,
    status: q.status,
    validUntil: q.validUntil,
    items: q.items,
  }));
  res.status(200).json({ status: true, data: matrix });
});

// @desc Get quotation statistics for vendor dashboard
const getQuotationStats = expressAsyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'vendor') filter.vendor = req.user._id;
  else if (req.user.role === 'buyer') filter.buyer = req.user._id;
  const stats = await Quotation.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const result = { total: 0, draft: 0, sent: 0, pending: 0, accepted: 0, rejected: 0, expired: 0, cancelled: 0 };
  stats.forEach(s => { result[s._id] = s.count; result.total += s.count; });
  res.status(200).json({ status: true, data: result });
});

export { createQuotation, getQuotations, getQuotationById, updateQuotation, submitQuotation, acceptQuotation, rejectQuotation, compareQuotations, getQuotationStats };
