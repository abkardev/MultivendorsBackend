import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';
import { logAuditEvent } from '../services/auditService.js';

const BENCHMARK_PROCUREMENT_CYCLE_HOURS = 72;
const BENCHMARK_COST_PER_UNIT = 100;
const BENCHMARK_REVIEW_RATING = 4.0;
const BENCHMARK_DISPUTE_RATE = 0.05;
const BENCHMARK_ON_TIME_DELIVERY = 0.9;
const BENCHMARK_BUDGET_UTILIZATION = 0.85;

class ExecutiveScorecardService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
  }

  async getScorecard(userId) {
    const cacheKey = `scorecard_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const data = await this.collectData(userId);
    const scorecard = this.calculateScorecard(data);

    this.cache.set(cacheKey, { data: scorecard, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'generate_scorecard',
      category: 'executive',
      entityType: 'ExecutiveScorecard',
      entityId: userId,
      description: 'Generated executive scorecard',
      status: 'success',
    });

    return scorecard;
  }

  async getScorecardByDepartment(departmentId) {
    const orders = await Order.find({ department: departmentId }).lean();
    if (!orders.length) return this.emptyScorecard();

    const userIds = [...new Set(orders.map(o => o.buyer?.toString() || o.user?.toString()).filter(Boolean))];
    const allData = await Promise.all(userIds.map(uid => this.collectData(uid)));
    const mergedData = this.mergeData(allData);

    return this.calculateScorecard(mergedData);
  }

  async getScorecardByCategory(categoryId) {
    const products = await Product.find({ category: categoryId }).lean();
    const productIds = products.map(p => p._id);

    const orders = await Order.find({ 'items.product': { $in: productIds } }).lean();
    if (!orders.length) return this.emptyScorecard();

    const userIds = [...new Set(orders.map(o => o.buyer?.toString() || o.user?.toString()).filter(Boolean))];
    const allData = await Promise.all(userIds.map(uid => this.collectData(uid)));
    const mergedData = this.mergeData(allData);

    return this.calculateScorecard(mergedData);
  }

  async collectData(userId) {
    const [orders, reviews, disputes, vendors] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').lean(),
      Review.find({ user: userId }).lean(),
      Dispute.find({ buyer: userId }).lean(),
      Vendor.find({}).lean(),
    ]);

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');

    const totalSpend = completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);

    const cycleTimes = completedOrders.map(o => {
      const created = new Date(o.createdAt).getTime();
      const delivered = o.updatedAt ? new Date(o.updatedAt).getTime() : Date.now();
      return (delivered - created) / (1000 * 60 * 60);
    }).filter(t => t > 0);

    const avgCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

    const avgReviewRating = reviews.length > 0 ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length : 0;

    const disputeRate = orders.length > 0 ? disputes.length / orders.length : 0;

    const onTimeDeliveries = completedOrders.filter(o => {
      if (o.shippingDetails?.actualDeliveryDate && o.shippingDetails?.estimatedDelivery) {
        return new Date(o.shippingDetails.actualDeliveryDate) <= new Date(o.shippingDetails.estimatedDelivery);
      }
      return o.status === 'delivered' || o.status === 'completed';
    });

    const onTimeRate = completedOrders.length > 0 ? onTimeDeliveries.length / completedOrders.length : 0;

    const avgOrderValue = completedOrders.length > 0 ? totalSpend / completedOrders.length : 0;

    const budgetAssumptions = { allocated: Math.max(totalSpend * 1.2, 100000) };
    const budgetUtilization = budgetAssumptions.allocated > 0 ? totalSpend / budgetAssumptions.allocated : 0;

    return {
      totalOrders: orders.length,
      completedOrders,
      pendingOrders,
      totalSpend,
      avgCycleTime,
      avgReviewRating,
      disputeRate,
      onTimeRate,
      avgOrderValue,
      budgetUtilization,
      budgetAllocated: budgetAssumptions.allocated,
      ordersCount: completedOrders.length,
    };
  }

  mergeData(dataArray) {
    const merged = {
      totalOrders: 0,
      completedOrders: [],
      pendingOrders: [],
      totalSpend: 0,
      avgCycleTime: 0,
      avgReviewRating: 0,
      disputeRate: 0,
      onTimeRate: 0,
      avgOrderValue: 0,
      budgetUtilization: 0,
      budgetAllocated: 0,
      ordersCount: 0,
    };

    let totalCycleTime = 0;
    let totalCycleCount = 0;
    let totalRating = 0;
    let totalRatingCount = 0;
    let totalDisputes = 0;
    let totalCompleted = 0;
    let totalOnTime = 0;

    for (const d of dataArray) {
      merged.totalOrders += d.totalOrders;
      merged.completedOrders.push(...d.completedOrders);
      merged.pendingOrders.push(...d.pendingOrders);
      merged.totalSpend += d.totalSpend;
      totalCycleTime += d.avgCycleTime * d.ordersCount;
      totalCycleCount += d.ordersCount;
      totalRating += d.avgReviewRating * d.ordersCount;
      totalRatingCount += d.ordersCount;
      totalDisputes += d.disputeRate * d.totalOrders;
      totalCompleted += d.ordersCount;
      totalOnTime += d.onTimeRate * d.ordersCount;
      merged.budgetAllocated += d.budgetAllocated;
    }

    merged.ordersCount = totalCompleted;
    merged.totalOrders = dataArray.reduce((s, d) => s + d.totalOrders, 0);
    merged.avgCycleTime = totalCycleCount > 0 ? totalCycleTime / totalCycleCount : 0;
    merged.avgReviewRating = totalRatingCount > 0 ? totalRating / totalRatingCount : 0;
    merged.disputeRate = merged.totalOrders > 0 ? totalDisputes / merged.totalOrders : 0;
    merged.onTimeRate = totalCompleted > 0 ? totalOnTime / totalCompleted : 0;
    merged.avgOrderValue = merged.ordersCount > 0 ? merged.totalSpend / merged.ordersCount : 0;
    merged.budgetUtilization = merged.budgetAllocated > 0 ? merged.totalSpend / merged.budgetAllocated : 0;

    return merged;
  }

  calculateScorecard(data) {
    const procurementEfficiency = this.calcProcurementEfficiency(data);
    const costOptimization = this.calcCostOptimization(data);
    const supplierQuality = this.calcSupplierQuality(data);
    const riskManagement = this.calcRiskManagement(data);
    const deliveryPerformance = this.calcDeliveryPerformance(data);
    const budgetCompliance = this.calcBudgetCompliance(data);

    const dimensions = {
      procurementEfficiency,
      costOptimization,
      supplierQuality,
      riskManagement,
      deliveryPerformance,
      budgetCompliance,
    };

    const overallScore = Math.round(
      Object.values(dimensions).reduce((sum, d) => sum + d.score, 0) / Object.keys(dimensions).length
    );

    const periodComparison = this.calculatePeriodComparison(data);

    return {
      ...dimensions,
      overallScore,
      periodComparison,
    };
  }

  calcProcurementEfficiency(data) {
    const score = data.avgCycleTime > 0
      ? Math.min(100, Math.max(0, Math.round((1 - (data.avgCycleTime - BENCHMARK_PROCUREMENT_CYCLE_HOURS) / BENCHMARK_PROCUREMENT_CYCLE_HOURS) * 100)))
      : 0;
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 80,
      recommendations: score < 60 ? ['Reduce procurement cycle time by automating approvals', 'Implement parallel vendor evaluations'] : [],
    };
  }

  calcCostOptimization(data) {
    const marketAvgPrice = data.avgOrderValue > 0 ? data.avgOrderValue * 1.15 : BENCHMARK_COST_PER_UNIT;
    const ratio = data.avgOrderValue > 0 ? marketAvgPrice / data.avgOrderValue : 1;
    const score = Math.min(100, Math.max(0, Math.round(ratio * 50)));
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 75,
      recommendations: score < 60 ? ['Consolidate orders for volume discounts', 'Explore alternative suppliers for better pricing'] : [],
    };
  }

  calcSupplierQuality(data) {
    const score = data.avgReviewRating > 0
      ? Math.min(100, Math.round((data.avgReviewRating / 5) * 100))
      : 0;
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 80,
      recommendations: score < 60 ? ['Review underperforming suppliers', 'Implement supplier development programs'] : [],
    };
  }

  calcRiskManagement(data) {
    const score = Math.min(100, Math.max(0, Math.round((1 - data.disputeRate / BENCHMARK_DISPUTE_RATE) * 100)));
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 85,
      recommendations: score < 60 ? ['Strengthen supplier qualification criteria', 'Use escrow for all high-value orders'] : [],
    };
  }

  calcDeliveryPerformance(data) {
    const score = Math.min(100, Math.round((data.onTimeRate / BENCHMARK_ON_TIME_DELIVERY) * 100));
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 85,
      recommendations: score < 60 ? ['Add delivery SLA clauses to contracts', 'Track and report carrier performance'] : [],
    };
  }

  calcBudgetCompliance(data) {
    const ratio = data.budgetUtilization;
    const score = Math.min(100, Math.max(0, Math.round((1 - Math.abs(ratio - BENCHMARK_BUDGET_UTILIZATION)) * 100)));
    return {
      score,
      trend: score > 70 ? 'up' : score > 40 ? 'stable' : 'down',
      benchmark: 85,
      recommendations: score < 60 ? ['Review budget allocation against actual spend', 'Implement quarterly budget reviews'] : [],
    };
  }

  calculatePeriodComparison(data) {
    return {
      previous: Math.round(data.totalSpend * 0.85),
      change: Math.round(data.totalSpend * 0.15),
      changePercent: 15,
    };
  }

  emptyScorecard() {
    return {
      procurementEfficiency: { score: 0, trend: 'stable', benchmark: 80, recommendations: ['No data available'] },
      costOptimization: { score: 0, trend: 'stable', benchmark: 75, recommendations: ['No data available'] },
      supplierQuality: { score: 0, trend: 'stable', benchmark: 80, recommendations: ['No data available'] },
      riskManagement: { score: 0, trend: 'stable', benchmark: 85, recommendations: ['No data available'] },
      deliveryPerformance: { score: 0, trend: 'stable', benchmark: 85, recommendations: ['No data available'] },
      budgetCompliance: { score: 0, trend: 'stable', benchmark: 85, recommendations: ['No data available'] },
      overallScore: 0,
      periodComparison: { previous: 0, change: 0, changePercent: 0 },
    };
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`scorecard_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new ExecutiveScorecardService();
