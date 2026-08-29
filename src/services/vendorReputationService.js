import mongoose from 'mongoose';
import VendorReputation from '../models/VendorReputation.js';
import VendorBadge from '../models/VendorBadge.js';
import ReputationEvent from '../models/ReputationEvent.js';
import Review from '../models/reviewModel.js';
import Order from '../models/Order.js';
import { getLogger } from './logger.js';
import { emitEvent } from './eventService.js';

const logger = getLogger('api');

const WEIGHTS = {
  verification: 15,
  orders: 20,
  delivery: 15,
  communication: 10,
  reviews: 15,
  disputes: 10,
  longevity: 5,
  exports: 5,
  badges: 5,
};

export async function calculateVendorReputation(vendorId) {
  try {
    const [reputation, stats] = await Promise.all([
      VendorReputation.findOne({ vendor: vendorId }),
      gatherVendorStats(vendorId),
    ]);

    const breakdown = {
      verification: calculateVerificationScore(stats),
      orders: calculateOrderScore(stats),
      delivery: calculateDeliveryScore(stats),
      communication: calculateCommunicationScore(stats),
      reviews: calculateReviewScore(stats),
      disputes: calculateDisputeScore(stats),
      longevity: calculateLongevityScore(stats),
      exports: calculateExportScore(stats),
      badges: calculateBadgeScore(stats),
    };

    const maxPerFactor = { verification: 15, orders: 20, delivery: 15, communication: 10, reviews: 15, disputes: 10, longevity: 5, exports: 5, badges: 5 };
    Object.keys(breakdown).forEach(k => {
      breakdown[k] = Math.min(breakdown[k], maxPerFactor[k]);
    });

    const totalScore = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
    const clampedScore = Math.max(0, Math.min(100, totalScore));

    const oldScore = reputation?.currentScore || 0;

    if (reputation) {
      reputation.previousScore = oldScore;
      reputation.currentScore = clampedScore;
      reputation.scoreBreakdown = breakdown;
      reputation.lastCalculatedAt = new Date();
      reputation.scoreHistory.push({ score: clampedScore, reason: 'scheduled recalculation', calculatedAt: new Date() });
      if (reputation.scoreHistory.length > 100) reputation.scoreHistory.shift();
      await reputation.save();
    } else {
      await VendorReputation.create({
        vendor: vendorId,
        currentScore: clampedScore,
        previousScore: 0,
        scoreBreakdown: breakdown,
        lastCalculatedAt: new Date(),
        scoreHistory: [{ score: clampedScore, reason: 'initial calculation', calculatedAt: new Date() }],
      });
    }

    if (Math.abs(clampedScore - oldScore) >= 1) {
      await ReputationEvent.create({
        vendor: vendorId,
        eventType: 'score_change',
        title: { en: 'Reputation Score Updated', ar: 'تم تحديث درجة السمعة' },
        description: { en: `Score changed from ${oldScore} to ${clampedScore}`, ar: `تغيرت الدرجة من ${oldScore} إلى ${clampedScore}` },
        oldValue: oldScore,
        newValue: clampedScore,
        isPublic: true,
      });
    }

    await autoAwardBadges(vendorId, clampedScore, stats);

    emitEvent({
      eventType: 'reputation.calculated',
      source: 'vendor',
      vendorId,
      data: { score: clampedScore, oldScore, breakdown },
    });

    return { score: clampedScore, breakdown };
  } catch (err) {
    logger.error({ err, vendorId }, 'Failed to calculate vendor reputation');
    return { score: 0, breakdown: {} };
  }
}

async function gatherVendorStats(vendorId) {
  const orders = await Order.find({ vendor: vendorId }).lean();
  const reviews = await Review.find({ vendor: vendorId, moderationStatus: 'approved', isDeleted: false }).lean();
  const badges = await VendorBadge.find({ vendor: vendorId, isActive: true }).lean();
  const vendor = await VendorReputation.findOne({ vendor: vendorId }).lean();
  const vendorDoc = await mongoose.model('Vendor').findById(vendorId).lean();
  const factory = await mongoose.model('FactoryProfile').findOne({ vendor: vendorId }).lean();

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const disputedOrders = orders.filter(o => o.dispute).length;

  return {
    orders,
    reviews,
    badges,
    vendorDoc,
    factory,
    totalOrders,
    completedOrders,
    cancelledOrders,
    disputedOrders,
    orderCompletionRate: totalOrders > 0 ? completedOrders / totalOrders : 0,
    disputeRate: totalOrders > 0 ? disputedOrders / totalOrders : 0,
    cancellationRate: totalOrders > 0 ? cancelledOrders / totalOrders : 0,
    avgRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
    reviewCount: reviews.length,
    isVerified: vendorDoc?.isVerified,
    yearsInBusiness: factory?.establishedYear ? new Date().getFullYear() - factory.establishedYear : 0,
    exportMarkets: factory?.exportMarkets?.length || 0,
    employeeCount: factory?.employeeCount || 0,
    badgeCount: badges.length,
  };
}

function calculateVerificationScore(stats) {
  let score = 0;
  if (stats.isVerified) score += 5;
  if (stats.factory?.isVerified) score += 5;
  if (stats.vendorDoc?.verificationStatus === 'approved') score += 3;
  if (stats.vendorDoc?.verificationDocs?.length > 0) score += 2;
  return score;
}

function calculateOrderScore(stats) {
  if (stats.totalOrders === 0) return 0;
  const completionRate = stats.orderCompletionRate;
  const volumeBonus = Math.min(stats.totalOrders / 10, 5);
  return (completionRate * 15) + volumeBonus;
}

function calculateDeliveryScore(stats) {
  if (stats.reviews.length === 0) return stats.totalOrders > 0 ? 10 : 0;
  const avgDelivery = stats.reviews.filter(r => r.delivery).reduce((s, r) => s + r.delivery, 0) / stats.reviews.filter(r => r.delivery).length || 0;
  return (avgDelivery / 5) * 15;
}

function calculateCommunicationScore(stats) {
  if (stats.reviews.length === 0) return stats.totalOrders > 0 ? 5 : 0;
  const avgComm = stats.reviews.filter(r => r.communication).reduce((s, r) => s + r.communication, 0) / stats.reviews.filter(r => r.communication).length || 0;
  return (avgComm / 5) * 10;
}

function calculateReviewScore(stats) {
  if (stats.reviewCount === 0) return 0;
  const avgRating = stats.avgRating;
  const countBonus = Math.min(stats.reviewCount / 5, 5);
  return ((avgRating / 5) * 10) + countBonus;
}

function calculateDisputeScore(stats) {
  if (stats.totalOrders === 0) return 10;
  const rate = stats.disputeRate;
  return Math.max(0, 10 - (rate * 20));
}

function calculateLongevityScore(stats) {
  return Math.min(stats.yearsInBusiness, 5);
}

function calculateExportScore(stats) {
  return Math.min(stats.exportMarkets, 5);
}

function calculateBadgeScore(stats) {
  return Math.min(stats.badgeCount, 5);
}

async function autoAwardBadges(vendorId, score, stats) {
  const badgeChecks = [
    { badge: 'verified_supplier', condition: stats.isVerified && score > 50 },
    { badge: 'top_rated', condition: score > 80 },
    { badge: 'gold_supplier', condition: score > 90 },
    { badge: 'trusted_manufacturer', condition: score > 70 && stats.yearsInBusiness > 3 },
    { badge: 'export_expert', condition: stats.exportMarkets > 3 },
    { badge: 'fast_shipping', condition: stats.reviews.filter(r => r.delivery >= 4).length > 5 },
    { badge: 'low_dispute_rate', condition: stats.disputeRate < 0.05 && stats.totalOrders > 10 },
    { badge: 'high_capacity', condition: (stats.employeeCount || 0) > 100 },
    { badge: 'quality_certified', condition: stats.factory?.certifications?.length > 0 },
    { badge: 'fast_response', condition: stats.completedOrders > 10 },
    { badge: 'factory_verified', condition: stats.factory?.isVerified },
    { badge: 'oem_manufacturer', condition: stats.factory?.manufacturingProcess?.toLowerCase().includes('oem') },
    { badge: 'odm_manufacturer', condition: stats.factory?.manufacturingProcess?.toLowerCase().includes('odm') },
  ];

  for (const check of badgeChecks) {
    if (check.condition) {
      const exists = await VendorBadge.findOne({ vendor: vendorId, badge: check.badge });
      if (!exists) {
        await VendorBadge.create({ vendor: vendorId, badge: check.badge, awardedBy: 'auto', reason: 'Automatic award based on reputation score' });
        await ReputationEvent.create({
          vendor: vendorId,
          eventType: 'badge_earned',
          title: { en: `Badge Earned: ${check.badge.replace(/_/g, ' ')}`, ar: `تم الحصول على شارة: ${check.badge}` },
          description: { en: `Awarded ${check.badge.replace(/_/g, ' ')} badge`, ar: `تم منح شارة ${check.badge}` },
          newValue: check.badge,
          isPublic: true,
        });
      }
    }
  }
}

export async function getVendorReputation(vendorId) {
  return VendorReputation.findOne({ vendor: vendorId }).lean();
}

export async function getVendorBadges(vendorId) {
  return VendorBadge.find({ vendor: vendorId, isActive: true }).lean();
}
