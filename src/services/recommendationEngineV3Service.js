import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import { Category } from '../models/categoryModel.js';
import User from '../models/userModel.js';
import Review from '../models/reviewModel.js';
import BuyerReputation from '../models/BuyerReputation.js';
import { SellerKnowledgeArticle } from '../models/SellerKnowledgeArticle.js';
import { logAuditEvent } from './auditService.js';

class RecommendationEngineV3Service {
  async getRecommendations(entityType, entityId, context = {}) {
    switch (entityType) {
      case 'product': return this.getProductRecommendations(entityId, context.limit);
      case 'supplier': return this.getSupplierRecommendations(entityId, context.limit);
      case 'category': return this.getCategoryRecommendations(entityId);
      case 'pricing': return this.getPricingRecommendations(entityId);
      case 'discount': return this.getDiscountRecommendations(entityId);
      case 'subscription': return this.getSubscriptionRecommendations(entityId);
      case 'workflow': return this.getWorkflowRecommendations();
      case 'approval': return this.getApprovalRecommendations(entityType, entityId);
      case 'knowledge': return this.getKnowledgeRecommendations(entityId);
      case 'report': return this.getReportRecommendations(entityId);
      case 'playbook': return this.getPlaybookRecommendations(context);
      default: return { recommendations: [] };
    }
  }

  async getProductRecommendations(userId, limit = 10) {
    const orders = await EscrowOrder.find({ buyer: userId }).populate('items.product').lean();
    const purchasedProductIds = new Set();
    const categoryCounts = {};
    const vendorPrefs = {};

    for (const o of orders) {
      for (const item of o.items || []) {
        if (item.product?._id) purchasedProductIds.add(item.product._id.toString());
        if (item.product?.category) {
          const catId = item.product.category.toString();
          categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
        }
      }
      if (o.vendor) {
        const vid = o.vendor.toString();
        vendorPrefs[vid] = (vendorPrefs[vid] || 0) + (o.totalAmount || 0);
      }
    }

    const preferredCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const preferredVendors = Object.entries(vendorPrefs)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    const query = { isActive: true };
    if (preferredCategories.length > 0) {
      query.category = { $in: preferredCategories };
    }
    if (purchasedProductIds.size > 0) {
      query._id = { $nin: [...purchasedProductIds] };
    }

    const candidates = await Product.find(query).populate('vendor', 'storeName rating').limit(limit * 3).lean();
    const scored = candidates.map(p => {
      let score = 0;
      const reasons = [];
      const evidence = [];

      if (preferredCategories.includes(p.category?.toString())) {
        score += 30;
        reasons.push('Matches your preferred categories');
        evidence.push('Based on your purchase history');
      }
      if (preferredVendors.includes(p.vendor?._id?.toString())) {
        score += 25;
        reasons.push('From a vendor you frequently order from');
        evidence.push('Vendor relationship strength');
      }
      if (p.rating && p.rating >= 4) {
        score += 20;
        reasons.push('Highly rated product');
        evidence.push(`Rating: ${p.rating}/5`);
      }
      if (p.discountPercent && p.discountPercent > 10) {
        score += 10;
        reasons.push(`Currently ${p.discountPercent}% off`);
        evidence.push('Active promotion');
      }

      return {
        item: { productId: p._id, name: p.name?.en || p.name, price: p.price, vendor: p.vendor?.storeName?.en || p.vendor?.storeName },
        reason: reasons[0] || 'Popular choice',
        evidence: evidence[0] || 'General recommendation',
        expectedOutcome: score > 50 ? 'High purchase probability' : 'Moderate interest expected',
        confidence: Math.min(99, Math.round(score + 20)),
      };
    });

    scored.sort((a, b) => b.confidence - a.confidence);
    return { recommendations: scored.slice(0, limit) };
  }

  async getSupplierRecommendations(buyerId, limit = 10) {
    const orders = await EscrowOrder.find({ buyer: buyerId }).populate('vendor').lean();
    const usedVendorIds = new Set(orders.map(o => o.vendor?._id?.toString()).filter(Boolean));
    const industryPrefs = {};

    for (const o of orders) {
      for (const item of o.items || []) {
        if (item.name?.en) {
          const ind = item.name.en;
          industryPrefs[ind] = (industryPrefs[ind] || 0) + 1;
        }
      }
    }

    const topIndustries = Object.entries(industryPrefs).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const vendors = await Vendor.find({ isActive: true }).lean();
    const vendorIds = vendors.map(v => v._id);
    const reviews = await Review.aggregate([
      { $match: { vendor: { $in: vendorIds }, moderationStatus: 'approved' } },
      { $group: { _id: '$vendor', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const reviewMap = {};
    for (const r of reviews) reviewMap[r._id.toString()] = r;

    const scored = vendors
      .filter(v => !usedVendorIds.has(v._id.toString()))
      .map(v => {
        let score = 30;
        const reasons = [];
        const rev = reviewMap[v._id.toString()];
        if (rev && rev.avgRating >= 4) { score += 25; reasons.push('Top-rated supplier'); }
        if (rev && rev.count > 10) { score += 15; reasons.push('Proven track record'); }
        if (v.isVerified) { score += 15; reasons.push('Verified supplier'); }
        return {
          item: { vendorId: v._id, storeName: v.storeName?.en || v.storeName, rating: rev?.avgRating || 0, reviewCount: rev?.count || 0 },
          reason: reasons[0] || 'Recommended supplier',
          evidence: `Rating: ${(rev?.avgRating || 0).toFixed(1)}/5 from ${rev?.count || 0} reviews`,
          expectedOutcome: score > 60 ? 'High match quality' : 'Good alternative',
          confidence: Math.min(95, score),
        };
      });

    scored.sort((a, b) => b.confidence - a.confidence);
    return { recommendations: scored.slice(0, limit) };
  }

  async getCategoryRecommendations(userId) {
    const orders = await EscrowOrder.find({ buyer: userId }).populate('items.product').lean();
    const categoryScores = {};

    for (const o of orders) {
      for (const item of o.items || []) {
        if (item.product?.category) {
          const catId = item.product.category.toString();
          if (!categoryScores[catId]) categoryScores[catId] = { count: 0, revenue: 0 };
          categoryScores[catId].count += item.quantity || 1;
          categoryScores[catId].revenue += item.totalPrice || 0;
        }
      }
    }

    const categories = await Category.find().lean();
    const catMap = {};
    for (const c of categories) catMap[c._id.toString()] = c;

    const recommendations = Object.entries(categoryScores)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([catId, data]) => {
        const cat = catMap[catId];
        return {
          item: { categoryId: catId, name: cat?.name?.en || cat?.name || 'Unknown' },
          reason: `You've spent ${data.revenue} in this category`,
          evidence: `${data.count} items purchased`,
          expectedOutcome: 'Increased category engagement',
          confidence: Math.min(90, Math.round(50 + (data.revenue / 1000) * 5)),
        };
      });

    return { recommendations };
  }

  async getPricingRecommendations(productId) {
    const product = await Product.findById(productId).lean();
    if (!product) throw new Error('Product not found');

    const similarProducts = await Product.find({ category: product.category, _id: { $ne: productId }, isActive: true }).lean();
    const prices = similarProducts.map(p => p.price).filter(Boolean);
    const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : product.price;
    const minPrice = prices.length > 0 ? Math.min(...prices) : product.price * 0.8;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : product.price * 1.2;

    const position = product.price < avgPrice ? 'below_market' : product.price > avgPrice ? 'above_market' : 'at_market';
    const recommendations = [
      {
        item: { productId, currentPrice: product.price, marketAvg: Math.round(avgPrice * 100) / 100, priceRange: { min: minPrice, max: maxPrice } },
        reason: position === 'below_market' ? 'Priced below market average - potential margin opportunity' : position === 'above_market' ? 'Priced above market average - may need adjustment' : 'Priced at market average',
        evidence: `Market average: ${Math.round(avgPrice * 100) / 100}, Range: ${Math.round(minPrice * 100) / 100} - ${Math.round(maxPrice * 100) / 100}`,
        expectedOutcome: position === 'above_market' ? 'Price reduction may increase sales volume' : position === 'below_market' ? 'Small increase may improve margins' : 'Stable pricing expected',
        confidence: prices.length > 5 ? 85 : prices.length > 2 ? 70 : 50,
      },
    ];

    return { recommendations };
  }

  async getDiscountRecommendations(productId) {
    const product = await Product.findById(productId).lean();
    if (!product) throw new Error('Product not found');

    const ageDays = (Date.now() - new Date(product.createdAt).getTime()) / 86400000;
    const recommendations = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const orderCount = await EscrowOrder.countDocuments({ 'items.product': productId, createdAt: { $gte: thirtyDaysAgo } });

    if (ageDays > 90 && orderCount < 5) {
      recommendations.push({
        item: { productId, ageDays: Math.round(ageDays), recentOrders: orderCount },
        reason: 'Low turnover for aging inventory',
        evidence: `Product listed ${Math.round(ageDays)} days ago with only ${orderCount} recent orders`,
        expectedOutcome: '20-30% discount may clear inventory',
        confidence: 75,
      });
    } else if (orderCount === 0 && ageDays > 30) {
      recommendations.push({
        item: { productId, ageDays: Math.round(ageDays), recentOrders: orderCount },
        reason: 'No recent sales - introductory discount recommended',
        evidence: 'Zero orders in last 30 days',
        expectedOutcome: '15-20% discount may drive first purchases',
        confidence: 65,
      });
    } else {
      recommendations.push({
        item: { productId, ageDays: Math.round(ageDays), recentOrders: orderCount },
        reason: 'Product is performing adequately',
        evidence: `${orderCount} orders in last 30 days`,
        expectedOutcome: 'Maintain current pricing strategy',
        confidence: 80,
      });
    }

    return { recommendations };
  }

  async getSubscriptionRecommendations(vendorId) {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) throw new Error('Vendor not found');

    const orderCount = await EscrowOrder.countDocuments({ vendor: vendorId });
    const monthlyOrders = await EscrowOrder.countDocuments({ vendor: vendorId, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } });

    const recommendations = [];
    if (monthlyOrders > 50 && (vendor.subscription?.plan === 'starter' || vendor.subscription?.plan === 'basic')) {
      recommendations.push({
        item: { currentPlan: vendor.subscription?.plan, recommendedPlan: 'pro' },
        reason: 'Your order volume justifies an upgrade',
        evidence: `${monthlyOrders} orders/month exceeds current plan capacity`,
        expectedOutcome: 'Lower per-order fees and premium features',
        confidence: 90,
      });
    } else if (monthlyOrders > 20 && vendor.subscription?.plan === 'starter') {
      recommendations.push({
        item: { currentPlan: vendor.subscription?.plan, recommendedPlan: 'growth' },
        reason: 'Growing business would benefit from growth plan',
        evidence: `${monthlyOrders} monthly orders with starter plan`,
        expectedOutcome: 'Reduced transaction costs and analytics access',
        confidence: 80,
      });
    } else {
      recommendations.push({
        item: { currentPlan: vendor.subscription?.plan || 'none', recommendedPlan: 'starter' },
        reason: 'Starter plan provides essential features for new vendors',
        evidence: `${orderCount} total orders processed`,
        expectedOutcome: 'Access to marketplace features and support',
        confidence: 60,
      });
    }

    return { recommendations };
  }

  async getWorkflowRecommendations() {
    const orderCount = await EscrowOrder.countDocuments();
    const vendorCount = await Vendor.countDocuments({ isActive: true });

    const recommendations = [];
    if (orderCount > 100) {
      recommendations.push({
        item: { workflowType: 'order_approval', name: 'Order Approval Flow' },
        reason: 'High order volume requires streamlined approval',
        evidence: `${orderCount} total orders processed`,
        expectedOutcome: 'Faster order processing with automated approvals',
        confidence: 85,
      });
    }
    if (vendorCount > 20) {
      recommendations.push({
        item: { workflowType: 'vendor_onboarding', name: 'Automated Vendor Onboarding' },
        reason: 'Growing vendor base benefits from standardized onboarding',
        evidence: `${vendorCount} active vendors`,
        expectedOutcome: 'Reduced manual effort and consistent verification',
        confidence: 80,
      });
    }
    recommendations.push({
      item: { workflowType: 'dispute_resolution', name: 'Dispute Resolution Workflow' },
      reason: 'Standardize dispute handling across the marketplace',
      evidence: 'Dispute management best practices',
      expectedOutcome: 'Faster resolution and improved satisfaction',
      confidence: 70,
    });

    return { recommendations };
  }

  async getApprovalRecommendations(entityType, entityId) {
    const recommendations = [];
    if (entityType === 'order') {
      const order = await EscrowOrder.findById(entityId).lean();
      if (!order) return { recommendations: [] };
      const amount = order.totalAmount || 0;
      if (amount > 50000) {
        recommendations.push({
          item: { entityType, entityId, amount },
          reason: 'Large order requires senior approval',
          evidence: `Order amount ${amount} exceeds $50K threshold`,
          expectedOutcome: 'Director-level review recommended',
          confidence: 95,
        });
      } else if (amount > 10000) {
        recommendations.push({
          item: { entityType, entityId, amount },
          reason: 'Standard approval workflow applicable',
          evidence: 'Amount within manager approval limits',
          expectedOutcome: 'Manager approval with automated checks',
          confidence: 85,
        });
      }
    }
    return { recommendations };
  }

  async getKnowledgeRecommendations(userId) {
    const articles = await SellerKnowledgeArticle.find({ isActive: true }).sort({ helpfulCount: -1 }).limit(10).lean();
    const recommendations = articles.map(a => ({
      item: { articleId: a._id, title: a.title, category: a.category },
      reason: a.helpfulCount > 50 ? 'Highly rated by peers' : 'Recommended reading',
      evidence: `${a.helpfulCount || 0} users found this helpful`,
      expectedOutcome: 'Improved knowledge and best practices',
      confidence: Math.min(90, 50 + (a.helpfulCount || 0)),
    }));
    return { recommendations };
  }

  async getReportRecommendations(userId) {
    const reports = [
      { id: 'revenue_summary', name: 'Revenue Summary', category: 'finance' },
      { id: 'order_analytics', name: 'Order Analytics', category: 'operations' },
      { id: 'vendor_performance', name: 'Vendor Performance', category: 'suppliers' },
      { id: 'buyer_insights', name: 'Buyer Insights', category: 'customers' },
      { id: 'marketplace_health', name: 'Marketplace Health', category: 'overview' },
    ];

    const user = await User.findById(userId).lean();
    const role = user?.role || 'user';
    const roleReports = {
      admin: ['revenue_summary', 'marketplace_health', 'order_analytics', 'vendor_performance', 'buyer_insights'],
      vendor: ['order_analytics', 'vendor_performance'],
      user: ['order_analytics'],
    };

    const relevant = (roleReports[role] || reports.map(r => r.id));
    return {
      recommendations: reports
        .filter(r => relevant.includes(r.id))
        .map(r => ({
          item: { reportId: r.id, name: r.name, category: r.category },
          reason: `${r.category} report relevant to your role`,
          evidence: 'Based on role-based recommendations',
          expectedOutcome: 'Actionable business insights',
          confidence: 80,
        })),
    };
  }

  async getPlaybookRecommendations(context) {
    const playbooks = [
      { id: 'new_vendor_onboarding', name: 'New Vendor Onboarding', context: 'vendor' },
      { id: 'dispute_resolution', name: 'Dispute Resolution', context: 'dispute' },
      { id: 'order_fulfillment', name: 'Order Fulfillment', context: 'order' },
      { id: 'customer_retention', name: 'Customer Retention', context: 'churn' },
      { id: 'market_expansion', name: 'Market Expansion', context: 'growth' },
    ];

    const matching = context.type
      ? playbooks.filter(p => p.context === context.type)
      : playbooks;

    return {
      recommendations: matching.map(p => ({
        item: { playbookId: p.id, name: p.name },
        reason: `Playbook for ${p.context} scenarios`,
        evidence: `Context: ${context.type || 'general'}`,
        expectedOutcome: 'Structured approach to common scenarios',
        confidence: 75,
      })),
    };
  }
}

export const recommendationEngineV3Service = new RecommendationEngineV3Service();
