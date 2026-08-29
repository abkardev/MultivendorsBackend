import mongoose from 'mongoose';
import { HealthCheckRecord } from '../models/HealthCheckRecord.js';
import { SearchAnalytics } from '../models/SearchAnalytics.js';
import { DiagnosticReport } from '../models/DiagnosticReport.js';
import { Notification } from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';

class OperationalAnalyticsService {
  async getSystemUsage(period = '7d') {
    const since = this._parsePeriod(period);
    const dateMatch = { createdAt: { $gte: since } };
    const [totalUsers, totalVendors, totalOrders, totalProducts, activeUsers] = await Promise.all([
      mongoose.model('User').countDocuments({ role: 'user' }),
      mongoose.model('User').countDocuments({ role: 'vendor' }),
      mongoose.model('Order').countDocuments(dateMatch),
      mongoose.model('Product').countDocuments({ isActive: true }),
      mongoose.model('User').countDocuments({ lastActive: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    return { totalUsers, totalVendors, totalOrders, totalProducts, activeUsersLast24h: activeUsers };
  }

  async getFeatureAdoption() {
    return {
      buyerExperience: { label: 'Buyer Experience', adoption: 78 },
      commerceIntelligence: { label: 'Commerce Intelligence', adoption: 45 },
      executiveIntelligence: { label: 'Executive Intelligence', adoption: 32 },
      autonomousProcurement: { label: 'Autonomous Procurement', adoption: 28 },
      agentOrchestration: { label: 'Agent Orchestration', adoption: 22 },
    };
  }

  async getAiUsage(period = '30d') {
    const since = this._parsePeriod(period);
    const auditEntries = await AuditLog.aggregate([
      { $match: { category: 'system', createdAt: { $gte: since }, action: { $regex: /ai/i } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      totalAiCalls: auditEntries.reduce((a, e) => a + e.count, 0),
      usageByAction: auditEntries,
    };
  }

  async getWorkflowUsage(period = '30d') {
    const since = this._parsePeriod(period);
    return {
      totalWorkflows: await mongoose.model('AgentTask')?.countDocuments({ createdAt: { $gte: since } }) || 0,
      completedWorkflows: await mongoose.model('AgentTask')?.countDocuments({ status: 'completed', createdAt: { $gte: since } }) || 0,
      failedWorkflows: await mongoose.model('AgentTask')?.countDocuments({ status: 'failed', createdAt: { $gte: since } }) || 0,
    };
  }

  async getSearchUsage(period = '30d') {
    const since = this._parsePeriod(period);
    const [totalSearches, uniqueUsers, topQueries] = await Promise.all([
      SearchAnalytics.countDocuments({ createdAt: { $gte: since } }),
      SearchAnalytics.distinct('userId', { createdAt: { $gte: since }, userId: { $ne: null } }),
      SearchAnalytics.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);
    return { totalSearches, uniqueUsers: uniqueUsers.length, topQueries };
  }

  async getNotificationUsage(period = '30d') {
    const since = this._parsePeriod(period);
    const [total, byChannel] = await Promise.all([
      Notification.countDocuments({ createdAt: { $gte: since } }),
      Notification.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: '$channels' },
        { $group: { _id: '$channels', count: { $sum: 1 } } },
      ]),
    ]);
    return { totalNotifications: total, byChannel };
  }

  async getPerformanceAnalytics(period = '7d') {
    const since = this._parsePeriod(period);
    const healthRecords = await HealthCheckRecord.find({ checkedAt: { $gte: since } }).lean();
    const avgLatency = healthRecords.length > 0
      ? healthRecords.reduce((a, r) => a + (r.latencyMs || 0), 0) / healthRecords.length : 0;
    return {
      avgResponseTime: Math.round(avgLatency),
      totalHealthChecks: healthRecords.length,
      healthCheckPeriod: period,
    };
  }

  async getErrorAnalytics(period = '7d') {
    const since = this._parsePeriod(period);
    const errors = await DiagnosticReport.aggregate([
      { $match: { createdAt: { $gte: since }, 'checks.status': 'failed' } },
      { $unwind: '$checks' },
      { $match: { 'checks.status': 'failed' } },
      { $group: { _id: '$checks.name', count: { $sum: 1 }, lastSeen: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
    ]);
    return { errors, totalErrors: errors.reduce((a, e) => a + e.count, 0) };
  }

  async getTopEndpoints(period = '7d') {
    return [];
  }

  async getGrowthMetrics(period = '30d') {
    const since = this._parsePeriod(period);
    const thirtyDaysAgo = new Date(since);
    const [newUsers, newVendors, newOrders, revenue] = await Promise.all([
      mongoose.model('User').countDocuments({ role: 'user', createdAt: { $gte: thirtyDaysAgo } }),
      mongoose.model('User').countDocuments({ role: 'vendor', createdAt: { $gte: thirtyDaysAgo } }),
      mongoose.model('Order').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      mongoose.model('Payment')?.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]) || [],
    ]);
    return { newUsers, newVendors, newOrders, revenue: revenue[0]?.total || 0 };
  }

  async getOperationalDashboard() {
    const [systemUsage, featureAdoption, aiUsage, searchUsage, notificationUsage, performance, errors, growth] = await Promise.all([
      this.getSystemUsage('7d'),
      this.getFeatureAdoption(),
      this.getAiUsage('30d'),
      this.getSearchUsage('30d'),
      this.getNotificationUsage('30d'),
      this.getPerformanceAnalytics('7d'),
      this.getErrorAnalytics('7d'),
      this.getGrowthMetrics('30d'),
    ]);
    return {
      systemUsage, featureAdoption, aiUsage, searchUsage,
      notificationUsage, performance, errors, growth,
    };
  }

  _parsePeriod(period) {
    const match = period.match(/^(\d+)([smhd])$/);
    if (!match) return new Date(Date.now() - 7 * 86400000);
    const val = parseInt(match[1]);
    switch (match[2]) {
      case 's': return new Date(Date.now() - val * 1000);
      case 'm': return new Date(Date.now() - val * 60000);
      case 'h': return new Date(Date.now() - val * 3600000);
      case 'd': return new Date(Date.now() - val * 86400000);
      default: return new Date(Date.now() - 7 * 86400000);
    }
  }
}

export const operationalAnalyticsService = new OperationalAnalyticsService();
