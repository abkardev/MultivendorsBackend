import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import { Vendor } from '../models/vendorModel.js';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import Subscription from '../models/Subscription.js';
import { BuyingRequest } from '../models/buyingRequestModel.js';
import { SearchAnalytics } from '../models/SearchAnalytics.js';
import { logAuditEvent } from './auditService.js';

class MarketplaceAnalyticsService {
  async getMarketplaceOverview(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [orders, users, vendors, products, reviews, rfqs, revenue] = await Promise.all([
      Order.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      User.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      Vendor.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      Product.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      Review.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      BuyingRequest.find({ createdAt: { $gte: start, $lte: end } }).lean(),
      MarketplaceRevenue.find({ createdAt: { $gte: start, $lte: end }, status: 'cleared' }).lean(),
    ]);
    const gmv = orders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const platformRevenue = revenue.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      gmv: Math.round(gmv * 100) / 100,
      revenue: Math.round(platformRevenue * 100) / 100,
      orders: { total: orders.length, delivered: orders.filter(o => o.status === 'delivered').length, pending: orders.filter(o => o.status === 'pending').length, cancelled: orders.filter(o => o.status === 'cancelled').length },
      rfqs: { total: rfqs.length, open: rfqs.filter(r => r.status === 'open').length, closed: rfqs.filter(r => r.status === 'closed').length },
      users: { total: users.length, buyers: users.filter(u => u.role === 'user').length, vendors: users.filter(u => u.role === 'vendor').length },
      vendors: { total: vendors.length, verified: vendors.filter(v => v.isVerified).length },
      products: { total: products.length },
      reviews: { total: reviews.length, avgRating: reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : 0 },
      period: { start, end },
    };
  }

  async getGmv(startDate, endDate, groupBy = 'day') {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const format = groupBy === 'month' ? '%Y-%m' : groupBy === 'year' ? '%Y' : '%Y-%m-%d';
    const [gmvByPeriod, totalGmv] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
        { $group: { _id: { $dateToString: { format, date: '$createdAt' } }, gmv: { $sum: { $toDouble: '$totalPrice' } }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: { $toDouble: '$totalPrice' } }, count: { $sum: 1 } } },
      ]),
    ]);
    return { byPeriod: gmvByPeriod, totals: totalGmv[0] || { total: 0, count: 0 }, period: { start, end } };
  }

  async getRevenueAnalytics(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [byType, byMonth, totals] = await Promise.all([
      MarketplaceRevenue.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'cleared' } },
        { $group: { _id: '$type', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { amount: -1 } },
      ]),
      MarketplaceRevenue.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'cleared' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      MarketplaceRevenue.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'cleared' } },
        { $group: { _id: null, total: { $sum: '$amount' }, avg: { $avg: '$amount' } } },
      ]),
    ]);
    return { byType, byMonth, totals: totals[0] || { total: 0, avg: 0 }, period: { start, end } };
  }

  async getOrderAnalytics(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [trend, statusBreakdown, totals] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } }, avgOrderValue: { $avg: { $toDouble: '$totalPrice' } } } },
      ]),
    ]);
    return { trend, statusBreakdown, totals: totals[0] || { total: 0, revenue: 0, avgOrderValue: 0 }, period: { start, end } };
  }

  async getBuyerAnalytics(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [newBuyers, activeBuyers, orders] = await Promise.all([
      User.countDocuments({ role: 'user', createdAt: { $gte: start, $lte: end } }),
      User.countDocuments({ role: 'user', lastLogin: { $gte: new Date(Date.now() - 30 * 86400000) } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: { $toDouble: '$totalPrice' } } } },
      ]),
    ]);
    const repeatBuyers = orders.filter(o => o.orderCount > 1).length;
    const totalBuyers = orders.length;
    return {
      newBuyers, activeBuyers, repeatBuyers,
      retentionRate: totalBuyers > 0 ? Math.round((repeatBuyers / totalBuyers) * 100) : 0,
      avgOrderPerBuyer: totalBuyers > 0 ? Math.round(orders.reduce((s, o) => s + o.orderCount, 0) / totalBuyers * 100) / 100 : 0,
      avgSpendPerBuyer: totalBuyers > 0 ? Math.round(orders.reduce((s, o) => s + o.totalSpent, 0) / totalBuyers * 100) / 100 : 0,
      period: { start, end },
    };
  }

  async getSupplierAnalytics(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [newSuppliers, verifiedSuppliers, byIndustry, byCountry] = await Promise.all([
      Vendor.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Vendor.countDocuments({ isVerified: true }),
      Vendor.aggregate([{ $group: { _id: '$industry', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Vendor.aggregate([{ $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
    ]);
    const total = await Vendor.countDocuments();
    return {
      total, newSuppliers, verifiedSuppliers,
      verificationRate: total > 0 ? Math.round((verifiedSuppliers / total) * 100) : 0,
      byIndustry, byCountry, period: { start, end },
    };
  }

  async getConversionFunnel() {
    const [visitors, registered, orderPlaced, completed] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      Order.aggregate([{ $group: { _id: '$user' } }, { $count: 'count' }]),
      Order.countDocuments({ status: 'delivered' }),
    ]);
    const buyers = orderPlaced[0]?.count || 0;
    return {
      stages: [
        { name: 'Visitors', count: visitors, conversionRate: 100 },
        { name: 'Registered', count: registered, conversionRate: visitors > 0 ? Math.round((registered / visitors) * 100) : 0 },
        { name: 'Placed Order', count: buyers, conversionRate: visitors > 0 ? Math.round((buyers / visitors) * 100) : 0 },
        { name: 'Completed Purchase', count: completed, conversionRate: visitors > 0 ? Math.round((completed / visitors) * 100) : 0 },
      ],
      overallRate: visitors > 0 ? Math.round((completed / visitors) * 100) : 0,
    };
  }

  async getCountryAnalytics() {
    const [usersByCountry, ordersByCountry, vendorsByCountry] = await Promise.all([
      User.aggregate([{ $group: { _id: '$address.country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Order.aggregate([{ $group: { _id: '$address.country', count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Vendor.aggregate([{ $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
    ]);
    return { users: usersByCountry, orders: ordersByCountry, vendors: vendorsByCountry };
  }

  async getIndustryAnalytics() {
    const [vendorsByIndustry, productsByIndustry] = await Promise.all([
      Vendor.aggregate([{ $group: { _id: '$industry', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
      Product.aggregate([
        { $lookup: { from: 'vendors', localField: 'vendor', foreignField: '_id', as: 'vendorData' } },
        { $unwind: { path: '$vendorData', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$vendorData.industry', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 20 },
      ]),
    ]);
    return { vendors: vendorsByIndustry, products: productsByIndustry };
  }

  async getCategoryAnalytics() {
    const byCategory = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 1, count: 1, name: '$category.name.en' } },
    ]);
    return byCategory;
  }

  async getSubscriptionAnalytics() {
    const [planBreakdown, statusBreakdown, activeSubs, revenue] = await Promise.all([
      Subscription.aggregate([{ $group: { _id: '$planType', count: { $sum: 1 } } }]),
      Subscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Subscription.countDocuments({ status: 'active', endDate: { $gte: new Date() } }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'subscriptionplans', localField: 'planType', foreignField: 'code', as: 'plan' } },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, mrr: { $sum: '$plan.price' }, avgCommission: { $avg: '$commissionRate' } } },
      ]),
    ]);
    const total = await Subscription.countDocuments();
    return {
      total,
      active: activeSubs,
      planBreakdown, statusBreakdown,
      mrr: revenue[0]?.mrr || 0,
      avgCommissionRate: revenue[0]?.avgCommission || 0,
      churnRate: total > 0 ? Math.round((statusBreakdown.find(s => s._id === 'canceled')?.count || 0) / total * 100) : 0,
    };
  }

  async getGrowthMetrics() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    const [currentMonth, prevMonth, currentYear, prevYear, totalOrders] = await Promise.all([
      Order.aggregate([{ $match: { createdAt: { $gte: monthStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: yearStart } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } }]),
      Order.aggregate([{ $match: { createdAt: { $gte: prevYearStart, $lte: prevYearEnd } } }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } }]),
      Order.countDocuments(),
    ]);
    const c = currentMonth[0] || { count: 0, revenue: 0 };
    const p = prevMonth[0] || { count: 0, revenue: 0 };
    const cy = currentYear[0] || { count: 0, revenue: 0 };
    const py = prevYear[0] || { count: 0, revenue: 0 };
    return {
      mom: { orderGrowth: p.count > 0 ? Math.round(((c.count - p.count) / p.count) * 100) : 0, revenueGrowth: p.revenue > 0 ? Math.round(((c.revenue - p.revenue) / p.revenue) * 100) : 0 },
      qoq: { orderGrowth: 0, revenueGrowth: 0 },
      yoy: { orderGrowth: py.count > 0 ? Math.round(((cy.count - py.count) / py.count) * 100) : 0, revenueGrowth: py.revenue > 0 ? Math.round(((cy.revenue - py.revenue) / py.revenue) * 100) : 0 },
      currentPeriod: { orders: c.count, revenue: Math.round(c.revenue * 100) / 100 },
      totalOrders,
    };
  }

  async getRetentionRate() {
    const now = new Date();
    const cohorts = [];
    for (let i = 0; i < 6; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const cohortUsers = await User.find({ role: 'user', createdAt: { $gte: start, $lt: end } }).select('_id').lean();
      const userIds = cohortUsers.map(u => u._id);
      if (userIds.length === 0) continue;
      const returning = await Order.distinct('user', { user: { $in: userIds }, createdAt: { $gte: end } });
      cohorts.push({
        cohort: start.toISOString().slice(0, 7),
        users: userIds.length,
        returning: returning.length,
        retentionRate: Math.round((returning.length / userIds.length) * 100),
      });
    }
    return {
      cohorts,
      averageRetention: cohorts.length > 0 ? Math.round(cohorts.reduce((s, c) => s + c.retentionRate, 0) / cohorts.length) : 0,
    };
  }

  async getChurnRate() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const [startBuyers, endBuyers] = await Promise.all([
      Order.distinct('user', { createdAt: { $lt: periodEnd } }),
      Order.distinct('user', { createdAt: { $gte: periodStart, $lt: periodEnd } }),
    ]);
    const churned = startBuyers.filter(id => !endBuyers.includes(id));
    return {
      period: { start: periodStart, end: periodEnd },
      previousBuyers: startBuyers.length,
      currentBuyers: endBuyers.length,
      churned: churned.length,
      churnRate: startBuyers.length > 0 ? Math.round((churned.length / startBuyers.length) * 100) : 0,
    };
  }

  async getCustomerLifetimeValue() {
    const ltvData = await Order.aggregate([
      { $group: { _id: '$user', totalSpent: { $sum: { $toDouble: '$totalPrice' } }, orderCount: { $sum: 1 }, firstOrder: { $min: '$createdAt' }, lastOrder: { $max: '$createdAt' } } },
      { $project: { totalSpent: 1, orderCount: 1, firstOrder: 1, lastOrder: 1, lifetimeDays: { $divide: [{ $subtract: ['$lastOrder', '$firstOrder'] }, 86400000] } } },
    ]);
    const totalBuyers = ltvData.length;
    const avgLtv = totalBuyers > 0 ? Math.round(ltvData.reduce((s, u) => s + u.totalSpent, 0) / totalBuyers * 100) / 100 : 0;
    const avgOrders = totalBuyers > 0 ? Math.round(ltvData.reduce((s, u) => s + u.orderCount, 0) / totalBuyers * 100) / 100 : 0;
    const avgLifetime = totalBuyers > 0 ? Math.round(ltvData.reduce((s, u) => s + Math.max(u.lifetimeDays || 0, 1), 0) / totalBuyers) : 0;
    return { averageLtv: avgLtv, averageOrders: avgOrders, averageLifetimeDays: avgLifetime, totalBuyers };
  }

  async getCustomerAcquisitionCost() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [newBuyers, marketingSpend] = await Promise.all([
      User.countDocuments({ role: 'user', createdAt: { $gte: monthStart } }),
      MarketplaceRevenue.aggregate([
        { $match: { type: 'advertising', createdAt: { $gte: monthStart }, status: 'cleared' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);
    const spend = marketingSpend[0]?.total || 0;
    return {
      period: { start: monthStart, end: now },
      newBuyers,
      marketingSpend: spend,
      cac: newBuyers > 0 ? Math.round((spend / newBuyers) * 100) / 100 : 0,
    };
  }

  async getSearchAnalytics() {
    const [popular, failed, total] = await Promise.all([
      SearchAnalytics.aggregate([
        { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 20 },
      ]),
      SearchAnalytics.aggregate([
        { $match: { hasResults: false } },
        { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 20 },
      ]),
      SearchAnalytics.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, withResults: { $sum: { $cond: ['$hasResults', 1, 0] } }, withoutResults: { $sum: { $cond: ['$hasResults', 0, 1] } } } },
      ]),
    ]);
    return { popular, failed, totals: total[0] || { total: 0, withResults: 0, withoutResults: 0 } };
  }

  async getFeatureAdoption() {
    const [usersWithOrders, usersWithReviews, usersWithRfqs, totalUsers] = await Promise.all([
      Order.distinct('user'),
      Review.distinct('user'),
      BuyingRequest.distinct('buyer'),
      User.countDocuments({ role: 'user' }),
    ]);
    return {
      orders: { users: usersWithOrders.length, rate: totalUsers > 0 ? Math.round((usersWithOrders.length / totalUsers) * 100) : 0 },
      reviews: { users: usersWithReviews.length, rate: totalUsers > 0 ? Math.round((usersWithReviews.length / totalUsers) * 100) : 0 },
      rfqs: { users: usersWithRfqs.length, rate: totalUsers > 0 ? Math.round((usersWithRfqs.length / totalUsers) * 100) : 0 },
      totalUsers,
    };
  }

  async getMarketplaceTrends() {
    const now = new Date();
    const recent = new Date(now.getTime() - 30 * 86400000);
    const [topProducts, topCategories, topVendors] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: recent } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', orders: { $sum: 1 }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
        { $sort: { orders: -1 } }, { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, orders: 1, quantity: 1, revenue: 1, name: '$product.name.en' } },
      ]),
      Product.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 10 },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, count: 1, name: '$category.name.en' } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: recent } } },
        { $group: { _id: '$vendor', orders: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } },
        { $sort: { revenue: -1 } }, { $limit: 10 },
      ]),
    ]);
    return { topProducts, topCategories, topVendors, period: '30d' };
  }

  async getForecasts(metric, period = '30d') {
    const days = parseInt(period) || 30;
    const start = new Date(Date.now() - days * 86400000);
    const historical = await Order.aggregate([
      { $match: { createdAt: { $gte: start }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: { $toDouble: '$totalPrice' } } } },
      { $sort: { _id: 1 } },
    ]);
    const values = historical.map(h => metric === 'orders' ? h.count : h.revenue);
    const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
    const forecast = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10),
      predicted: Math.max(0, Math.round(avg + trend * (i + 1))),
      lower: Math.max(0, Math.round(avg + trend * (i + 1) - avg * 0.2)),
      upper: Math.round(avg + trend * (i + 1) + avg * 0.2),
    }));
    return { metric, historical, forecast, confidence: values.length > 7 ? 0.8 : 0.5 };
  }

  async getExecutiveReport(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const [overview, gmv, revenue, orders, buyers, suppliers, funnel, ltv, cac, retention, churn] = await Promise.all([
      this.getMarketplaceOverview(start, end),
      this.getGmv(start, end, 'day'),
      this.getRevenueAnalytics(start, end),
      this.getOrderAnalytics(start, end),
      this.getBuyerAnalytics(start, end),
      this.getSupplierAnalytics(start, end),
      this.getConversionFunnel(),
      this.getCustomerLifetimeValue(),
      this.getCustomerAcquisitionCost(),
      this.getRetentionRate(),
      this.getChurnRate(),
    ]);
    const summary = {
      gmv: Math.round(gmv.totals.total * 100) / 100,
      revenue: Math.round(revenue.totals.total * 100) / 100,
      orders: orders.totals.total,
      avgOrderValue: Math.round(orders.totals.avgOrderValue * 100) / 100,
      totalBuyers: buyers.newBuyers + (buyers.retentionRate > 0 ? 1 : 0),
      retentionRate: retention.averageRetention,
      churnRate: churn.churnRate,
      lifetimeValue: ltv.averageLtv,
      acquisitionCost: cac.cac,
      conversionRate: funnel.overallRate,
    };
    return { summary, overview, gmv, revenue, orders, buyers, suppliers, funnel, ltv, cac, retention, churn, generatedAt: new Date() };
  }
}

export const marketplaceAnalyticsService = new MarketplaceAnalyticsService();
