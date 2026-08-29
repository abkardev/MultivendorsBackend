/**
 * @deprecated Superseded by recommendationEngineV3Service.js
 * Kept for backward compatibility. New code should use recommendationEngineV3Service.
 */

import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import adminControlsService from './adminControlsService.js';
import commerceIntelligenceService from './commerceIntelligenceService.js';
import supplierRiskService from './supplierRiskService.js';

class RecommendationEngineV2 {
  async getPersonalizedProducts(userId, limit = 10) {
    const weights = await adminControlsService.getWeights();
    const rankingWeights = weights.ranking;

    const orders = await Order.find({ user: userId }).populate('items.product').lean();
    const purchasedCategories = new Set();
    const preferredVendors = new Set();
    orders.forEach(o => {
      if (o.items) o.items.forEach(i => {
        if (i.product?.category) purchasedCategories.add(i.product.category);
      });
    });

    const query = {};
    if (purchasedCategories.size > 0) {
      query.category = { $in: [...purchasedCategories] };
    }
    const products = await Product.find(query).populate('vendor').limit(limit * 3).lean();

    const scored = await Promise.all(products.map(async (product) => {
      let score = 0;
      const vendor = product.vendor || {};

      if (purchasedCategories.has(product.category)) score += rankingWeights.relevance || 25;

      if (vendor._id) {
        const intel = await commerceIntelligenceService.getSupplierIntelligence(vendor._id);
        if (intel?.classifications?.bestOverall) {
          score += (intel.classifications.bestOverall / 100) * (rankingWeights.reputation || 20);
        }
      }

      const priceIntel = await commerceIntelligenceService.getPriceIntelligence(product._id);
      if (priceIntel?.label === 'Excellent Deal') score += rankingWeights.price || 15;
      else if (priceIntel?.label === 'Good Deal') score += (rankingWeights.price || 15) * 0.7;

      if (preferredVendors.has(vendor._id?.toString())) {
        score += rankingWeights.buyerPreference || 5;
      }

      return { product, score: Math.round(score * 100) / 100 };
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => ({ ...s.product, _aiScore: s.score }));
  }

  async getRecommendedVendors(userId, limit = 10) {
    const weights = await adminControlsService.getWeights();
    const recommendationWeights = weights.recommendations;

    const vendors = await Vendor.find({ isActive: true }).limit(limit * 2).lean();

    const scored = await Promise.all(vendors.map(async (vendor) => {
      let score = 0;

      const intel = await commerceIntelligenceService.getSupplierIntelligence(vendor._id);
      if (intel?.classifications?.bestOverall) {
        score += (intel.classifications.bestOverall / 100) * (recommendationWeights.vendorReputation || 30);
      }

      const risk = await supplierRiskService.calculateVendorRisk(vendor._id);
      if (risk?.overall !== undefined) {
        score += Math.max(0, (100 - risk.overall) / 100) * (recommendationWeights.risk || 10);
      }

      return { vendor, score: Math.round(score * 100) / 100 };
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => ({ ...s.vendor, _aiScore: s.score }));
  }
}

export default new RecommendationEngineV2();
