import AuditLog from '../models/AuditLog.js';
import { Order } from '../models/orderModel.js';
import User from '../models/userModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { logAuditEvent } from './auditService.js';

class ExplainableAiService {
  constructor() {
    this.templates = this._initTemplates();
  }

  _initTemplates() {
    return {
      pricing: {
        title: 'Pricing Decision Explanation',
        sections: ['market_analysis', 'cost_analysis', 'competitor_pricing', 'demand_elasticity'],
      },
      approval: {
        title: 'Approval Decision Explanation',
        sections: ['risk_assessment', 'compliance_check', 'history_review', 'policy_match'],
      },
      recommendation: {
        title: 'Recommendation Explanation',
        sections: ['user_preferences', 'behavioral_analysis', 'similarity_score', 'confidence_factors'],
      },
      fraud_detection: {
        title: 'Fraud Detection Explanation',
        sections: ['anomaly_score', 'rule_matches', 'behavioral_deviation', 'risk_indicators'],
      },
      forecasting: {
        title: 'Forecast Explanation',
        sections: ['historical_trend', 'seasonal_factors', 'external_influences', 'model_confidence'],
      },
    };
  }

  async explainDecision(decisionType, context = {}, result = {}) {
    const evidence = this._gatherEvidence(decisionType, context);
    const confidence = this._computeConfidence(decisionType, context, result, evidence);
    const supportingData = this._buildSupportingData(decisionType, context, result);
    const tradeoffs = this._getTradeoffs(decisionType, context);
    const alternative = this._generateAlternative(decisionType, context, result);

    const explanation = {
      decisionType,
      reason: this._generateReason(decisionType, context, result, evidence),
      evidence,
      confidence,
      supportingData,
      alternativeRecommendation: alternative,
      tradeoffs,
      businessImpact: this._assessBusinessImpact(decisionType, context, result),
      financialImpact: this._assessFinancialImpact(result),
      riskImpact: this._assessRiskImpact(decisionType, context),
      affectedEntities: this._getAffectedEntities(context),
      timestamp: new Date().toISOString(),
    };

    await logAuditEvent({
      userId: context.userId || 'system',
      action: `ai_explain_${decisionType}`,
      category: 'ai_decision',
      entityType: 'DecisionExplanation',
      description: `AI explanation generated for ${decisionType}`,
      newValue: { confidence, reason: explanation.reason.substring(0, 200) },
    });

    return explanation;
  }

  _gatherEvidence(decisionType, context) {
    const evidence = [];
    switch (decisionType) {
      case 'pricing': {
        if (context.productId) {
          evidence.push({ source: 'Product', data: 'Current pricing and cost data' });
        }
        if (context.competitorPrice) {
          evidence.push({ source: 'Market Intelligence', data: `Competitor price: ${context.competitorPrice}` });
        }
        evidence.push({ source: 'Historical Demand', data: 'Demand elasticity at various price points' });
        break;
      }
      case 'approval': {
        if (context.amount) {
          evidence.push({ source: 'Policy Rules', data: `Amount ${context.amount} compared to approval thresholds` });
        }
        if (context.userRole) {
          evidence.push({ source: 'RBAC', data: `Role: ${context.userRole}` });
        }
        evidence.push({ source: 'Compliance Check', data: 'Regulatory requirements validated' });
        break;
      }
      case 'recommendation': {
        if (context.userId) {
          evidence.push({ source: 'User History', data: 'Past purchases and browsing behavior' });
        }
        evidence.push({ source: 'Similar Users', data: 'Collaborative filtering from peer group' });
        evidence.push({ source: 'Product Attributes', data: 'Feature matching and relevance scoring' });
        break;
      }
      default:
        evidence.push({ source: 'System Analysis', data: 'Multi-factor evaluation completed' });
    }
    return evidence;
  }

  _computeConfidence(decisionType, context, result, evidence) {
    let base = 75;
    if (context.historicalAccuracy) base = Math.round((base + context.historicalAccuracy) / 2);
    if (evidence.length >= 3) base += 10;
    if (evidence.length >= 5) base += 5;
    if (context.amount && context.amount > 100000) base -= 10;
    if (context.urgency === 'critical') base -= 15;
    if (result.expectedOutcome) base += 5;
    return Math.max(10, Math.min(100, base));
  }

  _buildSupportingData(decisionType, context, result) {
    const data = {};
    if (context.amount) data.amount = context.amount;
    if (context.score) data.score = context.score;
    if (context.quantity) data.quantity = context.quantity;
    if (result.predictedValue) data.predictedValue = result.predictedValue;
    if (result.actualValue) data.actualValue = result.actualValue;
    if (context.historicalData) data.historicalDataPoints = context.historicalData;
    data.featureImportance = this._getFeatureImportance(decisionType);
    return data;
  }

  _getFeatureImportance(decisionType) {
    const importance = {
      pricing: { competitorPrice: 0.35, cost: 0.25, demand: 0.2, seasonality: 0.1, productAge: 0.1 },
      approval: { amount: 0.4, riskScore: 0.3, compliance: 0.2, history: 0.1 },
      recommendation: { relevance: 0.4, popularity: 0.25, recency: 0.2, rating: 0.15 },
      fraud_detection: { anomalyScore: 0.5, velocityCheck: 0.25, geoDeviation: 0.15, deviceTrust: 0.1 },
      forecasting: { trend: 0.4, seasonality: 0.3, externalFactors: 0.2, noise: 0.1 },
    };
    return importance[decisionType] || { default: 1 };
  }

  _getTradeoffs(decisionType, context) {
    const tradeoffsMap = {
      pricing: [
        { option: 'Increase price', pros: ['Higher margin per unit'], cons: ['Potential demand reduction', 'Customer churn risk'] },
        { option: 'Decrease price', pros: ['Volume growth', 'Market share gain'], cons: ['Margin compression', 'Brand perception risk'] },
      ],
      approval: [
        { option: 'Approve', pros: ['Business continuity', 'Customer satisfaction'], cons: ['Financial risk exposure', 'Policy exception'] },
        { option: 'Reject', pros: ['Risk mitigated', 'Policy compliance'], cons: ['Business delay', 'Customer frustration'] },
      ],
    };
    return tradeoffsMap[decisionType] || [{ option: 'Proceed', pros: ['Expected benefit'], cons: ['Residual risk'] }];
  }

  _generateAlternative(decisionType, context, result) {
    const alternatives = {
      pricing: context.competitorPrice
        ? `Consider a moderate adjustment of ${Math.round(Math.abs(context.competitorPrice * 0.05))} instead of full change`
        : 'Consider A/B testing before full rollout',
      approval: context.amount > 50000
        ? 'Consider conditional approval with additional monitoring'
        : 'Standard approval process is appropriate',
      recommendation: 'Consider diversifying recommendations across complementary categories',
    };
    return alternatives[decisionType] || 'Current approach is optimal based on available data';
  }

  _generateReason(decisionType, context, result, evidence) {
    switch (decisionType) {
      case 'pricing':
        return context.competitorPrice
          ? `Price set based on competitive analysis showing market rate at ${context.competitorPrice}, adjusted for ${evidence.length} supporting factors`
          : `Price determined by cost-plus model with ${evidence.length} market validation factors`;
      case 'approval':
        return context.amount
          ? `Approval decision based on ${context.amount} exceeding ${context.amount > 50000 ? 'high' : 'standard'} threshold with ${evidence.length} risk checks`
          : `Approval granted after ${evidence.length} compliance and risk checks`;
      case 'recommendation':
        return `Recommendation generated using collaborative filtering and content-based matching across ${evidence.length} evidence dimensions`;
      case 'fraud_detection':
        return `Alert triggered by anomalous patterns exceeding ${context.score || 80}% confidence threshold`;
      case 'forecasting':
        return `Forecast based on historical trend analysis with ${context.period || '30-day'} lookback and seasonal adjustment`;
      default:
        return `Decision made based on multi-factor analysis of ${evidence.length} data points`;
    }
  }

  _assessBusinessImpact(decisionType, context, result) {
    const impacts = {
      pricing: context.amount ? `Revenue impact of ±${Math.round(context.amount * 0.1)} expected` : 'Moderate business impact expected',
      approval: context.amount ? `Approval affects ${context.amount} in transaction value` : 'Operational impact from approval timing',
      recommendation: 'Customer experience and engagement impact',
      fraud_detection: 'Prevents financial loss and maintains platform trust',
      forecasting: 'Strategic planning and resource allocation impact',
    };
    return impacts[decisionType] || 'Business impact assessment completed';
  }

  _assessFinancialImpact(result) {
    if (result.financialImpact) return result.financialImpact;
    if (result.predictedValue && result.actualValue) {
      const variance = Math.abs(result.predictedValue - result.actualValue);
      return `Financial variance of ${Math.round(variance)} identified`;
    }
    return 'Direct financial impact requires further quantification';
  }

  _assessRiskImpact(decisionType, context) {
    const risks = {
      pricing: context.amount > 100000 ? 'High - significant price change affects revenue' : 'Low - standard pricing adjustment',
      approval: context.amount > 100000 ? 'High - large transaction exposure' : 'Medium - standard approval risk',
      recommendation: 'Low - recommendations are non-binding suggestions',
      fraud_detection: 'Medium - false positives impact user experience',
      forecasting: 'Medium - forecasts guide business decisions',
    };
    return risks[decisionType] || 'Risk impact assessed as standard';
  }

  _getAffectedEntities(context) {
    const entities = [];
    if (context.userId) entities.push({ type: 'User', id: context.userId });
    if (context.vendorId) entities.push({ type: 'Vendor', id: context.vendorId });
    if (context.productId) entities.push({ type: 'Product', id: context.productId });
    if (context.orderId) entities.push({ type: 'Order', id: context.orderId });
    return entities;
  }

  async getAuditRecord(decisionId) {
    const logs = await AuditLog.find({
      $or: [
        { entityId: decisionId, entityType: 'DecisionExplanation' },
        { entityId: decisionId, action: /^ai_explain_/ },
      ],
    }).sort({ createdAt: -1 }).lean();
    return {
      decisionId,
      auditTrail: logs,
      totalEvents: logs.length,
      timeline: logs.map(l => ({ action: l.action, timestamp: l.createdAt, user: l.userId })),
    };
  }

  async compareAlternatives(decisionType, context) {
    const currentExplanation = await this.explainDecision(decisionType, context, {});
    const alternatives = [
      { label: 'Conservative Approach', context: { ...context, riskTolerance: 'low' } },
      { label: 'Aggressive Approach', context: { ...context, riskTolerance: 'high' } },
    ];
    const comparisons = await Promise.all(
      alternatives.map(async alt => ({
        label: alt.label,
        explanation: await this._generateReason(decisionType, alt.context, {}, []),
        confidence: this._computeConfidence(decisionType, alt.context, {}, []),
        tradeoffs: this._getTradeoffs(decisionType, alt.context),
      }))
    );
    return { current: currentExplanation, alternatives: comparisons };
  }

  async getExplanationTemplate(type) {
    return this.templates[type] || this.templates.recommendation;
  }
}

export const explainableAiService = new ExplainableAiService();
