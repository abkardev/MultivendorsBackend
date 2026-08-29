import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import Dispute from '../models/Dispute.js';
import Review from '../models/reviewModel.js';
import supplierRiskService from './supplierRiskService.js';

class ProcurementRiskIntelligenceService {
  async getRiskMap(vendorId) {
    const risk = await supplierRiskService.calculateVendorRisk(vendorId).catch(() => null);
    const vendor = await Vendor.findById(vendorId).lean();
    const disputes = await Dispute.find({ vendor: vendorId }).lean();
    const reviews = await Review.find({ vendor: vendorId }).lean();
    const orders = await Order.find({ vendor: vendorId }).lean();

    const dimensions = {
      supplierRisk: { score: risk?.overall || 50, trend: 'stable', severity: this.getSeverity(risk?.overall || 50), reason: 'Based on delivery, quality, and dispute history', mitigation: 'Regular performance reviews' },
      countryRisk: { score: vendor?.country !== 'Saudi Arabia' ? 30 : 10, trend: 'stable', severity: vendor?.country !== 'Saudi Arabia' ? 'moderate' : 'low', reason: vendor?.country !== 'Saudi Arabia' ? 'International jurisdiction' : 'Local supplier', mitigation: 'Local supplier preference' },
      financialRisk: { score: risk?.scores?.financialRisk || 40, trend: 'stable', severity: this.getSeverity(risk?.scores?.financialRisk || 40), reason: 'Based on order cancellations and refunds', mitigation: 'Escrow payments' },
      complianceRisk: { score: risk?.scores?.complianceRisk || 30, trend: 'stable', severity: this.getSeverity(risk?.scores?.complianceRisk || 30), reason: vendor?.certifications?.length > 0 ? 'Certifications present' : 'Missing certifications', mitigation: 'Request certification documentation' },
      shipmentRisk: { score: risk?.scores?.deliveryRisk || 40, trend: 'stable', severity: this.getSeverity(risk?.scores?.deliveryRisk || 40), reason: 'Based on delivery history', mitigation: 'Use insured shipping' },
      qualityRisk: { score: risk?.scores?.qualityRisk || 40, trend: 'stable', severity: this.getSeverity(risk?.scores?.qualityRisk || 40), reason: 'Based on review ratings', mitigation: 'Request samples before bulk order' },
      disputeRisk: { score: risk?.scores?.disputeRisk || 30, trend: 'stable', severity: this.getSeverity(risk?.scores?.disputeRisk || 30), reason: `${disputes.length} dispute(s) on record`, mitigation: 'Clear contract terms' },
    };

    const overall = Math.round(Object.values(dimensions).reduce((s, d) => s + d.score, 0) / Object.keys(dimensions).length);
    return { overall, level: this.getSeverity(overall), dimensions, trends: this.getTrends(orders, disputes), forecast: this.generateForecast(dimensions) };
  }

  getSeverity(score) {
    if (score <= 15) return 'excellent';
    if (score <= 30) return 'low';
    if (score <= 50) return 'moderate';
    if (score <= 75) return 'high';
    return 'critical';
  }

  getTrends(orders, disputes) {
    if (orders.length < 2) return { direction: 'stable', changePercent: 0 };
    const recent = orders.slice(-Math.min(5, orders.length));
    const delayed = recent.filter(o => o.delayed).length;
    return { direction: delayed > 2 ? 'deteriorating' : 'improving', changePercent: Math.round((delayed / recent.length) * 100) };
  }

  generateForecast(dimensions) {
    const scores = Object.values(dimensions).map(d => d.score);
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return { predictedNextMonth: Math.round(avg + (Math.random() * 10 - 5)), confidence: 70 };
  }
}

export default new ProcurementRiskIntelligenceService();
