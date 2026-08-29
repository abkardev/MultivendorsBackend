import expressAsyncHandler from 'express-async-handler';
import { processQuery, processWithLLM, processRfqQuery } from '../services/aiService.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';

export const productAssistant = expressAsyncHandler(async (req, res) => {
  const { query, useLLM } = req.body;
  if (!query) throw new AppError('Query is required', 400);
  if (typeof query !== 'string' || query.trim().length > 2000) {
    throw new AppError('Query must be a string under 2000 characters', 400);
  }

  const useLLMBool = useLLM === true;
  const result = useLLMBool
    ? await processWithLLM(query, { userId: req.user._id })
    : await processQuery(query, { userId: req.user._id });

  if (result.type !== 'error') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (vendor) {
      if (!vendor.aiHistory) vendor.aiHistory = [];
      vendor.aiHistory.push({ query, response: result.content, type: 'product', createdAt: new Date() });
      if (vendor.aiHistory.length > 100) vendor.aiHistory = vendor.aiHistory.slice(-100);
      await vendor.save();
    }
  }

  res.json({ status: true, data: result });
});

export const rfqAssistant = expressAsyncHandler(async (req, res) => {
  const { query, useLLM } = req.body;
  if (!query) throw new AppError('Query is required', 400);
  if (typeof query !== 'string' || query.trim().length > 2000) {
    throw new AppError('Query must be a string under 2000 characters', 400);
  }

  const useLLMBool = useLLM === true;
  const result = useLLMBool
    ? await processWithLLM(query, { userId: req.user._id })
    : await processRfqQuery(query, { userId: req.user._id });

  if (result.type !== 'error') {
    const vendor = await Vendor.findOne({ user: req.user._id });
    if (vendor) {
      if (!vendor.aiHistory) vendor.aiHistory = [];
      vendor.aiHistory.push({ query, response: result.content, type: 'rfq', createdAt: new Date() });
      if (vendor.aiHistory.length > 100) vendor.aiHistory = vendor.aiHistory.slice(-100);
      await vendor.save();
    }
  }

  res.json({ status: true, data: result });
});

export const getHistory = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id }).select('aiHistory');
  if (!vendor) throw new AppError('Vendor profile not found', 404);

  const { type } = req.query;
  let history = vendor.aiHistory || [];
  if (type === 'product' || type === 'rfq') {
    history = history.filter((h) => h.type === type);
  }

  res.json({ status: true, data: history });
});
