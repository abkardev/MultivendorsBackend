import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import { logAuditEvent } from './auditService.js';

class DigitalTwinService {
  async getTwinSnapshot() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [totalOrders, recentOrders, totalRevenue, recentRevenue,
      totalBuyers, totalSuppliers, totalProducts, activeProducts,
      totalReviews, avgRating, pendingDisputes, recentDisputes,
      growthRate, newBuyers, newSuppliers] = await Promise.all([
      EscrowOrder.countDocuments(),
      EscrowOrder.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      EscrowOrder.aggregate([{ $match: { status: { $in: ['completed', 'delivered', 'in_escrow'] } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      EscrowOrder.aggregate([{ $match: { createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      User.countDocuments({ role: 'user', isActive: true }),
      Vendor.countDocuments({ isActive: true }),
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Review.countDocuments({ moderationStatus: 'approved' }),
      Review.aggregate([{ $match: { moderationStatus: 'approved' } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Dispute.countDocuments({ status: 'open' }),
      Dispute.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getTime() - 60 * 86400000) } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ role: 'user', isActive: true, createdAt: { $gte: thirtyDaysAgo } }),
      Vendor.countDocuments({ isActive: true, createdAt: { $gte: thirtyDaysAgo } }),
    ]);

    const rev = recentRevenue[0]?.total || 0;
    const prevRev = (totalRevenue[0]?.total || 0) - rev;
    const growthPct = prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : 0;

    const ordersLast60 = growthRate[0];
    const { orderCount: prevOrders, revenue: prevRevenue } = ordersLast60 || { count: 0, revenue: 0 };

    const riskScore = this._calculateRiskScore({
      pendingDisputes, recentDisputes, avgRating: avgRating[0]?.avg || 0,
      activeProducts, totalProducts,
    });

    return {
      timestamp: now.toISOString(),
      orders: {
        total: totalOrders,
        last30Days: recentOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        revenueLast30Days: rev,
        growthRate: Math.round(growthPct * 100) / 100,
        averageOrderValue: recentOrders > 0 ? Math.round(rev / recentOrders * 100) / 100 : 0,
      },
      suppliers: { total: totalSuppliers, newLast30Days: newSuppliers, activeRate: totalSuppliers > 0 ? Math.round((totalSuppliers / totalSuppliers) * 100) : 0 },
      buyers: { total: totalBuyers, newLast30Days: newBuyers, totalProducts },
      revenue: { total: totalRevenue[0]?.total || 0, last30Days: rev, monthlyGrowth: Math.round(growthPct * 100) / 100 },
      growth: {
        orderGrowth: prevOrders > 0 ? Math.round(((recentOrders - prevOrders) / prevOrders) * 10000) / 100 : 0,
        revenueGrowth: prevRevenue > 0 ? Math.round(((rev - prevRevenue) / prevRevenue) * 10000) / 100 : 0,
      },
      risk: riskScore,
      marketplaceHealth: this._computeHealthScore({
        avgRating: avgRating[0]?.avg || 0,
        pendingDisputes,
        activeProducts,
        totalProducts,
        growthPct,
        totalBuyers,
        totalSuppliers,
      }),
    };
  }

  async getTwinHistory(days = 30) {
    const startDate = new Date(Date.now() - days * 86400000);
    const orders = await EscrowOrder.find({ createdAt: { $gte: startDate } }).sort({ createdAt: 1 }).lean();

    const dailySnapshots = {};
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      if (!dailySnapshots[day]) {
        dailySnapshots[day] = { date: day, orders: 0, revenue: 0, disputes: 0, completed: 0 };
      }
      dailySnapshots[day].orders += 1;
      dailySnapshots[day].revenue += o.totalAmount || 0;
      if (o.status === 'completed' || o.status === 'delivered') dailySnapshots[day].completed += 1;
      if (o.status === 'disputed') dailySnapshots[day].disputes += 1;
    }

    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000).toISOString().slice(0, 10);
      dates.push(d);
    }

    return {
      period: `${days}d`,
      snapshots: dates.map(d => dailySnapshots[d] || { date: d, orders: 0, revenue: 0, disputes: 0, completed: 0 }),
      totalOrders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
    };
  }

  async simulateScenario(type, params = {}) {
    const snapshot = await this.getTwinSnapshot();
    let simulated;

    switch (type) {
      case 'increase_commission': {
        const commissionChange = params.percent || 2;
        const currentRevenue = snapshot.revenue.last30Days;
        const newRevenue = currentRevenue * (1 + commissionChange / 100);
        const expectedDrop = commissionChange * 0.3;
        simulated = {
          scenario: `Increase commission by ${commissionChange}%`,
          currentRevenue,
          projectedRevenue: Math.round(newRevenue * (1 - expectedDrop / 100)),
          revenueImpact: Math.round((newRevenue * (1 - expectedDrop / 100) - currentRevenue) * 100) / 100,
          expectedOrderDrop: `${Math.round(expectedDrop)}%`,
          riskLevel: commissionChange > 5 ? 'high' : 'medium',
          recommendation: commissionChange > 5
            ? 'Consider phasing the increase over multiple months'
            : 'Acceptable commission adjustment',
        };
        break;
      }
      case 'add_suppliers': {
        const newSuppliers = params.count || 10;
        const currentSuppliers = snapshot.suppliers.total;
        const expectedVolumeIncrease = newSuppliers * 0.05;
        simulated = {
          scenario: `Add ${newSuppliers} new suppliers`,
          currentSuppliers,
          projectedSuppliers: currentSuppliers + newSuppliers,
          expectedVolumeIncrease: `${Math.round(expectedVolumeIncrease * 100)}%`,
          estimatedRevenueImpact: Math.round(snapshot.revenue.last30Days * expectedVolumeIncrease),
          timeToImpact: '30-60 days',
        };
        break;
      }
      case 'promotion_campaign': {
        const discount = params.discount || 10;
        const expectedUplift = discount * 2.5;
        const currentOrders = snapshot.orders.last30Days;
        simulated = {
          scenario: `${discount}% discount promotion`,
          expectedOrderUplift: `${Math.round(expectedUplift)}%`,
          projectedOrders: Math.round(currentOrders * (1 + expectedUplift / 100)),
          projectedRevenue: Math.round(snapshot.revenue.last30Days * (1 + expectedUplift / 100) * (1 - discount / 100)),
          marginImpact: `-${discount}% margin per order`,
          recommendation: discount > 20 ? 'Deep discounts may harm brand perception' : 'Standard promotional range',
        };
        break;
      }
      case 'improve_ratings': {
        const targetRating = params.targetRating || 4.5;
        const currentRating = snapshot.risk?.avgRating || 4;
        const expectedOrderIncrease = Math.min(30, (targetRating - currentRating) * 20);
        simulated = {
          scenario: `Improve ratings from ${currentRating.toFixed(1)} to ${targetRating}`,
          currentRating,
          targetRating,
          expectedOrderIncrease: `${Math.round(expectedOrderIncrease)}%`,
          estimatedTimeline: '2-3 months',
          keyDrivers: ['Product quality', 'Customer service', 'Delivery speed', 'Packaging'],
        };
        break;
      }
      default: {
        simulated = {
          scenario: type,
          params,
          impact: 'Under analysis',
          confidence: 'medium',
        };
      }
    }

    await logAuditEvent({
      action: 'run_simulation',
      category: 'executive',
      entityType: 'DigitalTwin',
      description: `Scenario simulation: ${type}`,
      newValue: { type, params, simulated },
    });

    return {
      type,
      params,
      currentState: {
        totalOrders: snapshot.orders.total,
        totalRevenue: snapshot.revenue.total,
        activeSuppliers: snapshot.suppliers.total,
        activeBuyers: snapshot.buyers.total,
      },
      simulated,
      timestamp: new Date().toISOString(),
    };
  }

  async getCapacityPlan() {
    const [totalOrders, activeVendors, activeProducts, totalBuyers] = await Promise.all([
      EscrowOrder.countDocuments({ status: { $in: ['pending', 'in_escrow', 'shipped'] } }),
      Vendor.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'user', isActive: true }),
    ]);

    const avgDailyOrders = await EscrowOrder.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
    }) / 30;

    return {
      currentLoad: {
        activeOrders: totalOrders,
        dailyOrderRate: Math.round(avgDailyOrders * 10) / 10,
        activeVendors,
        activeProducts,
        totalBuyers,
      },
      capacity: {
        vendorCapacity: Math.round(activeVendors * 50),
        orderCapacity: Math.round(activeVendors * 200),
        headroom: Math.round(activeVendors * 200 - totalOrders),
      },
      recommendations: [
        totalOrders > activeVendors * 100 && `Consider onboarding ${Math.ceil(totalOrders / 100 - activeVendors)} more vendors`,
        activeProducts < 1000 && 'Expand product catalog to improve buyer engagement',
        totalBuyers < 100 && 'Focus on buyer acquisition to balance marketplace',
      ].filter(Boolean),
      projectedGrowth: {
        nextMonth: Math.round(avgDailyOrders * 30 * 1.1),
        nextQuarter: Math.round(avgDailyOrders * 90 * 1.25),
      },
    };
  }

  async getGrowthForecast() {
    const snap = await this.getTwinSnapshot();
    const monthlyGrowth = snap.growth.revenueGrowth || 10;
    const baseRevenue = snap.revenue.last30Days || 0;

    return {
      currentMonthlyRevenue: baseRevenue,
      monthlyGrowthRate: monthlyGrowth,
      forecast: {
        nextMonth: Math.round(baseRevenue * (1 + monthlyGrowth / 100)),
        nextQuarter: Math.round(baseRevenue * Math.pow(1 + monthlyGrowth / 100, 3)),
        nextYear: Math.round(baseRevenue * Math.pow(1 + monthlyGrowth / 100, 12)),
      },
      confidence: Math.abs(monthlyGrowth) < 5 ? 'high' : Math.abs(monthlyGrowth) < 15 ? 'medium' : 'low',
      assumptions: [
        'Current growth rate remains constant',
        'No major market disruptions',
        'Seasonal variations may apply',
      ],
    };
  }

  async getMarketplaceHealth() {
    return this._computeHealthScore(await this.getTwinSnapshot());
  }

  _calculateRiskScore(data) {
    let score = 0;
    if (data.pendingDisputes > 10) score += 30;
    else if (data.pendingDisputes > 5) score += 15;
    if (data.recentDisputes > 5) score += 20;
    if ((data.avgRating || 4) < 3.5) score += 25;
    else if ((data.avgRating || 4) < 4) score += 10;
    if (data.activeProducts < data.totalProducts * 0.5) score += 15;
    return {
      score: Math.min(100, score),
      level: score < 20 ? 'low' : score < 50 ? 'medium' : 'high',
      factors: {
        pendingDisputes: data.pendingDisputes,
        recentDisputes: data.recentDisputes,
        averageRating: data.avgRating || 0,
        activeProductRatio: data.totalProducts > 0 ? data.activeProducts / data.totalProducts : 0,
      },
    };
  }

  _computeHealthScore(data) {
    const rating = (data.avgRating || 4) / 5 * 25;
    const disputeScore = Math.max(0, 20 - (data.pendingDisputes || 0) * 2);
    const productScore = data.totalProducts > 0 ? (data.activeProducts || 0) / data.totalProducts * 20 : 15;
    const growth = Math.min(20, Math.max(0, (data.growthPct || 0) + 20));
    const participation = Math.min(15, ((data.totalBuyers || 0) / Math.max(1, data.totalSuppliers || 1)) * 3);

    const totalScore = Math.round(Math.min(100, rating + disputeScore + productScore + growth + participation));
    return {
      score: totalScore,
      grade: totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : totalScore >= 40 ? 'C' : 'D',
      status: totalScore >= 60 ? 'healthy' : totalScore >= 40 ? 'fair' : 'critical',
      components: { rating: Math.round(rating), disputes: Math.round(disputeScore), products: Math.round(productScore), growth: Math.round(growth), participation: Math.round(participation) },
    };
  }
}

export const digitalTwinService = new DigitalTwinService();
