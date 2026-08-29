import mongoose from 'mongoose';
import User from '../models/userModel.js';
import { UsageRecord } from '../models/UsageRecord.js';
import UserSession from '../models/UserSession.js';
import LoginHistory from '../models/LoginHistory.js';
import AuditLog from '../models/AuditLog.js';
import AgentTask from '../models/AgentTask.js';
import { Order } from '../models/orderModel.js';
import MarketplaceEvent from '../models/MarketplaceEvent.js';

const usageEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String, required: true },
  category: { type: String, required: true },
  module: { type: String, required: true },
  properties: { type: mongoose.Schema.Types.Mixed },
  sessionId: String,
  ip: String,
  userAgent: String,
  duration: Number,
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

usageEventSchema.index({ userId: 1, timestamp: -1 });
usageEventSchema.index({ event: 1, timestamp: -1 });
usageEventSchema.index({ module: 1, category: 1, timestamp: -1 });
usageEventSchema.index({ timestamp: -1 });

const UsageEvent = mongoose.models.UsageEvent || mongoose.model('UsageEvent', usageEventSchema);

class UsageIntelligenceService {
  async trackEvent(userId, event, category, module, properties = {}) {
    const entry = await UsageEvent.create({ userId, event, category, module, properties, timestamp: new Date() });
    return entry;
  }

  async _getDateRange(period) {
    const end = new Date();
    const map = {
      '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000, '90d': 90 * 86400000,
      '1y': 365 * 86400000, 'this_month': new Date(end.getFullYear(), end.getMonth(), 1).getTime(),
    };
    const ms = map[period] || 30 * 86400000;
    return { start: new Date(end.getTime() - ms), end };
  }

  async getFeatureAdoption(module, period) {
    const { start, end } = await this._getDateRange(period);
    const [totalUsers, activeUsers, events] = await Promise.all([
      User.countDocuments({ isActive: true }),
      UserSession.distinct('user', { lastActivity: { $gte: start, $lte: end } }),
      UsageEvent.aggregate([
        { $match: { timestamp: { $gte: start, $lte: end }, ...(module ? { module } : {}) } },
        { $group: { _id: '$event', uniqueUsers: { $addToSet: '$userId' }, count: { $sum: 1 } } },
        { $project: { event: '$_id', uniqueUserCount: { $size: '$uniqueUsers' }, totalCalls: '$count', adoptionRate: { $cond: [{ $gt: [{ $size: '$uniqueUsers' }, 0] }, { $multiply: [{ $divide: [{ $size: '$uniqueUsers' }, activeUsers.length || 1] }, 100] }, 0] } } },
        { $sort: { uniqueUserCount: -1 } },
      ]),
    ]);
    return { period, module, totalUsers: totalUsers, activeUsers: activeUsers.length, features: events };
  }

  async getModuleUsage(module, period) {
    const { start, end } = await this._getDateRange(period);
    const [events, daily] = await Promise.all([
      UsageEvent.aggregate([
        { $match: { module, timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
        { $project: { category: '$_id', count: 1, uniqueUsers: { $size: '$uniqueUsers' } } },
      ]),
      UsageEvent.aggregate([
        { $match: { module, timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    return { module, period, start, end, totalEvents: events.reduce((s, e) => s + e.count, 0), byCategory: events, dailyTrend: daily };
  }

  async getAiUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const [tasks, events] = await Promise.all([
      AgentTask.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$agent', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } }, avgDuration: { $avg: '$executionTime' } } },
      ]),
      UsageEvent.aggregate([
        { $match: { module: 'ai', timestamp: { $gte: start, $lte: end } } },
        { $group: { _id: null, count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
      ]),
    ]);
    return { period, start, end, byAgent: tasks, totals: { queries: tasks.reduce((s, t) => s + t.count, 0) + (events[0]?.count || 0), completed: tasks.reduce((s, t) => s + t.completed, 0), failed: tasks.reduce((s, t) => s + t.failed, 0), avgResponseTime: events[0]?.avgDuration || tasks.reduce((s, t) => s + (t.avgDuration || 0), 0) / (tasks.length || 1) } };
  }

  async getAutomationUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const tasks = await AgentTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, agent: { $in: ['automation', 'workflow'] } } },
      { $group: { _id: '$status', count: { $sum: 1 }, avgDuration: { $avg: '$executionTime' } } },
    ]);
    const daily = await AgentTask.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, agent: { $in: ['automation', 'workflow'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return { period, start, end, byStatus: tasks, dailyTrend: daily, total: tasks.reduce((s, t) => s + t.count, 0) };
  }

  async getWorkflowUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const [sessions, tasks] = await Promise.all([
      mongoose.model('AgentSession').aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AgentTask.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: '$action', count: { $sum: 1 }, avgDuration: { $avg: '$executionTime' } } },
      ]),
    ]);
    return { period, start, end, sessions: sessions, tasks: tasks, totalSessions: sessions.reduce((s, t) => s + t.count, 0), totalTasks: tasks.reduce((s, t) => s + t.count, 0) };
  }

  async getSearchUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const events = await UsageEvent.aggregate([
      { $match: { module: 'search', timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: '$event', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
    ]);
    const searchCount = events.find(e => e._id === 'search')?.count || 0;
    const noResultCount = events.find(e => e._id === 'search_no_results')?.count || 0;
    const clickCount = events.find(e => e._id === 'search_click')?.count || 0;
    return { period, start, end, totalSearches: searchCount, noResultRate: searchCount > 0 ? (noResultCount / searchCount) * 100 : 0, clickThroughRate: searchCount > 0 ? (clickCount / searchCount) * 100 : 0, byEvent: events };
  }

  async getNotificationUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const events = await UsageEvent.aggregate([
      { $match: { module: 'notification', timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);
    const delivered = events.find(e => e._id === 'notification_delivered')?.count || 0;
    const failed = events.find(e => e._id === 'notification_failed')?.count || 0;
    const opened = events.find(e => e._id === 'notification_opened')?.count || 0;
    const total = delivered + failed;
    return { period, start, end, total, delivered, failed, opened, deliveryRate: total > 0 ? (delivered / total) * 100 : 0, openRate: delivered > 0 ? (opened / delivered) * 100 : 0 };
  }

  async getDashboardUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const events = await UsageEvent.aggregate([
      { $match: { module: 'dashboard', timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: { dashboard: '$properties.dashboardName', event: '$event' }, count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
    ]);
    const daily = await UsageEvent.aggregate([
      { $match: { module: 'dashboard', timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return { period, start, end, byDashboard: events, dailyTrend: daily, totalViews: events.reduce((s, e) => s + e.count, 0) };
  }

  async getApiUsage(period) {
    const { start, end } = await this._getDateRange(period);
    const usageRecords = await UsageRecord.aggregate([
      { $match: { periodStart: { $gte: start }, periodEnd: { $lte: end } } },
      { $group: { _id: null, totalApiCalls: { $sum: '$metrics.apiCalls' }, totalAiQueries: { $sum: '$metrics.aiQueries' }, avgApiCalls: { $avg: '$metrics.apiCalls' } } },
    ]);
    const events = await UsageEvent.aggregate([
      { $match: { category: 'api', timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: { endpoint: '$properties.endpoint', method: '$properties.method' }, count: { $sum: 1 }, avgDuration: { $avg: '$duration' } } },
    ]);
    return { period, start, end, totalApiCalls: usageRecords[0]?.totalApiCalls || 0, byEndpoint: events, totals: usageRecords[0] || { totalApiCalls: 0, totalAiQueries: 0, avgApiCalls: 0 } };
  }

  async getActiveUsers(period) {
    const { start, end } = await this._getDateRange(period);
    const [sessions, logins] = await Promise.all([
      UserSession.aggregate([
        { $match: { lastActivity: { $gte: start, $lte: end } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastActivity' } }, users: { $addToSet: '$user' } } },
        { $sort: { _id: 1 } },
      ]),
      LoginHistory.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: 'success' } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, users: { $addToSet: '$user' } } },
      ]),
    ]);
    const daus = sessions.map(s => ({ date: s._id, count: s.users.length }));
    const uniqueDaily = sessions.reduce((set, s) => { s.users.forEach(u => set.add(u.toString())); return set; }, new Set());
    const uniqueMonthly = logins.reduce((set, s) => { s.users.forEach(u => set.add(u.toString())); return set; }, new Set());
    return { period, start, end, dau: daus, mau: uniqueMonthly.size, wau: uniqueDaily.size, dailyActive: daus.reduce((s, d) => s + d.count, 0) / (daus.length || 1) };
  }

  async getUserJourney(userId) {
    const [events, logins, sessions] = await Promise.all([
      UsageEvent.find({ userId }).sort({ timestamp: 1 }).limit(500).lean(),
      LoginHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean(),
      UserSession.find({ user: userId }).sort({ lastActivity: -1 }).limit(50).lean(),
    ]);
    const timeline = events.map(e => ({ type: 'event', timestamp: e.timestamp, action: e.event, module: e.module, category: e.category, properties: e.properties }));
    logins.forEach(l => timeline.push({ type: 'login', timestamp: l.createdAt, status: l.status, ip: l.ipAddress, device: l.deviceName }));
    sessions.forEach(s => timeline.push({ type: 'session', timestamp: s.lastActivity, device: s.deviceName, browser: s.browser, ip: s.ipAddress }));
    timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const moduleSequence = events.reduce((seq, e) => { if (!seq.length || seq[seq.length - 1] !== e.module) seq.push(e.module); return seq; }, []);
    return { userId, totalEvents: events.length, totalSessions: sessions.length, firstSeen: timeline[0]?.timestamp, lastSeen: timeline[timeline.length - 1]?.timestamp, timeline, moduleJourney: moduleSequence };
  }

  async getActivationFunnel() {
    const stages = ['registered', 'verified_email', 'completed_profile', 'first_search', 'first_order', 'first_payment', 'repeat_order'];
    const funnel = [];
    for (const stage of stages) {
      const count = await UsageEvent.countDocuments({ event: stage });
      funnel.push({ stage, users: count });
    }
    const conversions = [];
    for (let i = 1; i < funnel.length; i++) {
      const rate = funnel[i - 1].users > 0 ? (funnel[i].users / funnel[i - 1].users) * 100 : 0;
      conversions.push({ from: funnel[i - 1].stage, to: funnel[i].stage, rate: Math.round(rate * 100) / 100 });
    }
    return { funnel, conversions, overall: funnel.length > 0 ? (funnel[funnel.length - 1].users / funnel[0].users) * 100 : 0 };
  }

  async getRetentionCohort(period) {
    const { start, end } = await this._getDateRange(period);
    const cohorts = await UsageEvent.aggregate([
      { $match: { timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: { cohort: { $dateToString: { format: '%Y-%m', date: '$timestamp' } }, user: '$userId' }, firstSeen: { $min: '$timestamp' } } },
      { $sort: { '_id.cohort': 1 } },
      { $group: { _id: '$_id.cohort', users: { $addToSet: '$_id.user' }, count: { $sum: 1 } } },
    ]);
    return cohorts.map(c => ({ cohort: c._id, users: c.count }));
  }

  async getPowerUsers(limit = 20) {
    const users = await UsageEvent.aggregate([
      { $group: { _id: '$userId', eventCount: { $sum: 1 }, modules: { $addToSet: '$module' }, lastActive: { $max: '$timestamp' } } },
      { $sort: { eventCount: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { userId: '$_id', name: '$user.name', email: '$user.email', eventCount: 1, modulesUsed: { $size: '$modules' }, lastActive: 1 } },
    ]);
    return users;
  }

  async getLicenseUtilization() {
    const [totalUsers, activeSessions, usageRecords] = await Promise.all([
      User.countDocuments({ isActive: true }),
      UserSession.countDocuments({ isCurrent: true }),
      UsageRecord.aggregate([
        { $group: { _id: null, totalProducts: { $sum: '$metrics.products' }, totalOrders: { $sum: '$metrics.orders' }, totalStorage: { $sum: '$metrics.storage' }, totalApiCalls: { $sum: '$metrics.apiCalls' }, totalAiQueries: { $sum: '$metrics.aiQueries' } } },
      ]),
    ]);
    const limits = { maxUsers: 10000, maxProducts: 50000, maxStorage: 1073741824, maxApiCallsPerMonth: 1000000, maxAiQueriesPerMonth: 10000 };
    const usage = usageRecords[0] || {};
    return {
      users: { used: totalUsers, limit: limits.maxUsers, percent: (totalUsers / limits.maxUsers) * 100 },
      products: { used: usage.totalProducts || 0, limit: limits.maxProducts, percent: ((usage.totalProducts || 0) / limits.maxProducts) * 100 },
      storage: { used: usage.totalStorage || 0, limit: limits.maxStorage, percent: ((usage.totalStorage || 0) / limits.maxStorage) * 100 },
      apiCalls: { used: usage.totalApiCalls || 0, limit: limits.maxApiCallsPerMonth, percent: ((usage.totalApiCalls || 0) / limits.maxApiCallsPerMonth) * 100 },
      aiQueries: { used: usage.totalAiQueries || 0, limit: limits.maxAiQueriesPerMonth, percent: ((usage.totalAiQueries || 0) / limits.maxAiQueriesPerMonth) * 100 },
    };
  }

  async getHeatmapData(module, period) {
    const { start, end } = await this._getDateRange(period);
    const events = await UsageEvent.aggregate([
      { $match: { ...(module ? { module } : {}), timestamp: { $gte: start, $lte: end } } },
      { $group: { _id: { dayOfWeek: { $dayOfWeek: '$timestamp' }, hour: { $hour: '$timestamp' } }, count: { $sum: 1 } } },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);
    const heatmap = [];
    for (let day = 1; day <= 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const match = events.find(e => e._id.dayOfWeek === day && e._id.hour === hour);
        heatmap.push({ dayOfWeek: day, hour, count: match?.count || 0 });
      }
    }
    return { module, period, start, end, heatmap };
  }

  async getFeatureFunnels(feature) {
    const stages = [`${feature}_viewed`, `${feature}_interacted`, `${feature}_configured`, `${feature}_activated`, `${feature}_completed`];
    const funnel = [];
    for (const stage of stages) {
      const count = await UsageEvent.countDocuments({ event: stage });
      funnel.push({ stage, users: count });
    }
    const conversions = [];
    for (let i = 1; i < funnel.length; i++) {
      const rate = funnel[i - 1].users > 0 ? (funnel[i].users / funnel[i - 1].users) * 100 : 0;
      conversions.push({ from: funnel[i - 1].stage, to: funnel[i].stage, rate: Math.round(rate * 100) / 100 });
    }
    return { feature, funnel, conversions, overallConversion: funnel[0].users > 0 ? (funnel[funnel.length - 1].users / funnel[0].users) * 100 : 0 };
  }
}

export const usageIntelligenceService = new UsageIntelligenceService();
