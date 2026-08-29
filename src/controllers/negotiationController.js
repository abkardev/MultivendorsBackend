import expressAsyncHandler from 'express-async-handler';
import { Negotiation } from '../models/Negotiation.js';
import { Quotation } from '../models/Quotation.js';
import { AppError } from '../middlewares/errorHandler.js';

// @desc Start or continue negotiation
const startNegotiation = expressAsyncHandler(async (req, res) => {
  const { quotation, buyer, vendor, message } = req.body;
  if (!quotation || !buyer || !vendor) throw new AppError('quotation, buyer, and vendor are required', 400);
  const existing = await Negotiation.findOne({ quotation, status: { $in: ['open', 'buyer_countered', 'vendor_countered'] } });
  if (existing) {
    existing.rounds.push({ roundNumber: existing.currentRound + 1, initiatedBy: req.user.role === 'buyer' ? 'buyer' : 'vendor', type: 'counter', message, createdAt: new Date() });
    existing.currentRound += 1;
    existing.status = req.user.role === 'buyer' ? 'buyer_countered' : 'vendor_countered';
    await existing.save();
    return res.status(200).json({ status: true, data: existing });
  }
  const neg = await Negotiation.create({
    quotation, buyer, vendor,
    rounds: [{ roundNumber: 1, initiatedBy: req.user.role === 'buyer' ? 'buyer' : 'vendor', type: 'initial', message }],
    status: 'open', currentRound: 1,
  });
  res.status(201).json({ status: true, data: neg });
});

// @desc Add counter-offer
const addCounterOffer = expressAsyncHandler(async (req, res) => {
  const neg = await Negotiation.findById(req.params.id);
  if (!neg) throw new AppError('Negotiation not found', 404);
  if (['accepted', 'declined', 'expired', 'cancelled'].includes(neg.status)) throw new AppError('Negotiation is closed', 400);
  const { message, proposedPrice, proposedMoq, proposedLeadTimeMin, proposedLeadTimeMax, proposedPaymentTerms, proposedIncoterms, proposedDeliveryDate } = req.body;
  neg.rounds.push({
    roundNumber: neg.currentRound + 1,
    initiatedBy: req.user.role === 'buyer' ? 'buyer' : 'vendor',
    type: 'counter',
    message,
    proposedPrice, proposedMoq, proposedLeadTimeMin, proposedLeadTimeMax, proposedPaymentTerms, proposedIncoterms, proposedDeliveryDate,
    createdAt: new Date(),
  });
  neg.currentRound += 1;
  neg.status = req.user.role === 'buyer' ? 'buyer_countered' : 'vendor_countered';
  await neg.save();
  res.status(200).json({ status: true, data: neg });
});

// @desc Accept negotiation
const acceptNegotiation = expressAsyncHandler(async (req, res) => {
  const neg = await Negotiation.findById(req.params.id);
  if (!neg) throw new AppError('Negotiation not found', 404);
  neg.status = 'accepted';
  neg.acceptedAt = new Date();
  neg.acceptedBy = req.user._id;
  neg.acceptedRound = neg.currentRound;
  neg.completedAt = new Date();
  await neg.save();
  const quote = await Quotation.findById(neg.quotation);
  if (quote) {
    const lastRound = neg.rounds[neg.rounds.length - 1];
    if (lastRound.proposedPrice) quote.totalAmount = lastRound.proposedPrice;
    if (lastRound.proposedPaymentTerms) quote.paymentTerms = lastRound.proposedPaymentTerms;
    if (lastRound.proposedIncoterms) quote.incoterms = lastRound.proposedIncoterms;
    if (lastRound.proposedLeadTimeMin != null) quote.leadTimeMin = lastRound.proposedLeadTimeMin;
    if (lastRound.proposedLeadTimeMax != null) quote.leadTimeMax = lastRound.proposedLeadTimeMax;
    quote.status = 'accepted';
    quote.acceptedAt = new Date();
    quote.acceptedBy = req.user._id;
    await quote.save();
  }
  res.status(200).json({ status: true, data: neg });
});

// @desc Decline negotiation
const declineNegotiation = expressAsyncHandler(async (req, res) => {
  const neg = await Negotiation.findById(req.params.id);
  if (!neg) throw new AppError('Negotiation not found', 404);
  neg.status = 'declined';
  neg.completedAt = new Date();
  neg.rounds.push({ roundNumber: neg.currentRound + 1, initiatedBy: req.user.role === 'buyer' ? 'buyer' : 'vendor', type: 'decline', message: req.body.message || 'Declined', createdAt: new Date() });
  await neg.save();
  res.status(200).json({ status: true, data: neg });
});

// @desc Get negotiations for user
const getNegotiations = expressAsyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'buyer') filter.buyer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;
  if (req.query.status) filter.status = req.query.status;
  const negs = await Negotiation.find(filter).populate('buyer vendor quotation').sort({ updatedAt: -1 });
  res.status(200).json({ status: true, data: negs });
});

// @desc Get single negotiation
const getNegotiationById = expressAsyncHandler(async (req, res) => {
  const neg = await Negotiation.findById(req.params.id).populate('buyer vendor quotation');
  if (!neg) throw new AppError('Negotiation not found', 404);
  res.status(200).json({ status: true, data: neg });
});

export { startNegotiation, addCounterOffer, acceptNegotiation, declineNegotiation, getNegotiations, getNegotiationById };
