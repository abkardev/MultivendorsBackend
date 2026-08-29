import { PricingIntelligence } from '../models/PricingIntelligence.js';
import { ProductPerformance } from '../models/ProductPerformance.js';

class PricingIntelligenceService {
  async analyzeProductPricing(vendorId, productId) {
    const { Product } = await import('../models/productModel.js');
    const product = await Product.findById(productId).lean();
    if (!product) throw new Error('Product not found');
    const competitors = await Product.find({
      category: product.category,
      _id: { $ne: productId },
      isActive: true,
    }).select('name price vendor').lean();
    const competitorPrices = competitors.map(c => c.price).filter(p => p);
    const avgPrice = competitorPrices.length > 0
      ? competitorPrices.reduce((s, p) => s + p, 0) / competitorPrices.length
      : product.price;
    const minPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : product.price;
    const maxPrice = competitorPrices.length > 0 ? Math.max(...competitorPrices) : product.price;
    const pricePosition = avgPrice > 0 ? ((product.price - avgPrice) / avgPrice) * 100 : 0;
    const performance = await ProductPerformance.findOne({ vendor: vendorId, product: productId });
    const conversionRate = performance?.conversionRate || 0;
    let recommendation = 'maintain';
    if (pricePosition > 20 && conversionRate < 20) recommendation = 'reduce';
    else if (pricePosition < -20) recommendation = 'increase';
    const existing = await PricingIntelligence.findOne({ vendor: vendorId, product: productId });
    const data = {
      vendor: vendorId,
      product: productId,
      currentPrice: product.price,
      competitorAverage: Math.round(avgPrice),
      competitorMin: Math.round(minPrice),
      competitorMax: Math.round(maxPrice),
      pricePosition: Math.round(pricePosition * 100) / 100,
      marketDemand: 'moderate',
      recommendation,
      lastAnalyzed: new Date(),
    };
    if (existing) {
      await PricingIntelligence.findOneAndUpdate({ _id: existing._id }, { $set: data });
      return PricingIntelligence.findById(existing._id);
    }
    return PricingIntelligence.create(data);
  }

  async getProductPricing(vendorId, productId) {
    let intelligence = await PricingIntelligence.findOne({ vendor: vendorId, product: productId })
      .populate('product', 'name price images category');
    if (!intelligence) {
      return this.analyzeProductPricing(vendorId, productId);
    }
    return intelligence;
  }

  async getPricingList(vendorId) {
    const intelligences = await PricingIntelligence.find({ vendor: vendorId })
      .populate('product', 'name price images')
      .sort({ lastAnalyzed: -1 });
    const { Product } = await import('../models/productModel.js');
    const allProducts = await Product.find({ vendor: vendorId, isActive: true })
      .select('_id name price').lean();
    const trackedIds = new Set(intelligences.map(i => i.product?._id?.toString()));
    const untracked = allProducts.filter(p => !trackedIds.has(p._id.toString()));
    return { tracked: intelligences, untracked };
  }

  async getPricingRecommendations(vendorId) {
    const recommendations = await PricingIntelligence.find({
      vendor: vendorId,
      recommendation: { $ne: 'maintain' },
    }).populate('product', 'name price').sort({ lastAnalyzed: -1 });
    return recommendations;
  }

  async getPriceHistory(vendorId, productId) {
    const { default: AuditLog } = await import('../models/AuditLog.js');
    const history = await AuditLog.find({
      'details.vendor': vendorId,
      'details.product': productId,
      action: { $regex: /price/i },
    }).sort({ createdAt: -1 }).limit(30);
    return history;
  }
}

export const pricingIntelligenceService = new PricingIntelligenceService();
