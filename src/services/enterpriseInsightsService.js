import mongoose from 'mongoose';
import { EnterpriseInsight } from '../models/EnterpriseInsight.js';
import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import { Quotation } from '../models/Quotation.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseInsightsService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000;
  }

  async generateExecutiveInsights() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const [currentOrders, lastOrders, prevOrders, totalUsers, activeUsers, totalVendors, activeVendors] = await Promise.all([
      Order.find({ createdAt: { $gte: currentMonthStart } }).lean(),
      Order.find({ createdAt: { $gte: lastMonthStart, $lt: currentMonthStart } }).lean(),
      Order.find({ createdAt: { $gte: prevMonthStart, $lt: lastMonthStart } }).lean(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, lastLoginAt: { $gte: lastMonthStart } }),
      Vendor.countDocuments({ isActive: true }),
      Vendor.countDocuments({ isActive: true, createdAt: { $gte: lastMonthStart } }),
    ]);

    const calcRevenue = (orders) => orders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const currentRevenue = calcRevenue(currentOrders);
    const lastRevenue = calcRevenue(lastOrders);
    const prevRevenue = calcRevenue(prevOrders);
    const currentCount = currentOrders.length;
    const lastCount = lastOrders.length;

    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const orderGrowth = lastCount > 0 ? ((currentCount - lastCount) / lastCount) * 100 : 0;
    const userGrowth = totalUsers > 0 ? activeUsers / totalUsers : 0;
    const newVendors = await Vendor.countDocuments({ createdAt: { $gte: lastMonthStart } });
    const vendorGrowth = totalVendors > 0 ? newVendors / totalVendors : 0;

    const insights = [];
    insights.push({
      type: 'executive',
      title: 'Revenue Trend Analysis',
      description: `Current month revenue ${currentRevenue.toFixed(2)} is ${revenueGrowth >= 0 ? 'up' : 'down'} ${Math.abs(revenueGrowth).toFixed(1)}% vs last month.`,
      severity: Math.abs(revenueGrowth) > 20 ? 'critical' : 'important',
      confidence: 90,
      evidence: [
        { metric: 'current_month_revenue', value: currentRevenue, change: currentRevenue - lastRevenue, direction: revenueGrowth >= 0 ? 'up' : 'down' },
        { metric: 'last_month_revenue', value: lastRevenue, change: lastRevenue - prevRevenue, direction: lastRevenue >= prevRevenue ? 'up' : 'down' },
      ],
    });
    insights.push({
      type: 'executive',
      title: 'Order Volume Growth',
      description: `${currentCount} orders this month (${orderGrowth >= 0 ? '+' : ''}${orderGrowth.toFixed(1)}% vs last month).`,
      severity: orderGrowth < -20 ? 'critical' : 'info',
      confidence: 92,
      evidence: [
        { metric: 'current_month_orders', value: currentCount, change: currentCount - lastCount, direction: orderGrowth >= 0 ? 'up' : 'down' },
        { metric: 'last_month_orders', value: lastCount, change: lastCount - prevOrders.length, direction: lastCount >= prevOrders.length ? 'up' : 'down' },
      ],
    });
    insights.push({
      type: 'executive',
      title: 'User Growth Metrics',
      description: `${activeUsers} active users out of ${totalUsers} total (${(userGrowth * 100).toFixed(1)}% activation rate).`,
      severity: 'info',
      confidence: 95,
      evidence: [
        { metric: 'active_users', value: activeUsers, change: activeUsers - totalUsers, direction: 'up' },
        { metric: 'total_users', value: totalUsers, direction: 'up' },
      ],
    });
    insights.push({
      type: 'executive',
      title: 'Vendor Ecosystem Growth',
      description: `${newVendors} new vendors joined this month (${(vendorGrowth * 100).toFixed(1)}% growth rate).`,
      severity: 'important',
      confidence: 88,
      evidence: [
        { metric: 'new_vendors', value: newVendors, direction: 'up' },
        { metric: 'total_vendors', value: totalVendors, direction: 'up' },
      ],
    });
    return insights;
  }

  async generateMarketplaceInsights() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [completedOrders, quotes, products, activeUsers, activeVendors] = await Promise.all([
      Order.find({ status: 'delivered', createdAt: { $gte: monthStart } }).lean(),
      Quotation.find({ createdAt: { $gte: monthStart } }).lean(),
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Vendor.countDocuments({ isActive: true }),
    ]);

    const totalOrders = completedOrders.length;
    const totalRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
    const quoteFillRate = quotes.length > 0 ? (acceptedQuotes.length / quotes.length) * 100 : 0;
    const revenuePerUser = activeUsers > 0 ? totalRevenue / activeUsers : 0;
    const liquidityScore = Math.min(100, (totalOrders / Math.max(1, activeVendors)) * 5);

    return [
      {
        type: 'marketplace',
        title: 'Marketplace Health Index',
        description: `${totalOrders} orders fulfilled, ${totalRevenue.toFixed(2)} total revenue, ${revenuePerUser.toFixed(2)} revenue per active user.`,
        severity: 'important',
        confidence: 90,
        evidence: [
          { metric: 'fulfilled_orders', value: totalOrders, direction: 'up' },
          { metric: 'revenue_per_user', value: revenuePerUser, direction: revenuePerUser > 0 ? 'up' : 'down' },
          { metric: 'liquidity_score', value: liquidityScore, direction: liquidityScore > 50 ? 'up' : 'down' },
        ],
      },
      {
        type: 'marketplace',
        title: 'RFQ Fill Rate',
        description: `${quoteFillRate.toFixed(1)}% of quotations are accepted. ${acceptedQuotes.length} of ${quotes.length} quotes converted.`,
        severity: quoteFillRate < 30 ? 'critical' : 'info',
        confidence: 85,
        evidence: [
          { metric: 'quote_fill_rate', value: quoteFillRate, direction: quoteFillRate > 50 ? 'up' : 'down' },
          { metric: 'total_quotes', value: quotes.length, direction: 'flat' },
        ],
      },
      {
        type: 'marketplace',
        title: 'Active Participant Mix',
        description: `${activeUsers} buyers and ${activeVendors} sellers active this month across ${products} product listings.`,
        severity: 'info',
        confidence: 93,
        evidence: [
          { metric: 'active_buyers', value: activeUsers, direction: 'up' },
          { metric: 'active_sellers', value: activeVendors, direction: 'up' },
          { metric: 'product_listings', value: products, direction: 'flat' },
        ],
      },
    ];
  }

  async generateSellerInsights() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [reviews, currentOrders, lastOrders] = await Promise.all([
      Review.find({ createdAt: { $gte: lastMonthStart } }).lean(),
      Order.find({ createdAt: { $gte: monthStart } }).lean(),
      Order.find({ createdAt: { $gte: lastMonthStart, $lt: monthStart } }).lean(),
    ]);

    const ratings = reviews.filter(r => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
    const currentDelivered = currentOrders.filter(o => o.status === 'delivered');
    const allCurrent = currentOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));
    const fulfillmentRate = allCurrent.length > 0 ? (currentDelivered.length / allCurrent.length) * 100 : 0;
    const lastDelivered = lastOrders.filter(o => o.status === 'delivered');
    const fulfillmentGrowth = lastDelivered.length > 0 ? ((currentDelivered.length - lastDelivered.length) / lastDelivered.length) * 100 : 0;

    const orderUserMap = {};
    for (const o of currentDelivered) {
      const uid = o.user?.toString();
      if (uid) orderUserMap[uid] = (orderUserMap[uid] || 0) + 1;
    }
    const repeatBuyers = Object.values(orderUserMap).filter(c => c > 1).length;
    const uniqueBuyers = Object.keys(orderUserMap).length;
    const repeatRate = uniqueBuyers > 0 ? (repeatBuyers / uniqueBuyers) * 100 : 0;

    return [
      {
        type: 'seller',
        title: 'Seller Performance Score',
        description: `Average seller rating ${avgRating.toFixed(2)}/5 across ${ratings.length} reviews.`,
        severity: avgRating < 3 ? 'critical' : avgRating < 4 ? 'important' : 'info',
        confidence: 88,
        evidence: [
          { metric: 'average_rating', value: avgRating, direction: avgRating >= 4 ? 'up' : 'down' },
          { metric: 'total_reviews', value: reviews.length, direction: reviews.length > 0 ? 'up' : 'flat' },
        ],
      },
      {
        type: 'seller',
        title: 'Fulfillment Rate',
        description: `${fulfillmentRate.toFixed(1)}% fulfillment rate (${fulfillmentGrowth >= 0 ? '+' : ''}${fulfillmentGrowth.toFixed(1)}% vs last month).`,
        severity: fulfillmentRate < 80 ? 'critical' : 'important',
        confidence: 90,
        evidence: [
          { metric: 'fulfillment_rate', value: fulfillmentRate, change: fulfillmentGrowth, direction: fulfillmentGrowth >= 0 ? 'up' : 'down' },
          { metric: 'delivered_count', value: currentDelivered.length, direction: 'up' },
        ],
      },
      {
        type: 'seller',
        title: 'Repeat Order Rate',
        description: `${repeatRate.toFixed(1)}% of buyers placed repeat orders (${repeatBuyers} of ${uniqueBuyers}).`,
        severity: repeatRate > 30 ? 'info' : 'important',
        confidence: 82,
        evidence: [
          { metric: 'repeat_order_rate', value: repeatRate, direction: repeatRate > 20 ? 'up' : 'down' },
          { metric: 'repeat_buyers', value: repeatBuyers, direction: 'up' },
        ],
      },
    ];
  }

  async generateBuyerInsights() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [orders, reviews, allOrders] = await Promise.all([
      Order.find({ createdAt: { $gte: monthStart } }).lean(),
      Review.find().lean(),
      Order.find().lean(),
    ]);

    const orderUsers = new Set(orders.map(o => o.user?.toString()).filter(Boolean));
    const avgOrdersPerBuyer = orderUsers.size > 0 ? orders.length / orderUsers.size : 0;
    const reviewScores = reviews.filter(r => r.rating);
    const avgReviewScore = reviewScores.length > 0 ? reviewScores.reduce((s, r) => s + r.rating, 0) / reviewScores.length : 0;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const returnRate = orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0;
    const uniqueBuyers = new Set(allOrders.map(o => o.user?.toString()).filter(Boolean));
    const activeBuyers = new Set(orders.map(o => o.user?.toString()).filter(Boolean));
    const retentionRate = uniqueBuyers.size > 0 ? (activeBuyers.size / uniqueBuyers.size) * 100 : 0;

    return [
      {
        type: 'buyer',
        title: 'Buyer Order Frequency',
        description: `Average ${avgOrdersPerBuyer.toFixed(2)} orders per buyer this month across ${orderUsers.size} active buyers.`,
        severity: 'info',
        confidence: 87,
        evidence: [
          { metric: 'avg_orders_per_buyer', value: avgOrdersPerBuyer, direction: avgOrdersPerBuyer > 1 ? 'up' : 'flat' },
          { metric: 'active_buyers', value: orderUsers.size, direction: orderUsers.size > 0 ? 'up' : 'down' },
        ],
      },
      {
        type: 'buyer',
        title: 'Buyer Satisfaction Score',
        description: `Average review score ${avgReviewScore.toFixed(2)}/5 across ${reviews.length} reviews.`,
        severity: avgReviewScore < 3 ? 'critical' : 'important',
        confidence: 85,
        evidence: [
          { metric: 'average_review_score', value: avgReviewScore, direction: avgReviewScore >= 4 ? 'up' : 'down' },
          { metric: 'total_reviews', value: reviews.length, direction: reviews.length > 0 ? 'up' : 'flat' },
        ],
      },
      {
        type: 'buyer',
        title: 'Return Rate Analysis',
        description: `${returnRate.toFixed(1)}% order cancellation rate (${cancelledOrders.length} of ${orders.length} orders).`,
        severity: returnRate > 15 ? 'critical' : returnRate > 5 ? 'important' : 'info',
        confidence: 90,
        evidence: [
          { metric: 'cancellation_rate', value: returnRate, direction: returnRate > 5 ? 'down' : 'flat' },
          { metric: 'cancelled_orders', value: cancelledOrders.length, direction: 'down' },
        ],
      },
      {
        type: 'buyer',
        title: 'Buyer Retention Rate',
        description: `${retentionRate.toFixed(1)}% of all-time buyers remain active (${activeBuyers.size} of ${uniqueBuyers.size}).`,
        severity: retentionRate < 20 ? 'critical' : retentionRate < 40 ? 'important' : 'info',
        confidence: 83,
        evidence: [
          { metric: 'retention_rate', value: retentionRate, direction: retentionRate > 30 ? 'up' : 'down' },
          { metric: 'active_buyers', value: activeBuyers.size, direction: 'up' },
        ],
      },
    ];
  }

  async generateOperationsInsights() {
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [recentOrders, telemetry] = await Promise.all([
      Order.find({ createdAt: { $gte: weekStart } }).lean(),
      TelemetryEvent.aggregate([
        { $match: { timestamp: { $gte: weekStart } } },
        { $group: { _id: '$type', avgValue: { $avg: '$value' }, maxValue: { $max: '$value' }, count: { $sum: 1 } } },
      ]),
    ]);

    const cycleTimes = recentOrders
      .filter(o => o.status === 'delivered' && o.createdAt && o.updatedAt)
      .map(o => (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60));
    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((s, t) => s + t, 0) / cycleTimes.length : 0;
    const errorTelemetry = telemetry.filter(t => t._id.includes('error') || t._id.includes('latency'));
    const avgErrorRate = errorTelemetry.length > 0 ? errorTelemetry.reduce((s, t) => s + t.avgValue, 0) / errorTelemetry.length : 0;
    const pendingOrders = recentOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

    return [
      {
        type: 'operations',
        title: 'Order Processing Cycle Time',
        description: `Average ${avgCycleTime.toFixed(1)} hours from order to delivery (${cycleTimes.length} orders).`,
        severity: avgCycleTime > 72 ? 'critical' : avgCycleTime > 48 ? 'important' : 'info',
        confidence: 89,
        evidence: [
          { metric: 'avg_cycle_time_hours', value: avgCycleTime, direction: avgCycleTime < 48 ? 'up' : 'down' },
          { metric: 'completed_orders_sampled', value: cycleTimes.length, direction: 'flat' },
        ],
      },
      {
        type: 'operations',
        title: 'Error Rate Monitoring',
        description: `Average error/latency metric ${avgErrorRate.toFixed(2)} across ${errorTelemetry.length} telemetry categories.`,
        severity: avgErrorRate > 5 ? 'critical' : avgErrorRate > 2 ? 'important' : 'info',
        confidence: 82,
        evidence: [
          { metric: 'avg_error_rate', value: avgErrorRate, direction: avgErrorRate > 2 ? 'down' : 'flat' },
          { metric: 'telemetry_categories', value: telemetry.length, direction: 'flat' },
        ],
      },
      {
        type: 'operations',
        title: 'Queue Depth Alert',
        description: `${pendingOrders} orders pending or confirmed (awaiting processing).`,
        severity: pendingOrders > 50 ? 'critical' : pendingOrders > 20 ? 'important' : 'info',
        confidence: 95,
        evidence: [
          { metric: 'pending_orders', value: pendingOrders, direction: pendingOrders > 20 ? 'down' : 'flat' },
        ],
      },
    ];
  }

  async generateFinancialInsights() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [currentOrders, lastOrders, vendors, products] = await Promise.all([
      Order.find({ createdAt: { $gte: monthStart } }).lean(),
      Order.find({ createdAt: { $gte: lastMonthStart, $lt: monthStart } }).lean(),
      Vendor.find({ isActive: true }).lean(),
      Product.find({ isActive: true }).lean(),
    ]);

    const deliveredCurrent = currentOrders.filter(o => o.status === 'delivered');
    const deliveredLast = lastOrders.filter(o => o.status === 'delivered');
    const currentRevenue = deliveredCurrent.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const lastRevenue = deliveredLast.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0;
    const avgOrderValue = deliveredCurrent.length > 0 ? currentRevenue / deliveredCurrent.length : 0;
    const totalProducts = products.length;
    const productCostRatio = totalProducts > 0 ? vendors.length / totalProducts : 0;

    return [
      {
        type: 'financial',
        title: 'Revenue Performance',
        description: `${currentRevenue.toFixed(2)} total revenue this month (${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% MoM).`,
        severity: revenueGrowth < -20 ? 'critical' : revenueGrowth < 0 ? 'important' : 'info',
        confidence: 93,
        evidence: [
          { metric: 'monthly_revenue', value: currentRevenue, change: currentRevenue - lastRevenue, direction: revenueGrowth >= 0 ? 'up' : 'down' },
          { metric: 'revenue_growth_mom', value: revenueGrowth, direction: revenueGrowth >= 0 ? 'up' : 'down' },
        ],
      },
      {
        type: 'financial',
        title: 'Average Order Value',
        description: `Average order value is ${avgOrderValue.toFixed(2)} across ${deliveredCurrent.length} completed orders.`,
        severity: 'info',
        confidence: 87,
        evidence: [
          { metric: 'avg_order_value', value: avgOrderValue, direction: avgOrderValue > 0 ? 'up' : 'flat' },
          { metric: 'completed_orders', value: deliveredCurrent.length, direction: 'up' },
        ],
      },
      {
        type: 'financial',
        title: 'Marketplace Efficiency Ratio',
        description: `${vendors.length} active vendors serving ${totalProducts} products (${productCostRatio.toFixed(2)} vendors per product).`,
        severity: 'info',
        confidence: 80,
        evidence: [
          { metric: 'active_vendors', value: vendors.length, direction: 'up' },
          { metric: 'active_products', value: totalProducts, direction: 'up' },
        ],
      },
    ];
  }

  async getInsights(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.severity) query.severity = filters.severity;
    const sort = filters.sort || { generatedAt: -1 };
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      EnterpriseInsight.find(query).sort(sort).skip(skip).limit(limit).lean(),
      EnterpriseInsight.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async acknowledgeInsight(userId, id) {
    const insight = await EnterpriseInsight.findByIdAndUpdate(
      id,
      { status: 'acknowledged' },
      { new: true }
    );
    if (!insight) throw new Error('Insight not found');
    await logAuditEvent({
      userId,
      action: 'acknowledge_insight',
      category: 'enterprise_insights',
      entityType: 'EnterpriseInsight',
      entityId: id,
      description: `Acknowledged insight: ${insight.title}`,
      status: 'success',
    });
    return insight;
  }

  async dismissInsight(userId, id) {
    const insight = await EnterpriseInsight.findByIdAndUpdate(
      id,
      { status: 'dismissed' },
      { new: true }
    );
    if (!insight) throw new Error('Insight not found');
    await logAuditEvent({
      userId,
      action: 'dismiss_insight',
      category: 'enterprise_insights',
      entityType: 'EnterpriseInsight',
      entityId: id,
      description: `Dismissed insight: ${insight.title}`,
      status: 'success',
    });
    return insight;
  }

  async getInsightsDashboard() {
    const [allExecutive, allMarketplace, allSeller, allBuyer, allOperations, allFinancial, latestInsights] = await Promise.all([
      this.generateExecutiveInsights(),
      this.generateMarketplaceInsights(),
      this.generateSellerInsights(),
      this.generateBuyerInsights(),
      this.generateOperationsInsights(),
      this.generateFinancialInsights(),
      EnterpriseInsight.find().sort({ generatedAt: -1 }).limit(10).lean(),
    ]);
    const allGenerated = [...allExecutive, ...allMarketplace, ...allSeller, ...allBuyer, ...allOperations, ...allFinancial];
    const criticalCount = allGenerated.filter(i => i.severity === 'critical').length;
    const importantCount = allGenerated.filter(i => i.severity === 'important').length;
    return {
      summary: {
        totalInsights: allGenerated.length,
        criticalCount,
        importantCount,
        infoCount: allGenerated.filter(i => i.severity === 'info').length,
        categories: {
          executive: allExecutive.length,
          marketplace: allMarketplace.length,
          seller: allSeller.length,
          buyer: allBuyer.length,
          operations: allOperations.length,
          financial: allFinancial.length,
        },
      },
      insights: {
        executive: allExecutive,
        marketplace: allMarketplace,
        seller: allSeller,
        buyer: allBuyer,
        operations: allOperations,
        financial: allFinancial,
      },
      recentInsights: latestInsights,
      generatedAt: new Date(),
    };
  }
}

export default new EnterpriseInsightsService();
