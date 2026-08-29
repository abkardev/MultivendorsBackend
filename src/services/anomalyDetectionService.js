import { AnomalyResult } from '../models/AnomalyResult.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';
import { FraudAlert } from '../models/FraudAlert.js';
import AuditLog from '../models/AuditLog.js';
import { logAuditEvent } from './auditService.js';

class AnomalyDetectionService {
  async getAnomalies(type, severity, status) {
    const filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    return AnomalyResult.find(filter).sort({ detectedAt: -1 }).lean();
  }

  async getAnomaly(id) {
    const anomaly = await AnomalyResult.findById(id).lean();
    if (!anomaly) throw new Error('Anomaly not found');
    return anomaly;
  }

  async detectAnomalies(type) {
    const detectionMethods = {
      order_anomaly: this._detectOrderAnomalies,
      payment_anomaly: this._detectPaymentAnomalies,
      user_anomaly: this._detectUserAnomalies,
      review_anomaly: this._detectReviewAnomalies,
      fraud_anomaly: this._detectFraudAnomalies,
      vendor_anomaly: this._detectVendorAnomalies,
    };

    const method = detectionMethods[type];
    if (!method) throw new Error(`Unknown detection type: ${type}`);

    const anomalies = await method.call(this);
    const created = [];

    for (const a of anomalies) {
      const existing = await AnomalyResult.findOne({
        type: a.type,
        entityType: a.entityType,
        entityId: a.entityId,
        status: { $in: ['open', 'investigating'] },
      });
      if (!existing) {
        const record = await AnomalyResult.create({
          ...a,
          detectedAt: new Date(),
          status: 'open',
        });
        created.push(record);
      }
    }

    await logAuditEvent({
      action: 'run_anomaly_detection',
      category: 'security',
      entityType: 'AnomalyResult',
      description: `Anomaly detection run for ${type}: ${created.length} new anomalies`,
      newValue: { type, detected: created.length, total: anomalies.length },
    });

    return { type, detected: created.length, total: anomalies.length, anomalies: created };
  }

  async _detectOrderAnomalies() {
    const anomalies = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const orders = await EscrowOrder.find({ createdAt: { $gte: thirtyDaysAgo } }).lean();

    const vendorAmounts = {};
    for (const o of orders) {
      const vid = o.vendor?.toString();
      if (!vid) continue;
      if (!vendorAmounts[vid]) vendorAmounts[vid] = { amounts: [], count: 0 };
      vendorAmounts[vid].amounts.push(o.totalAmount || 0);
      vendorAmounts[vid].count++;
    }

    for (const [vendorId, data] of Object.entries(vendorAmounts)) {
      const avg = data.amounts.reduce((s, a) => s + a, 0) / data.amounts.length;
      for (const amount of data.amounts) {
        if (amount > avg * 3 && amount > 50000) {
          anomalies.push({
            type: 'order_anomaly',
            severity: 'high',
            entityType: 'Order',
            entityId: vendorId,
            metric: 'amount',
            expectedValue: Math.round(avg * 100) / 100,
            actualValue: amount,
            deviation: Math.round(((amount - avg) / avg) * 100),
            description: `Order amount $${amount} is ${Math.round((amount - avg) / avg * 100)}% above vendor average`,
          });
        }
      }
    }

    return anomalies;
  }

  async _detectPaymentAnomalies() {
    const anomalies = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recentCount = await EscrowOrder.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const previousCount = await EscrowOrder.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 14 * 86400000), $lt: sevenDaysAgo },
    });

    if (previousCount > 0) {
      const change = ((recentCount - previousCount) / previousCount) * 100;
      if (Math.abs(change) > 50) {
        anomalies.push({
          type: 'payment_anomaly',
          severity: Math.abs(change) > 100 ? 'critical' : 'high',
          entityType: 'Order',
          metric: 'order_volume',
          expectedValue: previousCount,
          actualValue: recentCount,
          deviation: Math.round(Math.abs(change)),
          description: `Order volume changed by ${Math.round(change)}% week-over-week`,
        });
      }
    }

    return anomalies;
  }

  async _detectUserAnomalies() {
    const anomalies = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const recentLogins = await AuditLog.aggregate([
      { $match: { action: 'login', createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 20 } } },
    ]);

    for (const rl of recentLogins) {
      anomalies.push({
        type: 'user_anomaly',
        severity: rl.count > 50 ? 'critical' : 'high',
        entityType: 'User',
        entityId: rl._id,
        metric: 'login_frequency',
        expectedValue: 10,
        actualValue: rl.count,
        deviation: Math.round(((rl.count - 10) / 10) * 100),
        description: `User logged in ${rl.count} times in 7 days (unusual activity)`,
      });
    }

    return anomalies;
  }

  async _detectReviewAnomalies() {
    const anomalies = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const reviewCounts = await Review.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$user', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $match: { count: { $gt: 10 } } },
    ]);

    for (const rc of reviewCounts) {
      if (rc.avgRating === 1 || rc.avgRating === 5) {
        anomalies.push({
          type: 'review_anomaly',
          severity: 'medium',
          entityType: 'User',
          entityId: rc._id,
          metric: 'review_velocity',
          expectedValue: 5,
          actualValue: rc.count,
          deviation: Math.round(((rc.count - 5) / 5) * 100),
          description: `User submitted ${rc.count} reviews (avg ${rc.avgRating.toFixed(1)}) in 7 days - possible review manipulation`,
        });
      }
    }

    const extremeRatingUsers = await Review.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: '$user', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
      { $match: { count: { $gte: 5 }, $or: [{ avgRating: { $lte: 1.5 } }, { avgRating: { $gte: 4.8 } }] } },
    ]);

    for (const eru of extremeRatingUsers) {
      anomalies.push({
        type: 'review_anomaly',
        severity: 'medium',
        entityType: 'User',
        entityId: eru._id,
        metric: 'rating_pattern',
        expectedValue: 3,
        actualValue: eru.avgRating,
        deviation: Math.round(Math.abs(eru.avgRating - 3) / 3 * 100),
        description: `User's average rating ${eru.avgRating.toFixed(1)} over ${eru.count} reviews - polarized pattern`,
      });
    }

    return anomalies;
  }

  async _detectFraudAnomalies() {
    const anomalies = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const recentAlerts = await FraudAlert.find({
      createdAt: { $gte: sevenDaysAgo },
      status: 'open',
    }).lean();

    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 5) {
      anomalies.push({
        type: 'fraud_anomaly',
        severity: 'critical',
        entityType: 'FraudAlert',
        metric: 'alert_volume',
        expectedValue: 5,
        actualValue: criticalAlerts.length,
        deviation: Math.round(((criticalAlerts.length - 5) / 5) * 100),
        description: `Spike in critical fraud alerts: ${criticalAlerts.length} in 7 days`,
      });
    }

    const avgScore = recentAlerts.reduce((s, a) => s + (a.score || 0), 0) / (recentAlerts.length || 1);
    if (avgScore > 80) {
      anomalies.push({
        type: 'fraud_anomaly',
        severity: 'high',
        entityType: 'FraudAlert',
        metric: 'average_risk_score',
        expectedValue: 50,
        actualValue: Math.round(avgScore),
        deviation: Math.round(((avgScore - 50) / 50) * 100),
        description: `High average fraud score ${Math.round(avgScore)} indicates elevated risk environment`,
      });
    }

    return anomalies;
  }

  async _detectVendorAnomalies() {
    const anomalies = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const disputeRate = await EscrowOrder.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$vendor', total: { $sum: 1 }, disputed: { $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] } } } },
      { $match: { total: { $gte: 5 } } },
    ]);

    for (const dr of disputeRate) {
      const disputePct = (dr.disputed / dr.total) * 100;
      if (disputePct > 20) {
        anomalies.push({
          type: 'vendor_anomaly',
          severity: disputePct > 40 ? 'critical' : 'high',
          entityType: 'Vendor',
          entityId: dr._id,
          metric: 'dispute_rate',
          expectedValue: 10,
          actualValue: Math.round(disputePct * 100) / 100,
          deviation: Math.round((disputePct - 10) / 10 * 100),
          description: `Vendor dispute rate ${disputePct.toFixed(1)}% exceeds 20% threshold`,
        });
      }
    }

    return anomalies;
  }

  async investigateAnomaly(id, userId) {
    const anomaly = await AnomalyResult.findByIdAndUpdate(id,
      { status: 'investigating', investigatedBy: userId, investigatedAt: new Date() },
      { new: true }
    );
    if (!anomaly) throw new Error('Anomaly not found');
    return anomaly;
  }

  async resolveAnomaly(id, resolution, notes) {
    const anomaly = await AnomalyResult.findByIdAndUpdate(id,
      { status: 'resolved', resolution, notes, resolvedAt: new Date() },
      { new: true }
    );
    if (!anomaly) throw new Error('Anomaly not found');
    await logAuditEvent({
      action: 'resolve_anomaly',
      category: 'security',
      entityType: 'AnomalyResult',
      entityId: id,
      newValue: { resolution },
      description: `Anomaly resolved: ${resolution}`,
    });
    return anomaly;
  }

  async ignoreAnomaly(id) {
    const anomaly = await AnomalyResult.findByIdAndUpdate(id,
      { status: 'ignored', resolvedAt: new Date() },
      { new: true }
    );
    if (!anomaly) throw new Error('Anomaly not found');
    return anomaly;
  }

  async getAnomalyStats() {
    const stats = await AnomalyResult.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        ignored: { $sum: { $cond: [{ $eq: ['$status', 'ignored'] }, 1, 0] } },
      }},
    ]);
    const byType = await AnomalyResult.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const bySeverity = await AnomalyResult.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return {
      stats: stats[0] || { total: 0, open: 0, investigating: 0, resolved: 0, ignored: 0 },
      byType,
      bySeverity,
    };
  }

  async runAllDetections() {
    const types = ['order_anomaly', 'payment_anomaly', 'user_anomaly', 'review_anomaly', 'fraud_anomaly', 'vendor_anomaly'];
    const results = [];
    for (const type of types) {
      try {
        const result = await this.detectAnomalies(type);
        results.push(result);
      } catch (err) {
        results.push({ type, error: err.message, detected: 0 });
      }
    }
    const totalDetected = results.reduce((s, r) => s + r.detected, 0);
    return { types: results, totalDetected, runAt: new Date().toISOString() };
  }

  async getAnomalyTrends(days = 30) {
    const startDate = new Date(Date.now() - days * 86400000);
    const anomalies = await AnomalyResult.find({ detectedAt: { $gte: startDate } }).sort({ detectedAt: 1 }).lean();

    const daily = {};
    for (const a of anomalies) {
      const day = a.detectedAt.toISOString().slice(0, 10);
      if (!daily[day]) daily[day] = { date: day, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      daily[day].total++;
      if (a.severity) daily[day][a.severity]++;
    }

    const byType = {};
    for (const a of anomalies) {
      if (!byType[a.type]) byType[a.type] = { type: a.type, count: 0, trend: [] };
      byType[a.type].count++;
    }

    const dates = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate.getTime() + i * 86400000).toISOString().slice(0, 10);
      dates.push(d);
    }

    return {
      period: `${days}d`,
      total: anomalies.length,
      dailyTrend: dates.map(d => daily[d] || { date: d, total: 0, critical: 0, high: 0, medium: 0, low: 0 }),
      byType: Object.values(byType).sort((a, b) => b.count - a.count),
      avgDailyRate: Math.round((anomalies.length / days) * 100) / 100,
    };
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
