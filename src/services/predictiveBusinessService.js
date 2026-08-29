import mongoose from 'mongoose';
import { BusinessForecast } from '../models/BusinessForecast.js';
import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { logAuditEvent } from './auditService.js';

class PredictiveBusinessService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60 * 60 * 1000;
  }

  movingAverage(data, window = 7) {
    if (data.length < window) return data;
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      result.push(slice.reduce((s, v) => s + v, 0) / slice.length);
    }
    return result;
  }

  linearTrend(data) {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0] || 0 };
    const xMean = (n - 1) / 2;
    const yMean = data.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (data[i] - yMean);
      den += (i - xMean) ** 2;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    return { slope, intercept };
  }

  projectForward(data, months, seasonality = null) {
    const ma = this.movingAverage(data, 7);
    const trend = this.linearTrend(ma.length >= 2 ? ma : data);
    const projected = [];
    const lastDate = new Date();
    const dailyProjection = months * 30;
    for (let i = 1; i <= dailyProjection; i++) {
      const predicted = Math.max(0, trend.intercept + trend.slope * (data.length + i - 1));
      const seasonalFactor = seasonality ? 1 + seasonality.amplitude * Math.sin(2 * Math.PI * i / seasonality.period + seasonality.phase) : 1;
      const value = predicted * seasonalFactor;
      const date = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      projected.push({
        date,
        predicted: Math.round(value * 100) / 100,
        lower: Math.round(value * 0.8 * 100) / 100,
        upper: Math.round(value * 1.2 * 100) / 100,
      });
    }
    return projected;
  }

  async getDailyRevenue(monthsBack) {
    const since = new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000);
    const pipeline = [
      { $match: { createdAt: { $gte: since }, status: 'delivered' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $toDouble: '$totalPrice' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    return Order.aggregate(pipeline);
  }

  async getDailyOrderVolume(monthsBack) {
    const since = new Date(Date.now() - monthsBack * 30 * 24 * 60 * 60 * 1000);
    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];
    return Order.aggregate(pipeline);
  }

  async forecastRevenue(period = 'monthly', months = 3) {
    const historicalMonths = Math.max(months * 2, 6);
    const dailyRevenue = await this.getDailyRevenue(historicalMonths);
    const values = dailyRevenue.map(d => d.revenue);
    const projected = this.projectForward(values, months);

    const forecast = await BusinessForecast.create({
      type: 'revenue',
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(90, 50 + values.length),
      method: 'moving_average',
      trend: this.linearTrend(values).slope > 0 ? 'up' : this.linearTrend(values).slope < 0 ? 'down' : 'stable',
      generatedAt: new Date(),
    });

    const totalPredicted = projected.reduce((s, v) => s + v.predicted, 0);
    const totalLower = projected.reduce((s, v) => s + v.lower, 0);
    const totalUpper = projected.reduce((s, v) => s + v.upper, 0);

    return {
      forecastId: forecast._id.toString(),
      type: 'revenue',
      period: `${months} months`,
      historicalDataPoints: values.length,
      totalPredicted: Math.round(totalPredicted * 100) / 100,
      range: { lower: Math.round(totalLower * 100) / 100, upper: Math.round(totalUpper * 100) / 100 },
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastOrders(period = 'monthly', months = 3) {
    const historicalMonths = Math.max(months * 2, 6);
    const dailyVolume = await this.getDailyOrderVolume(historicalMonths);
    const values = dailyVolume.map(d => d.count);
    const projected = this.projectForward(values, months);

    const forecast = await BusinessForecast.create({
      type: 'orders',
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(90, 50 + values.length),
      method: 'moving_average',
      trend: this.linearTrend(values).slope > 0 ? 'up' : this.linearTrend(values).slope < 0 ? 'down' : 'stable',
      generatedAt: new Date(),
    });

    const totalPredicted = projected.reduce((s, v) => s + v.predicted, 0);

    return {
      forecastId: forecast._id.toString(),
      type: 'orders',
      period: `${months} months`,
      historicalDataPoints: values.length,
      totalPredictedOrders: Math.round(totalPredicted),
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastGrowth(metric, months = 3) {
    let values = [];
    if (metric === 'users') {
      const users = await User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      values = users.map(d => d.count);
    } else if (metric === 'vendors') {
      const vendors = await Vendor.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      values = vendors.map(d => d.count);
    } else if (metric === 'revenue') {
      const revenue = await this.getDailyRevenue(months * 2);
      values = revenue.map(d => d.revenue);
    } else {
      const orders = await this.getDailyOrderVolume(months * 2);
      values = orders.map(d => d.count);
    }

    const projected = this.projectForward(values, months);
    const growthRate = values.length > 1 ? this.linearTrend(values).slope : 0;
    const avgValue = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
    const growthPercent = avgValue > 0 ? (growthRate / avgValue) * 100 : 0;

    const forecast = await BusinessForecast.create({
      type: 'growth',
      entityType: metric,
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(85, 40 + values.length),
      method: 'trend_analysis',
      trend: growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'stable',
      generatedAt: new Date(),
    });

    return {
      forecastId: forecast._id.toString(),
      type: 'growth',
      metric,
      period: `${months} months`,
      historicalDataPoints: values.length,
      growthRate: Math.round(growthPercent * 100) / 100,
      averageDailyValue: Math.round(avgValue * 100) / 100,
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastDemand(productId, months = 3) {
    const since = new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000);
    const orders = await Order.aggregate([
      { $match: { 'items.product': new mongoose.Types.ObjectId(productId), createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          quantity: { $sum: { $sum: '$items.quantity' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const values = orders.map(d => d.quantity);
    const projected = this.projectForward(values, months);

    const forecast = await BusinessForecast.create({
      type: 'demand',
      entityType: 'product',
      entityId: productId,
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(80, 30 + values.length),
      method: 'moving_average',
      trend: this.linearTrend(values.length ? values : [0]).slope > 0 ? 'up' : 'down',
      generatedAt: new Date(),
    });

    const totalProjected = projected.reduce((s, v) => s + v.predicted, 0);
    return {
      forecastId: forecast._id.toString(),
      type: 'demand',
      productId,
      period: `${months} months`,
      historicalDataPoints: values.length,
      totalProjectedDemand: Math.round(totalProjected),
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastSupplierPerformance(vendorId, months = 3) {
    const since = new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000);
    const vendorObjectId = new mongoose.Types.ObjectId(vendorId);
    const orders = await Order.aggregate([
      {
        $match: {
          'items.product': { $exists: true },
          createdAt: { $gte: since },
        },
      },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      { $unwind: '$productData' },
      { $match: { 'productData.vendor': vendorObjectId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalValue: { $sum: { $toDouble: '$totalPrice' } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const values = orders.map(d => d.count);
    const projected = this.projectForward(values, months);

    const forecast = await BusinessForecast.create({
      type: 'supplier_performance',
      entityType: 'vendor',
      entityId: vendorId,
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(75, 25 + values.length),
      method: 'trend_analysis',
      trend: this.linearTrend(values.length ? values : [0]).slope > 0 ? 'up' : 'down',
      generatedAt: new Date(),
    });

    return {
      forecastId: forecast._id.toString(),
      type: 'supplier_performance',
      vendorId,
      period: `${months} months`,
      historicalDataPoints: values.length,
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastProductDemand(categoryId, months = 3) {
    const since = new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000);
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      { $unwind: '$productData' },
      { $match: { 'productData.category': new mongoose.Types.ObjectId(categoryId), createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const values = orders.map(d => d.count);
    const projected = this.projectForward(values, months);

    const forecast = await BusinessForecast.create({
      type: 'product_demand',
      entityType: 'category',
      entityId: categoryId,
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: projected,
      confidence: Math.min(80, 30 + values.length),
      method: 'moving_average',
      trend: this.linearTrend(values.length ? values : [0]).slope > 0 ? 'up' : 'down',
      generatedAt: new Date(),
    });

    return {
      forecastId: forecast._id.toString(),
      type: 'product_demand',
      categoryId,
      period: `${months} months`,
      historicalDataPoints: values.length,
      confidence: forecast.confidence,
      trend: forecast.trend,
      dailyProjections: projected,
      generatedAt: forecast.generatedAt,
    };
  }

  async forecastCategoryTrends(months = 3) {
    const since = new Date(Date.now() - months * 2 * 30 * 24 * 60 * 60 * 1000);
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData',
        },
      },
      { $unwind: '$productData' },
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$productData.category',
          count: { $sum: 1 },
          lastOrder: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);
    const categories = orders.filter(o => o._id);
    const trends = categories.map(c => ({
      categoryId: c._id.toString(),
      orderCount: c.count,
      lastOrderDate: c.lastOrder,
      direction: c.count > 5 ? 'rising' : c.count > 1 ? 'stable' : 'declining',
    }));

    const forecast = await BusinessForecast.create({
      type: 'category_trend',
      period: { start: new Date(), end: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000) },
      values: categories.map(c => ({ date: new Date(), predicted: c.count, actual: c.count })),
      confidence: 70,
      method: 'trend_analysis',
      trend: 'cyclical',
      generatedAt: new Date(),
      metadata: { categories: trends },
    });

    return {
      forecastId: forecast._id.toString(),
      type: 'category_trend',
      period: `${months} months`,
      totalCategories: categories.length,
      trends,
      generatedAt: forecast.generatedAt,
    };
  }

  async getForecast(type, entityId) {
    const query = { type };
    if (entityId) query.entityId = entityId;
    const forecasts = await BusinessForecast.find(query).sort({ generatedAt: -1 }).limit(1).lean();
    return forecasts.length > 0 ? forecasts[0] : null;
  }

  async generateAllForecasts() {
    const results = await Promise.allSettled([
      this.forecastRevenue('monthly', 3),
      this.forecastOrders('monthly', 3),
      this.forecastGrowth('revenue', 3),
      this.forecastGrowth('users', 3),
      this.forecastGrowth('vendors', 3),
    ]);
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);
    await logAuditEvent({
      action: 'generate_all_forecasts',
      category: 'predictive',
      entityType: 'BusinessForecast',
      description: `Generated ${successful.length}/${results.length} forecasts`,
      status: failed.length === 0 ? 'success' : 'partial',
    });
    return { successful, failed, totalRequested: results.length, totalSuccessful: successful.length };
  }

  async getPredictiveDashboard() {
    const [recentForecasts, categoryTrends, productIds] = await Promise.all([
      BusinessForecast.find().sort({ generatedAt: -1 }).limit(20).lean(),
      this.forecastCategoryTrends(3),
      Product.find({ isActive: true }).distinct('_id').then(ids => ids.slice(0, 5)),
    ]);
    const typeBreakdown = {};
    for (const f of recentForecasts) {
      if (!typeBreakdown[f.type]) typeBreakdown[f.type] = [];
      typeBreakdown[f.type].push(f);
    }
    return {
      summary: {
        totalForecasts: recentForecasts.length,
        categories: Object.keys(typeBreakdown),
        lastGenerated: recentForecasts[0]?.generatedAt,
      },
      recentForecasts: recentForecasts.slice(0, 10),
      categoryTrends: categoryTrends.trends,
      typeBreakdown,
      generatedAt: new Date(),
    };
  }
}

export default new PredictiveBusinessService();
