import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import commerceIntelligenceService from './commerceIntelligenceService.js';
import supplierRiskService from './supplierRiskService.js';

class SupplierPortfolioOptimizerService {
  async optimize(userId, strategy = 'balanced', category) {
    const query = { status: 'active' };
    if (category) query.category = category;
    
    const vendors = await Vendor.find(query).limit(50).lean();
    const userOrders = await Order.find({ buyer: userId }).lean();
    const preferredVendors = new Set(userOrders.map(o => o.vendor?.toString()).filter(Boolean));

    const scored = await Promise.all(vendors.map(async (v) => {
      let score = 0;
      let reasons = [];
      const intel = await commerceIntelligenceService.getSupplierIntelligence(v._id).catch(() => null);
      const risk = await supplierRiskService.calculateVendorRisk(v._id).catch(() => null);

      switch (strategy) {
        case 'lowest_cost':
          score = intel?.classifications?.bestPrice || 50;
          reasons.push(`Price score: ${score}`);
          break;
        case 'highest_reputation':
          score = intel?.classifications?.bestReputation || 50;
          reasons.push(`Reputation score: ${score}`);
          break;
        case 'fastest_delivery':
          score = (intel?.classifications?.bestDelivery || 0.5) * 100;
          reasons.push(`Delivery score: ${score}`);
          break;
        case 'lowest_risk':
          score = risk ? 100 - risk.overall : 50;
          reasons.push(`Risk score: ${score}`);
          break;
        case 'balanced':
        default:
          score = (intel?.classifications?.bestOverall || 50) * 0.4 + (risk ? (100 - risk.overall) * 0.3 : 15) + (intel?.classifications?.bestDelivery || 0.5) * 30;
          reasons.push(`Overall: ${Math.round(score)}`);
          break;
      }
      
      if (preferredVendors.has(v._id.toString())) score += 10;
      if (v.country === 'Saudi Arabia') score += 5;

      return { vendor: { _id: v._id, name: v.name, country: v.country, city: v.city }, score: Math.round(score), reasons };
    }));

    scored.sort((a, b) => b.score - a.score);
    return { strategy, suppliers: scored.slice(0, 10), totalAnalyzed: scored.length };
  }
}

export default new SupplierPortfolioOptimizerService();
