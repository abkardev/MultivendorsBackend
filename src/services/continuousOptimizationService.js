import mongoose from 'mongoose';
import { OptimizationRecommendation } from '../models/OptimizationRecommendation.js';
import { OptimizationAction } from '../models/OptimizationAction.js';
import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { Message } from '../models/Message.js';
import { WorkflowDefinition } from '../models/WorkflowDefinition.js';
import { logAuditEvent } from './auditService.js';

class ContinuousOptimizationService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
    this.ADOPTION_THRESHOLD = 0.3;
    this.WORKFLOW_DURATION_THRESHOLD_MS = 30 * 60 * 1000;
  }

  async detectUnusedFeatures(period = 90) {
    const since = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    const features = [
      { key: 'escrow', field: 'paymentMethods', value: 'escrow' },
      { key: 'bulk_ordering', field: 'items.count', value: 5 },
      { key: 'rfq', model: 'Announcement' },
      { key: 'quotation', model: 'Quotation' },
      { key: 'dispute', model: 'Dispute' },
    ];
    const results = [];
    for (const feature of features) {
      let count = 0;
      if (feature.model === 'Announcement') {
        const model = (await import('../models/announcementModel.js')).Announcement;
        count = await model.countDocuments({ createdAt: { $gte: since } });
      } else if (feature.model === 'Quotation') {
        const { Quotation } = await import('../models/Quotation.js');
        count = await Quotation.countDocuments({ createdAt: { $gte: since } });
      } else if (feature.model === 'Dispute') {
        const model = (await import('../models/Dispute.js')).default;
        count = await model.countDocuments({ createdAt: { $gte: since } });
      } else if (feature.key === 'escrow') {
        count = await Order.countDocuments({ paymentMethods: 'escrow', createdAt: { $gte: since } });
      } else if (feature.key === 'bulk_ordering') {
        const orders = await Order.find({ createdAt: { $gte: since } }).lean();
        count = orders.filter(o => (o.items || []).length >= 5).length;
      }
      if (count === 0) {
        results.push({ feature: feature.key, status: 'unused', periodDays: period, zeroUsageCount: count });
      }
    }
    return results;
  }

  async detectLowAdoption(features = ['escrow', 'bulk_ordering', 'rfq']) {
    const totalUsers = await User.countDocuments({ isActive: true });
    if (totalUsers === 0) return [];
    const results = [];
    for (const feature of features) {
      let usedBy = 0;
      if (feature === 'escrow') {
        usedBy = await Order.distinct('user', { paymentMethods: 'escrow' }).then(r => r.length);
      } else if (feature === 'bulk_ordering') {
        const orders = await Order.aggregate([
          { $match: { $expr: { $gte: [{ $size: '$items' }, 5] } } },
          { $group: { _id: '$user' } },
        ]);
        usedBy = orders.length;
      } else if (feature === 'rfq') {
        const { Announcement } = await import('../models/announcementModel.js');
        usedBy = await Announcement.distinct('user').then(r => r.length);
      }
      const adoptionRate = usedBy / totalUsers;
      if (adoptionRate < this.ADOPTION_THRESHOLD) {
        results.push({ feature, adoptionRate: Math.round(adoptionRate * 100), usersUsed: usedBy, totalUsers, status: 'low_adoption' });
      }
    }
    return results;
  }

  async detectSlowWorkflows(threshold) {
    const durThreshold = threshold || this.WORKFLOW_DURATION_THRESHOLD_MS;
    const slowWorkflows = await WorkflowDefinition.aggregate([
      {
        $lookup: {
          from: 'workflowexecutions',
          localField: '_id',
          foreignField: 'workflow',
          as: 'executions',
        },
      },
      { $unwind: '$executions' },
      {
        $match: {
          'executions.completedAt': { $ne: null },
          'executions.startedAt': { $ne: null },
        },
      },
      {
        $addFields: {
          durationMs: { $subtract: ['$executions.completedAt', '$executions.startedAt'] },
        },
      },
      { $match: { durationMs: { $gt: durThreshold } } },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          totalExecutions: { $sum: 1 },
          avgDurationMs: { $avg: '$durationMs' },
          maxDurationMs: { $max: '$durationMs' },
        },
      },
      { $sort: { avgDurationMs: -1 } },
    ]);
    return slowWorkflows.map(w => ({
      workflowId: w._id.toString(),
      name: w.name,
      totalSlowExecutions: w.totalExecutions,
      avgDurationMs: Math.round(w.avgDurationMs),
      maxDurationMs: Math.round(w.maxDurationMs),
      thresholdMs: durThreshold,
    }));
  }

  async detectDuplicateOperations() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const orderOps = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { user: '$user', status: '$status' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 3 } } },
      { $sort: { count: -1 } },
    ]);
    const messageOps = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: { sender: '$sender', channel: '$channel' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 20 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      duplicateOrderOperations: orderOps.map(o => ({
        userId: o._id.user.toString(),
        status: o._id.status,
        count: o.count,
        type: 'order',
      })),
      duplicateMessageOperations: messageOps.map(m => ({
        userId: m._id.sender.toString(),
        channelId: m._id.channel.toString(),
        count: m.count,
        type: 'message',
      })),
    };
  }

  async detectManualBottlenecks() {
    const workflows = await WorkflowDefinition.aggregate([
      {
        $lookup: {
          from: 'workflowexecutions',
          localField: '_id',
          foreignField: 'workflow',
          as: 'executions',
        },
      },
      { $unwind: '$executions' },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          totalSteps: { $first: { $size: { $ifNull: ['$steps', []] } } },
          executionCount: { $sum: 1 },
          manualApprovals: {
            $sum: {
              $cond: [{ $eq: ['$executions.status', 'pending_approval'] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          manualInterventionRate: {
            $cond: [{ $gt: ['$executionCount', 0] }, { $divide: ['$manualApprovals', '$executionCount'] }, 0],
          },
        },
      },
      { $match: { manualInterventionRate: { $gt: 0.5 } } },
      { $sort: { manualInterventionRate: -1 } },
    ]);
    return workflows.map(w => ({
      workflowId: w._id.toString(),
      name: w.name,
      totalSteps: w.totalSteps,
      executionCount: w.executionCount,
      manualApprovals: w.manualApprovals,
      manualInterventionRate: Math.round(w.manualInterventionRate * 100),
    }));
  }

  async generateImprovementRoadmap() {
    const [unused, lowAdoption, slowWorkflows, duplicates, bottlenecks] = await Promise.all([
      this.detectUnusedFeatures(),
      this.detectLowAdoption(),
      this.detectSlowWorkflows(),
      this.detectDuplicateOperations(),
      this.detectManualBottlenecks(),
    ]);
    const recommendations = [];
    for (const item of unused) {
      recommendations.push({
        type: 'adoption',
        priority: 'low',
        title: `Unused feature: ${item.feature}`,
        description: `Feature ${item.feature} had zero usage in the last ${item.periodDays} days. Consider deprecation or promotion.`,
        estimatedSavings: { amount: 0, period: 'monthly' },
      });
    }
    for (const item of lowAdoption) {
      recommendations.push({
        type: 'adoption',
        priority: item.adoptionRate < 10 ? 'high' : 'medium',
        title: `Low adoption: ${item.feature}`,
        description: `Feature ${item.feature} used by ${item.adoptionRate}% of users. Target: ${this.ADOPTION_THRESHOLD * 100}%.`,
        estimatedSavings: { amount: 0, period: 'monthly' },
      });
    }
    for (const item of slowWorkflows) {
      recommendations.push({
        type: 'workflow',
        priority: 'high',
        title: `Slow workflow: ${item.name}`,
        description: `Workflow ${item.name} averages ${Math.round(item.avgDurationMs / 1000)}s, exceeding ${item.thresholdMs / 1000}s threshold.`,
        estimatedSavings: { amount: 0, period: 'monthly' },
      });
    }
    for (const item of duplicates.duplicateOrderOperations) {
      recommendations.push({
        type: 'duplicate',
        priority: 'medium',
        title: `Duplicate ${item.status} orders by user ${item.userId.slice(-6)}`,
        description: `User performed ${item.count} ${item.status} orders in 7 days, indicating possible automation opportunity.`,
        estimatedSavings: { amount: 0, period: 'monthly' },
      });
    }
    for (const item of bottlenecks) {
      recommendations.push({
        type: 'workflow',
        priority: 'critical',
        title: `Manual bottleneck: ${item.name}`,
        description: `Workflow ${item.name} has ${item.manualInterventionRate}% manual intervention rate across ${item.executionCount} executions.`,
        estimatedSavings: { amount: 0, period: 'monthly' },
      });
    }
    return recommendations;
  }

  async createRecommendation(type, data) {
    const rec = await OptimizationRecommendation.create({
      type,
      title: data.title || `Optimization: ${type}`,
      description: data.description || '',
      priority: data.priority || 'medium',
      status: 'identified',
      impact: data.impact,
      effort: data.effort,
      estimatedSavings: data.estimatedSavings,
      source: data.source || 'auto_detect',
      evidence: data.evidence || [],
      suggestedAction: data.suggestedAction,
    });
    await logAuditEvent({
      action: 'create_optimization_recommendation',
      category: 'optimization',
      entityType: 'OptimizationRecommendation',
      entityId: rec._id.toString(),
      description: `Created ${type} recommendation: ${rec.title}`,
      status: 'success',
    });
    return rec;
  }

  async approveRecommendation(userId, id) {
    const rec = await OptimizationRecommendation.findByIdAndUpdate(
      id,
      { status: 'approved', approvedBy: new mongoose.Types.ObjectId(userId), approvedAt: new Date() },
      { new: true }
    );
    if (!rec) throw new Error('Recommendation not found');
    await logAuditEvent({
      userId,
      action: 'approve_recommendation',
      category: 'optimization',
      entityType: 'OptimizationRecommendation',
      entityId: id,
      description: `Approved recommendation: ${rec.title}`,
      status: 'success',
    });
    return rec;
  }

  async rejectRecommendation(userId, id, reason) {
    const rec = await OptimizationRecommendation.findByIdAndUpdate(
      id,
      { status: 'rejected', rejectionReason: reason },
      { new: true }
    );
    if (!rec) throw new Error('Recommendation not found');
    await logAuditEvent({
      userId,
      action: 'reject_recommendation',
      category: 'optimization',
      entityType: 'OptimizationRecommendation',
      entityId: id,
      description: `Rejected recommendation: ${rec.title}. Reason: ${reason}`,
      status: 'success',
    });
    return rec;
  }

  async implementRecommendation(userId, id) {
    const rec = await OptimizationRecommendation.findByIdAndUpdate(
      id,
      { status: 'implemented', implementedAt: new Date() },
      { new: true }
    );
    if (!rec) throw new Error('Recommendation not found');
    await logAuditEvent({
      userId,
      action: 'implement_recommendation',
      category: 'optimization',
      entityType: 'OptimizationRecommendation',
      entityId: id,
      description: `Implemented recommendation: ${rec.title}`,
      status: 'success',
    });
    const action = await OptimizationAction.create({
      recommendation: rec._id,
      action: rec.suggestedAction?.type || 'implement',
      status: 'in_progress',
      startedBy: new mongoose.Types.ObjectId(userId),
      startedAt: new Date(),
    });
    return { recommendation: rec, action };
  }

  async getRecommendations(filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;
    if (filters.source) query.source = filters.source;
    const sort = filters.sort || { createdAt: -1 };
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      OptimizationRecommendation.find(query).sort(sort).skip(skip).limit(limit).lean(),
      OptimizationRecommendation.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOptimizationDashboard() {
    const [stats, unused, lowAdoption, slowWorkflows, bottlenecks] = await Promise.all([
      OptimizationRecommendation.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
            implemented: { $sum: { $cond: [{ $eq: ['$status', 'implemented'] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          },
        },
      ]),
      this.detectUnusedFeatures(),
      this.detectLowAdoption(),
      this.detectSlowWorkflows(),
      this.detectManualBottlenecks(),
    ]);
    return {
      summary: stats[0] || { total: 0, critical: 0, high: 0, medium: 0, low: 0, approved: 0, implemented: 0, rejected: 0 },
      unusedFeatures: unused,
      lowAdoptionFeatures: lowAdoption,
      slowWorkflows,
      manualBottlenecks: bottlenecks,
      detectedAt: new Date(),
    };
  }
}

export default new ContinuousOptimizationService();
