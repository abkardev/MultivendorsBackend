import { Quotation } from '../models/Quotation.js';
import Review from '../models/reviewModel.js';
import { Order } from '../models/orderModel.js';
import supplierRiskService from './supplierRiskService.js';

class AiNegotiationService {
  async generateNegotiationPlan(vendorId, productId, targetQuantity) {
    const [quotes, reviews, orders, risk] = await Promise.all([
      Quotation.find({ vendor: vendorId }).sort('-createdAt').limit(10).lean(),
      Review.find({ vendor: vendorId }).lean(),
      Order.find({ vendor: vendorId }).sort('-total').lean(),
      supplierRiskService.calculateVendorRisk(vendorId).catch(() => null),
    ]);

    const avgQuotePrice = quotes.reduce((s, q) => s + (q.total || 0), 0) / Math.max(1, quotes.length);
    const avgOrderPrice = orders.reduce((s, o) => s + (o.total || 0), 0) / Math.max(1, orders.length);
    const avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / Math.max(1, reviews.length);

    const targetPrice = avgQuotePrice > 0 ? avgQuotePrice * 0.9 : avgOrderPrice * 0.85;
    const minPrice = targetPrice * 0.85;
    const maxPrice = avgQuotePrice || avgOrderPrice || targetPrice * 1.1;

    const moqSuggestion = targetQuantity > 0
      ? Math.max(1, Math.round(targetQuantity / 5)) * 5
      : 100;

    const talkingPoints = [
      `Reference past order volume of ${orders.length} orders`,
      avgRating > 4 ? 'Strong positive reviews support your quality position' : 'Quality improvement areas can be addressed',
      risk ? `Risk profile: ${risk.level} (score: ${risk.overall})` : '',
      targetQuantity > 0 ? `Volume of ${targetQuantity} units justifies tiered pricing` : '',
      avgQuotePrice > 0 ? `Market-aligned pricing at ${Math.round(avgQuotePrice).toLocaleString()} SAR average` : '',
    ].filter(Boolean);

    const weaknesses = [];
    if (risk?.overall > 50) weaknesses.push('Elevated risk score');
    if (avgRating < 3.5) weaknesses.push('Below-average buyer satisfaction');
    if (quotes.length < 5) weaknesses.push('Limited quotation history');

    const strengths = [];
    if (risk?.overall <= 30) strengths.push('Low risk profile');
    if (avgRating >= 4) strengths.push('Strong buyer satisfaction');
    if (orders.length >= 10) strengths.push('Extensive order history');

    return {
      targetPrice: Math.round(targetPrice),
      minimumPrice: Math.round(minPrice),
      maximumPrice: Math.round(maxPrice),
      moqSuggestion,
      recommendedPaymentTerms: risk?.overall > 50 ? 'Escrow or Letter of Credit' : '30% advance, 70% on delivery',
      recommendedShipmentTerms: 'FOB for international, EXW for local',
      talkingPoints,
      riskWarnings: risk?.reasons || [],
      supplierStrengths: strengths,
      supplierWeaknesses: weaknesses,
      alternativeSuppliers: [],
      probabilityOfSuccess: Math.round(Math.max(0, 100 - (risk?.overall || 0) - (avgRating < 3 ? 20 : 0))),
      confidenceScore: Math.round(Math.min(90, 50 + orders.length * 2 + (avgRating > 4 ? 10 : 0))),
    };
  }
}

export default new AiNegotiationService();
