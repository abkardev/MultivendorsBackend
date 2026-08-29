import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Dispute from '../models/Dispute.js';
import { logAuditEvent } from '../services/auditService.js';

class ExecutiveForecastService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000;
  }

  async getSpendForecast(userId, months = 3) {
    const cacheKey = `spend_forecast_${userId}_${months}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const now = new Date();
    const historicalMonths = Math.max(months * 2, 6);
    const startDate = new Date(now.getTime() - historicalMonths * 30 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      buyer: userId,
      createdAt: { $gte: startDate },
    }).sort('createdAt').lean();

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');

    const monthlyBuckets = {};
    for (const order of completedOrders) {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyBuckets[key]) monthlyBuckets[key] = [];
      monthlyBuckets[key].push(order);
    }

    const monthlySpend = Object.entries(monthlyBuckets)
      .map(([month, monthOrders]) => ({
        month,
        spend: monthOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0),
        count: monthOrders.length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const values = monthlySpend.map(m => m.spend);
    const forecast = this.movingAverageForecast(values, months);

    const totalHistoricalSpend = values.reduce((a, b) => a + b, 0);
    const avgMonthlySpend = values.length > 0 ? totalHistoricalSpend / values.length : 0;

    const forecastMonths = [];
    let cumulativeSpend = 0;
    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      const predicted = Math.round(forecast[i] || avgMonthlySpend);
      cumulativeSpend += predicted;
      forecastMonths.push({
        month: monthKey,
        predictedSpend: predicted,
        confidence: Math.max(30, 90 - i * 15),
      });
    }

    const result = {
      userId,
      forecastMonths,
      totalForecastSpend: cumulativeSpend,
      averageMonthlySpend: Math.round(avgMonthlySpend),
      historicalData: monthlySpend,
      methodology: 'Moving average forecast based on historical monthly spend',
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'spend_forecast',
      category: 'executive',
      entityType: 'ExecutiveForecast',
      entityId: userId,
      description: `Spend forecast generated for ${months} months`,
      status: 'success',
    });

    return result;
  }

  async getDemandForecast(userId, months = 3) {
    const cacheKey = `demand_forecast_${userId}_${months}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const now = new Date();
    const historicalMonths = Math.max(months * 2, 6);
    const startDate = new Date(now.getTime() - historicalMonths * 30 * 24 * 60 * 60 * 1000);

    const [orders, products] = await Promise.all([
      Order.find({ buyer: userId, createdAt: { $gte: startDate } }).sort('createdAt').lean(),
      Product.countDocuments({ status: 'active' }),
    ]);

    const monthlyBuckets = {};
    for (const order of orders) {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyBuckets[key]) monthlyBuckets[key] = { orders: 0, items: 0, quantity: 0 };
      monthlyBuckets[key].orders++;
      if (order.items) {
        monthlyBuckets[key].items += order.items.length;
        monthlyBuckets[key].quantity += order.items.reduce((s, i) => s + (i.quantity || 0), 0);
      }
    }

    const monthlyDemand = Object.entries(monthlyBuckets)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const orderCounts = monthlyDemand.map(m => m.orders);
    const quantityCounts = monthlyDemand.map(m => m.quantity);

    const orderForecast = this.movingAverageForecast(orderCounts, months);
    const quantityForecast = this.movingAverageForecast(quantityCounts, months);

    const avgMonthlyOrders = orderCounts.length > 0
      ? orderCounts.reduce((a, b) => a + b, 0) / orderCounts.length
      : 0;
    const avgMonthlyQuantity = quantityCounts.length > 0
      ? quantityCounts.reduce((a, b) => a + b, 0) / quantityCounts.length
      : 0;

    const forecastMonths = [];
    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      forecastMonths.push({
        month: monthKey,
        predictedOrders: Math.max(0, Math.round(orderForecast[i] || avgMonthlyOrders)),
        predictedQuantity: Math.max(0, Math.round(quantityForecast[i] || avgMonthlyQuantity)),
        growthRate: i > 0 && forecastMonths.length > 0
          ? Math.round(((orderForecast[i] - orderForecast[i - 1]) / Math.max(1, orderForecast[i - 1])) * 100) / 100
          : 0,
      });
    }

    const result = {
      userId,
      forecastMonths,
      averageMonthlyOrders: Math.round(avgMonthlyOrders),
      averageMonthlyQuantity: Math.round(avgMonthlyQuantity),
      historicalData: monthlyDemand,
      totalProducts: products,
      methodology: 'Moving average forecast based on historical order demand',
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  async getRiskForecast(userId, months = 3) {
    const cacheKey = `risk_forecast_${userId}_${months}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const now = new Date();
    const historicalMonths = Math.max(months * 2, 6);
    const startDate = new Date(now.getTime() - historicalMonths * 30 * 24 * 60 * 60 * 1000);

    const [orders, disputes, vendors] = await Promise.all([
      Order.find({ buyer: userId, createdAt: { $gte: startDate } }).sort('createdAt').lean(),
      Dispute.find({ buyer: userId, createdAt: { $gte: startDate } }).lean(),
      Vendor.find({}).lean(),
    ]);

    const monthlyBuckets = {};
    for (const order of orders) {
      const d = new Date(order.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyBuckets[key]) monthlyBuckets[key] = { orders: 0, disputes: 0, delayed: 0 };
      monthlyBuckets[key].orders++;
      if (order.status === 'cancelled' || order.status === 'disputed') {
        monthlyBuckets[key].delayed++;
      }
    }

    for (const dispute of disputes) {
      const d = new Date(dispute.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyBuckets[key]) {
        monthlyBuckets[key].disputes++;
      }
    }

    const monthlyRisks = Object.entries(monthlyBuckets)
      .map(([month, data]) => ({
        month,
        ...data,
        disputeRate: data.orders > 0 ? Math.round((data.disputes / data.orders) * 100) : 0,
        deliveryRisk: data.orders > 0 ? Math.round((data.delayed / data.orders) * 100) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const disputeRates = monthlyRisks.map(m => m.disputeRate);
    const deliveryRisks = monthlyRisks.map(m => m.deliveryRisk);

    const disputeForecast = this.movingAverageForecast(disputeRates, months);
    const deliveryForecast = this.movingAverageForecast(deliveryRisks, months);

    const avgDisputeRate = disputeRates.length > 0
      ? disputeRates.reduce((a, b) => a + b, 0) / disputeRates.length
      : 0;
    const avgDeliveryRisk = deliveryRisks.length > 0
      ? deliveryRisks.reduce((a, b) => a + b, 0) / deliveryRisks.length
      : 0;

    const forecastMonths = [];
    for (let i = 0; i < months; i++) {
      const forecastDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const monthKey = `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, '0')}`;
      forecastMonths.push({
        month: monthKey,
        predictedDisputeRate: Math.round(disputeForecast[i] || avgDisputeRate),
        predictedDeliveryRisk: Math.round(deliveryForecast[i] || avgDeliveryRisk),
        confidence: Math.max(30, 85 - i * 15),
        supplierCount: vendors.length,
      });
    }

    const result = {
      userId,
      forecastMonths,
      averageDisputeRate: Math.round(avgDisputeRate),
      averageDeliveryRisk: Math.round(avgDeliveryRisk),
      historicalData: monthlyRisks,
      methodology: 'Moving average forecast based on historical dispute and delivery data',
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  movingAverageForecast(values, periods) {
    if (!values || values.length === 0) {
      return Array(periods).fill(0);
    }

    const window = Math.min(values.length, Math.max(2, Math.floor(values.length / 2)));
    const recentValues = values.slice(-window);
    const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;

    let trend = 0;
    if (values.length >= window * 2) {
      const earlier = values.slice(-window * 2, -window);
      const later = recentValues;
      const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
      const laterAvg = later.reduce((a, b) => a + b, 0) / later.length;
      trend = laterAvg - earlierAvg;
    }

    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const predicted = avg + trend * (i + 1) * 0.5;
      forecast.push(Math.max(0, predicted));
    }

    return forecast;
  }

  clearCache(userId) {
    if (userId) {
      ['spend_forecast', 'demand_forecast', 'risk_forecast'].forEach(prefix => {
        for (const key of this.cache.keys()) {
          if (key.startsWith(`${prefix}_${userId}`)) this.cache.delete(key);
        }
      });
    } else {
      this.cache.clear();
    }
  }
}

export default new ExecutiveForecastService();
