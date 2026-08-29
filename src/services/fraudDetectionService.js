import { FraudAlert } from '../models/FraudAlert.js';
import { FraudRule } from '../models/FraudRule.js';
import { IpReputation } from '../models/IpReputation.js';
import { DeviceFingerprint } from '../models/DeviceFingerprint.js';
import User from '../models/userModel.js';
import { Company } from '../models/Company.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class FraudDetectionService {
  async getFraudDashboard() {
    const stats = await FraudAlert.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        falsePositive: { $sum: { $cond: [{ $eq: ['$status', 'false_positive'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        avgScore: { $avg: '$score' },
      }},
    ]);
    const byType = await FraudAlert.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const recentAlerts = await FraudAlert.find().sort({ createdAt: -1 }).limit(10)
      .populate('assignedTo', 'name email').lean();
    const openCount = await FraudAlert.countDocuments({ status: 'open' });
    const blocklistedIps = await IpReputation.countDocuments({ blocklisted: true });
    return {
      stats: stats[0] || { total: 0, open: 0, investigating: 0, resolved: 0, falsePositive: 0, critical: 0, high: 0, medium: 0, low: 0, avgScore: 0 },
      byType, recentAlerts, openAlerts: openCount, blocklistedIps,
    };
  }

  async getAlerts(query = {}) {
    const filter = {};
    if (query.type) filter.type = query.type;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const [alerts, total] = await Promise.all([
      FraudAlert.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate('assignedTo', 'name email').populate('resolvedBy', 'name email').lean(),
      FraudAlert.countDocuments(filter),
    ]);
    return { alerts, total, page, pages: Math.ceil(total / limit) };
  }

  async getAlert(id) {
    return FraudAlert.findById(id)
      .populate('assignedTo', 'name email')
      .populate('resolvedBy', 'name email')
      .populate('vendor', 'storeName')
      .populate('buyer', 'name email')
      .lean();
  }

  async investigateAlert(id, userId) {
    const alert = await FraudAlert.findById(id);
    if (!alert) throw new Error('Alert not found');
    alert.status = 'investigating';
    alert.assignedTo = userId;
    await alert.save();
    await logAuditEvent({ userId, action: 'investigate_fraud_alert', category: 'fraud', entityType: 'FraudAlert', entityId: id, description: `Alert ${id} assigned for investigation`, status: 'success' });
    return alert;
  }

  async resolveAlert(id, resolution, status) {
    const alert = await FraudAlert.findById(id);
    if (!alert) throw new Error('Alert not found');
    alert.status = status;
    alert.resolution = resolution;
    alert.resolvedAt = new Date();
    await alert.save();
    await logAuditEvent({ userId: alert.assignedTo, action: 'resolve_fraud_alert', category: 'fraud', entityType: 'FraudAlert', entityId: id, description: `Alert resolved as ${status}`, status: 'success' });
    return alert;
  }

  async detectDuplicateAccounts(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    const duplicates = await User.find({
      _id: { $ne: userId },
      $or: [
        { email: user.email },
        { phone: user.phone },
        { ipAddress: user.ipAddress },
        { companyName: user.companyName },
      ],
    }).select('name email phone companyName createdAt').lean();
    if (duplicates.length > 0) {
      await FraudAlert.create({
        buyer: userId, type: 'duplicate_account', severity: duplicates.length > 2 ? 'high' : 'medium',
        score: Math.min(duplicates.length * 20, 100), description: `Found ${duplicates.length} duplicate accounts`,
        evidence: { relatedIds: duplicates.map(d => String(d._id)), timestamp: new Date() }, detectedBy: 'system',
      });
    }
    return { isDuplicate: duplicates.length > 0, count: duplicates.length, duplicates };
  }

  async detectDuplicateCompanies(companyName) {
    const companies = await Company.find({ name: { $regex: companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }).lean();
    const normalized = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fuzzy = companies.filter(c => {
      const cn = (c.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return cn.includes(normalized) || normalized.includes(cn) || levenshtein(cn, normalized) < 3;
    });
    return { matches: fuzzy, count: fuzzy.length };
  }

  async analyzeSuspiciousOrder(orderId) {
    const order = await Order.findById(orderId).populate('user').lean();
    if (!order) throw new Error('Order not found');
    const userOrders = await Order.find({ user: order.user?._id }).sort({ createdAt: -1 }).lean();
    const recentOrders = userOrders.filter(o =>
      new Date(o.createdAt) > new Date(Date.now() - 86400000)
    );
    const totalAmount = parseFloat(order.totalPrice) || 0;
    const avgAmount = userOrders.length > 1
      ? userOrders.reduce((s, o) => s + (parseFloat(o.totalPrice) || 0), 0) / userOrders.length
      : totalAmount;
    const issues = [];
    if (recentOrders.length > 5) issues.push({ type: 'velocity', details: `${recentOrders.length} orders in 24h` });
    if (totalAmount > avgAmount * 3) issues.push({ type: 'amount_mismatch', details: `Order ${totalAmount} vs avg ${avgAmount}` });
    if (order.address?.country && order.user?.address?.country && order.address.country !== order.user.address.country) {
      issues.push({ type: 'shipping_mismatch', details: `Shipping ${order.address.country} != user ${order.user.address.country}` });
    }
    if (issues.length > 0) {
      await FraudAlert.create({
        buyer: order.user?._id, type: 'suspicious_order', severity: issues.length > 2 ? 'high' : 'medium',
        score: Math.min(issues.length * 30, 100), description: `Suspicious order: ${issues.map(i => i.type).join(', ')}`,
        evidence: { ip: order.user?.ip, relatedIds: [orderId], timestamp: new Date() }, detectedBy: 'system',
      });
    }
    return { orderId, issues, isSuspicious: issues.length > 0 };
  }

  async analyzeSuspiciousReview(reviewId) {
    const review = await Review.findById(reviewId).populate('user').lean();
    if (!review) throw new Error('Review not found');
    const productReviews = await Review.find({ product: review.product }).lean();
    const userReviews = await Review.find({ user: review.user?._id }).lean();
    const avgRating = productReviews.length > 0
      ? productReviews.reduce((s, r) => s + r.rating, 0) / productReviews.length
      : 0;
    const issues = [];
    if (review.rating === 5 && avgRating > 0 && Math.abs(review.rating - avgRating) >= 3) {
      issues.push({ type: 'rating_outlier', details: `Rating ${review.rating} vs avg ${avgRating.toFixed(1)}` });
    }
    if (userReviews.length > 10 && userReviews.every(r => r.rating === 5 || r.rating === 1)) {
      issues.push({ type: 'polarized_pattern', details: `${userReviews.length} reviews all extreme` });
    }
    if ((review.comment || '').length < 20 && review.rating === 5) {
      issues.push({ type: 'low_effort', details: 'Short 5-star review' });
    }
    if (issues.length > 0) {
      await FraudAlert.create({
        buyer: review.user?._id, type: 'suspicious_review', severity: issues.length > 1 ? 'high' : 'medium',
        score: Math.min(issues.length * 25, 100), description: `Suspicious review: ${issues.map(i => i.type).join(', ')}`,
        evidence: { relatedIds: [reviewId], timestamp: new Date() }, detectedBy: 'system',
      });
    }
    return { reviewId, issues, isSuspicious: issues.length > 0 };
  }

  async detectBotActivity(ip) {
    const lookback = new Date(Date.now() - 3600000);
    const [loginCount, reviewCount, orderCount] = await Promise.all([
      User.countDocuments({ ipAddress: ip, createdAt: { $gte: lookback } }),
      Review.countDocuments({ 'media.url': { $regex: ip, $options: 'i' }, createdAt: { $gte: lookback } }),
      Order.countDocuments({ 'address.state': ip, createdAt: { $gte: lookback } }),
    ]);
    const total = loginCount + reviewCount + orderCount;
    const isBot = total > 20 || loginCount > 10;
    if (isBot) {
      await FraudAlert.create({
        type: 'bot_activity', severity: total > 50 ? 'critical' : 'high',
        score: Math.min(total * 5, 100), description: `Bot activity: ${total} actions in 1h from ${ip}`,
        evidence: { ip, timestamp: new Date() }, detectedBy: 'system',
      });
    }
    return { ip, actionCount: total, isBot };
  }

  async checkIpReputation(ip) {
    let record = await IpReputation.findOne({ ip });
    if (!record) {
      record = await IpReputation.create({ ip, score: 50, category: 'clean', firstSeen: new Date(), lastSeen: new Date() });
    }
    return record;
  }

  async blockIp(ip, reason) {
    let record = await IpReputation.findOne({ ip });
    if (!record) {
      record = await IpReputation.create({ ip, score: 0, category: 'malicious', blocklisted: true, blocklistedAt: new Date() });
    } else {
      record.blocklisted = true;
      record.blocklistedAt = new Date();
      record.category = 'malicious';
      record.score = 0;
    }
    record.flags.push({ type: 'blocklisted', timestamp: new Date(), details: reason });
    await record.save();
    await logAuditEvent({ action: 'block_ip', category: 'fraud', entityType: 'IpReputation', entityId: ip, description: `IP ${ip} blocklisted: ${reason}`, status: 'success' });
    return record;
  }

  async unblockIp(ip) {
    const record = await IpReputation.findOne({ ip });
    if (!record) throw new Error('IP not found');
    record.blocklisted = false;
    record.blocklistedAt = null;
    record.score = Math.max(record.score, 50);
    await record.save();
    return record;
  }

  async getFraudRules() {
    return FraudRule.find().sort({ priority: -1, name: 1 }).lean();
  }

  async createFraudRule(data) {
    const rule = await FraudRule.create(data);
    return rule;
  }

  async updateFraudRule(id, data) {
    return FraudRule.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async toggleFraudRule(id) {
    const rule = await FraudRule.findById(id);
    if (!rule) throw new Error('Rule not found');
    rule.isActive = !rule.isActive;
    await rule.save();
    return rule;
  }

  async runRule(ruleId) {
    const rule = await FraudRule.findById(ruleId);
    if (!rule) throw new Error('Rule not found');
    let results = [];
    if (rule.type === 'velocity') {
      const recent = await Order.countDocuments({ createdAt: { $gte: new Date(Date.now() - 3600000) } });
      if (recent > (rule.config.threshold || 50)) {
        results.push({ matched: true, count: recent, threshold: rule.config.threshold || 50 });
      }
    } else if (rule.type === 'ip_reputation') {
      const badIps = await IpReputation.countDocuments({ score: { $lte: rule.config.scoreThreshold || 30 } });
      results.push({ matched: badIps > 0, count: badIps });
    } else if (rule.type === 'device') {
      const highRisk = await DeviceFingerprint.countDocuments({ riskScore: { $gte: rule.config.riskThreshold || 80 } });
      results.push({ matched: highRisk > 0, count: highRisk });
    }
    rule.occurrences = (rule.occurrences || 0) + 1;
    await rule.save();
    return { rule: rule.name, type: rule.type, results };
  }

  async getRiskScore(userId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');
    const alerts = await FraudAlert.countDocuments({ buyer: userId });
    const orders = await Order.find({ user: userId }).lean();
    const fraudOrders = orders.filter(o => o.status === 'cancelled').length;
    const ipRecord = user.ipAddress ? await IpReputation.findOne({ ip: user.ipAddress }).lean() : null;
    let score = 0;
    if (alerts > 0) score += Math.min(alerts * 15, 45);
    if (orders.length > 0) score += Math.min((fraudOrders / orders.length) * 30, 30);
    if (ipRecord?.blocklisted) score += 25;
    if (ipRecord && ipRecord.score < 30) score += 15;
    if (!user.isVerified) score += 10;
    return { userId, riskScore: Math.min(score, 100), alerts, fraudRate: orders.length > 0 ? fraudOrders / orders.length : 0, ipBlocklisted: ipRecord?.blocklisted || false };
  }

  async getDeviceFingerprint(fingerprint) {
    const device = await DeviceFingerprint.findOne({ fingerprint }).populate('vendor', 'storeName').populate('buyer', 'name email').lean();
    return device || null;
  }

  async registerDevice(fingerprint, userId, data = {}) {
    const existing = await DeviceFingerprint.findOne({ fingerprint });
    if (existing) {
      existing.lastSeen = new Date();
      if (data.userAgent) existing.userAgent = data.userAgent;
      if (data.platform) existing.platform = data.platform;
      if (!existing.buyer && userId) existing.buyer = userId;
      await existing.save();
      return existing;
    }
    return DeviceFingerprint.create({
      fingerprint, buyer: userId, firstSeen: new Date(), lastSeen: new Date(),
      userAgent: data.userAgent, platform: data.platform, screenResolution: data.screenResolution,
      language: data.language, timezone: data.timezone, riskScore: 0,
    });
  }

  async getInvestigationQueue() {
    const alerts = await FraudAlert.find({ status: 'open' })
      .sort({ score: -1, createdAt: 1 })
      .populate('buyer', 'name email')
      .populate('vendor', 'storeName')
      .lean();
    return { total: alerts.length, alerts };
  }
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export const fraudDetectionService = new FraudDetectionService();
