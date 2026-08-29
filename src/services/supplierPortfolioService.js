import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';
import { logAuditEvent } from '../services/auditService.js';

class SupplierPortfolioService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
  }

  async getPortfolio(userId) {
    const cacheKey = `portfolio_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const [orders, vendors, reviews, disputes] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').lean(),
      Vendor.find({}).lean(),
      Review.find({ user: userId }).lean(),
      Dispute.find({ buyer: userId }).lean(),
    ]);

    const vendorMap = {};
    for (const v of vendors) {
      vendorMap[v._id.toString()] = v;
    }

    const vendorStats = {};
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const recentCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    for (const order of completedOrders) {
      const vid = order.vendor?.toString();
      if (!vid || !vendorMap[vid]) continue;

      if (!vendorStats[vid]) {
        vendorStats[vid] = { vendor: vendorMap[vid], orderCount: 0, totalSpend: 0, lastOrderDate: null, riskScore: 0, performanceScore: 0 };
      }

      vendorStats[vid].orderCount++;
      vendorStats[vid].totalSpend += parseFloat(order.totalPrice) || order.totalAmount || order.total || 0;
      const orderDate = order.createdAt || order.updatedAt;
      if (orderDate && (!vendorStats[vid].lastOrderDate || new Date(orderDate) > new Date(vendorStats[vid].lastOrderDate))) {
        vendorStats[vid].lastOrderDate = orderDate;
      }
    }

    const reviewMap = {};
    for (const r of reviews) {
      const vid = r.vendor?.toString();
      if (vid) {
        if (!reviewMap[vid]) reviewMap[vid] = { ratings: [] };
        reviewMap[vid].ratings.push(r.rating || 0);
      }
    }

    const disputeMap = {};
    for (const d of disputes) {
      const vid = d.vendor?.toString();
      if (vid) {
        disputeMap[vid] = (disputeMap[vid] || 0) + 1;
      }
    }

    const vendorIds = Object.keys(vendorStats);
    const totalSpendAll = vendorIds.reduce((sum, id) => sum + vendorStats[id].totalSpend, 0);

    const portfolio = [];

    for (const vid of vendorIds) {
      const stats = vendorStats[vid];
      const vendor = stats.vendor;

      const ratingInfo = reviewMap[vid];
      const avgRating = ratingInfo && ratingInfo.ratings.length > 0
        ? ratingInfo.ratings.reduce((a, b) => a + b, 0) / ratingInfo.ratings.length
        : 0;
      const disputeCount = disputeMap[vid] || 0;
      const disputeRatio = stats.orderCount > 0 ? disputeCount / stats.orderCount : 0;

      const performanceScore = Math.round((avgRating / 5) * 70 + (1 - disputeRatio) * 30);

      const highValueRatio = completedOrders.filter(o => {
        const val = parseFloat(o.totalPrice) || o.totalAmount || o.total || 0;
        return val > 50000 && o.vendor?.toString() === vid;
      }).length / Math.max(1, stats.orderCount);

      const riskScore = Math.round(
        disputeRatio * 50 +
        (1 - avgRating / 5) * 30 +
        (vendor.isVerified ? 0 : 20)
      );

      const spendRatio = totalSpendAll > 0 ? stats.totalSpend / totalSpendAll : 0;
      const dependencePercent = Math.round(spendRatio * 100);

      const growth = stats.orderCount > 0
        ? Math.round(((completedOrders.filter(o => o.vendor?.toString() === vid && new Date(o.createdAt) >= recentCutoff).length /
            Math.max(1, stats.orderCount)) * 100 - 50) * 2)
        : 0;

      let classification = 'standard';
      if (spendRatio > 0.2 && performanceScore > 70) classification = 'strategic';
      else if (performanceScore > 70 && spendRatio > 0.05) classification = 'preferred';
      else if (performanceScore > 50 && riskScore < 30) classification = 'approved';
      else if (spendRatio < 0.01) classification = 'transactional';
      else if (riskScore > 60) classification = 'highRisk';
      else if (stats.orderCount === 0) classification = 'inactive';

      const isNew = stats.orderCount >= 1 && stats.orderCount <= 3 && performanceScore > 50;
      if (isNew && classification === 'standard') classification = 'emerging';

      const inactiveDays = stats.lastOrderDate
        ? Math.round((Date.now() - new Date(stats.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      if (inactiveDays > 180) classification = 'inactive';

      const replacementDifficulty = performanceScore > 70 && stats.orderCount > 5 ? 'hard' : performanceScore > 50 ? 'moderate' : 'easy';

      const reputation = performanceScore > 70 ? 'excellent' : performanceScore > 50 ? 'good' : performanceScore > 30 ? 'fair' : 'poor';

      portfolio.push({
        vendorId: vid,
        name: vendor.storeName?.en || vendor.name || 'Unknown',
        classification,
        spend: Math.round(stats.totalSpend),
        risk: riskScore,
        performance: performanceScore,
        growth,
        reputation,
        dependencePercent,
        replacementDifficulty,
        orderCount: stats.orderCount,
        avgRating: Math.round(avgRating * 10) / 10,
        disputeCount,
        lastOrderDate: stats.lastOrderDate || null,
        inactiveDays,
        isVerified: vendor.isVerified || false,
        country: vendor.country || vendor.countryOfOrigin || 'Unknown',
      });
    }

    for (const vendor of vendors) {
      const vid = vendor._id.toString();
      if (!vendorStats[vid]) {
        portfolio.push({
          vendorId: vid,
          name: vendor.storeName?.en || vendor.name || 'Unknown',
          classification: 'inactive',
          spend: 0,
          risk: vendor.isVerified ? 30 : 50,
          performance: 0,
          growth: 0,
          reputation: 'unknown',
          dependencePercent: 0,
          replacementDifficulty: 'easy',
          orderCount: 0,
          avgRating: 0,
          disputeCount: 0,
          lastOrderDate: null,
          inactiveDays: null,
          isVerified: vendor.isVerified || false,
          country: vendor.country || vendor.countryOfOrigin || 'Unknown',
        });
      }
    }

    const classificationSummary = {};
    for (const entry of portfolio) {
      classificationSummary[entry.classification] = (classificationSummary[entry.classification] || 0) + 1;
    }

    const result = {
      portfolio,
      totalSuppliers: portfolio.length,
      activeSuppliers: portfolio.filter(s => s.classification !== 'inactive').length,
      classificationSummary,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'get_supplier_portfolio',
      category: 'executive',
      entityType: 'SupplierPortfolio',
      entityId: userId,
      description: `Supplier portfolio generated: ${portfolio.length} suppliers`,
      status: 'success',
    });

    return result;
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`portfolio_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new SupplierPortfolioService();
