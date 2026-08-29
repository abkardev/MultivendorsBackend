import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { logAuditEvent } from '../services/auditService.js';
import { Setting } from '../models/Setting.js';

class BudgetIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
  }

  async getBudgetOverview(userId) {
    const cacheKey = `budget_overview_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const last3Months = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [orders, settings, allOrders] = await Promise.all([
      Order.find({ buyer: userId, createdAt: { $gte: startOfYear } }).lean(),
      Setting.findOne({ key: 'budget_allocation', category: 'general' }).lean(),
      Order.find({ buyer: userId }).lean(),
    ]);

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const totalSpent = completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);

    const defaultBudget = 1000000;
    let allocatedBudget = defaultBudget;
    if (settings && settings.value) {
      allocatedBudget = typeof settings.value === 'number' ? settings.value : defaultBudget;
    }

    const budgetConsumption = allocatedBudget > 0 ? Math.round((totalSpent / allocatedBudget) * 100) : 0;

    const nowMs = Date.now();
    const daysElapsed = (nowMs - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
    const daysInYear = 365;
    const dailyBurnRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
    const forecastSpend = Math.round(dailyBurnRate * daysInYear);

    const budgetVariance = totalSpent - allocatedBudget;
    const isOverBudget = budgetVariance > 0;

    const monthlyOrders = allOrders.filter(o => new Date(o.createdAt) >= last3Months);
    const monthlySpend = monthlyOrders
      .filter(o => o.status === 'delivered' || o.status === 'completed')
      .reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);
    const monthlyAvg = Math.round(monthlySpend / 3);

    const monthlyBudget = allocatedBudget / 12;
    const overspendProbability = monthlyAvg > monthlyBudget
      ? Math.min(95, Math.round(((monthlyAvg - monthlyBudget) / monthlyBudget) * 100))
      : Math.max(5, Math.round((1 - (monthlyAvg / monthlyBudget)) * 20));

    const overview = {
      userId,
      period: { year: now.getFullYear(), start: startOfYear.toISOString(), end: new Date(now.getFullYear(), 11, 31).toISOString() },
      allocated: allocatedBudget,
      spent: Math.round(totalSpent),
      remaining: Math.max(0, allocatedBudget - totalSpent),
      budgetConsumption,
      forecastSpend,
      budgetVariance: Math.round(budgetVariance),
      isOverBudget,
      dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
      monthlyAvgSpend: monthlyAvg,
      overspendProbability,
      budgetRisk: overspendProbability > 70 ? 'high' : overspendProbability > 40 ? 'medium' : 'low',
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: overview, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'budget_overview',
      category: 'executive',
      entityType: 'BudgetIntelligence',
      entityId: userId,
      description: `Budget overview generated: ${budgetConsumption}% consumed`,
      status: 'success',
    });

    return overview;
  }

  async getBudgetByCategory(userId, category) {
    const orders = await Order.find({ buyer: userId }).populate('items.product').lean();
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');

    let categorySpend = 0;
    for (const order of completedOrders) {
      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.product && (item.product.category?.toString() === category || item.product.toString() === category)) {
            categorySpend += (item.price || item.unitPrice || 0) * (item.quantity || 1);
          }
        }
      }
    }

    const totalSpend = completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);
    const categoryRatio = totalSpend > 0 ? Math.round((categorySpend / totalSpend) * 100) : 0;

    return {
      category,
      spent: Math.round(categorySpend),
      percentageOfTotal: categoryRatio,
      totalSpend: Math.round(totalSpend),
      generatedAt: new Date().toISOString(),
    };
  }

  async getBudgetAlerts(userId) {
    const overview = await this.getBudgetOverview(userId);
    const alerts = [];

    if (overview.budgetConsumption > 90) {
      alerts.push({
        type: 'critical_overspend',
        severity: 'critical',
        message: `Budget ${overview.budgetConsumption}% consumed. Immediate review required.`,
        threshold: 90,
        currentValue: overview.budgetConsumption,
      });
    } else if (overview.budgetConsumption > 75) {
      alerts.push({
        type: 'high_consumption',
        severity: 'warning',
        message: `Budget ${overview.budgetConsumption}% consumed. Monitor spending closely.`,
        threshold: 75,
        currentValue: overview.budgetConsumption,
      });
    }

    if (overview.isOverBudget) {
      alerts.push({
        type: 'over_budget',
        severity: 'critical',
        message: `Over budget by ${overview.budgetVariance.toLocaleString()} SAR.`,
        threshold: 0,
        currentValue: overview.budgetVariance,
      });
    }

    if (overview.overspendProbability > 70) {
      alerts.push({
        type: 'overspend_risk',
        severity: 'warning',
        message: `High probability (${overview.overspendProbability}%) of exceeding annual budget.`,
        threshold: 70,
        currentValue: overview.overspendProbability,
      });
    }

    if (overview.forecastSpend > overview.allocated * 1.1) {
      alerts.push({
        type: 'forecast_overrun',
        severity: 'warning',
        message: `Forecast spend of ${overview.forecastSpend.toLocaleString()} SAR exceeds allocated budget.`,
        threshold: Math.round(overview.allocated * 1.1),
        currentValue: overview.forecastSpend,
      });
    }

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalCount: alerts.filter(a => a.severity === 'critical').length,
      warningCount: alerts.filter(a => a.severity === 'warning').length,
      generatedAt: new Date().toISOString(),
    };
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`budget_overview_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new BudgetIntelligenceService();
