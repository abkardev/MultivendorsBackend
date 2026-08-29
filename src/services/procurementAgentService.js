import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import { Announcement } from '../models/announcementModel.js';
import { Quotation } from '../models/Quotation.js';
import Dispute from '../models/Dispute.js';
import supplierRiskService from './supplierRiskService.js';
import commerceIntelligenceService from './commerceIntelligenceService.js';
import ProcurementPlan from '../models/ProcurementPlan.js';

class ProcurementAgentService {
  async interpretIntent(userId, intent) {
    const params = this.parseIntent(intent);

    const [products, vendors, userOrders] = await Promise.all([
      this.findMatchingProducts(params),
      this.findMatchingVendors(params),
      Order.find({ buyer: userId }).sort('-createdAt').limit(10).lean(),
    ]);

    const shortlistedVendors = await this.scoreAndRankVendors(vendors, params);

    const rfqRecommendation = this.generateRFQRecommendation(params, shortlistedVendors);
    const shipmentRecommendation = this.generateShipmentRecommendation(params);
    const escrowRecommendation = this.generateEscrowRecommendation(params, shortlistedVendors);
    const paymentRecommendation = this.generatePaymentRecommendation(params, shortlistedVendors);
    const risks = await this.identifyRisks(params, shortlistedVendors);
    const timeline = this.generateTimeline(params);

    const estimatedSavings = this.estimateSavings(params, shortlistedVendors, userOrders);

    return {
      intent: { original: intent, parsed: params },
      strategy: this.generateStrategy(params, shortlistedVendors),
      productRecommendations: products.slice(0, 5),
      supplierShortlist: shortlistedVendors.slice(0, 5),
      rfqRecommendation,
      shipmentRecommendation,
      escrowRecommendation,
      paymentRecommendation,
      timeline,
      estimatedCost: this.estimateCost(params, shortlistedVendors),
      estimatedSavings,
      risks,
      confidenceScore: this.calculateConfidence(params, shortlistedVendors, products),
      reasoning: this.generateReasoning(params, shortlistedVendors),
    };
  }

  parseIntent(intent) {
    const lower = intent.toLowerCase();
    const params = {
      original: intent,
      quantity: null,
      productType: '',
      certifications: [],
      country: '',
      requirements: [],
      budget: null,
      priority: 'balanced',
    };

    const qtyMatch = intent.match(/(\d+[,]?\d*)\s*(?:pieces|units|items|kg|tons|solar panels|panels)/i);
    if (qtyMatch) params.quantity = parseInt(qtyMatch[1].replace(',', ''));

    const certKeywords = ['FDA', 'ISO', 'CE', 'SASO', 'Halal', 'organic', 'BSCI', 'OHSAS', 'GMP'];
    certKeywords.forEach(cert => {
      if (lower.includes(cert.toLowerCase())) params.certifications.push(cert);
    });

    const countries = ['saudi', 'china', 'india', 'usa', 'europe', 'germany', 'japan', 'korea', 'turkey', 'uae'];
    countries.forEach(c => {
      if (lower.includes(c)) params.country = c;
    });

    if (lower.includes('cheap') || lower.includes('lowest price') || lower.includes('affordable')) {
      params.requirements.push('lowest_cost'); params.priority = 'cost';
    }
    if (lower.includes('fast') || lower.includes('urgent') || lower.includes('quick')) {
      params.requirements.push('fastest_delivery'); params.priority = 'speed';
    }
    if (lower.includes('quality') || lower.includes('premium') || lower.includes('high')) {
      params.requirements.push('highest_quality'); params.priority = 'quality';
    }
    if (lower.includes('oem')) params.requirements.push('oem');
    if (lower.includes('odm')) params.requirements.push('odm');
    if (lower.includes('factory') || lower.includes('manufacturer')) params.requirements.push('factory_direct');
    if (lower.includes('low risk') || lower.includes('safe') || lower.includes('reliable')) params.requirements.push('low_risk');

    const tokens = intent.split(/\s+/);
    const afterQuantity = qtyMatch ? tokens.slice(tokens.indexOf(qtyMatch[2]) + 1) : tokens;
    params.productType = afterQuantity.filter(t => t.length > 2 && !['for', 'with', 'that', 'from', 'need', 'want', 'looking'].includes(t.toLowerCase())).join(' ').trim() || '';

    return params;
  }

  async findMatchingProducts(params) {
    const query = { status: 'active' };
    if (params.productType) {
      query.$or = [
        { name: { $regex: params.productType, $options: 'i' } },
        { description: { $regex: params.productType, $options: 'i' } },
        { tags: { $regex: params.productType, $options: 'i' } },
      ];
    }
    if (params.certifications.length > 0) {
      query.certifications = { $in: params.certifications };
    }
    return Product.find(query).populate('vendor').limit(20).lean();
  }

  async findMatchingVendors(params) {
    const query = { status: 'active' };
    if (params.country) {
      const countryMap = { saudi: 'Saudi Arabia', china: 'China', india: 'India', usa: 'United States', germany: 'Germany', japan: 'Japan', korea: 'South Korea', turkey: 'Turkey', uae: 'UAE', europe: 'Europe' };
      query.country = countryMap[params.country] || params.country;
    }
    if (params.certifications.length > 0) {
      query.certifications = { $in: params.certifications };
    }
    return Vendor.find(query).limit(20).lean();
  }

  async scoreAndRankVendors(vendors, params) {
    const scored = await Promise.all(vendors.map(async (v) => {
      let score = 50;
      const reasons = [];

      const intel = await commerceIntelligenceService.getSupplierIntelligence(v._id).catch(() => null);
      const risk = await supplierRiskService.calculateVendorRisk(v._id).catch(() => null);

      if (intel?.classifications?.bestOverall) score += intel.classifications.bestOverall * 0.3;

      if (params.priority === 'cost' && intel?.classifications?.bestPrice) score += intel.classifications.bestPrice * 0.4;
      if (params.priority === 'speed' && intel?.classifications?.bestDelivery) score += (intel.classifications.bestDelivery * 100) * 0.4;
      if (params.priority === 'quality' && intel?.classifications?.bestReputation) score += intel.classifications.bestReputation * 0.4;

      if (params.requirements.includes('oem') && v.capabilities?.oem) score += 20;
      if (params.requirements.includes('odm') && v.capabilities?.odm) score += 20;

      if (risk) score -= risk.overall * 0.3;

      if (v.country === 'Saudi Arabia') score += 10;

      const vendorCerts = (v.certifications || []).map(c => c.toLowerCase());
      const matchingCerts = params.certifications.filter(c => vendorCerts.some(vc => vc.includes(c.toLowerCase())));
      score += matchingCerts.length * 5;

      return { vendor: v, score: Math.round(score), reasons, matchDetails: { intel, risk } };
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  generateRFQRecommendation(params, shortlistedVendors) {
    return {
      recommended: shortlistedVendors.length > 0,
      title: params.productType ? `RFQ: ${params.productType}` : 'New Procurement RFQ',
      targetSuppliers: shortlistedVendors.slice(0, 3).map(s => s.vendor?._id).filter(Boolean),
      quantity: params.quantity,
      certifications: params.certifications,
      notes: `AI-generated RFQ based on intent: "${params.original || ''}"`,
    };
  }

  generateShipmentRecommendation(params) {
    if (params.country && params.country !== 'saudi') {
      return { method: 'sea_freight', recommendation: 'Sea freight recommended for international procurement. Consider FOB incoterms.', alternatives: ['air_freight'], insurance: 'recommended' };
    }
    return { method: 'land_freight', recommendation: 'Land freight recommended for local procurement.', insurance: 'optional' };
  }

  generateEscrowRecommendation(params, shortlistedVendors) {
    const avgRisk = shortlistedVendors.reduce((s, v) => s + (v.matchDetails?.risk?.overall || 0), 0) / Math.max(1, shortlistedVendors.length);
    if (avgRisk > 30 || (params.budget || 50000) > 50000) {
      return { recommended: true, reason: 'Escrow recommended to protect high-value or higher-risk procurement', minimumAmount: 50000 };
    }
    return { recommended: false, reason: 'Escrow optional for low-value or trusted supplier relationships' };
  }

  generatePaymentRecommendation(params, shortlistedVendors) {
    if (shortlistedVendors.some(s => s.vendor?.country && s.vendor.country !== 'Saudi Arabia')) {
      return { method: 'letter_of_credit', recommendation: 'Letter of Credit recommended for international suppliers', alternatives: ['wire_transfer', 'escrow'] };
    }
    return { method: 'bank_transfer', recommendation: 'Bank transfer or escrow recommended for local suppliers', alternatives: ['escrow'] };
  }

  async identifyRisks(params, shortlistedVendors) {
    const risks = [];

    if (shortlistedVendors.length === 0) {
      risks.push({ type: 'supplier_availability', severity: 'critical', description: 'No matching suppliers found', mitigation: 'Broaden search criteria or consider alternative product categories' });
    }

    if (params.country && params.country !== 'saudi') {
      risks.push({ type: 'international_shipment', severity: 'moderate', description: 'International procurement adds shipping complexity and customs delays', mitigation: 'Use experienced freight forwarder and allow extra lead time' });
    }

    const avgRisk = shortlistedVendors.reduce((s, v) => s + (v.matchDetails?.risk?.overall || 0), 0) / Math.max(1, shortlistedVendors.length);
    if (avgRisk > 50) {
      risks.push({ type: 'supplier_risk', severity: 'high', description: 'Shortlisted suppliers have elevated risk scores', mitigation: 'Request additional documentation or consider escrow payments' });
    }

    if (params.certifications.length > 0 && shortlistedVendors.every(s => !s.vendor?.certifications)) {
      risks.push({ type: 'certification_gap', severity: 'moderate', description: 'No vendors found with required certifications', mitigation: 'Verify certification requirements or accept certified products instead' });
    }

    return risks;
  }

  generateTimeline(params) {
    const now = new Date();
    const milestones = [
      { name: 'Strategy Definition', duration: 3 },
      { name: 'Supplier Selection', duration: 5 },
      { name: 'RFQ Creation', duration: 2 },
      { name: 'Supplier Response Period', duration: 7 },
      { name: 'Quotation Evaluation', duration: 3 },
      { name: 'Negotiation', duration: 5 },
      { name: 'Approval', duration: 2 },
      { name: 'Payment Processing', duration: 2 },
      { name: 'Production/Processing', duration: 15 },
      { name: 'Shipment', duration: params.country && params.country !== 'saudi' ? 20 : 5 },
      { name: 'Customs Clearance', duration: params.country && params.country !== 'saudi' ? 5 : 0 },
      { name: 'Delivery', duration: 2 },
      { name: 'Escrow Release', duration: 2 },
    ];

    let currentDate = new Date(now);
    return milestones.map(m => {
      const start = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + m.duration);
      const end = new Date(currentDate);
      return { ...m, startDate: start, endDate: end };
    });
  }

  estimateCost(params, shortlistedVendors) {
    if (!params.quantity) return { estimatedTotal: 0, currency: 'SAR', breakdown: { unitPrice: 0, shipping: 0, duties: 0, total: 0 } };
    const avgPrice = shortlistedVendors.reduce((s, v) => s + (v.vendor?.avgPrice || 0), 0) / Math.max(1, shortlistedVendors.length);
    const unitPrice = avgPrice || 100;
    const subtotal = params.quantity * unitPrice;
    const shipping = params.country && params.country !== 'saudi' ? subtotal * 0.12 : subtotal * 0.05;
    const duties = params.country && params.country !== 'saudi' ? subtotal * 0.05 : 0;
    return { estimatedTotal: Math.round(subtotal + shipping + duties), currency: 'SAR', breakdown: { unitPrice: Math.round(unitPrice), shipping: Math.round(shipping), duties: Math.round(duties), total: Math.round(subtotal + shipping + duties) } };
  }

  estimateSavings(params, shortlistedVendors, userOrders) {
    const avgMarketPrice = shortlistedVendors.reduce((s, v) => s + (v.vendor?.avgPrice || 0), 0) / Math.max(1, shortlistedVendors.length);
    const userAvgPrice = userOrders.reduce((s, o) => s + (o.total || 0), 0) / Math.max(1, userOrders.length);
    const savingsPerUnit = Math.max(0, userAvgPrice - avgMarketPrice);
    return { estimatedSavings: Math.round(savingsPerUnit * (params.quantity || 1)), percentage: userAvgPrice > 0 ? Math.round((savingsPerUnit / userAvgPrice) * 100) : 0, basedOn: 'Market comparison vs your historical average' };
  }

  generateStrategy(params, shortlistedVendors) {
    if (shortlistedVendors.length === 0) return { approach: 'market_research', description: 'No direct matches found. Consider broader sourcing strategy.' };
    if (params.priority === 'cost') return { approach: 'competitive_bidding', description: 'Use competitive RFQ to drive lowest pricing from multiple suppliers.' };
    if (params.priority === 'speed') return { approach: 'direct_procurement', description: 'Proceed directly with top-ranked supplier for fastest delivery.' };
    if (params.priority === 'quality') return { approach: 'targeted_sourcing', description: 'Focus on highest-rated suppliers with relevant certifications.' };
    return { approach: 'balanced', description: 'Balanced approach: evaluate cost, quality, and delivery equally.' };
  }

  calculateConfidence(params, shortlistedVendors, products) {
    let confidence = 50;
    if (params.productType) confidence += 15;
    if (params.quantity) confidence += 10;
    if (shortlistedVendors.length > 0) confidence += 15;
    if (products.length > 0) confidence += 10;
    if (params.certifications.length > 0) confidence += 5;
    if (params.country) confidence += 5;
    return Math.min(95, confidence);
  }

  generateReasoning(params, shortlistedVendors) {
    const parts = [];
    if (params.productType) parts.push(`Analyzed marketplace for "${params.productType}"`);
    if (shortlistedVendors.length > 0) parts.push(`Found ${shortlistedVendors.length} potential suppliers`);
    const topScore = shortlistedVendors[0]?.score;
    if (topScore) parts.push(`Top supplier match score: ${topScore}/100`);
    if (params.certifications.length > 0) parts.push(`Filtered for certifications: ${params.certifications.join(', ')}`);
    if (params.country) parts.push(`Sourcing from: ${params.country}`);
    return parts.join('. ') + '. Recommendations based on marketplace data, supplier reputation, risk analysis, and your requirements.';
  }

  async createPlan(userId, intent) {
    const interpretation = await this.interpretIntent(userId, intent);
    const plan = new ProcurementPlan({
      user: userId,
      name: `Procurement Plan: ${interpretation.intent.parsed.productType || 'New Procurement'}`,
      businessObjective: intent,
      status: 'draft',
      budget: interpretation.estimatedCost?.estimatedTotal,
      targetSuppliers: interpretation.supplierShortlist.slice(0, 3).map(s => s.vendor?._id).filter(Boolean),
      deliveryDeadline: interpretation.timeline?.[interpretation.timeline.length - 1]?.endDate,
      milestones: interpretation.timeline.map(t => ({ name: t.name, description: t.name, dueDate: t.endDate, status: 'pending' })),
      riskScore: interpretation.risks.length > 0 ? Math.max(...interpretation.risks.map(r => r.severity === 'critical' ? 80 : r.severity === 'high' ? 60 : 40)) : 10,
      confidenceScore: interpretation.confidenceScore,
      estimatedSavings: interpretation.estimatedSavings?.estimatedSavings || 0,
      calendarEvents: interpretation.timeline.map(t => ({ title: t.name, startDate: t.startDate, endDate: t.endDate, type: 'milestone' })),
    });
    await plan.save();
    return plan;
  }

  async getPlan(planId, userId) {
    const plan = await ProcurementPlan.findOne({ _id: planId, user: userId }).lean();
    return plan;
  }

  async updatePlan(planId, userId, updates) {
    const plan = await ProcurementPlan.findOne({ _id: planId, user: userId });
    if (!plan) return null;
    Object.assign(plan, updates);
    plan.version += 1;
    plan.versions.push({ version: plan.version, changes: 'Updated via AI', changedBy: userId, snapshot: JSON.parse(JSON.stringify(updates)) });
    await plan.save();
    return plan;
  }

  async listPlans(userId, status) {
    const query = { user: userId };
    if (status) query.status = status;
    return ProcurementPlan.find(query).sort('-createdAt').lean();
  }

  async deletePlan(planId, userId) {
    return ProcurementPlan.deleteOne({ _id: planId, user: userId });
  }
}

export default new ProcurementAgentService();
