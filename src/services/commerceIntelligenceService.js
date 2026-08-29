import mongoose from 'mongoose';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import { Announcement } from '../models/announcementModel.js';
import { Quotation } from '../models/Quotation.js';
import Dispute from '../models/Dispute.js';

class CommerceIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000;
  }

  async getSupplierIntelligence(vendorId) {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) return null;

    const [reputation, orders, reviews, rfqs, disputes, shipments] = await Promise.all([
      this.getVendorReputation(vendorId),
      this.getOrderStats(vendorId),
      this.getReviewStats(vendorId),
      this.getRFQStats(vendorId),
      this.getDisputeStats(vendorId),
      this.getShipmentStats(vendorId),
    ]);

    const certifications = vendor.certifications || [];
    const factoryProfile = vendor.factoryProfile || {};

    return {
      vendorId: vendor._id,
      name: vendor.name,
      classifications: {
        bestOverall: this.calculateOverallScore({ reputation, orders, reviews, rfqs, disputes, shipments }),
        bestPrice: this.calculatePriceScore(orders),
        bestReputation: reputation?.overall || 0,
        bestDelivery: shipments?.onTimeRate || 0,
        fastestResponse: rfqs?.avgResponseHours || 99,
        bestExport: this.calculateExportScore(vendor, orders),
        bestLocal: vendor.country === 'Saudi Arabia' ? 100 : this.calculateLocalScore(vendor, orders),
        bestOEM: vendor.capabilities?.oem ? this.calculateCapabilityScore(vendor, 'oem', orders) : 0,
        bestODM: vendor.capabilities?.odm ? this.calculateCapabilityScore(vendor, 'odm', orders) : 0,
        bestManufacturing: this.calculateManufacturingScore(factoryProfile),
        bestSustainability: this.calculateSustainabilityScore(vendor),
      },
      explanation: this.generateSupplierExplanation(vendor, { reputation, orders, reviews, rfqs, disputes, shipments, certifications, factoryProfile }),
      metrics: { reputation, orders, reviews, rfqs, disputes, shipments },
      certifications,
    };
  }

  async getPriceIntelligence(productId) {
    const product = await Product.findById(productId).lean();
    if (!product) return null;

    const historicalPrices = await this.getHistoricalPrices(product);
    const similarProducts = await this.getSimilarProducts(product);

    const prices = historicalPrices.map(p => p.price).filter(p => p > 0);
    const allPrices = [...prices, product.price];

    if (allPrices.length < 2) {
      return {
        productId: product._id,
        currentPrice: product.price,
        currency: product.currency || 'SAR',
        label: 'Fair Price',
        confidence: 0,
        message: 'Insufficient data for price analysis',
      };
    }

    const avg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
    const sorted = [...allPrices].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const percentile = ((sorted.indexOf(product.price) + 1) / sorted.length) * 100;

    const variance = allPrices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / allPrices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = avg > 0 ? (stdDev / avg) * 100 : 0;

    const trend = this.calculatePriceTrend(historicalPrices);

    let label, confidence;
    if (percentile <= 20) { label = 'Excellent Deal'; confidence = 95; }
    else if (percentile <= 40) { label = 'Good Deal'; confidence = 85; }
    else if (percentile <= 60) { label = 'Fair Price'; confidence = 75; }
    else if (percentile <= 80) { label = 'Premium Price'; confidence = 65; }
    else { label = 'Overpriced'; confidence = 55; }

    return {
      productId: product._id,
      currentPrice: product.price,
      currency: product.currency || 'SAR',
      stats: { average: Math.round(avg * 100) / 100, median: Math.round(median * 100) / 100, min, max, count: allPrices.length, stdDev: Math.round(stdDev * 100) / 100, volatility: Math.round(volatility * 100) / 100 },
      trend: { direction: trend.direction, change: trend.change },
      percentile: Math.round(percentile),
      label,
      confidence,
      outliers: this.detectPriceOutliers(allPrices),
    };
  }

  async getProcurementIntelligence(userId) {
    const [orders, rfqs, favorites, history, analytics] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').limit(20).lean(),
      Announcement.find({ user: userId }).sort('-createdAt').limit(10).lean(),
      [],
      [],
      this.getBuyerAnalytics(userId),
    ]);

    const recommendations = [];

    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
    if (pendingOrders.length > 0) {
      recommendations.push({
        type: 'contact_supplier',
        priority: 'high',
        reason: `${pendingOrders.length} pending order(s) require attention`,
        explanation: 'You have orders that need follow-up. Contact your suppliers to ensure timely delivery.',
      });
    }

    const openRfqs = rfqs.filter(r => r.status === 'open' || r.status === 'pending');
    if (openRfqs.length > 3) {
      recommendations.push({
        type: 'consolidate_rfqs',
        priority: 'medium',
        reason: `${openRfqs.length} open RFQs can be consolidated`,
        explanation: 'Consider bundling similar RFQs to negotiate better pricing and terms.',
      });
    }

    const repeatOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const totalSpent = repeatOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    if (totalSpent > 100000) {
      recommendations.push({
        type: 'negotiate_bulk',
        priority: 'medium',
        reason: `Total spend of ${(totalSpent).toLocaleString()} SAR qualifies for bulk discounts`,
        explanation: 'Your procurement volume qualifies for volume-based pricing. Request a bulk discount from your primary suppliers.',
      });
    }

    const highValueOrders = orders.filter(o => (o.total || 0) > 50000 && o.paymentMethod !== 'escrow');
    if (highValueOrders.length > 0) {
      recommendations.push({
        type: 'use_escrow',
        priority: 'high',
        reason: `${highValueOrders.length} high-value order(s) without escrow protection`,
        explanation: 'Using escrow payments protects your funds for orders over 50,000 SAR.',
      });
    }

    return { recommendations, analytics };
  }

  async getDeliveryIntelligence(vendorId) {
    const shipments = await this.getShipmentStats(vendorId);
    if (!shipments || shipments.total === 0) {
      return { reliability: 0, confidence: 0, message: 'No shipment data available' };
    }

    const onTimeRate = shipments.onTimeRate || 0;
    const delayRate = shipments.delayedRate || 0;
    const avgDelay = shipments.avgDelayHours || 0;

    const reliability = Math.round(onTimeRate * 100);
    const confidence = Math.min(100, Math.round((shipments.total / 10) * 50 + 50));
    const delayProbability = Math.round((1 - onTimeRate) * 100);

    return {
      vendorId,
      reliability,
      confidence,
      delayProbability,
      avgDelayHours: Math.round(avgDelay * 10) / 10,
      totalShipments: shipments.total,
      historicalAccuracy: reliability,
      onTimeRate: Math.round(onTimeRate * 100),
      delayedRate: Math.round(delayRate * 100),
    };
  }

  async getProcurementHealth(userId) {
    const [orders, rfqs, disputes, transactions] = await Promise.all([
      Order.find({ buyer: userId }).lean(),
      Announcement.find({ user: userId }).lean(),
      Dispute.find({ buyer: userId }).lean(),
      [],
    ]);

    if (orders.length === 0) {
      return { score: 0, level: 'Inactive', strengths: [], weaknesses: ['No procurement history'], suggestions: ['Start by creating your first RFQ or order'] };
    }

    const uniqueSuppliers = new Set(orders.map(o => o.vendor?.toString()).filter(Boolean));
    const supplierDiversity = Math.min(100, Math.round((uniqueSuppliers.size / Math.max(1, orders.length)) * 100));

    const repeatOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
    const repeatRate = orders.length > 0 ? Math.round((repeatOrders / orders.length) * 100) : 0;

    const rfqUsage = Math.min(100, rfqs.length * 10);

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const onTimePayments = completedOrders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 0;

    const disputeRate = orders.length > 0 ? Math.round((disputes.length / orders.length) * 100) : 0;
    const disputeScore = Math.max(0, 100 - disputeRate * 10);

    const orderCompletion = Math.round((completedOrders.length / Math.max(1, orders.length)) * 100);

    const escrowOrders = orders.filter(o => o.paymentMethod === 'escrow').length;
    const escrowScore = Math.min(100, Math.round((escrowOrders / Math.max(1, orders.length)) * 100));

    const budgetEfficiency = completedOrders.length > 0 ? Math.min(100, Math.round((completedOrders.length / Math.max(1, orders.length)) * 100)) : 0;

    const dimensions = {
      supplierDiversity,
      repeatRate,
      rfqUsage,
      budgetEfficiency,
      onTimePayments,
      orderCompletion,
      disputeScore,
      escrowScore,
    };

    const overallScore = Math.round(Object.values(dimensions).reduce((a, b) => a + b, 0) / Object.keys(dimensions).length);

    const strengths = [];
    const weaknesses = [];
    const suggestions = [];

    if (supplierDiversity >= 60) strengths.push('Good supplier diversity');
    else { weaknesses.push('Low supplier diversity'); suggestions.push('Expand your supplier base to reduce dependency risk'); }

    if (repeatRate >= 50) strengths.push('Strong repeat purchase rate');
    else { weaknesses.push('Low repeat purchase rate'); suggestions.push('Build relationships with reliable suppliers for repeat orders'); }

    if (rfqUsage >= 30) strengths.push('Active RFQ user');
    else { weaknesses.push('Low RFQ usage'); suggestions.push('Use RFQs to get competitive pricing from multiple suppliers'); }

    if (onTimePayments >= 80) strengths.push('Excellent payment history');
    else { weaknesses.push('Payment delays detected'); suggestions.push('Maintain on-time payments to build supplier trust and negotiate better terms'); }

    if (disputeScore >= 90) strengths.push('Low dispute rate');
    else { weaknesses.push('High dispute frequency'); suggestions.push('Review supplier selection criteria and improve order specifications'); }

    if (escrowScore >= 30) strengths.push('Good escrow adoption');
    else { weaknesses.push('Low escrow usage'); suggestions.push('Use escrow payments for high-value orders to protect your funds'); }

    return { score: overallScore, level: overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Improvement', dimensions, strengths, weaknesses, suggestions };
  }

  async detectOpportunities(userId) {
    const favoritedVendors = await this.getFavoriteVendors(userId);
    const orders = await Order.find({ buyer: userId }).sort('-createdAt').limit(20).lean();
    const products = await this.getRecentlyViewedProducts(userId);

    const opportunities = [];

    for (const order of orders) {
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const priceIntel = await this.getPriceIntelligence(item.product);
          if (priceIntel && priceIntel.label === 'Overpriced') {
            opportunities.push({
              type: 'better_price_available',
              priority: 'medium',
              productId: item.product,
              reason: `Better price available for previously purchased item`,
              explanation: `You previously purchased this at ${order.total} SAR. Current market average is ${priceIntel.stats.average} SAR.`,
            });
          }
        }
      }
    }

    return opportunities;
  }

  async getMarketIntelligence() {
    const [totalProducts, totalVendors, totalOrders, totalRfqs, shipments, payments] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      Vendor.countDocuments({ status: 'active' }),
      Order.countDocuments(),
      Announcement.countDocuments(),
      this.getShipmentSummary(),
      this.getPaymentSummary(),
    ]);

    return {
      marketplace: { totalProducts, totalVendors, totalOrders, totalRfqs },
      shipments,
      payments,
      trends: {
        orderGrowth: await this.calculateGrowthRate(Order, 'createdAt'),
        vendorGrowth: await this.calculateGrowthRate(Vendor, 'createdAt'),
        productGrowth: await this.calculateGrowthRate(Product, 'createdAt'),
      },
    };
  }

  async getPredictiveAnalytics() {
    const [orderHistory, vendorHistory, productHistory] = await Promise.all([
      this.getTimeSeriesData(Order, 'createdAt', 90),
      this.getTimeSeriesData(Vendor, 'createdAt', 90),
      this.getTimeSeriesData(Product, 'createdAt', 90),
    ]);

    return {
      orders: { history: orderHistory, forecast: this.simpleForecast(orderHistory) },
      vendors: { history: vendorHistory, forecast: this.simpleForecast(vendorHistory) },
      products: { history: productHistory, forecast: this.simpleForecast(productHistory) },
      generatedAt: new Date(),
      methodology: 'Historical moving average based on last 90 days of marketplace data',
    };
  }

  async getVendorReputation(vendorId) {
    try {
      const { getVendorReputation } = await import('../services/vendorReputationService.js');
      return await getVendorReputation(vendorId);
    } catch { return { overall: 0 }; }
  }

  async getOrderStats(vendorId) {
    const orders = await Order.find({ vendor: vendorId }).lean();
    if (!orders.length) return { total: 0, completed: 0, totalRevenue: 0, avgOrderValue: 0 };
    const completed = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const totalRevenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    return { total: orders.length, completed: completed.length, totalRevenue, avgOrderValue: completed.length ? totalRevenue / completed.length : 0 };
  }

  async getReviewStats(vendorId) {
    const reviews = await Review.find({ vendor: vendorId }).lean();
    if (!reviews.length) return { total: 0, average: 0, distribution: {} };
    const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    return { total: reviews.length, average: Math.round(avg * 10) / 10, distribution: {} };
  }

  async getRFQStats(vendorId) {
    const rfqs = await Announcement.find({ vendor: vendorId }).lean();
    const quotations = await Quotation.find({ vendor: vendorId }).lean();
    const avgResponse = quotations.length > 0
      ? quotations.reduce((s, q) => s + (q.responseTime || 0), 0) / quotations.length
      : 0;
    return { total: rfqs.length, responded: quotations.length, avgResponseHours: Math.round(avgResponse * 10) / 10 };
  }

  async getDisputeStats(vendorId) {
    const disputes = await Dispute.find({ vendor: vendorId }).lean();
    return { total: disputes.length, open: disputes.filter(d => d.status === 'open').length, resolved: disputes.filter(d => d.status === 'resolved').length };
  }

  async getShipmentStats(vendorId) {
    try {
      const Shipment = mongoose.model('Shipment');
      const shipments = await Shipment.find({ vendor: vendorId }).lean();
      if (!shipments.length) return { total: 0, onTimeRate: 0, delayedRate: 0, avgDelayHours: 0 };
      const onTime = shipments.filter(s => s.status === 'delivered' && (!s.delayed || s.delayed === false)).length;
      const delayed = shipments.filter(s => s.delayed === true).length;
      return { total: shipments.length, onTimeRate: shipments.length ? onTime / shipments.length : 0, delayedRate: shipments.length ? delayed / shipments.length : 0, avgDelayHours: 0 };
    } catch { return { total: 0, onTimeRate: 0, delayedRate: 0, avgDelayHours: 0 }; }
  }

  calculateOverallScore({ reputation, orders, reviews, rfqs, disputes, shipments }) {
    const repScore = (reputation?.overall || 0) * 0.25;
    const orderScore = orders.total > 0 ? Math.min(100, orders.total * 5) * 0.2 : 0;
    const reviewScore = (reviews.average || 0) * 10 * 0.15;
    const shipmentScore = (shipments.onTimeRate || 0) * 100 * 0.2;
    const disputePenalty = Math.min(100, (disputes.total || 0) * 20) * 0.1;
    const responseScore = rfqs.avgResponseHours > 0 ? Math.max(0, 100 - rfqs.avgResponseHours * 5) * 0.1 : 0;
    return Math.round(Math.max(0, repScore + orderScore + reviewScore + shipmentScore + responseScore - disputePenalty));
  }

  calculatePriceScore(orders) {
    if (!orders.completed) return 0;
    return orders.avgOrderValue < 10000 ? 90 : orders.avgOrderValue < 50000 ? 70 : orders.avgOrderValue < 100000 ? 50 : 30;
  }

  calculateExportScore(vendor, orders) {
    if (!vendor) return 0;
    const hasExport = vendor.exportMarkets && vendor.exportMarkets.length > 0;
    const hasCertifications = vendor.certifications && vendor.certifications.length > 0;
    let score = 0;
    if (hasExport) score += 40;
    if (hasCertifications) score += 30;
    if (vendor.country !== 'Saudi Arabia') score += 20;
    if (orders.total > 0) score += 10;
    return Math.min(100, score);
  }

  calculateLocalScore(vendor, orders) {
    if (!vendor) return 0;
    let score = 0;
    if (vendor.country === 'Saudi Arabia') score += 50;
    if (vendor.city) score += 20;
    if (orders.total > 0) score += 30;
    return Math.min(100, score);
  }

  calculateCapabilityScore(vendor, capability, orders) {
    if (!vendor) return 0;
    let score = 0;
    if (vendor.capabilities?.[capability]) score += 50;
    if (vendor.certifications && vendor.certifications.length > 0) score += 20;
    if (orders.total > 0) score += 30;
    return Math.min(100, score);
  }

  calculateManufacturingScore(factory) {
    if (!factory) return 0;
    let score = 0;
    if (factory.productionCapacity) score += 30;
    if (factory.machines && factory.machines.length > 0) score += 20;
    if (factory.employees) score += 10;
    if (factory.certifications && factory.certifications.length > 0) score += 20;
    if (factory.yearsInOperation) score += 20;
    return Math.min(100, score);
  }

  calculateSustainabilityScore(vendor) {
    if (!vendor) return 0;
    let score = 0;
    const keywords = ['iso', 'environmental', 'green', 'sustainable', 'renewable', 'eco', 'carbon'];
    if (vendor.certifications) {
      const certStr = JSON.stringify(vendor.certifications).toLowerCase();
      score += keywords.filter(k => certStr.includes(k)).length * 15;
    }
    if (vendor.sustainability) score += 20;
    return Math.min(100, score);
  }

  generateSupplierExplanation(vendor, data) {
    const parts = [];
    if (data.reputation?.overall) parts.push(`Reputation Score: ${Math.round(data.reputation.overall)}`);
    if (data.shipments?.onTimeRate) parts.push(`On-time delivery: ${Math.round(data.shipments.onTimeRate * 100)}%`);
    if (data.rfqs?.avgResponseHours && data.rfqs.avgResponseHours < 24) parts.push(`Average RFQ response: ${data.rfqs.avgResponseHours} hours`);
    if (data.certifications?.length) parts.push(`${data.certifications.join(', ')}`);
    if (vendor.country === 'Saudi Arabia') parts.push('Ships from Saudi Arabia');
    if (data.disputes?.total === 0) parts.push('No disputes recorded');
    if (data.orders?.completed > 0) parts.push(`${data.orders.completed} completed orders`);
    return parts.length > 0 ? parts.join('\n') : 'Insufficient data for detailed analysis';
  }

  async getHistoricalPrices(product) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return await Order.aggregate([
        { $match: { 'items.product': product._id, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        { $match: { 'items.product': product._id } },
        { $group: { _id: null, prices: { $push: '$items.price' } } },
        { $project: { _id: 0, prices: 1 } },
      ]).then(r => (r[0]?.prices || []).map(p => ({ price: p })));
    } catch { return []; }
  }

  async getSimilarProducts(product) {
    if (!product.category) return [];
    try {
      return await Product.find({ category: product.category, _id: { $ne: product._id }, status: 'active' }).limit(20).lean();
    } catch { return []; }
  }

  calculatePriceTrend(prices) {
    if (prices.length < 2) return { direction: 'stable', change: 0 };
    const first = prices[0]?.price || 0;
    const last = prices[prices.length - 1]?.price || 0;
    const change = first > 0 ? ((last - first) / first) * 100 : 0;
    return { direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable', change: Math.round(change * 100) / 100 };
  }

  detectPriceOutliers(prices) {
    if (prices.length < 4) return [];
    const sorted = [...prices].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return prices.filter(p => p < lowerBound || p > upperBound);
  }

  async getBuyerAnalytics(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totalOrders, completedOrders, totalSpent] = await Promise.all([
      Order.countDocuments({ buyer: userId }),
      Order.countDocuments({ buyer: userId, status: { $in: ['delivered', 'completed'] } }),
      Order.aggregate([{ $match: { buyer: new mongoose.Types.ObjectId(userId) } }, { $group: { _id: null, total: { $sum: '$total' } } }]).then(r => r[0]?.total || 0),
    ]);
    return { totalOrders, completedOrders, totalSpent, orderCompletionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0 };
  }

  async getFavoriteVendors(userId) {
    try {
      const FavoriteSupplier = mongoose.model('FavoriteSupplier');
      return await FavoriteSupplier.find({ user: userId }).lean();
    } catch { return []; }
  }

  async getRecentlyViewedProducts(userId) {
    try {
      const RecentlyViewed = mongoose.model('RecentlyViewed');
      return await RecentlyViewed.find({ user: userId, entityType: 'product' }).sort('-viewedAt').limit(10).lean();
    } catch { return []; }
  }

  async getShipmentSummary() {
    try {
      const Shipment = mongoose.model('Shipment');
      const total = await Shipment.countDocuments();
      const delayed = await Shipment.countDocuments({ delayed: true });
      return { total, delayed, onTimeRate: total > 0 ? Math.round(((total - delayed) / total) * 100) : 0 };
    } catch { return { total: 0, delayed: 0, onTimeRate: 0 }; }
  }

  async getPaymentSummary() {
    try {
      const Payment = mongoose.model('Payment');
      const total = await Payment.countDocuments();
      const completed = await Payment.countDocuments({ status: 'completed' });
      return { total, completed, successRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    } catch { return { total: 0, completed: 0, successRate: 0 }; }
  }

  async calculateGrowthRate(Model, dateField) {
    try {
      const now = new Date();
      const last30 = await Model.countDocuments({ [dateField]: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } });
      const prev30 = await Model.countDocuments({ [dateField]: { $gte: new Date(now - 60 * 24 * 60 * 60 * 1000), $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) } });
      return { current: last30, previous: prev30, growth: prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : 0 };
    } catch { return { current: 0, previous: 0, growth: 0 }; }
  }

  async getTimeSeriesData(Model, dateField, days) {
    try {
      const results = await Model.aggregate([
        { $match: { [dateField]: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}` } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      return results.map(r => ({ date: r._id, count: r.count }));
    } catch { return []; }
  }

  simpleForecast(history) {
    if (!history || history.length < 7) return null;
    const recent = history.slice(-7);
    const avg = recent.reduce((s, d) => s + d.count, 0) / recent.length;
    const trend = history.length >= 14
      ? (recent.reduce((s, d) => s + d.count, 0) - history.slice(-14, -7).reduce((s, d) => s + d.count, 0)) / 7
      : 0;
    return Array.from({ length: 7 }, (_, i) => ({ day: i + 1, predicted: Math.max(0, Math.round(avg + trend * (i + 1))) }));
  }
}

export default new CommerceIntelligenceService();
