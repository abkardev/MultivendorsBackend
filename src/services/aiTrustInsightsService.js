import Review from '../models/reviewModel.js';
import VendorReputation from '../models/VendorReputation.js';
import VendorBadge from '../models/VendorBadge.js';
import Order from '../models/Order.js';
import { getLogger } from './logger.js';

const logger = getLogger('ai');

export async function generateVendorTrustInsights(vendorId) {
  try {
    const insights = [];

    const [rep, badges, reviews, orders] = await Promise.all([
      VendorReputation.findOne({ vendor: vendorId }).lean(),
      VendorBadge.find({ vendor: vendorId, isActive: true }).lean(),
      Review.find({ vendor: vendorId, moderationStatus: 'approved', isDeleted: false }).lean(),
      Order.find({ vendor: vendorId }).lean(),
    ]);

    if (!rep || !orders.length) {
      return { insights: [], summary: 'New supplier with no marketplace history yet.' };
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const onTimeDeliveries = orders.filter(o => o.deliveryDate && new Date(o.deliveryDate) <= new Date(o.expectedDeliveryDate || o.deliveryDate)).length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    const disputedOrders = orders.filter(o => o.dispute).length;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const uniqueBuyers = new Set(orders.map(o => o.user?.toString())).size;
    const repeatBuyers = uniqueBuyers > 0 && totalOrders > uniqueBuyers;
    const highRatings = reviews.filter(r => r.rating >= 4).length;

    if (totalOrders > 0) {
      const completionRate = (completedOrders / totalOrders) * 100;
      if (completionRate >= 95) insights.push('Supplier consistently completes orders at a high rate.');
      else if (completionRate >= 80) insights.push('Supplier maintains a good order completion rate.');
      else if (completionRate < 70) insights.push('Order completion rate is below marketplace average.');
    }

    if (completedOrders > 5) {
      const onTimeRate = (onTimeDeliveries / completedOrders) * 100;
      if (onTimeRate >= 90) insights.push('Consistently delivers on time or ahead of schedule.');
      else if (onTimeRate >= 75) insights.push('On-time delivery rate is good.');
      else if (onTimeRate < 60) insights.push('Delivery times may need improvement based on order history.');
    }

    const commReviews = reviews.filter(r => r.communication);
    if (commReviews.length > 3) {
      const avgComm = commReviews.reduce((s, r) => s + r.communication, 0) / commReviews.length;
      if (avgComm >= 4.5) insights.push('Response time is above marketplace average.');
      else if (avgComm >= 3.5) insights.push('Communication responsiveness is satisfactory.');
    }

    if (rep.scoreBreakdown?.exports >= 4) {
      insights.push('Trusted exporter serving multiple international markets.');
    }

    if (totalOrders > 5) {
      const disputeRate = (disputedOrders / totalOrders) * 100;
      if (disputeRate < 2) insights.push('Low dispute history indicates reliable business practices.');
      else if (disputeRate < 5) insights.push('Dispute rate is within normal marketplace range.');
      else if (disputeRate >= 5) insights.push('Dispute rate is higher than average; consider reviewing terms.');
    }

    if (reviews.length > 3 && avgRating >= 4.5) {
      insights.push('Customers consistently report high satisfaction.');
    } else if (reviews.length > 3 && avgRating >= 4) {
      insights.push('Positive customer feedback with room for excellence.');
    }

    if (repeatBuyers) {
      insights.push('Repeat customers indicate strong satisfaction and trust.');
    }

    if (highRatings > 10) {
      insights.push(`Over ${highRatings} high-rated reviews demonstrate consistent quality.`);
    }

    if (badges.some(b => b.badge === 'verified_supplier')) {
      insights.push('Verified supplier status confirmed through document verification.');
    }
    if (badges.some(b => b.badge === 'factory_verified')) {
      insights.push('Factory verification completed, confirming manufacturing capabilities.');
    }
    if (badges.some(b => b.badge === 'export_expert')) {
      insights.push('Export expertise verified with experience in international trade.');
    }

    const score = rep.currentScore;
    if (score >= 80) {
      insights.unshift('Top-performing supplier with excellent marketplace reputation.');
    } else if (score >= 60) {
      insights.unshift('Established supplier with good marketplace standing.');
    } else if (score >= 40) {
      insights.unshift('Growing supplier building marketplace reputation.');
    }

    const summary = generateSummary(insights, score, totalOrders, avgRating);

    return { insights, summary };
  } catch (err) {
    logger.error({ err, vendorId }, 'Failed to generate trust insights');
    return { insights: [], summary: 'Trust insights temporarily unavailable.' };
  }
}

function generateSummary(insights, score, totalOrders, avgRating) {
  if (totalOrders === 0) return 'New supplier with no marketplace history yet.';
  if (score >= 80) return 'Highly reputable supplier with proven marketplace track record.';
  if (score >= 60) return 'Reliable supplier with established marketplace presence.';
  if (score >= 40) return 'Developing supplier building marketplace reputation.';
  return 'New supplier establishing marketplace presence.';
}

export async function generateBuyerTrustInsights(userId) {
  try {
    const BuyerReputation = (await import('../models/BuyerReputation.js')).default;
    const rep = await BuyerReputation.findOne({ user: userId }).lean();

    if (!rep || rep.statistics.totalOrders === 0) {
      return { insights: ['New buyer with no order history.'], summary: 'New buyer' };
    }

    const insights = [];
    const s = rep.statistics;

    if (s.completedOrders > 10) insights.push(`Completed ${s.completedOrders} orders successfully.`);
    if (s.cancelledOrders === 0) insights.push('No order cancellations - highly reliable buyer.');
    else if ((s.cancelledOrders / s.totalOrders) < 0.1) insights.push('Low cancellation rate indicates reliable purchasing behavior.');

    if (s.disputesOpened === 0) insights.push('No disputes opened - smooth transaction history.');
    if (s.repeatPurchases > 3) insights.push('Repeat purchaser who values long-term vendor relationships.');
    if (s.totalSpent > 100000) insights.push('High-value buyer with significant marketplace investment.');

    return { insights, summary: rep.label.replace(/_/g, ' ') };
  } catch (err) {
    logger.error({ err, userId }, 'Failed to generate buyer trust insights');
    return { insights: [], summary: 'Buyer insights unavailable.' };
  }
}
