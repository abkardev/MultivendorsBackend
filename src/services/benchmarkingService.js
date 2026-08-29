import mongoose from 'mongoose';
import { BenchmarkReport } from '../models/BenchmarkReport.js';
import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import { logAuditEvent } from './auditService.js';

class BenchmarkingService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000;
  }

  async collectPeriodMetrics(start, end) {
    const [orders, totalUsers, totalVendors, totalProducts, reviews] = await Promise.all([
      Order.find({ createdAt: { $gte: start, $lt: end } }).lean(),
      User.countDocuments({ isActive: true, createdAt: { $lt: end } }),
      Vendor.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Review.find({ createdAt: { $gte: start, $lt: end } }).lean(),
    ]);
    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    const ratings = reviews.filter(r => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0;
    const activeUsers = new Set(orders.map(o => o.user?.toString()).filter(Boolean)).size;
    const cancellationRate = orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0;
    const newUsers = await User.countDocuments({ createdAt: { $gte: start, $lt: end } });
    const newVendors = await Vendor.countDocuments({ createdAt: { $gte: start, $lt: end } });

    return {
      orderCount: orders.length,
      completedOrderCount: completedOrders.length,
      totalRevenue,
      avgOrderValue,
      pendingOrderCount: pendingOrders.length,
      cancelledOrderCount: cancelledOrders.length,
      cancellationRate,
      activeUserCount: activeUsers,
      totalUsers,
      newUsers,
      totalVendors,
      newVendors,
      totalProducts,
      reviewCount: reviews.length,
      avgRating,
    };
  }

  computeGrowth(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  buildCategories(currentMetrics, previousMetrics) {
    const categories = [];
    const metrics = [
      { name: 'Total Orders', key: 'orderCount', unit: 'orders' },
      { name: 'Completed Orders', key: 'completedOrderCount', unit: 'orders' },
      { name: 'Total Revenue', key: 'totalRevenue', unit: 'currency' },
      { name: 'Average Order Value', key: 'avgOrderValue', unit: 'currency' },
      { name: 'Pending Orders', key: 'pendingOrderCount', unit: 'orders' },
      { name: 'Cancelled Orders', key: 'cancelledOrderCount', unit: 'orders' },
      { name: 'Cancellation Rate', key: 'cancellationRate', unit: 'percent' },
      { name: 'Active Users', key: 'activeUserCount', unit: 'users' },
      { name: 'New Users', key: 'newUsers', unit: 'users' },
      { name: 'Total Users', key: 'totalUsers', unit: 'users' },
      { name: 'New Vendors', key: 'newVendors', unit: 'vendors' },
      { name: 'Total Vendors', key: 'totalVendors', unit: 'vendors' },
      { name: 'Total Products', key: 'totalProducts', unit: 'products' },
      { name: 'Reviews', key: 'reviewCount', unit: 'reviews' },
      { name: 'Average Rating', key: 'avgRating', unit: 'rating' },
    ];
    for (const m of metrics) {
      const currentValue = currentMetrics[m.key];
      const previousValue = previousMetrics ? previousMetrics[m.key] : null;
      const variance = previousValue !== null ? currentValue - previousValue : null;
      const growth = previousValue !== null ? this.computeGrowth(currentValue, previousValue) : null;
      const direction = growth !== null ? (growth > 1 ? 'up' : growth < -1 ? 'down' : 'stable') : 'stable';
      categories.push({
        name: m.name,
        currentValue,
        previousValue,
        variance,
        growth: growth !== null ? Math.round(growth * 100) / 100 : null,
        trend: direction,
        unit: m.unit,
      });
    }
    return categories;
  }

  computeOverallScore(categories) {
    const positive = categories.filter(c => c.trend === 'up' || (c.name === 'Cancellation Rate' && c.trend === 'down'));
    const score = categories.length > 0 ? Math.round((positive.length / categories.length) * 100) : 0;
    const upCount = categories.filter(c => c.trend === 'up').length;
    const downCount = categories.filter(c => c.trend === 'down').length;
    const trend = upCount > downCount ? 'up' : downCount > upCount ? 'down' : 'stable';
    const improved = categories.filter(c => c.name !== 'Pending Orders' && c.name !== 'Cancelled Orders' && c.trend === 'up').length;
    return { score, trend, percentile: score, summary: `${improved}/${categories.length} metrics improved` };
  }

  async generateReport(name, type, periodStart, periodEnd, comparisonStart, comparisonEnd) {
    const currentMetrics = await this.collectPeriodMetrics(periodStart, periodEnd);
    let previousMetrics = null;
    if (comparisonStart && comparisonEnd) {
      previousMetrics = await this.collectPeriodMetrics(comparisonStart, comparisonEnd);
    }
    const categories = this.buildCategories(currentMetrics, previousMetrics);
    const overall = this.computeOverallScore(categories);
    const report = await BenchmarkReport.create({
      name,
      type,
      period: { start: periodStart, end: periodEnd },
      comparisonPeriod: previousMetrics ? { start: comparisonStart, end: comparisonEnd } : undefined,
      categories,
      overall,
      generatedAt: new Date(),
    });
    return report;
  }

  async generateMonthlyBenchmark() {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousEnd = currentStart;
    const report = await this.generateReport(
      `Monthly Benchmark - ${currentStart.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      'monthly',
      currentStart, monthEnd,
      previousStart, previousEnd
    );
    await logAuditEvent({
      action: 'generate_monthly_benchmark',
      category: 'benchmarking',
      entityType: 'BenchmarkReport',
      entityId: report._id.toString(),
      description: `Generated monthly benchmark for ${currentStart.toISOString().slice(0, 7)}`,
      status: 'success',
    });
    return report;
  }

  async generateQuarterlyBenchmark() {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1);
    const previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    const previousEnd = currentStart;
    const report = await this.generateReport(
      `Q${currentQuarter + 1} ${now.getFullYear()} Benchmark`,
      'quarterly',
      currentStart, quarterEnd,
      previousStart, previousEnd
    );
    await logAuditEvent({
      action: 'generate_quarterly_benchmark',
      category: 'benchmarking',
      entityType: 'BenchmarkReport',
      entityId: report._id.toString(),
      description: `Generated quarterly benchmark for Q${currentQuarter + 1} ${now.getFullYear()}`,
      status: 'success',
    });
    return report;
  }

  async generateYearlyBenchmark() {
    const now = new Date();
    const currentStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const previousStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousEnd = currentStart;
    const report = await this.generateReport(
      `${now.getFullYear()} Annual Benchmark`,
      'yearly',
      currentStart, yearEnd,
      previousStart, previousEnd
    );
    await logAuditEvent({
      action: 'generate_yearly_benchmark',
      category: 'benchmarking',
      entityType: 'BenchmarkReport',
      entityId: report._id.toString(),
      description: `Generated yearly benchmark for ${now.getFullYear()}`,
      status: 'success',
    });
    return report;
  }

  async comparePeriods(period1, period2) {
    const report = await this.generateReport(
      `Custom Comparison: ${period1.start.toISOString().slice(0, 10)} vs ${period2.start.toISOString().slice(0, 10)}`,
      'custom',
      period1.start, period1.end,
      period2.start, period2.end
    );
    await logAuditEvent({
      action: 'compare_periods',
      category: 'benchmarking',
      entityType: 'BenchmarkReport',
      entityId: report._id.toString(),
      description: `Custom period comparison: ${period1.start.toISOString().slice(0, 10)} - ${period1.end.toISOString().slice(0, 10)} vs ${period2.start.toISOString().slice(0, 10)} - ${period2.end.toISOString().slice(0, 10)}`,
      status: 'success',
    });
    return report;
  }

  async getBenchmarkReport(id) {
    const report = await BenchmarkReport.findById(id).lean();
    if (!report) throw new Error('Benchmark report not found');
    return report;
  }

  async getBenchmarkHistory(type) {
    const reports = await BenchmarkReport.find({ type })
      .sort({ 'period.start': -1 })
      .limit(12)
      .lean();
    const trends = {};
    if (reports.length > 1) {
      for (const category of reports[0].categories || []) {
        const values = reports.map(r => {
          const cat = r.categories?.find(c => c.name === category.name);
          return cat ? cat.currentValue : null;
        }).filter(v => v !== null);
        if (values.length > 1) {
          const first = values[values.length - 1];
          const last = values[0];
          trends[category.name] = {
            first: first,
            last: last,
            change: last - first,
            percentChange: first > 0 ? ((last - first) / first) * 100 : 0,
            values: values.reverse(),
          };
        }
      }
    }
    return { reports, trends };
  }

  async getBenchmarkDashboard() {
    const [latestMonthly, latestQuarterly, latestYearly, history] = await Promise.all([
      BenchmarkReport.findOne({ type: 'monthly' }).sort({ 'period.start': -1 }).lean(),
      BenchmarkReport.findOne({ type: 'quarterly' }).sort({ 'period.start': -1 }).lean(),
      BenchmarkReport.findOne({ type: 'yearly' }).sort({ 'period.start': -1 }).lean(),
      this.getBenchmarkHistory('monthly'),
    ]);
    return {
      latestMonthly,
      latestQuarterly,
      latestYearly,
      monthlyTrends: history.trends,
      recentReports: history.reports.slice(0, 6),
      generatedAt: new Date(),
    };
  }
}

export default new BenchmarkingService();
