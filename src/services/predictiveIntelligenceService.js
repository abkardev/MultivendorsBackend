import { PredictionModel as Prediction } from '../models/PredictionModel.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import { SalesForecast } from '../models/SalesForecast.js';
import { CustomerHealth } from '../models/CustomerHealth.js';
import { logAuditEvent } from './auditService.js';

class PredictiveIntelligenceService {
  async getPrediction(type, period) {
    const filter = { type };
    if (period) filter.period = period;
    const prediction = await Prediction.findOne(filter).sort({ createdAt: -1 }).lean();
    if (!prediction) return this.generatePrediction(type, period);
    return prediction;
  }

  async generatePrediction(type, period) {
    const historicalData = await this._aggregateHistoricalData(type, period);
    const forecast = this._statisticalForecast(historicalData, type);
    const prediction = await Prediction.create({
      type,
      period: period || '30d',
      predictedValue: forecast.predictedValue,
      confidenceInterval: forecast.confidenceInterval,
      historicalData: historicalData.slice(-90),
      method: forecast.method,
      trend: forecast.trend,
      seasonality: forecast.seasonality,
      generatedAt: new Date(),
    });

    await logAuditEvent({
      action: 'generate_prediction',
      category: 'ai_analytics',
      entityType: 'Prediction',
      entityId: prediction._id,
      newValue: { type, period, predictedValue: forecast.predictedValue, confidence: forecast.confidenceInterval },
      description: `Prediction generated: ${type} for ${period || '30d'}`,
    });

    return prediction;
  }

  async _aggregateHistoricalData(type, period) {
    const days = parseInt(period) || 30;
    const startDate = new Date(Date.now() - days * 86400000);
    const aggregation = {};

    switch (type) {
      case 'revenue': {
        const orders = await EscrowOrder.find({ createdAt: { $gte: startDate }, status: { $in: ['completed', 'delivered', 'in_escrow'] } }).lean();
        aggregation.totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        aggregation.orderCount = orders.length;
        aggregation.dailyRevenue = this._aggregateByDay(orders, 'totalAmount');
        aggregation.aov = orders.length > 0 ? aggregation.totalRevenue / orders.length : 0;
        break;
      }
      case 'demand': {
        const products = await Product.find({ isActive: true }).lean();
        const orders = await EscrowOrder.find({ createdAt: { $gte: startDate } }).populate('items.product').lean();
        aggregation.totalProducts = products.length;
        aggregation.totalOrders = orders.length;
        const itemCounts = {};
        for (const o of orders) {
          for (const item of o.items || []) {
            const pid = item.product?.toString();
            if (pid) itemCounts[pid] = (itemCounts[pid] || 0) + item.quantity;
          }
        }
        aggregation.totalDemand = Object.values(itemCounts).reduce((s, c) => s + c, 0);
        aggregation.uniqueProductsDemanded = Object.keys(itemCounts).length;
        break;
      }
      case 'churn': {
        const totalUsers = await User.countDocuments({ isActive: true });
        const inactiveThreshold = new Date(Date.now() - 90 * 86400000);
        const inactiveUsers = await User.countDocuments({ isActive: true, lastLoginAt: { $lt: inactiveThreshold } });
        aggregation.totalActiveUsers = totalUsers;
        aggregation.atRiskUsers = inactiveUsers;
        aggregation.churnRate = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;
        break;
      }
      case 'supply': {
        const vendors = await Vendor.find({ isActive: true }).lean();
        const vendorIds = vendors.map(v => v._id);
        const vendorOrders = await EscrowOrder.find({ vendor: { $in: vendorIds }, createdAt: { $gte: startDate } }).lean();
        aggregation.totalVendors = vendors.length;
        aggregation.activeVendors = new Set(vendorOrders.map(o => o.vendor?.toString())).size;
        aggregation.totalSupplyVolume = vendorOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
        break;
      }
      default: {
        aggregation.rawDataPoints = 0;
      }
    }

    return aggregation;
  }

  _aggregateByDay(orders, field) {
    const daily = {};
    for (const o of orders) {
      const day = new Date(o.createdAt).toISOString().slice(0, 10);
      daily[day] = (daily[day] || 0) + (o[field] || 0);
    }
    return Object.entries(daily).map(([date, value]) => ({ date, value }));
  }

  _statisticalForecast(data, type) {
    const dailyValues = data.dailyRevenue || [];
    const values = dailyValues.map(d => d.value);
    const n = values.length;

    if (n < 2) {
      return {
        predictedValue: values[0] || 0,
        confidenceInterval: { lower: 0, upper: (values[0] || 0) * 1.5 },
        method: 'single_value',
        trend: 'insufficient_data',
        seasonality: 0,
      };
    }

    const sumX = values.reduce((s, v, i) => s + i, 0);
    const sumY = values.reduce((s, v) => s + v, 0);
    const sumXY = values.reduce((s, v, i) => s + i * v, 0);
    const sumX2 = values.reduce((s, v, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedNext = intercept + slope * n;
    const residuals = values.map((v, i) => v - (intercept + slope * i));
    const stdErr = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 1)) || 0;

    const direction = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable';
    const magnitude = Math.abs(slope) / (Math.abs(intercept) || 1);

    return {
      predictedValue: Math.round(predictedNext * 100) / 100,
      confidenceInterval: {
        lower: Math.round((predictedNext - 1.96 * stdErr) * 100) / 100,
        upper: Math.round((predictedNext + 1.96 * stdErr) * 100) / 100,
      },
      method: 'linear_regression',
      trend: direction,
      trendStrength: Math.round(Math.min(1, magnitude) * 100) / 100,
      seasonality: this._detectSeasonality(values),
    };
  }

  _detectSeasonality(values) {
    if (values.length < 14) return 0;
    let weeklyCorrelation = 0;
    const weeklyValues = [];
    for (let i = 0; i < values.length; i += 7) {
      weeklyValues.push(values.slice(i, i + 7).reduce((s, v) => s + v, 0) / 7);
    }
    if (weeklyValues.length > 2) {
      const mean = weeklyValues.reduce((s, v) => s + v, 0) / weeklyValues.length;
      const variance = weeklyValues.reduce((s, v) => s + (v - mean) ** 2, 0) / weeklyValues.length;
      weeklyCorrelation = Math.sqrt(variance) / (mean || 1);
    }
    return Math.round(Math.min(1, weeklyCorrelation) * 100) / 100;
  }

  async getAllPredictions() {
    return Prediction.find().sort({ createdAt: -1 }).lean();
  }

  async getPredictionAccuracy(type) {
    const predictions = await Prediction.find({ type }).sort({ createdAt: -1 }).limit(30).lean();
    const comparisons = [];
    for (const pred of predictions) {
      const actuals = await this._aggregateHistoricalData(type, pred.period);
      const actualValue = actuals.totalRevenue || actuals.totalDemand || 0;
      const predictedValue = pred.predictedValue || 0;
      const error = predictedValue > 0 ? Math.abs(predictedValue - actualValue) / predictedValue : 0;
      comparisons.push({
        predictionId: pred._id,
        predicted: predictedValue,
        actual: actualValue,
        errorPercent: Math.round(error * 10000) / 100,
        date: pred.generatedAt,
      });
    }
    const avgError = comparisons.length > 0
      ? comparisons.reduce((s, c) => s + c.errorPercent, 0) / comparisons.length
      : 0;
    return {
      type,
      totalPredictions: comparisons.length,
      averageErrorPercent: Math.round(avgError * 100) / 100,
      accuracy: Math.round((100 - avgError) * 100) / 100,
      comparisons: comparisons.slice(-10),
    };
  }

  async retrainModel(type) {
    const period = '90d';
    const newPrediction = await this.generatePrediction(type, period);
    return { message: `Model retrained for ${type}`, prediction: newPrediction };
  }

  async getDemandForecast(productId, period) {
    const days = parseInt(period) || 30;
    const startDate = new Date(Date.now() - days * 86400000);
    const orders = await EscrowOrder.find({
      'items.product': productId,
      createdAt: { $gte: startDate },
    }).lean();

    const quantities = [];
    for (const o of orders) {
      for (const item of o.items || []) {
        if (item.product?.toString() === productId) {
          quantities.push(item.quantity);
        }
      }
    }

    const totalQuantity = quantities.reduce((s, q) => s + q, 0);
    const avgDaily = days > 0 ? totalQuantity / days : 0;
    const forecastNext = avgDaily * 30;

    return {
      productId,
      period: `${period || 30}d`,
      historicalQuantity: totalQuantity,
      averageDailyRate: Math.round(avgDaily * 100) / 100,
      forecastNext30Days: Math.round(forecastNext),
      confidence: quantities.length > 10 ? 'high' : quantities.length > 3 ? 'medium' : 'low',
    };
  }

  async getSupplyForecast(vendorId, period) {
    const days = parseInt(period) || 30;
    const startDate = new Date(Date.now() - days * 86400000);
    const orders = await EscrowOrder.find({ vendor: vendorId, createdAt: { $gte: startDate } }).lean();
    const totalVolume = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const orderCount = orders.length;
    const avgOrderValue = orderCount > 0 ? totalVolume / orderCount : 0;

    return {
      vendorId,
      period: `${period || 30}d`,
      totalVolume,
      orderCount,
      averageOrderValue: Math.round(avgOrderValue * 100) / 100,
      projectedNextPeriod: Math.round(totalVolume * 1.1),
      capacityUtilization: orderCount > 5 ? 'stable' : 'low_volume',
    };
  }

  async getRevenueForecast(period) {
    return this.getPrediction('revenue', period);
  }

  async getChurnPrediction(entityType) {
    const threshold = new Date(Date.now() - 90 * 86400000);

    let atRisk = [];
    if (entityType === 'vendor') {
      const vendors = await Vendor.find({ isActive: true }).lean();
      for (const v of vendors) {
        const recentOrders = await EscrowOrder.countDocuments({ vendor: v._id, createdAt: { $gte: threshold } });
        const health = await CustomerHealth.findOne({ vendor: v._id }).lean();
        atRisk.push({
          entityId: v._id,
          name: v.storeName?.en || v.storeName,
          type: 'vendor',
          recentOrders,
          churnScore: health?.churnRisk === 'high' ? 80 : health?.churnRisk === 'medium' ? 50 : recentOrders === 0 ? 70 : 20,
          riskFactors: [],
        });
      }
    } else if (entityType === 'buyer') {
      const buyers = await User.find({ role: 'user', isActive: true }).lean();
      for (const b of buyers) {
        const recentOrders = await EscrowOrder.countDocuments({ buyer: b._id, createdAt: { $gte: threshold } });
        atRisk.push({
          entityId: b._id,
          name: b.name,
          type: 'buyer',
          recentOrders,
          churnScore: recentOrders === 0 ? 85 : recentOrders < 3 ? 50 : 15,
          riskFactors: recentOrders === 0 ? ['No recent orders', 'Inactive > 90 days'] : [],
        });
      }
    }

    atRisk.sort((a, b) => b.churnScore - a.churnScore);
    return {
      entityType,
      totalEvaluated: atRisk.length,
      highRisk: atRisk.filter(e => e.churnScore >= 70).length,
      mediumRisk: atRisk.filter(e => e.churnScore >= 40 && e.churnScore < 70).length,
      lowRisk: atRisk.filter(e => e.churnScore < 40).length,
      atRiskEntities: atRisk.filter(e => e.churnScore >= 70).slice(0, 20),
    };
  }
}

export const predictiveIntelligenceService = new PredictiveIntelligenceService();
