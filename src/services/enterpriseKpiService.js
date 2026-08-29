import { EnterpriseKpi } from '../models/EnterpriseKpi.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import { Tender } from '../models/tenderModel.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { AiFeedback } from '../models/AiFeedback.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EnterpriseKpiService {
  async _storeKpi(name, category, value, target, tags) {
    const now = new Date();
    const period = { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    const previous = await EnterpriseKpi.findOne({ name, 'period.start': period.start }).lean();
    const trend = previous ? (value > previous.value ? 'up' : value < previous.value ? 'down' : 'stable') : 'stable';
    const variance = target ? Math.round(((value - target) / target) * 100) : 0;
    let status = 'on_track';
    if (variance < -20) status = 'critical';
    else if (variance < -10) status = 'at_risk';
    else if (variance > 10) status = 'exceeded';
    return EnterpriseKpi.findOneAndUpdate(
      { name, 'period.start': period.start },
      {
        name, category, value, target, period,
        trend, variance, status, tags: tags || [],
        previousValue: previous?.value || null,
      },
      { upsert: true, new: true }
    );
  }

  async calculateOperationalKpis() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [services, latencyEvents, traceErrors, totalTraces, orderCount] = await Promise.all([
      ServiceHealth.find({}).lean(),
      TelemetryEvent.aggregate([
        { $match: { type: 'api_latency', timestamp: { $gte: today } } },
        { $group: { _id: null, avgLatency: { $avg: '$value' }, maxLatency: { $max: '$value' }, count: { $sum: 1 } } },
      ]),
      TelemetryEvent.aggregate([
        { $match: { timestamp: { $gte: today } } },
        { $group: { _id: null, total: { $sum: 1 }, errors: { $sum: { $cond: [{ $gt: ['$value', 1000] }, 1, 0] } } } },
      ]),
      TelemetryEvent.countDocuments({ timestamp: { $gte: today } }),
      EscrowOrder.countDocuments({ createdAt: { $gte: today } }),
    ]);
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalServices = services.length;
    const uptime = totalServices > 0 ? Math.round((healthyCount / totalServices) * 100) : 0;
    const avgLatency = latencyEvents[0]?.avgLatency || 0;
    const throughput = traceErrors[0]?.total || 0;
    const errors = traceErrors[0]?.errors || 0;
    const errorRate = throughput > 0 ? Math.round((errors / throughput) * 10000) / 100 : 0;
    const kpis = [
      { name: 'service_uptime', value: uptime, target: 99.9, tags: ['operational'] },
      { name: 'avg_response_time', value: Math.round(avgLatency), target: 200, tags: ['operational'] },
      { name: 'error_rate', value: errorRate, target: 1, tags: ['operational'] },
      { name: 'throughput', value: throughput, target: null, tags: ['operational'] },
      { name: 'daily_orders_processed', value: orderCount, target: null, tags: ['operational'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'operational', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async calculateFinancialKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const [monthlyOrders, yearlyOrders, allOrders] = await Promise.all([
      EscrowOrder.find({ createdAt: { $gte: monthStart }, status: { $in: ['completed', 'delivered'] } }).lean(),
      EscrowOrder.find({ createdAt: { $gte: yearStart }, status: { $in: ['completed', 'delivered'] } }).lean(),
      EscrowOrder.find({}).lean(),
    ]);
    const monthlyRevenue = monthlyOrders.reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0);
    const yearlyRevenue = yearlyOrders.reduce((s, o) => s + (parseFloat(o.totalAmount) || 0), 0);
    const transactionVolume = monthlyOrders.length;
    const avgOrderValue = transactionVolume > 0 ? Math.round(monthlyRevenue / transactionVolume) : 0;
    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter(o => ['completed', 'delivered'].includes(o.status)).length;
    const paymentSuccessRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const kpis = [
      { name: 'monthly_revenue', value: Math.round(monthlyRevenue), target: null, tags: ['financial'] },
      { name: 'yearly_revenue', value: Math.round(yearlyRevenue), target: null, tags: ['financial'] },
      { name: 'transaction_volume', value: transactionVolume, target: null, tags: ['financial'] },
      { name: 'avg_order_value', value: avgOrderValue, target: null, tags: ['financial'] },
      { name: 'payment_success_rate', value: paymentSuccessRate, target: 98, tags: ['financial'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'financial', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async calculateMarketplaceKpis() {
    const [totalProducts, totalVendors, activeVendors, totalBuyers, tenders, orders] = await Promise.all([
      Product.countDocuments({}),
      Vendor.countDocuments({}),
      Vendor.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'user', isActive: true }),
      Tender.find({}).lean(),
      EscrowOrder.find({}).lean(),
    ]);
    const activeBuyers = new Set(orders.map(o => o.buyer?.toString())).size;
    const matchedTenders = tenders.filter(t => t.bids && t.bids.length > 0);
    const matchingRate = tenders.length > 0 ? Math.round((matchedTenders.length / tenders.length) * 100) : 0;
    const awardedTenders = tenders.filter(t => t.status === 'awarded');
    const fillRate = matchedTenders.length > 0 ? Math.round((awardedTenders.length / matchedTenders.length) * 100) : 0;
    const kpis = [
      { name: 'total_listings', value: totalProducts, target: null, tags: ['marketplace'] },
      { name: 'total_vendors', value: totalVendors, target: null, tags: ['marketplace'] },
      { name: 'active_vendors', value: activeVendors, target: null, tags: ['marketplace'] },
      { name: 'active_buyers', value: activeBuyers, target: null, tags: ['marketplace'] },
      { name: 'matching_rate', value: matchingRate, target: 70, tags: ['marketplace'] },
      { name: 'fill_rate', value: fillRate, target: 60, tags: ['marketplace'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'marketplace', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async calculateSellerKpis() {
    const [reviews, vendors, orders] = await Promise.all([
      Review.find({ reviewType: 'vendor', moderationStatus: 'approved' }).lean(),
      Vendor.find({ isActive: true }).lean(),
      EscrowOrder.find({}).sort({ createdAt: -1 }).lean(),
    ]);
    const vendorRatings = {};
    for (const r of reviews) {
      const vid = r.vendor?.toString();
      if (!vid) continue;
      if (!vendorRatings[vid]) vendorRatings[vid] = { total: 0, count: 0 };
      vendorRatings[vid].total += r.rating;
      vendorRatings[vid].count++;
    }
    const avgRatings = Object.values(vendorRatings).filter(v => v.count > 0).map(v => v.total / v.count);
    const avgSellerRating = avgRatings.length > 0
      ? Math.round((avgRatings.reduce((s, r) => s + r, 0) / avgRatings.length) * 10) / 10
      : 0;
    const vendorOrders = {};
    for (const o of orders) {
      const vid = o.vendor?.toString();
      if (vid) vendorOrders[vid] = (vendorOrders[vid] || 0) + 1;
    }
    const activeSellerCount = Object.keys(vendorOrders).length;
    const repeatSellers = Object.values(vendorOrders).filter(c => c > 1).length;
    const fulfillmentRate = activeSellerCount > 0 ? Math.round((repeatSellers / activeSellerCount) * 100) : 0;
    const vendorResponseRates = vendors.filter(v => v.aiHistory && v.aiHistory.length > 0);
    const responseRate = vendors.length > 0 ? Math.round((vendorResponseRates.length / vendors.length) * 100) : 0;
    const returningBuyers = {};
    for (const o of orders) {
      const bid = o.buyer?.toString();
      if (bid) returningBuyers[bid] = (returningBuyers[bid] || 0) + 1;
    }
    const repeatBuyers = Object.values(returningBuyers).filter(c => c > 1).length;
    const totalUniqueBuyers = Object.keys(returningBuyers).length;
    const repeatRate = totalUniqueBuyers > 0 ? Math.round((repeatBuyers / totalUniqueBuyers) * 100) : 0;
    const kpis = [
      { name: 'avg_seller_rating', value: avgSellerRating, target: 4.0, tags: ['seller'] },
      { name: 'fulfillment_rate', value: fulfillmentRate, target: 80, tags: ['seller'] },
      { name: 'response_rate', value: responseRate, target: 80, tags: ['seller'] },
      { name: 'seller_repeat_rate', value: repeatRate, target: 60, tags: ['seller'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'seller', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async calculateBuyerKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [buyers, orders, reviews] = await Promise.all([
      User.find({ role: 'user', isActive: true }).lean(),
      EscrowOrder.find({}).lean(),
      Review.find({ reviewType: 'product', moderationStatus: 'approved' }).lean(),
    ]);
    const orderBuyerIds = new Set(orders.map(o => o.buyer?.toString()).filter(Boolean));
    const monthOrderBuyers = new Set(
      orders.filter(o => new Date(o.createdAt) >= monthStart).map(o => o.buyer?.toString()).filter(Boolean)
    );
    const totalBuyers = buyers.length;
    const activeBuyers = orderBuyerIds.size;
    const newBuyersThisMonth = buyers.filter(u => new Date(u.createdAt) >= monthStart).length;
    const retentionRate = totalBuyers > 0 ? Math.round((activeBuyers / totalBuyers) * 100) : 0;
    const buyerSpending = {};
    for (const o of orders) {
      const bid = o.buyer?.toString();
      if (bid) buyerSpending[bid] = (buyerSpending[bid] || 0) + (parseFloat(o.totalAmount) || 0);
    }
    const avgSpend = activeBuyers > 0
      ? Math.round(Object.values(buyerSpending).reduce((s, v) => s + v, 0) / activeBuyers)
      : 0;
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;
    const satisfactionScore = avgRating > 0 ? Math.round((avgRating / 5) * 100) : 0;
    const kpis = [
      { name: 'active_buyers', value: activeBuyers, target: null, tags: ['buyer'] },
      { name: 'buyer_retention', value: retentionRate, target: 60, tags: ['buyer'] },
      { name: 'avg_buyer_spend', value: avgSpend, target: null, tags: ['buyer'] },
      { name: 'buyer_satisfaction', value: satisfactionScore, target: 80, tags: ['buyer'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'buyer', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async calculateAiKpis() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [allFeedback, monthFeedback, totalUsers, orders] = await Promise.all([
      AiFeedback.find({}).lean(),
      AiFeedback.find({ timestamp: { $gte: monthStart } }).lean(),
      User.countDocuments({ isActive: true }),
      EscrowOrder.find({ createdAt: { $gte: monthStart } }).lean(),
    ]);
    const uniqueUsersWithFeedback = new Set(allFeedback.map(f => f.userId?.toString()).filter(Boolean));
    const adoptionRate = totalUsers > 0 ? Math.round((uniqueUsersWithFeedback.size / totalUsers) * 100) : 0;
    const acceptedCount = monthFeedback.filter(f => f.wasAccepted).length;
    const acceptanceRate = monthFeedback.length > 0 ? Math.round((acceptedCount / monthFeedback.length) * 100) : 0;
    const aiOrders = orders.filter(o => o.status === 'completed' || o.status === 'delivered');
    const automationRate = orders.length > 0 ? Math.round((aiOrders.length / orders.length) * 100) : 0;
    const kpis = [
      { name: 'ai_adoption_rate', value: adoptionRate, target: 40, tags: ['ai'] },
      { name: 'recommendation_acceptance', value: acceptanceRate, target: 50, tags: ['ai'] },
      { name: 'automation_rate', value: automationRate, target: 30, tags: ['ai'] },
    ];
    const stored = [];
    for (const kpi of kpis) {
      stored.push(await this._storeKpi(kpi.name, 'ai', kpi.value, kpi.target, kpi.tags));
    }
    return stored;
  }

  async getKpiDashboard() {
    const kpis = await EnterpriseKpi.find({}).sort({ category: 1, name: 1 }).lean();
    const grouped = { operational: [], financial: [], marketplace: [], seller: [], buyer: [], ai: [] };
    for (const kpi of kpis) {
      if (grouped[kpi.category]) grouped[kpi.category].push(kpi);
    }
    return {
      kpis: grouped,
      generatedAt: new Date(),
    };
  }

  async compareKpiPeriod(period1, period2) {
    const p1 = await EnterpriseKpi.find({
      'period.start': new Date(period1.start),
      'period.end': new Date(period1.end),
    }).lean();
    const p2 = await EnterpriseKpi.find({
      'period.start': new Date(period2.start),
      'period.end': new Date(period2.end),
    }).lean();
    const comparison = [];
    for (const kpi1 of p1) {
      const kpi2 = p2.find(k => k.name === kpi1.name);
      comparison.push({
        name: kpi1.name, category: kpi1.category,
        value1: kpi1.value, value2: kpi2?.value || 0,
        change: kpi2 ? Math.round(((kpi1.value - kpi2.value) / (kpi2.value || 1)) * 100) : null,
      });
    }
    return { period1, period2, comparison };
  }

  async calculateAllKpis() {
    const results = await Promise.all([
      this.calculateOperationalKpis(),
      this.calculateFinancialKpis(),
      this.calculateMarketplaceKpis(),
      this.calculateSellerKpis(),
      this.calculateBuyerKpis(),
      this.calculateAiKpis(),
    ]);
    const total = results.reduce((s, r) => s + r.length, 0);
    await logAuditEvent({
      action: 'kpi.calculate.all', category: 'system',
      entityType: 'EnterpriseKpi',
      description: `Calculated all KPIs: ${total} total`,
      status: 'success',
    });
    return { kpis: results.flat(), total, generatedAt: new Date() };
  }

  async getKpiById(id) {
    const kpi = await EnterpriseKpi.findById(id).lean();
    if (!kpi) return null;
    const history = await EnterpriseKpi.find({ name: kpi.name })
      .sort({ 'period.start': -1 }).limit(12).lean();
    return { ...kpi, history };
  }
}

export const enterpriseKpiService = new EnterpriseKpiService();
