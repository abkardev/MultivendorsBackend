import expressAsyncHandler from 'express-async-handler';
import {
  getPersonalizedProducts,
  getTrendingProducts,
  getSimilarProducts,
  getRecommendedVendors,
  getFrequentlyBoughtTogether,
} from '../services/recommendationService.js';

export const personalized = expressAsyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await getPersonalizedProducts(req.user._id, limit);
  res.json({ status: true, data: products });
});

export const trending = expressAsyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const products = await getTrendingProducts(limit);
  res.json({ status: true, data: products });
});

export const similarProducts = expressAsyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 6;
  const products = await getSimilarProducts(req.params.productId, limit);
  res.json({ status: true, data: products });
});

export const recommendedVendors = expressAsyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const vendors = await getRecommendedVendors(req.user?._id, limit);
  res.json({ status: true, data: vendors });
});

export const frequentlyBought = expressAsyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 4;
  const products = await getFrequentlyBoughtTogether(req.params.productId, limit);
  res.json({ status: true, data: products });
});
