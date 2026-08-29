import Review from '../models/reviewModel.js';
import Order from '../models/Order.js';

class SellerReputationService {
  async getReputationDashboard(vendorId) {
    const { default: User } = await import('../models/userModel.js');
    const vendor = await User.findById(vendorId).select('name email company').lean();
    const reviews = await Review.find({ vendor: vendorId }).populate('buyer', 'name').sort({ createdAt: -1 });
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((s, r) => s + r.rating, 0);
    const averageRating = totalReviews > 0 ? Math.round((totalRating / totalReviews) * 10) / 10 : 0;
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { if (distribution[r.rating] !== undefined) distribution[r.rating]++; });
    const responseRate = totalReviews > 0
      ? Math.round((reviews.filter(r => r.vendorResponse).length / totalReviews) * 100)
      : 0;
    const recentReviews = reviews.slice(0, 10);
    const orders = await Order.find({ vendor: vendorId, status: 'delivered' });
    const completeRate = orders.length > 0
      ? Math.round((orders.filter(o => o.status === 'delivered').length / orders.length) * 100)
      : 0;
    const onTimeDelivery = orders.length > 0
      ? Math.round((orders.filter(o => o.deliveredAt && o.estimatedDelivery && o.deliveredAt <= o.estimatedDelivery).length / orders.length) * 100)
      : 0;
    return {
      vendor,
      averageRating,
      totalReviews,
      distribution,
      responseRate,
      recentReviews,
      completeRate,
      onTimeDelivery,
    };
  }

  async respondToReview(vendorId, reviewId, response) {
    const review = await Review.findOneAndUpdate(
      { _id: reviewId, vendor: vendorId },
      { $set: { vendorResponse: response, vendorRespondedAt: new Date() } },
      { new: true }
    );
    if (!review) throw new Error('Review not found');
    return review;
  }

  async getReviewAnalytics(vendorId) {
    const reviews = await Review.find({ vendor: vendorId });
    const total = reviews.length;
    if (total === 0) {
      return { total: 0, averageRating: 0, trend: 'neutral', topRatedProducts: [], needsAttention: [] };
    }
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / total;
    const fortyDaysAgo = new Date(Date.now() - 40 * 86400000);
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
    const recent = reviews.filter(r => r.createdAt >= fortyDaysAgo);
    const old = reviews.filter(r => r.createdAt < fortyDaysAgo && r.createdAt >= new Date(Date.now() - 80 * 86400000));
    const recentAvg = recent.length > 0 ? recent.reduce((s, r) => s + r.rating, 0) / recent.length : 0;
    const oldAvg = old.length > 0 ? old.reduce((s, r) => s + r.rating, 0) / old.length : 0;
    let trend = 'neutral';
    if (recentAvg > oldAvg + 0.3) trend = 'improving';
    else if (recentAvg < oldAvg - 0.3) trend = 'declining';
    const productRatings = {};
    reviews.forEach(r => {
      const pid = r.product?.toString();
      if (pid) {
        if (!productRatings[pid]) productRatings[pid] = { total: 0, sum: 0, name: r.productName };
        productRatings[pid].total++;
        productRatings[pid].sum += r.rating;
      }
    });
    const topRated = Object.entries(productRatings)
      .filter(([, d]) => d.total >= 3)
      .map(([id, d]) => ({ productId: id, name: d.name, avgRating: Math.round((d.sum / d.total) * 10) / 10, count: d.total }))
      .sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);
    const needsAttention = Object.entries(productRatings)
      .filter(([, d]) => d.total >= 2 && (d.sum / d.total) < 3)
      .map(([id, d]) => ({ productId: id, name: d.name, avgRating: Math.round((d.sum / d.total) * 10) / 10, count: d.total }))
      .sort((a, b) => a.avgRating - b.avgRating).slice(0, 5);
    return { total, averageRating: Math.round(avg * 10) / 10, trend, topRatedProducts: topRated, needsAttention };
  }
}

export const sellerReputationService = new SellerReputationService();
