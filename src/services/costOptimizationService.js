import { ResourceCost } from '../models/ResourceCost.js';
import { CostRecommendation } from '../models/CostRecommendation.js';
import { ResourceOptimization } from '../models/ResourceOptimization.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class CostOptimizationService {
  async recordResourceCost(data) {
    const cost = await ResourceCost.create(data);
    await logAuditEvent({
      action: 'cost.record', category: 'financial',
      entityType: 'ResourceCost', entityId: cost._id,
      description: `Recorded cost for ${data.name}: ${data.type}`,
      status: 'success',
    });
    return cost;
  }

  async updateResourceCost(id, data) {
    const cost = await ResourceCost.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!cost) throw new Error('ResourceCost not found');
    await logAuditEvent({
      action: 'cost.update', category: 'financial',
      entityType: 'ResourceCost', entityId: id,
      description: `Updated resource cost: ${cost.name}`,
      status: 'success',
    });
    return cost;
  }

  async getResourceCost(id) {
    const cost = await ResourceCost.findById(id).lean();
    if (!cost) throw new Error('ResourceCost not found');
    return cost;
  }

  async listResourceCosts(filter = {}) {
    const { type, category, start, end, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (category) query.category = category;
    if (start || end) {
      query['period.start'] = {};
      if (start) query['period.start'].$gte = new Date(start);
      if (end) query['period.start'].$lte = new Date(end);
    }
    const [items, total] = await Promise.all([
      ResourceCost.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ResourceCost.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getCostBreakdown(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const match = { 'period.start': { $gte: start } };
    const [byType, byCategory] = await Promise.all([
      ResourceCost.aggregate([
        { $match: match },
        { $group: { _id: '$type', total: { $sum: '$cost.monthly' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      ResourceCost.aggregate([
        { $match: match },
        { $group: { _id: '$category', total: { $sum: '$cost.monthly' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);
    return { period, byType, byCategory, generatedAt: new Date() };
  }

  async getCostTrend(resourceType, period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const costs = await ResourceCost.find({ type: resourceType, 'period.start': { $gte: start } })
      .sort({ 'period.start': 1 }).lean();
    const trend = costs.map(c => ({
      date: c.period ? c.period.start : c.createdAt,
      amount: c.cost ? c.cost.monthly : 0,
      name: c.name,
    }));
    const avg = trend.length > 0 ? trend.reduce((s, t) => s + t.amount, 0) / trend.length : 0;
    return { resourceType, period, dataPoints: trend.length, average: Math.round(avg * 100) / 100, trend };
  }

  async forecastCost(days = 30, resourceType) {
    const query = {};
    if (resourceType) query.type = resourceType;
    const costs = await ResourceCost.find(query).sort({ createdAt: -1 }).limit(100).lean();
    if (costs.length === 0) return { forecast: [], totalProjected: 0 };
    const monthlyTotal = costs.reduce((s, c) => s + (c.cost ? c.cost.monthly || 0 : 0), 0);
    const avgMonthly = monthlyTotal / costs.length;
    const dailyRate = avgMonthly / 30;
    const projected = dailyRate * days;
    return {
      forecast: [{ period: `${days} days`, projected: Math.round(projected * 100) / 100 }],
      totalProjected: Math.round(projected * 100) / 100,
      basedOn: costs.length,
      resourceType: resourceType || 'all',
    };
  }

  async createCostRecommendation(data) {
    const rec = await CostRecommendation.create(data);
    await logAuditEvent({
      action: 'cost.recommendation.create', category: 'financial',
      entityType: 'CostRecommendation', entityId: rec._id,
      description: `Created recommendation: ${rec.title}`,
      status: 'success',
    });
    return rec;
  }

  async updateCostRecommendation(id, data) {
    const rec = await CostRecommendation.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!rec) throw new Error('CostRecommendation not found');
    await logAuditEvent({
      action: 'cost.recommendation.update', category: 'financial',
      entityType: 'CostRecommendation', entityId: id,
      description: `Updated recommendation: ${rec.title}`,
      status: 'success',
    });
    return rec;
  }

  async listCostRecommendations(filter = {}) {
    const { type, status, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      CostRecommendation.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      CostRecommendation.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async approveRecommendation(id) {
    return this.updateCostRecommendation(id, { status: 'approved' });
  }

  async implementRecommendation(id) {
    return this.updateCostRecommendation(id, { status: 'implemented' });
  }

  async dismissRecommendation(id) {
    return this.updateCostRecommendation(id, { status: 'dismissed' });
  }

  async createResourceOptimization(data) {
    const opt = await ResourceOptimization.create(data);
    await logAuditEvent({
      action: 'cost.optimization.create', category: 'financial',
      entityType: 'ResourceOptimization', entityId: opt._id,
      description: `Created optimization: ${opt.name}`,
      status: 'success',
    });
    return opt;
  }

  async updateResourceOptimization(id, data) {
    const opt = await ResourceOptimization.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!opt) throw new Error('ResourceOptimization not found');
    await logAuditEvent({
      action: 'cost.optimization.update', category: 'financial',
      entityType: 'ResourceOptimization', entityId: id,
      description: `Updated optimization: ${opt.name}`,
      status: 'success',
    });
    return opt;
  }

  async listResourceOptimizations(filter = {}) {
    const { type, status, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ResourceOptimization.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ResourceOptimization.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async calculatePotentialSavings() {
    const pending = await CostRecommendation.find({ status: 'pending' }).lean();
    const totalSavings = pending.reduce((s, r) => s + (r.estimatedSavings || 0), 0);
    return {
      totalSavings,
      count: pending.length,
      byType: pending.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + (r.estimatedSavings || 0);
        return acc;
      }, {}),
      currency: 'USD',
    };
  }

  async generateCostReport(period = 30) {
    const [breakdown, costs, recs, optimizations, savings] = await Promise.all([
      this.getCostBreakdown(period),
      this.listResourceCosts({ start: new Date(Date.now() - period * 86400000).toISOString(), limit: 1000 }),
      this.listCostRecommendations({ limit: 1000 }),
      this.listResourceOptimizations({ limit: 1000 }),
      this.calculatePotentialSavings(),
    ]);
    const totalCost = costs.items.reduce((s, c) => s + (c.cost ? c.cost.monthly || 0 : 0), 0);
    return {
      period,
      generatedAt: new Date(),
      totalCost,
      breakdown,
      recommendations: recs.items.length,
      optimizations: optimizations.items.length,
      pendingSavings: savings,
      summary: `Total monthly cost: $${Math.round(totalCost)}, pending savings: $${Math.round(savings.totalSavings)}`,
    };
  }

  async getWasteAnalysis() {
    const resources = await ResourceCost.find({}).lean();
    const wasteItems = resources.filter(r => r.metrics && r.metrics.waste > 0);
    const totalWaste = wasteItems.reduce((s, r) => s + (r.cost ? r.cost.monthly * (r.metrics.waste / 100) : 0), 0);
    return {
      totalWaste,
      wasteCount: wasteItems.length,
      items: wasteItems.map(r => ({
        id: r._id, name: r.name, type: r.type,
        waste: r.metrics ? r.metrics.waste : 0,
        wastedCost: r.cost ? Math.round(r.cost.monthly * (r.metrics.waste / 100) * 100) / 100 : 0,
        utilization: r.metrics ? r.metrics.utilization : 0,
      })).sort((a, b) => b.wastedCost - a.wastedCost),
    };
  }

  async getEfficiencyScore() {
    const resources = await ResourceCost.find({}).lean();
    if (resources.length === 0) return { score: 100, resources: 0 };
    const totalEfficiency = resources.reduce((s, r) => s + (r.metrics && r.metrics.efficiency ? r.metrics.efficiency : 100), 0);
    const score = Math.round((totalEfficiency / resources.length) * 100) / 100;
    return { score, resources: resources.length, level: score >= 80 ? 'good' : score >= 50 ? 'fair' : 'poor' };
  }
}

export const costOptimizationService = new CostOptimizationService();
