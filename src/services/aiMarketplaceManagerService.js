import Order from '../models/Order.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import { FraudAlert } from '../models/FraudAlert.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import Subscription from '../models/Subscription.js';
import { logAuditEvent } from './auditService.js';

class AiMarketplaceManagerService {
  constructor() {
    this.intentPatterns = {
      revenue_decline: /revenue.*(declin|drop|decreas|down|fall|loss)|(declin|drop|decreas|down|fall|loss).*revenue/i,
      supplier_review: /supplier.*(review|audit|check|evaluat|assess|flag|bad|risk)|(worst|bad|poor).*supplier/i,
      compliance: /compliance|regulat|violat|rule.*break|non.complian/i,
      product_trends: /product.*(trend|declin|demand|popular|slow)|trend.*(product|category)/i,
      growth_by_country: /growth.*(country|region|area|geograph)|(country|region).*growth|expand.*(country|region)/i,
      category_expansion: /categor.*(grow|expand|rise|top|best|perform)|(grow|expand).*categor/i,
      suspicious_activity: /(suspicious|fraud|alert|risky|unusual).*(activity|behavior|transact|login)|fraud.*(alert|detect)/i,
      subscription_upgrades: /subscription.*(upgrade|better|plan|improve|premium)|upgrade.*(subscription|plan|vendor)/i,
      sla_violations: /sla|service.*level|violat.*(sla|agreement)|(late|delay).*delivery/i,
      revenue_opportunities: /(opportunit|potential|untap|growth).*(revenue|sale|profit)|revenue.*(opportunit|potential|increase)/i,
    };
  }

  async processQuery(query, userId) {
    const intent = this._classifyIntent(query);
    const handler = this._getHandler(intent);
    const data = handler ? await handler(userId) : {};
    const confidence = this._computeConfidence(query, intent);

    const response = {
      intent,
      query,
      originalQuery: query,
      confidence,
      data,
      explanation: this._generateExplanation(intent, data),
      evidence: data.evidence || [],
      relatedReports: this._getRelatedReports(intent),
      recommendations: this._getRecommendations(intent, data),
      actionSuggestions: this._getActionSuggestions(intent, data),
      timestamp: new Date().toISOString(),
    };

    await logAuditEvent({
      userId,
      action: 'ai_marketplace_query',
      category: 'system',
      entityType: 'AiMarketplaceQuery',
      newValue: { intent, query },
      description: `AI Marketplace query: "${query.substring(0, 100)}" classified as ${intent}`,
    });

    return response;
  }

  _classifyIntent(query) {
    for (const [intent, pattern] of Object.entries(this.intentPatterns)) {
      if (pattern.test(query)) return intent;
    }
    return 'revenue_opportunities';
  }

  _getHandler(intent) {
    const handlers = {
      revenue_decline: this._handleRevenueDecline,
      supplier_review: this._handleSupplierReview,
      compliance: this._handleCompliance,
      product_trends: this._handleProductTrends,
      growth_by_country: this._handleGrowthByCountry,
      category_expansion: this._handleCategoryExpansion,
      suspicious_activity: this._handleSuspiciousActivity,
      subscription_upgrades: this._handleSubscriptionUpgrades,
      sla_violations: this._handleSlaViolations,
      revenue_opportunities: this._handleRevenueOpportunities,
    };
    return handlers[intent] ? handlers[intent].bind(this) : null;
  }

  _computeConfidence(query, intent) {
    const pattern = this.intentPatterns[intent];
    if (!pattern) return 50;
    const match = query.match(pattern);
    if (!match) return 50;
    const matchedText = match[0];
    const coverage = matchedText.length / query.length;
    return Math.min(95, Math.round(50 + coverage * 45));
  }

  async _handleRevenueDecline(userId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    const [recentOrders, previousOrders] = await Promise.all([
      Order.find({ createdAt: { $gte: thirtyDaysAgo } }).lean(),
      Order.find({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }).lean(),
    ]);

    const recentRevenue = recentOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const previousRevenue = previousOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const change = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const decliningVendors = await this._findDecliningVendors(recentOrders, previousOrders);

    return {
      currentPeriod: { label: 'Last 30 days', revenue: recentRevenue, orders: recentOrders.length },
      previousPeriod: { label: '30-60 days ago', revenue: previousRevenue, orders: previousOrders.length },
      changePercent: Math.round(change * 100) / 100,
      changeDirection: change < 0 ? 'decline' : 'increase',
      decliningVendors,
      evidence: decliningVendors.length > 0
        ? [`${decliningVendors.length} vendor(s) showing revenue decline`]
        : ['No significant revenue decline detected'],
    };
  }

  async _findDecliningVendors(recent, previous) {
    const recentByVendor = {};
    const prevByVendor = {};
    for (const o of recent) { const vid = o.vendor?.toString(); if (vid) recentByVendor[vid] = (recentByVendor[vid] || 0) + (o.totalAmount || 0); }
    for (const o of previous) { const vid = o.vendor?.toString(); if (vid) prevByVendor[vid] = (prevByVendor[vid] || 0) + (o.totalAmount || 0); }
    const declining = [];
    for (const [vid, prevRev] of Object.entries(prevByVendor)) {
      const currRev = recentByVendor[vid] || 0;
      if (prevRev > 0 && currRev < prevRev * 0.5) {
        declining.push({ vendorId: vid, previousRevenue: prevRev, currentRevenue: currRev, declinePercent: Math.round((1 - currRev / prevRev) * 100) });
      }
    }
    return declining.sort((a, b) => b.declinePercent - a.declinePercent).slice(0, 10);
  }

  async _handleSupplierReview(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const vendors = await Vendor.find({ isActive: true }).lean();
    const vendorIds = vendors.map(v => v._id);

    const [reviews, orders] = await Promise.all([
      Review.aggregate([
        { $match: { vendor: { $in: vendorIds }, createdAt: { $gte: thirtyDaysAgo }, moderationStatus: 'approved' } },
        { $group: { _id: '$vendor', avgRating: { $avg: '$rating' }, count: { $sum: 1 }, complaints: { $sum: { $cond: [{ $lt: ['$rating', 3] }, 1, 0] } } } },
      ]),
      Order.aggregate([
        { $match: { vendor: { $in: vendorIds }, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$vendor', orderCount: { $sum: 1 }, disputes: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } } } },
      ]),
    ]);

    const reviewMap = {};
    for (const r of reviews) reviewMap[r._id.toString()] = r;
    const orderMap = {};
    for (const o of orders) orderMap[o._id.toString()] = o;

    const flagged = vendors.filter(v => {
      const r = reviewMap[v._id.toString()];
      const o = orderMap[v._id.toString()];
      if (r && r.avgRating < 3) return true;
      if (r && (r.complaints / Math.max(r.count, 1)) > 0.3) return true;
      if (o && o.disputes > 2) return true;
      return false;
    }).map(v => {
      const r = reviewMap[v._id.toString()];
      const o = orderMap[v._id.toString()];
      return {
        vendorId: v._id,
        storeName: v.storeName?.en || v.storeName,
        avgRating: r?.avgRating || 0,
        reviewCount: r?.count || 0,
        complaints: r?.complaints || 0,
        disputes: o?.disputes || 0,
        orders: o?.orderCount || 0,
        flags: [],
      };
    });

    return {
      totalVendors: vendors.length,
      flaggedCount: flagged.length,
      flagged,
      evidence: [`${flagged.length} of ${vendors.length} vendors need review`],
    };
  }

  async _handleCompliance(userId) {
    const violations = await Order.aggregate([
      { $match: { status: 'disputed', createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } },
      { $group: { _id: '$vendor', disputeCount: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $match: { disputeCount: { $gte: 3 } } },
      { $sort: { disputeCount: -1 } },
    ]);
    return {
      vendorsWithViolations: violations.length,
      violations,
      evidence: violations.length > 0
        ? [`${violations.length} vendors with 3+ disputes in 90 days`]
        : ['No compliance violations detected'],
    };
  }

  async _handleProductTrends(userId) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const products = await Product.find({ isActive: true }).populate('category', 'name').lean();
    const productIds = products.map(p => p._id);
    const orders = await Order.find({
      'items.product': { $in: productIds },
      createdAt: { $gte: sixtyDaysAgo },
    }).lean();

    const recentOrders = orders.filter(o => o.createdAt >= new Date(Date.now() - 30 * 86400000));
    const olderOrders = orders.filter(o => o.createdAt < new Date(Date.now() - 30 * 86400000));
    const recentCounts = {};
    const olderCounts = {};
    for (const o of recentOrders) { for (const item of o.items || []) { const id = item.product?.toString(); if (id) recentCounts[id] = (recentCounts[id] || 0) + item.quantity; } }
    for (const o of olderOrders) { for (const item of o.items || []) { const id = item.product?.toString(); if (id) olderCounts[id] = (olderCounts[id] || 0) + item.quantity; } }

    const declining = products.map(p => {
      const curr = recentCounts[p._id.toString()] || 0;
      const prev = olderCounts[p._id.toString()] || 0;
      const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
      return { productId: p._id, name: p.name?.en || p.name, category: p.category?.name?.en || 'N/A', currentQuantity: curr, previousQuantity: prev, changePercent: Math.round(change * 100) / 100 };
    }).filter(p => p.changePercent < -30).sort((a, b) => a.changePercent - b.changePercent).slice(0, 20);

    return { decliningProducts: declining, totalProducts: products.length, evidence: declining.length > 0 ? [`${declining.length} products with >30% demand decline`] : ['No significant product trends detected'] };
  }

  async _handleGrowthByCountry(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const orders = await Order.find({ createdAt: { $gte: thirtyDaysAgo } }).populate('buyer', 'address').lean();
    const countryRevenue = {};
    for (const o of orders) {
      const country = o.buyer?.address?.country || 'Unknown';
      if (!countryRevenue[country]) countryRevenue[country] = { revenue: 0, orders: 0 };
      countryRevenue[country].revenue += o.totalAmount || 0;
      countryRevenue[country].orders += 1;
    }
    const byCountry = Object.entries(countryRevenue).map(([country, data]) => ({ country, ...data }));
    byCountry.sort((a, b) => b.revenue - a.revenue);
    return { growthByCountry: byCountry, evidence: [`Data from ${orders.length} orders across ${byCountry.length} countries`] };
  }

  async _handleCategoryExpansion(userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const recent = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$items' },
      { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'product' } },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$product.category', revenue: { $sum: '$items.totalPrice' }, count: { $sum: '$items.quantity' } } },
    ]);
    return { categories: recent.filter(c => c._id).map(c => ({ categoryId: c._id, revenue: c.revenue, quantity: c.count })).sort((a, b) => b.revenue - a.revenue), evidence: [`${recent.length} categories with activity`] };
  }

  async _handleSuspiciousActivity(userId) {
    const alerts = await FraudAlert.find({ status: 'open', createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } }).sort({ score: -1 }).limit(20).lean();
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
    return { alerts, bySeverity, totalOpen: alerts.length, evidence: [`${alerts.length} open fraud alerts in the last 7 days`] };
  }

  async _handleSubscriptionUpgrades(userId) {
    const subscriptions = await Subscription.find({ status: 'active' }).populate('userId', 'name email').lean();
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ price: 1 }).lean();
    const candidates = subscriptions.filter(sub => {
      const currentPlanIdx = plans.findIndex(p => p.type === sub.planType);
      const orderCount = sub.orderCount || 0;
      return currentPlanIdx < plans.length - 1 && orderCount > plans[currentPlanIdx + 1]?.limits?.orders * 0.8;
    });
    return { upgradeCandidates: candidates.map(c => ({ userId: c.userId?._id, name: c.userId?.name, currentPlan: c.planType })), total: candidates.length, evidence: [`${candidates.length} vendors identified for upgrade`] };
  }

  async _handleSlaViolations(userId) {
    const violations = await Order.aggregate([
      { $match: { status: { $in: ['shipped', 'delivered', 'completed'] }, 'shippingDetails.actualDeliveryDate': { $ne: null }, 'shippingDetails.estimatedDelivery': { $ne: null } } },
      { $addFields: { delayDays: { $divide: [{ $subtract: ['$shippingDetails.actualDeliveryDate', '$shippingDetails.estimatedDelivery'] }, 86400000] } } },
      { $match: { delayDays: { $gt: 3 } } },
      { $group: { _id: '$vendor', violationCount: { $sum: 1 }, maxDelay: { $max: '$delayDays' }, avgDelay: { $avg: '$delayDays' } } },
      { $sort: { violationCount: -1 } },
      { $limit: 20 },
    ]);
    return { violations, totalViolations: violations.length, evidence: violations.length > 0 ? [`${violations.length} vendors with SLA violations`] : ['No SLA violations detected'] };
  }

  async _handleRevenueOpportunities(userId) {
    const topVendors = await Order.aggregate([
      { $group: { _id: '$vendor', totalRevenue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);
    return { topVendors, evidence: [`Top ${topVendors.length} vendors by revenue identified`] };
  }

  _generateExplanation(intent, data) {
    const explanations = {
      revenue_decline: data.changePercent < 0
        ? `Revenue declined ${Math.abs(data.changePercent).toFixed(1)}% compared to previous period. ${data.decliningVendors.length} vendors contributing to decline.`
        : `Revenue ${data.changeDirection} by ${Math.abs(data.changePercent).toFixed(1)}%.`,
      supplier_review: `${data.flaggedCount} supplier(s) flagged for review based on ratings, complaints, and dispute analysis.`,
      compliance: `${data.vendorsWithViolations} vendor(s) with compliance violations identified.`,
      product_trends: `${data.decliningProducts.length} product(s) showing declining demand.`,
      growth_by_country: `Marketplace growth across ${data.growthByCountry.length} countries. Top market: ${data.growthByCountry[0]?.country || 'N/A'}.`,
      category_expansion: `${data.categories.length} categories with active growth.`,
      suspicious_activity: `${data.totalOpen} open fraud alerts. ${data.bySeverity?.critical || 0} critical, ${data.bySeverity?.high || 0} high severity.`,
      subscription_upgrades: `${data.total} vendor(s) identified as upgrade candidates.`,
      sla_violations: `${data.totalViolations} vendor(s) with SLA violations.`,
      revenue_opportunities: `Top ${data.topVendors?.length || 0} revenue opportunities identified.`,
    };
    return explanations[intent] || 'Analysis complete.';
  }

  _getRelatedReports(intent) {
    const map = {
      revenue_decline: ['Revenue Analytics', 'Vendor Performance'],
      supplier_review: ['Vendor Scorecard', 'Supplier Risk'],
      compliance: ['Compliance Dashboard', 'Audit Trail'],
      product_trends: ['Product Analytics', 'Inventory Report'],
      growth_by_country: ['Market Intelligence', 'Geographic Expansion'],
      category_expansion: ['Category Analytics', 'Market Trends'],
      suspicious_activity: ['Security Center', 'Fraud Dashboard'],
      subscription_upgrades: ['Subscription Overview', 'Revenue Forecast'],
      sla_violations: ['Operations Dashboard', 'Vendor Reliability'],
      revenue_opportunities: ['Opportunity Detection', 'Growth Forecast'],
    };
    return map[intent] || [];
  }

  _getRecommendations(intent, data) {
    const map = {
      revenue_decline: data.changePercent < 0
        ? [`Investigate top ${Math.min(data.decliningVendors.length, 3)} declining vendors`, 'Review pricing strategy', 'Consider promotional campaigns']
        : ['Continue current strategy', 'Monitor for sustainability'],
      supplier_review: data.flaggedCount > 0 ? [`Review ${data.flaggedCount} flagged suppliers`, 'Set improvement targets', 'Consider alternative suppliers for high-risk'] : ['All suppliers performing well'],
      compliance: data.vendorsWithViolations > 0 ? ['Escalate top violators', 'Review compliance policies', 'Schedule compliance training'] : ['Compliance status is healthy'],
      product_trends: data.decliningProducts.length > 0 ? [`Review ${Math.min(data.decliningProducts.length, 5)} declining products`, 'Consider promotions or bundles', 'Evaluate product relevance'] : ['Product demand is stable'],
      growth_by_country: [data.growthByCountry[0] ? `Focus on ${data.growthByCountry[0].country} market` : 'Expand market reach', 'Invest in high-growth regions'],
      category_expansion: ['Invest in top growing categories', 'Consider new category additions'],
      suspicious_activity: data.totalOpen > 0 ? ['Review critical alerts immediately', 'Update fraud detection rules', 'Block identified bad actors'] : ['No immediate action needed'],
      subscription_upgrades: data.total > 0 ? [`Contact ${data.total} upgrade candidates`, 'Prepare upgrade proposals', 'Offer trial of premium features'] : ['Subscription plans well matched'],
      sla_violations: data.totalViolations > 0 ? ['Enforce SLA penalties', 'Review vendor agreements', 'Set improvement plans'] : ['SLA compliance is good'],
      revenue_opportunities: ['Focus on top revenue vendors', 'Cross-sell opportunities', 'Expand product lines'],
    };
    return map[intent] || ['No specific recommendations'];
  }

  _getActionSuggestions(intent, data) {
    const map = {
      revenue_decline: data.changePercent < 0 ? ['View Revenue Analytics Dashboard', 'Export Decline Report', 'Notify Affected Vendors'] : ['View Revenue Dashboard'],
      supplier_review: data.flaggedCount > 0 ? ['Open Vendor Management', 'Schedule Vendor Reviews', 'Generate Supplier Report'] : ['View Vendor Dashboard'],
      compliance: data.vendorsWithViolations > 0 ? ['Open Compliance Dashboard', 'Create Compliance Report', 'Escalate to Legal'] : ['View Compliance Status'],
      product_trends: data.decliningProducts.length > 0 ? ['View Product Analytics', 'Create Promotional Campaign', 'Archive Underperforming Products'] : ['View Product Dashboard'],
      growth_by_country: ['View Market Intelligence', 'Export Country Report'],
      category_expansion: ['View Category Analytics', 'Explore New Categories'],
      suspicious_activity: data.totalOpen > 0 ? ['Open Fraud Dashboard', 'Review Critical Alerts', 'Update Security Rules'] : ['View Security Dashboard'],
      subscription_upgrades: data.total > 0 ? ['Open Subscription Manager', 'Create Upgrade Campaign', 'Contact Candidates'] : ['View Subscription Dashboard'],
      sla_violations: data.totalViolations > 0 ? ['Open Operations Dashboard', 'Generate SLA Report', 'Contact Violating Vendors'] : ['View SLA Dashboard'],
      revenue_opportunities: ['View Opportunity Dashboard', 'Export Revenue Report'],
    };
    return map[intent] || ['View Marketplace Dashboard'];
  }
}

export const aiMarketplaceManagerService = new AiMarketplaceManagerService();
