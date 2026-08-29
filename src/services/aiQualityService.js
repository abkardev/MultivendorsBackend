import { AiQualityScore } from '../models/AiQualityScore.js';
import { AiFeedback } from '../models/AiFeedback.js';
import EscrowOrder from '../models/Order.js';
import User from '../models/userModel.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class AiQualityService {
  async _updateScore(service, metric, score, sampleSize, period, details) {
    return AiQualityScore.findOneAndUpdate(
      { service, metric, 'period.start': period.start, 'period.end': period.end },
      {
        service, metric, score: Math.round(score), sampleSize,
        period, details: details || {},
        trend: score > 50 ? 'improving' : score < 30 ? 'declining' : 'stable',
      },
      { upsert: true, new: true }
    );
  }

  async calculateAccuracy(service, period) {
    const days = period || 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const feedback = await AiFeedback.find({
      aiService: service,
      timestamp: { $gte: start, $lte: end },
    }).lean();
    const total = feedback.length;
    if (total === 0) {
      return this._updateScore(service, 'accuracy', 0, 0, { start, end }, { message: 'No data' });
    }
    const accepted = feedback.filter(f => f.wasAccepted).length;
    const score = Math.round((accepted / total) * 100);
    return this._updateScore(service, 'accuracy', score, total, { start, end }, { accepted, rejected: total - accepted });
  }

  async calculateAdoption(service, period) {
    const days = period || 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const [feedbackUsers, totalUsers] = await Promise.all([
      AiFeedback.distinct('userId', { aiService: service, timestamp: { $gte: start, $lte: end } }),
      User.countDocuments({ isActive: true }),
    ]);
    const uniqueUsers = feedbackUsers.filter(Boolean).length;
    const score = totalUsers > 0 ? Math.round((uniqueUsers / totalUsers) * 100) : 0;
    return this._updateScore(service, 'adoption', score, uniqueUsers, { start, end }, { totalUsers, activeUsers: uniqueUsers });
  }

  async calculateAcceptance(service, period) {
    const days = period || 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const feedback = await AiFeedback.find({
      aiService: service,
      timestamp: { $gte: start, $lte: end },
    }).lean();
    const total = feedback.length;
    if (total === 0) {
      return this._updateScore(service, 'acceptance', 0, 0, { start, end }, { message: 'No data' });
    }
    const accepted = feedback.filter(f => f.wasAccepted).length;
    const score = Math.round((accepted / total) * 100);
    return this._updateScore(service, 'acceptance', score, total, { start, end }, { accepted, total });
  }

  async calculateConfidence(service, period) {
    const days = period || 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const feedback = await AiFeedback.find({
      aiService: service,
      timestamp: { $gte: start, $lte: end },
      wasAccepted: true,
    }).lean();
    const total = feedback.length;
    if (total === 0) {
      return this._updateScore(service, 'confidence', 0, 0, { start, end }, { message: 'No accepted recommendations' });
    }
    const withRating = feedback.filter(f => f.userRating != null);
    if (withRating.length === 0) {
      return this._updateScore(service, 'confidence', 50, total, { start, end }, { message: 'No rating data' });
    }
    const avgRating = withRating.reduce((s, f) => s + f.userRating, 0) / withRating.length;
    const score = Math.round((avgRating / 5) * 100);
    return this._updateScore(service, 'confidence', score, withRating.length, { start, end }, { avgRating, ratedCount: withRating.length });
  }

  async trackUserFeedback(sessionId, userId, recType, accepted, rating, feedback) {
    const record = await AiFeedback.create({
      session: sessionId, userId, recommendationType: recType,
      wasAccepted: accepted, userRating: rating,
      userFeedback: feedback, aiService: recType,
    });
    await logAuditEvent({
      userId, action: 'ai.feedback.track', category: 'ai',
      entityType: 'AiFeedback', entityId: record._id,
      newValue: { recType, accepted, rating },
      description: `User feedback on ${recType}: ${accepted ? 'accepted' : 'rejected'} (rating ${rating || 'N/A'})`,
    });
    return record;
  }

  async getQualityDashboard() {
    const [recentScores, feedbackStats, ordersWithRecs] = await Promise.all([
      AiQualityScore.find({}).sort({ updatedAt: -1 }).lean(),
      AiFeedback.aggregate([
        { $group: { _id: '$aiService', total: { $sum: 1 }, accepted: { $sum: { $cond: ['$wasAccepted', 1, 0] } }, avgRating: { $avg: '$userRating' } } },
      ]),
      EscrowOrder.aggregate([
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
    ]);
    const serviceSummary = {};
    for (const s of recentScores) {
      if (!serviceSummary[s.service]) serviceSummary[s.service] = {};
      serviceSummary[s.service][s.metric] = s.score;
    }
    return {
      overallAccuracy: feedbackStats.reduce((s, f) => s + (f.total > 0 ? (f.accepted / f.total) * 100 : 0), 0) / Math.max(1, feedbackStats.length),
      services: Object.entries(serviceSummary).map(([svc, metrics]) => ({ service: svc, ...metrics })),
      feedbackByService: feedbackStats,
      totalOrders: ordersWithRecs[0]?.total || 0,
      generatedAt: new Date(),
    };
  }

  async getFalseRecommendations(period) {
    const days = period || 7;
    const start = new Date(Date.now() - days * 86400000);
    const falseRecs = await AiFeedback.find({
      wasAccepted: false,
      timestamp: { $gte: start },
    }).populate('userId', 'name email').sort({ timestamp: -1 }).limit(50).lean();
    const grouped = {};
    for (const rec of falseRecs) {
      const svc = rec.aiService || 'unknown';
      if (!grouped[svc]) grouped[svc] = { service: svc, total: 0, feedbacks: [] };
      grouped[svc].total++;
      grouped[svc].feedbacks.push({
        userId: rec.userId?._id,
        userName: rec.userId?.name,
        rating: rec.userRating,
        feedback: rec.userFeedback,
        timestamp: rec.timestamp,
        recType: rec.recommendationType,
      });
    }
    return {
      period: days,
      total: falseRecs.length,
      byService: Object.values(grouped).map(g => ({
        service: g.service,
        count: g.total,
        percentage: falseRecs.length > 0 ? Math.round((g.total / falseRecs.length) * 100) : 0,
        samples: g.feedbacks.slice(0, 5),
      })),
      recentFalseRecs: falseRecs.slice(0, 20).map(r => ({
        recType: r.recommendationType, userRating: r.userRating,
        feedback: r.userFeedback, timestamp: r.timestamp,
      })),
    };
  }

  async getImprovementTrends(service, metric) {
    const scores = await AiQualityScore.find({ service, metric })
      .sort({ 'period.start': -1 }).limit(12).lean();
    if (scores.length === 0) return { service, metric, trend: 'stable', dataPoints: 0, scores: [] };
    const values = scores.map(s => s.score);
    const firstAvg = values.slice(Math.floor(values.length / 2)).reduce((s, v) => s + v, 0) / Math.max(1, Math.floor(values.length / 2));
    const secondAvg = values.slice(0, Math.ceil(values.length / 2)).reduce((s, v) => s + v, 0) / Math.max(1, Math.ceil(values.length / 2));
    let trend = 'stable';
    if (secondAvg > firstAvg * 1.1) trend = 'improving';
    else if (secondAvg < firstAvg * 0.9) trend = 'declining';
    return {
      service, metric, trend,
      currentScore: scores[0]?.score || 0,
      previousScore: scores[1]?.score || 0,
      dataPoints: scores.length,
      scores: scores.map(s => ({ score: s.score, sampleSize: s.sampleSize, period: s.period })),
    };
  }

  async calculateAllScores() {
    const services = await AiFeedback.distinct('aiService');
    const allScores = [];
    for (const service of services.filter(Boolean)) {
      const [accuracy, adoption, acceptance, confidence] = await Promise.all([
        this.calculateAccuracy(service),
        this.calculateAdoption(service),
        this.calculateAcceptance(service),
        this.calculateConfidence(service),
      ]);
      allScores.push(accuracy, adoption, acceptance, confidence);
    }
    const feedbackCount = await AiFeedback.countDocuments({});
    await logAuditEvent({
      action: 'ai.quality.calculate.all', category: 'ai',
      entityType: 'AiQualityScore',
      description: `Calculated quality scores for ${services.length} services, ${allScores.length} scores, ${feedbackCount} feedback records`,
      status: 'success',
    });
    return { scores: allScores, services: services.length, totalScores: allScores.length, feedbackCount };
  }
}

export const aiQualityService = new AiQualityService();
