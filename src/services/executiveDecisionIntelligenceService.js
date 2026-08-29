import mongoose from 'mongoose';
import { EnterpriseInsight } from '../models/EnterpriseInsight.js';
import { EnterpriseKpi } from '../models/EnterpriseKpi.js';
import { BusinessForecast } from '../models/BusinessForecast.js';
import { BenchmarkReport } from '../models/BenchmarkReport.js';
import { OptimizationRecommendation } from '../models/OptimizationRecommendation.js';
import { logAuditEvent } from './auditService.js';

class ExecutiveDecisionIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 20 * 60 * 1000;
  }

  async generateDecisionPriorities() {
    const [kpis, insights, optimizations] = await Promise.all([
      EnterpriseKpi.find({ status: { $in: ['at_risk', 'critical'] } }).sort({ createdAt: -1 }).limit(20).lean(),
      EnterpriseInsight.find({ status: 'active', severity: { $in: ['critical', 'important'] } }).sort({ generatedAt: -1 }).limit(20).lean(),
      OptimizationRecommendation.find({ status: { $in: ['identified', 'analyzing', 'recommended'] }, priority: { $in: ['critical', 'high'] } }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);
    const priorities = [];
    for (const kpi of kpis) {
      const gap = kpi.target && kpi.value ? ((kpi.target - kpi.value) / kpi.target) * 100 : 0;
      priorities.push({
        type: 'kpi_gap',
        source: 'KPI',
        title: `KPI Gap: ${kpi.name}`,
        description: `${kpi.name} is ${kpi.status} (current: ${kpi.value}, target: ${kpi.target})`,
        urgency: kpi.status === 'critical' ? 90 : 65,
        impact: Math.abs(gap),
        confidence: 85,
        relatedMetric: kpi.name,
        category: kpi.category,
      });
    }
    for (const insight of insights) {
      priorities.push({
        type: 'insight_alert',
        source: 'EnterpriseInsight',
        title: insight.title,
        description: insight.description,
        urgency: insight.severity === 'critical' ? 85 : 60,
        impact: insight.confidence || 70,
        confidence: insight.confidence || 75,
        relatedMetric: insight.evidence?.[0]?.metric || 'general',
        category: insight.type,
      });
    }
    for (const opt of optimizations) {
      priorities.push({
        type: 'optimization_opportunity',
        source: 'OptimizationRecommendation',
        title: opt.title,
        description: opt.description,
        urgency: opt.priority === 'critical' ? 80 : 55,
        impact: opt.estimatedSavings?.amount || 50,
        confidence: 70,
        relatedMetric: opt.type,
        category: opt.category || 'general',
      });
    }
    priorities.sort((a, b) => (b.urgency * 0.4 + b.impact * 0.3 + b.confidence * 0.3) - (a.urgency * 0.4 + a.impact * 0.3 + a.confidence * 0.3));
    return {
      priorities: priorities.slice(0, 15),
      totalEvaluated: { kpis: kpis.length, insights: insights.length, optimizations: optimizations.length },
      generatedAt: new Date(),
    };
  }

  async analyzeRiskEvolution() {
    const [criticalInsights, recentInsights, kpis] = await Promise.all([
      EnterpriseInsight.find({ severity: 'critical' }).sort({ generatedAt: -1 }).lean(),
      EnterpriseInsight.find().sort({ generatedAt: -1 }).limit(50).lean(),
      EnterpriseKpi.find({ status: { $in: ['at_risk', 'critical'] } }).lean(),
    ]);
    const riskTimeline = {};
    for (const insight of recentInsights) {
      const dateKey = insight.generatedAt ? insight.generatedAt.toISOString().slice(0, 10) : 'unknown';
      if (!riskTimeline[dateKey]) riskTimeline[dateKey] = { total: 0, critical: 0, important: 0 };
      riskTimeline[dateKey].total++;
      if (insight.severity === 'critical') riskTimeline[dateKey].critical++;
      if (insight.severity === 'important') riskTimeline[dateKey].important++;
    }
    const dates = Object.keys(riskTimeline).sort();
    const trend = dates.length > 1 ? (
      riskTimeline[dates[dates.length - 1]].critical > riskTimeline[dates[0]].critical ? 'increasing' : 'decreasing'
    ) : 'stable';
    return {
      currentRisks: criticalInsights.slice(0, 10),
      riskTimeline: dates.map(d => ({ date: d, ...riskTimeline[d] })),
      trend,
      totalCriticalRisks: criticalInsights.length,
      atRiskKpis: kpis.map(k => ({ name: k.name, status: k.status, value: k.value, target: k.target })),
      generatedAt: new Date(),
    };
  }

  async identifyInvestmentOpportunities() {
    const [benchmarks, forecasts, vendors, products] = await Promise.all([
      BenchmarkReport.findOne({ type: 'monthly' }).sort({ 'period.start': -1 }).lean(),
      BusinessForecast.find({ type: { $in: ['revenue', 'growth'] }, trend: 'up' }).sort({ generatedAt: -1 }).limit(5).lean(),
      Vendor.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
    ]);
    const opportunities = [];
    if (benchmarks?.categories) {
      const revenueCat = benchmarks.categories.find(c => c.name === 'Total Revenue');
      const userCat = benchmarks.categories.find(c => c.name === 'New Users');
      const vendorCat = benchmarks.categories.find(c => c.name === 'New Vendors');
      if (revenueCat && revenueCat.growth > 10) {
        opportunities.push({
          area: 'Revenue Growth',
          type: 'investment',
          confidence: 80,
          signal: `${revenueCat.growth.toFixed(1)}% revenue growth`,
          evidence: `Revenue grew from ${revenueCat.previousValue?.toFixed(2)} to ${revenueCat.currentValue.toFixed(2)}`,
          priority: revenueCat.growth > 20 ? 'high' : 'medium',
        });
      }
      if (userCat && userCat.growth > 15) {
        opportunities.push({
          area: 'User Acquisition',
          type: 'investment',
          confidence: 75,
          signal: `${userCat.growth.toFixed(1)}% new user growth`,
          evidence: `${userCat.currentValue} new users vs ${userCat.previousValue} previous period`,
          priority: 'high',
        });
      }
      if (vendorCat && vendorCat.growth > 10) {
        opportunities.push({
          area: 'Vendor Expansion',
          type: 'investment',
          confidence: 70,
          signal: `${vendorCat.growth.toFixed(1)}% vendor growth`,
          evidence: `${vendorCat.currentValue} new vendors joined`,
          priority: 'medium',
        });
      }
    }
    if (forecasts.length > 0) {
      opportunities.push({
        area: 'Market Expansion',
        type: 'growth',
        confidence: 65,
        signal: `${forecasts.length} positive trend forecasts detected`,
        evidence: `Forecasts for ${forecasts.map(f => f.type).join(', ')} show upward trends`,
        priority: 'medium',
      });
    }
    opportunities.push({
      area: 'Product Catalog',
      type: 'inventory',
      confidence: 60,
      signal: `${products} active products from ${vendors} vendors`,
      evidence: `Marketplace has ${products} products across ${vendors} vendors`,
      priority: 'low',
    });
    return { opportunities, totalOpportunities: opportunities.length, generatedAt: new Date() };
  }

  async identifyOperationalImprovements() {
    const recommendations = await OptimizationRecommendation.find({
      status: { $in: ['identified', 'analyzing', 'recommended'] },
    }).sort({ priority: 1, createdAt: -1 }).limit(20).lean();
    const grouped = { critical: [], high: [], medium: [], low: [] };
    for (const rec of recommendations) {
      const priority = rec.priority || 'medium';
      if (grouped[priority]) grouped[priority].push(rec);
    }
    return {
      improvements: recommendations.map(r => ({
        id: r._id.toString(),
        title: r.title,
        description: r.description,
        priority: r.priority,
        type: r.type,
        estimatedSavings: r.estimatedSavings,
        status: r.status,
      })),
      summary: {
        total: recommendations.length,
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
        low: grouped.low.length,
      },
      generatedAt: new Date(),
    };
  }

  async identifyCostReductions() {
    const recommendations = await OptimizationRecommendation.find({
      type: { $in: ['cost', 'performance', 'capacity'] },
      status: { $in: ['identified', 'recommended', 'approved'] },
    }).sort({ priority: 1, createdAt: -1 }).lean();
    const totalEstimatedSavings = recommendations.reduce((s, r) => s + (r.estimatedSavings?.amount || 0), 0);
    const byCategory = {};
    for (const rec of recommendations) {
      const cat = rec.type || 'other';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, savings: 0 };
      byCategory[cat].count++;
      byCategory[cat].savings += rec.estimatedSavings?.amount || 0;
    }
    return {
      opportunities: recommendations.map(r => ({
        id: r._id.toString(),
        title: r.title,
        type: r.type,
        estimatedSavings: r.estimatedSavings,
        priority: r.priority,
        status: r.status,
      })),
      totalEstimatedSavings,
      savingsByCategory: Object.entries(byCategory).map(([category, data]) => ({ category, ...data })),
      generatedAt: new Date(),
    };
  }

  async identifyRevenueOpportunities() {
    const [forecasts, benchmarks] = await Promise.all([
      BusinessForecast.find({ type: 'revenue' }).sort({ generatedAt: -1 }).limit(3).lean(),
      BenchmarkReport.findOne({ type: 'monthly' }).sort({ 'period.start': -1 }).lean(),
    ]);
    const opportunities = [];
    if (forecasts.length > 0) {
      const latest = forecasts[0];
      const totalProjected = latest.values?.reduce((s, v) => s + (v.predicted || 0), 0) || 0;
      opportunities.push({
        source: 'Forecast',
        title: 'Revenue Growth Opportunity',
        description: `Projected ${latest.trend === 'up' ? 'growth' : 'stability'} based on trend analysis`,
        projectedRevenue: totalProjected,
        confidence: latest.confidence || 70,
        trend: latest.trend,
      });
    }
    if (benchmarks?.categories) {
      const revenueCat = benchmarks.categories.find(c => c.name === 'Total Revenue');
      const aovCat = benchmarks.categories.find(c => c.name === 'Average Order Value');
      if (revenueCat && revenueCat.growth > 0) {
        opportunities.push({
          source: 'Benchmark',
          title: 'Revenue Momentum',
          description: `${revenueCat.growth.toFixed(1)}% revenue growth over previous period`,
          growthRate: revenueCat.growth,
          confidence: 80,
        });
      }
      if (aovCat) {
        opportunities.push({
          source: 'Benchmark',
          title: 'Value Optimization',
          description: `Average order value is ${aovCat.currentValue?.toFixed(2)} (${aovCat.trend === 'up' ? 'improving' : 'needs attention'})`,
          currentAov: aovCat.currentValue,
          trend: aovCat.trend,
          confidence: 75,
        });
      }
    }
    return { opportunities, totalOpportunities: opportunities.length, generatedAt: new Date() };
  }

  async getDecisionIntelligenceDashboard() {
    const [priorities, risks, investments, operations, costs, revenue] = await Promise.all([
      this.generateDecisionPriorities(),
      this.analyzeRiskEvolution(),
      this.identifyInvestmentOpportunities(),
      this.identifyOperationalImprovements(),
      this.identifyCostReductions(),
      this.identifyRevenueOpportunities(),
    ]);
    return {
      decisionPriorities: priorities,
      riskEvolution: risks,
      investmentOpportunities: investments,
      operationalImprovements: operations,
      costReductions: costs,
      revenueOpportunities: revenue,
      generatedAt: new Date(),
    };
  }
}

export default new ExecutiveDecisionIntelligenceService();
