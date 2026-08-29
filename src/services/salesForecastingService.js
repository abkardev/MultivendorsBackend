import { SalesForecast } from '../models/SalesForecast.js';
import { SalesGoal } from '../models/SalesGoal.js';

class SalesForecastingService {
  async generateForecast(vendorId, type = 'monthly', options = {}) {
    const { default: Order } = await import('../models/Order.js');
    const now = new Date();
    let periodStart, periodEnd;
    if (type === 'daily') { periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); periodEnd = new Date(periodStart.getTime() + 86400000); }
    else if (type === 'weekly') { periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); periodEnd = new Date(periodStart.getTime() + 7 * 86400000); }
    else if (type === 'monthly') { periodStart = new Date(now.getFullYear(), now.getMonth(), 1); periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else if (type === 'quarterly') { const q = Math.floor(now.getMonth() / 3); periodStart = new Date(now.getFullYear(), q * 3, 1); periodEnd = new Date(now.getFullYear(), (q + 1) * 3, 0); }
    else { periodStart = new Date(now.getFullYear(), 0, 1); periodEnd = new Date(now.getFullYear(), 11, 31); }
    const daysBack = type === 'annual' ? 365 : type === 'quarterly' ? 90 : type === 'monthly' ? 60 : 30;
    const historicalStart = new Date(now.getTime() - daysBack * 86400000);
    const historicalOrders = await Order.find({
      vendor: vendorId,
      createdAt: { $gte: historicalStart, $lte: now },
    });
    const historicalRevenue = historicalOrders.reduce((s, o) => s + (o.total || 0), 0);
    const historicalCount = historicalOrders.length;
    const dailyAvgRevenue = historicalRevenue / daysBack;
    const dailyAvgOrders = historicalCount / daysBack;
    const periodDays = (periodEnd.getTime() - periodStart.getTime()) / 86400000;
    const forecastRevenue = Math.round(dailyAvgRevenue * periodDays * 1.1);
    const forecastOrders = Math.round(dailyAvgOrders * periodDays * 1.1);
    const existing = await SalesForecast.findOne({ vendor: vendorId, type, periodStart, periodEnd });
    const data = {
      vendor: vendorId, type, periodStart, periodEnd,
      metrics: {
        revenue: { forecast: forecastRevenue, actual: 0, variance: 0 },
        orders: { forecast: forecastOrders, actual: 0, variance: 0 },
        rfqs: { forecast: Math.round(forecastOrders * 3), actual: 0, variance: 0 },
        conversion: { forecast: 25, actual: 0, variance: 0 },
        demand: { forecast: Math.round(forecastOrders * 2), actual: 0, variance: 0 },
      },
      confidence: 70,
      methodology: 'historical',
      calculatedAt: new Date(),
    };
    if (existing) {
      await SalesForecast.findOneAndUpdate({ _id: existing._id }, { $set: data });
      return SalesForecast.findById(existing._id);
    }
    return SalesForecast.create(data);
  }

  async getForecasts(vendorId, options = {}) {
    const { type, limit = 12 } = options;
    const filter = { vendor: vendorId };
    if (type) filter.type = type;
    return SalesForecast.find(filter).sort({ periodStart: -1 }).limit(parseInt(limit));
  }

  async getForecast(vendorId, forecastId) {
    return SalesForecast.findOne({ _id: forecastId, vendor: vendorId });
  }

  async getHistoricalTrends(vendorId, options = {}) {
    const { default: Order } = await import('../models/Order.js');
    const { period = '12months' } = options;
    const months = parseInt(period) || 12;
    const startDate = new Date(Date.now() - months * 30 * 86400000);
    const orders = await Order.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: startDate } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return orders;
  }
}

export const salesForecastingService = new SalesForecastingService();
