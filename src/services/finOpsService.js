import { InfrastructureCost } from '../models/InfrastructureCost.js';
import { ServiceCost } from '../models/ServiceCost.js';
import { BudgetAlert } from '../models/BudgetAlert.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class FinOpsService {
  async recordCost(category, provider, service, amount, period, breakdown) {
    const cost = await InfrastructureCost.create({
      category, provider, service, amount,
      period: { start: period?.start || new Date(), end: period?.end || new Date() },
      breakdown: breakdown || {},
    });
    await ServiceCost.findOneAndUpdate(
      { service, category, 'period.start': period?.start || new Date() },
      { $inc: { amount }, $setOnInsert: { usage: 1, unit: 'count', costPerUnit: amount } },
      { upsert: true }
    );
    await logAuditEvent({
      action: 'finops.cost.record', category: 'system',
      entityType: 'InfrastructureCost', entityId: cost._id,
      amount, currency: 'USD',
      newValue: { category, provider, service, amount },
      description: `Recorded cost: ${service} $${amount} (${category})`,
    });
    return cost;
  }

  async getCostBreakdown(category, period) {
    const match = {};
    if (category) match.category = category;
    if (period) {
      const pStart = new Date();
      pStart.setDate(pStart.getDate() - period);
      match.timestamp = { $gte: pStart };
    }
    const [byCategory, byService, byProvider, total] = await Promise.all([
      InfrastructureCost.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 }, avg: { $avg: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      InfrastructureCost.aggregate([
        { $match: match },
        { $group: { _id: { service: '$service', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      InfrastructureCost.aggregate([
        { $match: match },
        { $group: { _id: '$provider', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      InfrastructureCost.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
    ]);
    return {
      total: total[0]?.total || 0,
      byCategory,
      byService: byService.map(s => ({ service: s._id.service, category: s._id.category, total: s.total, count: s.count })),
      byProvider,
    };
  }

  async getCostTrend(service, period) {
    const days = period || 30;
    const start = new Date(Date.now() - days * 86400000);
    const costs = await InfrastructureCost.aggregate([
      { $match: { service, timestamp: { $gte: start } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        dailyTotal: { $sum: '$amount' }, count: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]);
    const values = costs.map(c => c.dailyTotal);
    let trend = 'stable';
    if (values.length > 3) {
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
      if (secondAvg > firstAvg * 1.1) trend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trend = 'decreasing';
    }
    return { service, period: days, trend, daily: costs };
  }

  async analyzeCosts(period) {
    const days = period || 30;
    const start = new Date(Date.now() - days * 86400000);
    const [topCosts, unusedByLowVolume, trendData] = await Promise.all([
      InfrastructureCost.aggregate([
        { $match: { timestamp: { $gte: start } } },
        { $group: { _id: { service: '$service', provider: '$provider', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } }, { $limit: 20 },
      ]),
      InfrastructureCost.aggregate([
        { $match: { timestamp: { $gte: start } } },
        { $group: { _id: { service: '$service', category: '$category' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $match: { count: { $lte: 2 }, total: { $gt: 0 } } },
      ]),
      ServiceCost.find({}).lean(),
    ]);
    const opportunities = [];
    for (const item of unusedByLowVolume) {
      opportunities.push({
        type: 'underutilized',
        service: item._id.service,
        category: item._id.category,
        totalCost: item.total,
        suggestion: `Service ${item._id.service} has low usage but incurs costs. Consider rightsizing or decommissioning.`,
        potentialSavings: Math.round(item.total * 0.5),
      });
    }
    const top20 = topCosts.filter(t => t.total > 100);
    for (const item of top20) {
      const trend = trendData.find(t => t.service === item._id.service);
      if (trend?.trend === 'increasing') {
        opportunities.push({
          type: 'cost_growth',
          service: item._id.service,
          category: item._id.category,
          totalCost: item.total,
          suggestion: `${item._id.service} cost is increasing. Review usage patterns and consider reserved instances.`,
          potentialSavings: Math.round(item.total * 0.2),
        });
      }
    }
    return {
      period: days,
      totalCost: topCosts.reduce((s, t) => s + t.total, 0),
      topCosts: topCosts.slice(0, 10),
      opportunities: opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings),
      totalPotentialSavings: opportunities.reduce((s, o) => s + o.potentialSavings, 0),
    };
  }

  async forecastCost(category, months) {
    const start = new Date(Date.now() - months * 30 * 86400000);
    const costs = await InfrastructureCost.aggregate([
      { $match: { category, timestamp: { $gte: start } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$timestamp' } },
        monthlyTotal: { $sum: '$amount' },
      } },
      { $sort: { _id: 1 } },
    ]);
    const values = costs.map(c => c.monthlyTotal);
    if (values.length < 2) {
      return { category, forecast: [], error: 'Insufficient data for forecasting' };
    }
    const avgMonthly = values.reduce((s, v) => s + v, 0) / values.length;
    const n = values.length;
    const xMean = (n + 1) / 2;
    const yMean = avgMonthly;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i + 1 - xMean) * (values[i] - yMean);
      den += (i + 1 - xMean) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const forecast = [];
    const lastDate = new Date(costs[costs.length - 1]?._id || Date.now());
    for (let i = 1; i <= months; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      const predicted = yMean + slope * (n + i);
      forecast.push({
        month: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`,
        predicted: Math.round(Math.max(0, predicted)),
      });
    }
    return { category, historical: costs, forecast, trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable' };
  }

  async getBudgetStatus() {
    const alerts = await BudgetAlert.find({}).lean();
    return alerts.map(a => ({
      ...a,
      spendRatio: a.budget > 0 ? Math.round((a.spent / a.budget) * 100) : 0,
      remaining: Math.max(0, a.budget - a.spent),
      isOverThreshold: a.budget > 0 ? (a.spent / a.budget) >= (a.threshold / 100) : false,
    }));
  }

  async createBudgetAlert(name, category, budget, threshold) {
    const alert = await BudgetAlert.create({
      name, category, budget, spent: 0,
      threshold: threshold || 80,
      status: 'active',
    });
    await logAuditEvent({
      action: 'finops.budget.create', category: 'system',
      entityType: 'BudgetAlert', entityId: alert._id,
      newValue: { name, category, budget, threshold },
      description: `Created budget alert: ${name} (${category}) $${budget}`,
    });
    return alert;
  }

  async checkBudgetAlerts() {
    const alerts = await BudgetAlert.find({ status: 'active' }).lean();
    const triggered = [];
    for (const alert of alerts) {
      const spentResult = await InfrastructureCost.aggregate([
        { $match: { category: alert.category } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const spent = spentResult[0]?.total || 0;
      const ratio = alert.budget > 0 ? spent / alert.budget : 0;
      if (ratio >= (alert.threshold / 100)) {
        await BudgetAlert.findByIdAndUpdate(alert._id, {
          spent, status: 'triggered', triggeredAt: new Date(),
        });
        triggered.push({ ...alert, spent, ratio: Math.round(ratio * 100) });
      } else {
        await BudgetAlert.findByIdAndUpdate(alert._id, { spent });
      }
    }
    if (triggered.length > 0) {
      await logAuditEvent({
        action: 'finops.budget.triggered', category: 'system',
        entityType: 'BudgetAlert',
        newValue: { triggered: triggered.map(t => ({ name: t.name, spent: t.spent, budget: t.budget })) },
        description: `${triggered.length} budget alert(s) triggered`,
      });
    }
    return { checked: alerts.length, triggered: triggered.length, alerts: triggered };
  }

  async getFinOpsDashboard() {
    const [costBreakdown, budgetStatus, trends, analysis] = await Promise.all([
      this.getCostBreakdown(),
      this.getBudgetStatus(),
      InfrastructureCost.aggregate([
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }, { $limit: 30 },
      ]),
      this.analyzeCosts(30),
    ]);
    return {
      totalCosts: costBreakdown.total,
      byCategory: costBreakdown.byCategory,
      byProvider: costBreakdown.byProvider,
      dailyTrend: trends,
      budgets: budgetStatus,
      optimizationOpportunities: analysis.opportunities,
      potentialSavings: analysis.totalPotentialSavings,
    };
  }
}

export const finOpsService = new FinOpsService();
