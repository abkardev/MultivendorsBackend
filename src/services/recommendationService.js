/**
 * @deprecated Superseded by recommendationEngineV3Service.js
 * Kept for backward compatibility. New code should use recommendationEngineV3Service.
 */

/**
 * Recommendation Engine Service.
 * Logic-based recommendations, upgradable to ML-based later.
 */

import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';

export async function getPersonalizedProducts(userId, limit = 10) {
  const orders = await Order.find({ user: userId }).populate('items.product');
  const categoryIds = [...new Set(
    orders.flatMap(o => o.items.map(i => i.product?.category).filter(Boolean))
  )];

  const purchasedProductIds = orders.flatMap(o => o.items.map(i => i.product?._id).filter(Boolean));

  const filter = {};
  if (categoryIds.length > 0) filter.category = { $in: categoryIds };
  if (purchasedProductIds.length > 0) filter._id = { $nin: purchasedProductIds };

  const products = await Product.find(filter)
    .populate('vendor', 'storeName slug')
    .sort({ ratingAverage: -1, createdAt: -1 })
    .limit(limit);

  if (products.length < limit) {
    const existingIds = products.map(p => p._id);
    const fallback = await Product.find(existingIds.length > 0 ? { _id: { $nin: existingIds } } : {})
      .populate('vendor', 'storeName slug')
      .sort({ ratingAverage: -1, ratingQuantity: -1 })
      .limit(limit - products.length);
    products.push(...fallback);
  }

  return products;
}

export async function getTrendingProducts(limit = 10) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const products = await Product.find({ createdAt: { $gte: thirtyDaysAgo } })
    .populate('vendor', 'storeName slug')
    .sort({ ratingQuantity: -1, ratingAverage: -1 })
    .limit(limit);

  if (products.length < limit) {
    const existingIds = products.map(p => p._id);
    const fallback = await Product.find(existingIds.length > 0 ? { _id: { $nin: existingIds } } : {})
      .populate('vendor', 'storeName slug')
      .sort({ ratingQuantity: -1, ratingAverage: -1 })
      .limit(limit - products.length);
    products.push(...fallback);
  }

  return products;
}

export async function getSimilarProducts(productId, limit = 6) {
  const product = await Product.findById(productId);
  if (!product) return [];

  const filter = { _id: { $ne: productId } };
  if (product.category) filter.category = product.category;

  const products = await Product.find(filter)
    .populate('vendor', 'storeName slug')
    .sort({ ratingAverage: -1 })
    .limit(limit);

  if (products.length < limit) {
    const existingIds = products.map(p => p._id);
    existingIds.push(productId);
    const fallback = await Product.find({ _id: { $nin: existingIds } })
      .populate('vendor', 'storeName slug')
      .sort({ ratingAverage: -1 })
      .limit(limit - products.length);
    products.push(...fallback);
  }

  return products;
}

export async function getRecommendedVendors(userId, limit = 10) {
  const vendors = await Vendor.find({ isActive: true })
    .populate('user', 'name email')
    .sort({ isVerified: -1, createdAt: -1 })
    .limit(limit);
  return vendors;
}

export async function getFrequentlyBoughtTogether(productId, limit = 4) {
  const orders = await Order.find({ 'items.product': productId }).populate('items.product');
  const productIds = [...new Set(
    orders.flatMap(o => o.items.map(i => i.product?._id?.toString()).filter(Boolean))
  )].filter(id => id !== productId.toString());

  if (productIds.length === 0) return getSimilarProducts(productId, limit);

  const products = await Product.find({ _id: { $in: productIds.slice(0, limit) } })
    .populate('vendor', 'storeName slug');

  if (products.length < limit) {
    const existingIds = products.map(p => p._id);
    const fallback = await Product.find({ _id: { $nin: [...existingIds, productId] } })
      .populate('vendor', 'storeName slug')
      .sort({ ratingAverage: -1 })
      .limit(limit - products.length);
    products.push(...fallback);
  }

  return products;
}
