import { MetricSeries } from '../models/MetricSeries.js';
import { ResourceUsage } from '../models/ResourceUsage.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class CapacityPlanningService {
  _movingAverage(data, window) {
    if (data.length < window) return data.map(v => ({ ...v, smoothed: v.value }));
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const slice = data.slice(start, i + 1);
      const avg = slice.reduce((s, v) => s + v.value, 0) / slice.length;
      result.push({ ...data[i], smoothed: avg });
    }
    return result;
  }

  _forecastFromTrend(data, days, seasonalityPeriod) {
    if (data.length < 2) {
      return Array.from({ length: days }, (_, i) => ({
        day: i + 1, predicted: data.length > 0 ? data[data.length - 1].value : 0,
      }));
    }
    const sp = seasonalityPeriod || 7;
    const values = data.map(d => d.value);
    const n = values.length;
    const xMean = (n + 1) / 2;
    const yMean = values.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i + 1 - xMean) * (values[i] - yMean);
      den += (i + 1 - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const seasonalFactors = {};
    for (let i = 0; i < n; i++) {
      const dayOfWeek = i % sp;
      if (!seasonalFactors[dayOfWeek]) seasonalFactors[dayOfWeek] = [];
      seasonalFactors[dayOfWeek].push(values[i]);
    }
    for (const [d, vals] of Object.entries(seasonalFactors)) {
      seasonalFactors[d] = vals.reduce((s, v) => s + v, 0) / vals.length;
    }
    const seasonalAvg = Object.values(seasonalFactors).reduce((s, v) => s + v, 0) / Math.max(1, Object.keys(seasonalFactors).length);
    const forecast = [];
    for (let i = 1; i <= days; i++) {
      const trendVal = yMean + slope * (n + i);
      const dayOfWeek = (n + i - 1) % sp;
      const seasonFactor = seasonalFactors[dayOfWeek] ? seasonalFactors[dayOfWeek] / (seasonalAvg || 1) : 1;
      forecast.push({
        day: i,
        predicted: Math.max(0, Math.round(trendVal * seasonFactor * 100) / 100),
      });
    }
    return forecast;
  }

  async forecastTraffic(days) {
    const d = days || 30;
    const series = await MetricSeries.findOne({ name: 'request_volume', granularity: 'day' }).lean();
    const dailyValues = (series?.values || []).map(v => ({
      timestamp: v.timestamp, value: v.value || 0,
    }));
    if (dailyValues.length === 0) {
      const events = await TelemetryEvent.find({ type: 'request_volume' })
        .sort({ timestamp: -1 }).limit(30).lean();
      dailyValues.push(...events.map(e => ({ timestamp: e.timestamp, value: e.value })));
    }
    const smoothed = this._movingAverage(dailyValues.slice(-30), 3);
    const forecast = this._forecastFromTrend(smoothed, d, 7);
    const currentAvg = smoothed.length > 0
      ? smoothed.reduce((s, v) => s + v.value, 0) / smoothed.length
      : 0;
    const forecastAvg = forecast.reduce((s, v) => s + v.predicted, 0) / forecast.length;
    return {
      metric: 'traffic', days: d,
      currentDailyAvg: Math.round(currentAvg),
      predictedDailyAvg: Math.round(forecastAvg),
      growth: currentAvg > 0 ? `${Math.round(((forecastAvg - currentAvg) / currentAvg) * 100)}%` : '0%',
      historical: smoothed.slice(-14),
      forecast,
    };
  }

  async forecastOrders(days) {
    const d = days || 30;
    const series = await MetricSeries.findOne({ name: 'order_volume', granularity: 'day' }).lean();
    const dailyValues = (series?.values || []).slice(-60).map(v => ({
      timestamp: v.timestamp, value: v.value || 0,
    }));
    if (dailyValues.length === 0) {
      const { default: EscrowOrder } = await import('../models/Order.js');
      const orderCounts = await EscrowOrder.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 60 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      dailyValues.push(...orderCounts.map(o => ({ timestamp: o._id, value: o.count })));
    }
    const smoothed = this._movingAverage(dailyValues, 3);
    const forecast = this._forecastFromTrend(smoothed, d, 7);
    const currentAvg = smoothed.length > 0
      ? smoothed.reduce((s, v) => s + v.value, 0) / smoothed.length
      : 0;
    const forecastAvg = forecast.reduce((s, v) => s + v.predicted, 0) / forecast.length;
    return {
      metric: 'orders', days: d,
      currentDailyAvg: Math.round(currentAvg),
      predictedDailyAvg: Math.round(forecastAvg),
      growth: currentAvg > 0 ? `${Math.round(((forecastAvg - currentAvg) / currentAvg) * 100)}%` : '0%',
      historical: smoothed.slice(-14),
      forecast,
    };
  }

  async forecastUsers(days) {
    const d = days || 30;
    const { default: User } = await import('../models/userModel.js');
    const userCounts = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 90 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const dailyValues = userCounts.map(u => ({ timestamp: u._id, value: u.count }));
    const cumulative = [];
    let running = 0;
    for (const d of dailyValues) { running += d.value; cumulative.push({ ...d, value: running }); }
    const forecast = this._forecastFromTrend(cumulative, d, 7);
    const currentTotal = cumulative.length > 0 ? cumulative[cumulative.length - 1].value : 0;
    const predictedTotal = forecast.length > 0 ? forecast[forecast.length - 1].predicted : currentTotal;
    return {
      metric: 'users', days: d,
      currentTotal,
      predictedTotal: Math.round(predictedTotal),
      growth: currentTotal > 0 ? `${Math.round(((predictedTotal - currentTotal) / currentTotal) * 100)}%` : '0%',
      historical: cumulative.slice(-14),
      forecast,
    };
  }

  async forecastStorage(days) {
    const d = days || 30;
    const storageUsage = await ResourceUsage.aggregate([
      { $match: { resource: 'disk', timestamp: { $gte: new Date(Date.now() - 90 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, avgGB: { $avg: '$value' }, maxGB: { $max: '$value' } } },
      { $sort: { _id: 1 } },
    ]);
    const dailyValues = storageUsage.map(s => ({ timestamp: s._id, value: s.avgGB }));
    const forecast = this._forecastFromTrend(dailyValues, d, 7);
    const current = dailyValues.length > 0 ? dailyValues[dailyValues.length - 1].value : 0;
    const predicted = forecast.length > 0 ? forecast[forecast.length - 1].predicted : current;
    return {
      metric: 'storage', days: d,
      currentGB: Math.round(current * 10) / 10,
      predictedGB: Math.round(predicted * 10) / 10,
      growth: current > 0 ? `${Math.round(((predicted - current) / current) * 100)}%` : '0%',
      historical: dailyValues.slice(-14),
      forecast,
    };
  }

  async forecastDatabaseGrowth(days) {
    const d = days || 30;
    const series = await MetricSeries.findOne({ name: 'db_size', granularity: 'day' }).lean();
    const dailyValues = (series?.values || []).slice(-90).map(v => ({
      timestamp: v.timestamp, value: v.value || 0,
    }));
    if (dailyValues.length === 0) {
      const dbEvents = await TelemetryEvent.find({ type: 'db_latency' })
        .sort({ timestamp: -1 }).limit(60).lean();
      dailyValues.push(...dbEvents.map(e => ({ timestamp: e.timestamp, value: e.value })));
    }
    const forecast = this._forecastFromTrend(dailyValues, d, 7);
    const current = dailyValues.length > 0 ? dailyValues[dailyValues.length - 1].value : 0;
    const predicted = forecast.length > 0 ? forecast[forecast.length - 1].predicted : current;
    return {
      metric: 'database', days: d,
      currentSize: Math.round(current),
      predictedSize: Math.round(predicted),
      growth: current > 0 ? `${Math.round(((predicted - current) / current) * 100)}%` : '0%',
      historical: dailyValues.slice(-14),
      forecast,
    };
  }

  async forecastAiUsage(days) {
    const d = days || 30;
    const aiEvents = await TelemetryEvent.aggregate([
      { $match: { type: 'ai_latency', timestamp: { $gte: new Date(Date.now() - 60 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, avgLatency: { $avg: '$value' } } },
      { $sort: { _id: 1 } },
    ]);
    const dailyValues = aiEvents.map(a => ({ timestamp: a._id, value: a.count }));
    if (dailyValues.length === 0) {
      return { metric: 'ai_usage', days: d, currentDailyAvg: 0, predictedDailyAvg: 0, growth: '0%', historical: [], forecast: [] };
    }
    const smoothed = this._movingAverage(dailyValues, 3);
    const forecast = this._forecastFromTrend(smoothed, d, 7);
    const currentAvg = smoothed.slice(-7).reduce((s, v) => s + v.value, 0) / Math.min(7, smoothed.length);
    const forecastAvg = forecast.slice(-7).reduce((s, v) => s + v.predicted, 0) / Math.min(7, forecast.length);
    return {
      metric: 'ai_usage', days: d,
      currentDailyAvg: Math.round(currentAvg),
      predictedDailyAvg: Math.round(forecastAvg),
      growth: currentAvg > 0 ? `${Math.round(((forecastAvg - currentAvg) / currentAvg) * 100)}%` : '0%',
      historical: smoothed.slice(-14),
      forecast,
    };
  }

  async getScalingRecommendations() {
    const [traffic, orders, storage] = await Promise.all([
      this.forecastTraffic(30),
      this.forecastOrders(30),
      this.forecastStorage(30),
    ]);
    const recommendations = [];
    const trafficGrowth = parseFloat(traffic.growth) || 0;
    const orderGrowth = parseFloat(orders.growth) || 0;
    const storageGrowth = parseFloat(storage.growth) || 0;
    if (trafficGrowth > 20) {
      recommendations.push({
        resource: 'compute', priority: 'high',
        currentLoad: traffic.currentDailyAvg,
        predictedLoad: traffic.predictedDailyAvg,
        suggestion: `Traffic growing ${traffic.growth}. Add ${Math.ceil(trafficGrowth / 20)} additional instances within ${Math.ceil(30 / (trafficGrowth / 10))} days.`,
      });
    }
    if (storageGrowth > 15) {
      recommendations.push({
        resource: 'storage', priority: 'medium',
        currentLoad: `${storage.currentGB}GB`,
        predictedLoad: `${storage.predictedGB}GB`,
        suggestion: `Storage growing ${storage.growth}. Plan for additional ${Math.round(storage.predictedGB - storage.currentGB)}GB capacity.`,
      });
    }
    if (orderGrowth > 10) {
      recommendations.push({
        resource: 'database', priority: 'high',
        currentLoad: orders.currentDailyAvg,
        predictedLoad: orders.predictedDailyAvg,
        suggestion: `Order volume growing ${orders.growth}. Consider database read replicas and connection pooling.`,
      });
    }
    return {
      generatedAt: new Date(),
      recommendations: recommendations.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority]) - ({ high: 0, medium: 1, low: 2 }[b.priority])),
      summary: { total: recommendations.length, high: recommendations.filter(r => r.priority === 'high').length },
    };
  }

  async getPeakPredictions(period) {
    const days = period || 30;
    const start = new Date(Date.now() - days * 86400000);
    const [trafficSeries, orderSeries] = await Promise.all([
      TelemetryEvent.aggregate([
        { $match: { type: 'request_volume', timestamp: { $gte: start } } },
        { $group: { _id: { $dayOfWeek: '$timestamp' }, avgValue: { $avg: '$value' }, maxValue: { $max: '$value' }, count: { $sum: 1 } } },
      ]),
      MetricSeries.findOne({ name: 'order_volume', granularity: 'day' }).lean(),
    ]);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDays = trafficSeries.map(t => ({
      day: dayNames[t._id - 1] || `Day ${t._id}`,
      dayOfWeek: t._id,
      avgValue: Math.round(t.avgValue),
      maxValue: Math.round(t.maxValue),
      isPeak: t.avgValue > trafficSeries.reduce((s, x) => s + x.avgValue, 0) / trafficSeries.length,
    })).sort((a, b) => b.avgValue - a.avgValue);
    return {
      period: days,
      peakDays,
      busiestDay: peakDays[0]?.day || 'unknown',
      peakHours: await this._getPeakHours(start),
    };
  }

  async _getPeakHours(start) {
    const hourlyData = await TelemetryEvent.aggregate([
      { $match: { type: 'request_volume', timestamp: { $gte: start } } },
      { $group: { _id: { $hour: '$timestamp' }, avgValue: { $avg: '$value' }, count: { $sum: 1 } } },
      { $sort: { avgValue: -1 } },
    ]);
    return hourlyData.map(h => ({
      hour: h._id,
      avgTraffic: Math.round(h.avgValue),
      period: h._id < 12 ? 'morning' : h._id < 17 ? 'afternoon' : 'evening',
    }));
  }

  async detectSeasonality(metric) {
    const series = await MetricSeries.findOne({ name: metric }).lean();
    const values = (series?.values || []).map(v => v.value).filter(v => v != null);
    if (values.length < 14) return { metric, hasSeasonality: false, dataPoints: values.length };
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
    const weeklyPattern = [];
    for (let d = 0; d < 7; d++) {
      const dayVals = [];
      for (let i = d; i < values.length; i += 7) dayVals.push(values[i]);
      if (dayVals.length > 1) {
        weeklyPattern.push({
          dayOffset: d,
          avgValue: dayVals.reduce((s, v) => s + v, 0) / dayVals.length,
          stdDev: Math.sqrt(dayVals.reduce((s, v) => s + (v - dayVals.reduce((a, b) => a + b, 0) / dayVals.length) ** 2, 0) / dayVals.length),
        });
      }
    }
    const dayAvgs = weeklyPattern.map(w => w.avgValue);
    const overallAvg = dayAvgs.reduce((s, v) => s + v, 0) / dayAvgs.length;
    const hasDayPattern = dayAvgs.some(v => Math.abs(v - overallAvg) > overallAvg * 0.2);
    return {
      metric,
      hasSeasonality: hasDayPattern,
      dataPoints: values.length,
      trend: secondAvg > firstAvg * 1.1 ? 'upward' : secondAvg < firstAvg * 0.9 ? 'downward' : 'stable',
      weeklyPattern,
    };
  }

  async getCapacityDashboard() {
    const [traffic, orders, storage, dbGrowth, aiUsage, recommendations, peakPredictions] = await Promise.all([
      this.forecastTraffic(30),
      this.forecastOrders(30),
      this.forecastStorage(30),
      this.forecastDatabaseGrowth(30),
      this.forecastAiUsage(30),
      this.getScalingRecommendations(),
      this.getPeakPredictions(30),
    ]);
    return {
      forecasts: { traffic, orders, storage, dbGrowth, aiUsage },
      scalingRecommendations: recommendations,
      peakPredictions,
      generatedAt: new Date(),
    };
  }
}

export const capacityPlanningService = new CapacityPlanningService();
