import VendorReputation from '../models/VendorReputation.js';
import VendorBadge from '../models/VendorBadge.js';
import Order from '../models/Order.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

const DEFAULT_WEIGHTS = {
  relevance: 0.40,
  vendorReputation: 0.20,
  subscriptionPlan: 0.10,
  verifiedSupplier: 0.10,
  responseRate: 0.05,
  onTimeDelivery: 0.05,
  recentActivity: 0.05,
  sponsoredProducts: 0.05,
};

let weights = { ...DEFAULT_WEIGHTS };

export function setRankingWeights(newWeights) {
  weights = { ...DEFAULT_WEIGHTS, ...newWeights };
  logger.info({ weights }, 'Ranking weights updated');
}

export function getRankingWeights() {
  return { ...weights };
}

export function resetRankingWeights() {
  weights = { ...DEFAULT_WEIGHTS };
  return weights;
}

export async function scoreProduct(product, context = {}) {
  let score = 0;
  const breakdown = {};

  if (!product.vendor) return { score: 0, breakdown: { reason: 'No vendor' } };

  const vendorId = typeof product.vendor === 'object' ? product.vendor._id : product.vendor;

  const relevanceScore = context.relevanceScore || 0.5;
  breakdown.relevance = relevanceScore * weights.relevance;
  score += breakdown.relevance;

  try {
    const rep = await VendorReputation.findOne({ vendor: vendorId }).lean();
    if (rep) {
      const repScore = rep.currentScore / 100;
      breakdown.vendorReputation = repScore * weights.vendorReputation;
      score += breakdown.vendorReputation;

      if (rep.scoreBreakdown?.verification >= 10) {
        breakdown.verifiedSupplier = 1 * weights.verifiedSupplier;
        score += breakdown.verifiedSupplier;
      }

      if (rep.scoreBreakdown?.delivery >= 12) {
        breakdown.onTimeDelivery = 1 * weights.onTimeDelivery;
        score += breakdown.onTimeDelivery;
      }

      if (rep.scoreBreakdown?.communication >= 7) {
        breakdown.responseRate = 1 * weights.responseRate;
        score += breakdown.responseRate;
      }
    }

    const recentOrders = await Order.countDocuments({ vendor: vendorId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    breakdown.recentActivity = Math.min(recentOrders / 10, 1) * weights.recentActivity;
    score += breakdown.recentActivity;

    const badges = await VendorBadge.find({ vendor: vendorId, isActive: true }).lean();
    let subscriptionBonus = 0;
    if (badges.some(b => b.badge === 'premium_supplier' || b.badge === 'gold_supplier' || b.badge === 'trusted_manufacturer')) {
      subscriptionBonus = 1;
    }
    breakdown.subscriptionPlan = subscriptionBonus * weights.subscriptionPlan;
    score += breakdown.subscriptionPlan;

  } catch (err) {
    logger.debug({ err, vendorId }, 'Failed to score vendor reputation');
  }

  return {
    score: Math.round(score * 100) / 100,
    maxScore: 1,
    percentage: Math.round(score * 100),
    breakdown,
  };
}

export async function rankProducts(products, context = {}) {
  const scored = await Promise.all(
    products.map(async (product) => {
      const ranking = await scoreProduct(product, context);
      // Spread a mongoose document copies $__/_doc/$isNew into the JSON.
      // Always serialize through toObject() so the wire format stays clean
      // and the Product toJSON/toObject transform (price/images) applies.
      const base =
        product && typeof product.toObject === "function"
          ? product.toObject()
          : product && typeof product === "object"
            ? { ...product }
            : {};
      return { ...base, _rankingScore: ranking.score, _rankingBreakdown: ranking.breakdown };
    })
  );

  scored.sort((a, b) => (b._rankingScore || 0) - (a._rankingScore || 0));
  // Ranking fields are used only for sorting, never for the wire format.
  return scored.map(({ _rankingScore, _rankingBreakdown, ...rest }) => rest);
}

export async function scoreVendorForRfq(vendor, rfqContext = {}) {
  let score = 0;
  const reasons = [];

  try {
    const rep = await VendorReputation.findOne({ vendor: vendor._id }).lean();
    if (rep) {
      const repScore = rep.currentScore / 100;
      score += repScore * 0.30;
      if (rep.currentScore >= 80) reasons.push('High reputation score');
      if (rep.scoreBreakdown?.delivery >= 12) reasons.push('Excellent delivery performance');
      if (rep.scoreBreakdown?.communication >= 7) reasons.push('Fast response time');
      if (rep.scoreBreakdown?.disputes >= 8) reasons.push('Low dispute history');
    }

    const badges = await VendorBadge.find({ vendor: vendor._id, isActive: true }).lean();
    if (badges.some(b => b.badge === 'verified_supplier' || b.badge === 'factory_verified')) {
      score += 0.15;
      reasons.push('Verified supplier');
    }
    if (badges.some(b => b.badge === 'gold_supplier' || b.badge === 'trusted_manufacturer')) {
      score += 0.10;
      reasons.push('Premium supplier status');
    }
    if (badges.some(b => b.badge === 'export_expert')) {
      score += 0.05;
      reasons.push('Export expert');
    }

    if (rfqContext.category && vendor.industry === rfqContext.category) {
      score += 0.15;
      reasons.push('Industry match');
    }

    if (rfqContext.country && vendor.country === rfqContext.country) {
      score += 0.05;
      reasons.push('Local supplier');
    }

  } catch (err) {
    logger.debug({ err, vendorId: vendor._id }, 'Failed to score vendor for RFQ');
  }

  return { score: Math.round(score * 100), reasons };
}

export async function rankVendorsForRfq(vendors, rfqContext) {
  const scored = await Promise.all(
    vendors.map(async (vendor) => {
      const result = await scoreVendorForRfq(vendor, rfqContext);
      const base =
        vendor && typeof vendor.toObject === "function"
          ? vendor.toObject()
          : vendor && typeof vendor === "object"
            ? { ...vendor }
            : {};
      return { ...base, _rfqScore: result.score, _rfqReasons: result.reasons };
    })
  );
  scored.sort((a, b) => (b._rfqScore || 0) - (a._rfqScore || 0));
  return scored;
}
