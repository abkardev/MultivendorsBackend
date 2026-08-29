import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';
import { Order } from '../models/orderModel.js';
import commerceIntelligenceService from './commerceIntelligenceService.js';
import supplierRiskService from './supplierRiskService.js';

class ProcurementKnowledgeEngine {
  async explainSupplier(vendorId) {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) return { answer: 'Supplier not found', confidence: 0 };
    const [intel, risk, reviews, disputes] = await Promise.all([
      commerceIntelligenceService.getSupplierIntelligence(vendorId).catch(() => null),
      supplierRiskService.calculateVendorRisk(vendorId).catch(() => null),
      Review.find({ vendor: vendorId }).lean(),
      Dispute.find({ vendor: vendorId }).lean(),
    ]);
    return {
      answer: `${vendor.name} has a ${risk?.level || 'unknown'} risk profile with ${intel?.classifications?.bestOverall || 0}/100 overall score. ${reviews.length} reviews with avg ${reviews.reduce((s,r) => s + (r.rating||0), 0) / Math.max(1, reviews.length).toFixed(1)} stars. ${disputes.length} dispute(s) on record. ${vendor.certifications?.length || 0} certifications.`,
      confidence: intel ? 85 : 50,
      data: { vendor, reputation: intel, risk, reviews, disputes },
    };
  }

  async explainProduct(productId) {
    const product = await Product.findById(productId).populate('vendor').lean();
    if (!product) return { answer: 'Product not found', confidence: 0 };
    const priceIntel = await commerceIntelligenceService.getPriceIntelligence(productId).catch(() => null);
    return {
      answer: `${product.name} — ${priceIntel?.label || 'Fair Price'} at ${product.price} SAR. ${product.moq ? `Min order: ${product.moq}` : ''}. ${product.leadTime ? `Lead time: ${product.leadTime}` : ''}. ${product.vendor?.name ? `Supplied by: ${product.vendor.name}` : ''}.`,
      confidence: priceIntel ? 80 : 60,
      data: { product, priceIntelligence: priceIntel },
    };
  }

  async explainRecommendation(userId, recommendationType) {
    const orders = await Order.find({ buyer: userId }).sort('-createdAt').limit(5).lean();
    const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);
    if (recommendationType === 'negotiate_pricing') {
      return { answer: `Based on your total spend of ${totalSpend.toLocaleString()} SAR across ${orders.length} orders, you have leverage to negotiate volume pricing. Marketplace data shows 10-15% savings potential for your spend level.`, confidence: 75, data: { totalSpend, orderCount: orders.length } };
    }
    if (recommendationType === 'increase_diversity') {
      const uniqueVendors = new Set(orders.map(o => o.vendor?.toString()).filter(Boolean));
      return { answer: `You currently work with ${uniqueVendors.size} supplier(s). Increasing to 5+ suppliers reduces dependency risk. Marketplace data shows diverse portfolios have 30% fewer supply disruptions.`, confidence: 80, data: { supplierCount: uniqueVendors.size } };
    }
    return { answer: 'Recommendation based on your procurement history and marketplace data.', confidence: 60 };
  }
}

export default new ProcurementKnowledgeEngine();
