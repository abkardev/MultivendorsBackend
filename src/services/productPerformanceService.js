import { ProductPerformance } from '../models/ProductPerformance.js';

class ProductPerformanceService {
  async getPerformance(vendorId, options = {}) {
    const { sortBy = 'totalRevenue', sortOrder = -1, page = 1, limit = 20 } = options;
    const filter = { vendor: vendorId };
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      ProductPerformance.find(filter)
        .populate('product', 'name images price currency')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      ProductPerformance.countDocuments(filter),
    ]);
    return { products, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getProductDetail(vendorId, productId) {
    const perf = await ProductPerformance.findOne({ vendor: vendorId, product: productId })
      .populate('product', 'name images price currency description category');
    if (!perf) return null;
    return perf;
  }

  async calculatePerformance(vendorId, productId) {
    const { Product } = await import('../models/productModel.js');
    const { default: Order } = await import('../models/Order.js');
    const { default: Quotation } = await import('../models/Quotation.js');
    const { default: Review } = await import('../models/reviewModel.js');
    const existing = await ProductPerformance.findOne({ vendor: vendorId, product: productId });
    const product = await Product.findById(productId);
    if (!product) return null;
    const orders = await Order.find({ vendor: vendorId, 'items.product': productId });
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalUnits = orders.reduce((s, o) => {
      const item = o.items?.find(i => i.product?.toString() === productId);
      return s + (item?.quantity || 0);
    }, 0);
    const quotations = await Quotation.find({ vendor: vendorId, 'items.productId': productId });
    const totalQuotes = quotations.length;
    const totalRfqs = await Quotation.countDocuments({ vendor: vendorId, 'items.productId': productId, source: 'rfq' });
    const reviews = await Review.find({ product: productId });
    const buyerCountries = [];
    const buyerIndustries = [];
    for (const order of orders) {
      if (order.shippingAddress?.country) {
        const existing = buyerCountries.find(c => c.name === order.shippingAddress.country);
        if (existing) existing.count++;
        else buyerCountries.push({ name: order.shippingAddress.country, count: 1 });
      }
    }
    const data = {
      vendor: vendorId, product: productId,
      totalRfqs, totalQuotes: totalQuotes, totalOrders, totalRevenue, totalUnitsSold: totalUnits,
      conversionRate: totalRfqs > 0 ? (totalOrders / totalRfqs) * 100 : 0,
      repeatPurchaseRate: totalOrders > 1 ? 50 : 0,
      buyerCountries, buyerIndustries,
      demandTrend: totalOrders > 5 ? 'rising' : totalOrders > 0 ? 'stable' : 'declining',
      profitEstimate: totalRevenue * 0.2,
      profitMargin: 20,
      calculatedAt: new Date(),
    };
    if (existing) {
      await ProductPerformance.findOneAndUpdate({ vendor: vendorId, product: productId }, { $set: data });
    } else {
      await ProductPerformance.create(data);
    }
    return this.getProductDetail(vendorId, productId);
  }

  async getTopProducts(vendorId, metric = 'totalRevenue', limit = 10) {
    return ProductPerformance.find({ vendor: vendorId })
      .populate('product', 'name images price')
      .sort({ [metric]: -1 })
      .limit(limit);
  }

  async getProductRecommendations(vendorId, productId) {
    const perf = await this.getProductDetail(vendorId, productId);
    if (!perf) return [];
    const recommendations = [];
    if (perf.conversionRate < 10) recommendations.push('Consider lowering price or improving product description');
    if (perf.totalRfqs > 0 && perf.totalOrders === 0) recommendations.push('Follow up on pending RFQs for this product');
    if (perf.demandTrend === 'rising') recommendations.push('Increase inventory - demand is rising');
    if (perf.demandTrend === 'declining') recommendations.push('Consider bundling or promotion to boost sales');
    if (perf.profitMargin < 15) recommendations.push('Review pricing strategy - margin is below 15%');
    return recommendations;
  }
}

export const productPerformanceService = new ProductPerformanceService();
