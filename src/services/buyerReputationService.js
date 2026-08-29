import BuyerReputation from '../models/BuyerReputation.js';
import Order from '../models/Order.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

export async function calculateBuyerReputation(userId) {
  try {
    const [reputation, stats] = await Promise.all([
      BuyerReputation.findOne({ user: userId }),
      gatherBuyerStats(userId),
    ]);

    let score = 0;
    if (stats.totalOrders > 0) {
      score += Math.min(stats.completedOrders / stats.totalOrders * 30, 30);
      score += Math.min(stats.repeatPurchases * 5, 15);
      score += Math.min((1 - stats.cancellationRate) * 15, 15);
      score += Math.min((1 - stats.disputeRate) * 15, 15);
      score += Math.min(stats.yearsActive * 5, 10);
      if (stats.isVerified) score += 15;
    }

    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    let label = 'new_buyer';
    if (clampedScore >= 80) label = 'enterprise_buyer';
    else if (clampedScore >= 60) label = 'gold_buyer';
    else if (clampedScore >= 40) label = 'trusted_buyer';
    else if (clampedScore >= 20) label = 'reliable_buyer';

    const oldScore = reputation?.currentScore || 0;

    if (reputation) {
      reputation.previousScore = oldScore;
      reputation.currentScore = clampedScore;
      reputation.label = label;
      reputation.statistics = stats;
      reputation.lastCalculatedAt = new Date();
      reputation.scoreHistory.push({ score: clampedScore, reason: 'scheduled recalculation', calculatedAt: new Date() });
      if (reputation.scoreHistory.length > 50) reputation.scoreHistory.shift();
      await reputation.save();
    } else {
      await BuyerReputation.create({
        user: userId,
        currentScore: clampedScore,
        label,
        statistics: stats,
        lastCalculatedAt: new Date(),
      });
    }

    return { score: clampedScore, label, stats };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to calculate buyer reputation');
    return { score: 0, label: 'new_buyer', stats: {} };
  }
}

async function gatherBuyerStats(userId) {
  const orders = await Order.find({ user: userId }).lean();
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const disputedOrders = orders.filter(o => o.dispute).length;
  const uniqueVendors = new Set(orders.map(o => o.vendor?.toString()).filter(Boolean));

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return {
    totalOrders,
    completedOrders,
    cancelledOrders,
    disputesOpened: disputedOrders,
    disputesLost: 0,
    averagePaymentTime: 0,
    repeatPurchases: totalOrders - uniqueVendors.size > 0 ? totalOrders - uniqueVendors.size : 0,
    totalSpent,
    averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
    yearsActive: 0,
    isVerified: false,
    cancellationRate: totalOrders > 0 ? cancelledOrders / totalOrders : 0,
    disputeRate: totalOrders > 0 ? disputedOrders / totalOrders : 0,
  };
}

export async function getBuyerReputation(userId) {
  return BuyerReputation.findOne({ user: userId }).lean();
}
