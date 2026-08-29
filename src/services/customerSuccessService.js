import mongoose from 'mongoose';
import { CustomerHealth } from '../models/CustomerHealth.js';
import { SuccessPlan } from '../models/SuccessPlan.js';
import { CustomerJourney } from '../models/CustomerJourney.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class CustomerSuccessService {
  async calculateHealthScore(tenantId) {
    const metrics = await this._gatherMetrics(tenantId);
    const productAdoption = metrics.productAdoption || 0;
    const activeUsers = Math.min((metrics.activeUsers || 0) / 100, 1) * 100;
    const loginFrequency = Math.min((metrics.loginFrequency || 0) / 10, 1) * 100;
    const featureUsage = Math.min((metrics.featureUsage || 0) / 20, 1) * 100;
    const supportTickets = Math.max(0, 100 - (metrics.supportTickets || 0) * 10);
    const dataGrowth = Math.min((metrics.dataGrowth || 0) / 1000, 1) * 100;
    const weights = { productAdoption: 0.25, activeUsers: 0.2, loginFrequency: 0.15, featureUsage: 0.2, supportTickets: 0.1, dataGrowth: 0.1 };
    const healthScore = Math.round(
      productAdoption * weights.productAdoption +
      activeUsers * weights.activeUsers +
      loginFrequency * weights.loginFrequency +
      featureUsage * weights.featureUsage +
      supportTickets * weights.supportTickets +
      dataGrowth * weights.dataGrowth
    );
    const riskLevel = healthScore >= 80 ? 'low' : healthScore >= 60 ? 'medium' : healthScore >= 40 ? 'high' : 'critical';
    const health = await CustomerHealth.findOneAndUpdate(
      { tenant: tenantId },
      {
        $set: {
          healthScore,
          riskLevel,
          'metrics.productAdoption': productAdoption,
          'metrics.activeUsers': metrics.activeUsers || 0,
          'metrics.loginFrequency': metrics.loginFrequency || 0,
          'metrics.featureUsage': metrics.featureUsage || 0,
          'metrics.supportTickets': metrics.supportTickets || 0,
          'metrics.dataGrowth': metrics.dataGrowth || 0,
          lastCalculated: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    await logAuditEvent({
      action: 'customersuccess.health.calculate', category: 'system',
      entityType: 'CustomerHealth', entityId: health._id,
      newValue: { tenant: tenantId, healthScore, riskLevel, metrics },
      description: `Health score calculated for tenant ${tenantId}: ${healthScore} (${riskLevel})`,
    });
    return health;
  }

  async getHealth(tenantId) {
    let health = await CustomerHealth.findOne({ tenant: tenantId }).lean();
    if (!health) {
      health = await this.calculateHealthScore(tenantId);
    }
    return health;
  }

  async listHealth(filter = {}) {
    const { page = 1, limit = 20, riskLevel, minScore, maxScore, tenantId } = filter;
    const query = {};
    if (riskLevel) query.riskLevel = riskLevel;
    if (minScore !== undefined) query.healthScore = { ...query.healthScore, $gte: Number(minScore) };
    if (maxScore !== undefined) query.healthScore = { ...query.healthScore, $lte: Number(maxScore) };
    if (tenantId) query.tenant = tenantId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CustomerHealth.find(query).sort({ lastCalculated: -1 }).skip(skip).limit(Number(limit)).lean(),
      CustomerHealth.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createSuccessPlan(data) {
    const plan = await SuccessPlan.create(data);
    await logAuditEvent({
      action: 'customersuccess.plan.create', category: 'system',
      entityType: 'SuccessPlan', entityId: plan._id,
      newValue: { tenant: data.tenant, name: plan.name, type: plan.type },
      description: `Success plan "${plan.name}" created for tenant ${data.tenant}`,
    });
    return plan;
  }

  async updateSuccessPlan(id, data) {
    const plan = await SuccessPlan.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!plan) throw new Error('Success plan not found');
    return plan;
  }

  async getSuccessPlan(id) {
    const plan = await SuccessPlan.findById(id).populate('assignedTo', 'name email').populate('tenant', 'name').lean();
    if (!plan) throw new Error('Success plan not found');
    return plan;
  }

  async listSuccessPlans(tenantId) {
    return SuccessPlan.find({ tenant: tenantId }).sort({ createdAt: -1 }).lean();
  }

  async recordMilestone(planId, milestoneName) {
    const plan = await SuccessPlan.findById(planId);
    if (!plan) throw new Error('Success plan not found');
    const milestone = plan.milestones.find(m => m.name === milestoneName);
    if (!milestone) throw new Error(`Milestone "${milestoneName}" not found`);
    milestone.completedAt = new Date();
    milestone.status = 'completed';
    await plan.save();
    const allCompleted = plan.milestones.every(m => m.status === 'completed');
    if (allCompleted) {
      plan.status = 'completed';
      plan.completedDate = new Date();
      await plan.save();
    }
    await logAuditEvent({
      action: 'customersuccess.milestone.complete', category: 'system',
      entityType: 'SuccessPlan', entityId: planId,
      newValue: { milestone: milestoneName, planCompleted: allCompleted },
      description: `Milestone "${milestoneName}" completed in plan "${plan.name}"`,
    });
    return plan;
  }

  async getCustomerJourney(tenantId) {
    let journey = await CustomerJourney.findOne({ tenant: tenantId }).lean();
    if (!journey) {
      journey = await CustomerJourney.create({ tenant: tenantId, stage: 'lead' });
    }
    return journey;
  }

  async updateJourneyStage(tenantId, stage) {
    const validStages = ['lead', 'trial', 'onboarding', 'active', 'expansion', 'churned', 'reactivated'];
    if (!validStages.includes(stage)) throw new Error(`Invalid stage "${stage}"`);
    let journey = await CustomerJourney.findOne({ tenant: tenantId });
    if (!journey) {
      journey = await CustomerJourney.create({ tenant: tenantId, stage });
    }
    const previousStage = journey.stage;
    if (previousStage !== stage) {
      const now = new Date();
      const currentStageEntry = journey.stages.find(s => s.name === previousStage && !s.exitedAt);
      if (currentStageEntry) {
        currentStageEntry.exitedAt = now;
        currentStageEntry.duration = Math.round((now - currentStageEntry.enteredAt) / 86400000);
      }
      journey.stages.push({
        name: stage,
        enteredAt: now,
        exitedAt: null,
        duration: 0,
        actions: [],
      });
      journey.stage = stage;
      await journey.save();
    }
    await logAuditEvent({
      action: 'customersuccess.journey.stage', category: 'system',
      entityType: 'CustomerJourney', entityId: journey._id,
      newValue: { tenant: tenantId, previousStage, newStage: stage },
      description: `Journey stage for tenant ${tenantId}: ${previousStage} → ${stage}`,
    });
    return journey;
  }

  async recordTouchpoint(tenantId, touchpoint) {
    let journey = await CustomerJourney.findOne({ tenant: tenantId });
    if (!journey) {
      journey = await CustomerJourney.create({ tenant: tenantId, stage: 'lead' });
    }
    journey.touchpoints.push({
      type: touchpoint.type,
      channel: touchpoint.channel,
      description: touchpoint.description,
      timestamp: new Date(),
      satisfaction: touchpoint.satisfaction || null,
    });
    await journey.save();
    await logAuditEvent({
      action: 'customersuccess.touchpoint.record', category: 'system',
      entityType: 'CustomerJourney', entityId: journey._id,
      newValue: { tenant: tenantId, type: touchpoint.type, channel: touchpoint.channel },
      description: `Touchpoint "${touchpoint.type}" recorded for tenant ${tenantId}`,
    });
    return journey;
  }

  async generateRecommendations(healthId) {
    const health = await CustomerHealth.findById(healthId);
    if (!health) throw new Error('Health record not found');
    const recommendations = [];
    if ((health.metrics?.productAdoption || 0) < 40) {
      recommendations.push({ type: 'adoption', title: 'Improve Product Adoption', description: 'Low product adoption detected. Consider onboarding sessions.', priority: 'high', status: 'open', createdAt: new Date() });
    }
    if ((health.metrics?.loginFrequency || 0) < 3) {
      recommendations.push({ type: 'engagement', title: 'Increase Login Frequency', description: 'Users are logging in infrequently. Consider engagement campaign.', priority: 'medium', status: 'open', createdAt: new Date() });
    }
    if ((health.metrics?.supportTickets || 0) > 5) {
      recommendations.push({ type: 'support', title: 'Reduce Support Tickets', description: 'High support ticket volume. Review common issues.', priority: 'high', status: 'open', createdAt: new Date() });
    }
    if ((health.metrics?.featureUsage || 0) < 5) {
      recommendations.push({ type: 'feature', title: 'Increase Feature Adoption', description: 'Low feature usage. Highlight key features.', priority: 'medium', status: 'open', createdAt: new Date() });
    }
    if ((health.metrics?.activeUsers || 0) < 10) {
      recommendations.push({ type: 'growth', title: 'Grow Active Users', description: 'Low active user count. Consider expansion strategies.', priority: 'low', status: 'open', createdAt: new Date() });
    }
    health.recommendations = recommendations;
    await health.save();
    return recommendations;
  }

  async calculateRenewalProbability(healthId) {
    const health = await CustomerHealth.findById(healthId);
    if (!health) throw new Error('Health record not found');
    const score = health.healthScore || 50;
    const factorA = Math.min(score / 100, 1);
    const factorB = Math.min((health.metrics?.loginFrequency || 0) / 20, 1);
    const factorC = Math.max(0, 1 - (health.metrics?.supportTickets || 0) / 20);
    const factorD = Math.min((health.metrics?.featureUsage || 0) / 30, 1);
    const probability = Math.round((factorA * 0.4 + factorB * 0.2 + factorC * 0.2 + factorD * 0.2) * 100);
    health.metrics.renewalProbability = probability;
    await health.save();
    return { tenant: health.tenant, healthScore: score, renewalProbability: probability, calculatedAt: new Date() };
  }

  async calculateChurnRisk(healthId) {
    const health = await CustomerHealth.findById(healthId);
    if (!health) throw new Error('Health record not found');
    const score = health.healthScore || 50;
    const baseRisk = 100 - score;
    const ticketFactor = Math.min((health.metrics?.supportTickets || 0) * 5, 20);
    const loginFactor = Math.max(0, 10 - (health.metrics?.loginFrequency || 0)) * 3;
    const adoptionFactor = Math.max(0, 50 - (health.metrics?.productAdoption || 0)) * 0.3;
    const churnRisk = Math.min(100, Math.max(0, Math.round(baseRisk + ticketFactor + loginFactor + adoptionFactor)));
    health.metrics.churnRisk = churnRisk;
    await health.save();
    return { tenant: health.tenant, healthScore: score, churnRisk, riskLevel: churnRisk >= 70 ? 'high' : churnRisk >= 40 ? 'medium' : 'low', calculatedAt: new Date() };
  }

  async getAtRiskTenants(threshold = 60) {
    const records = await CustomerHealth.find({
      'metrics.churnRisk': { $gte: threshold },
    }).sort({ 'metrics.churnRisk': -1 }).populate('tenant', 'name email').lean();
    return records.map(r => ({
      tenant: r.tenant,
      healthScore: r.healthScore,
      churnRisk: r.metrics?.churnRisk,
      riskLevel: r.riskLevel,
      lastCalculated: r.lastCalculated,
    }));
  }

  async getExpansionOpportunities() {
    const records = await CustomerHealth.find({
      healthScore: { $gte: 70 },
      'metrics.churnRisk': { $lte: 30 },
      'metrics.expansionOpportunities': { $exists: true },
    }).sort({ healthScore: -1 }).populate('tenant', 'name email').lean();
    return records.map(r => ({
      tenant: r.tenant,
      healthScore: r.healthScore,
      expansionScore: r.metrics?.expansionOpportunities || 0,
      activeUsers: r.metrics?.activeUsers,
      lastCalculated: r.lastCalculated,
    }));
  }

  async recalculateAllHealth() {
    const tenants = await CustomerHealth.distinct('tenant');
    let updated = 0;
    for (const tenantId of tenants) {
      if (!tenantId) continue;
      try {
        await this.calculateHealthScore(tenantId);
        updated++;
      } catch (err) {
        logger.error(`Health recalculation failed for tenant ${tenantId}: ${err.message}`);
      }
    }
    logger.info(`Recalculated health for ${updated} tenants`);
    return { total: tenants.length, updated };
  }

  async _gatherMetrics(tenantId) {
    const metrics = { productAdoption: 0, activeUsers: 0, loginFrequency: 0, featureUsage: 0, supportTickets: 0, dataGrowth: 0 };
    try {
      const health = await CustomerHealth.findOne({ tenant: tenantId }).lean();
      if (health?.metrics) {
        Object.assign(metrics, health.metrics);
      }
    } catch {
    }
    try {
      const AuditLog = mongoose.model('AuditLog');
      const last30d = new Date(Date.now() - 30 * 86400000);
      const loginCount = await AuditLog.countDocuments({
        userId: tenantId,
        action: 'login',
        createdAt: { $gte: last30d },
      });
      metrics.loginFrequency = Math.round(loginCount / 30);
      const userCount = await mongoose.model('User').countDocuments({ tenant: tenantId, isActive: true });
      metrics.activeUsers = userCount;
    } catch {
    }
    return metrics;
  }
}

export const customerSuccessService = new CustomerSuccessService();
