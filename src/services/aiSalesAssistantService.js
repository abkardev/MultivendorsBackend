import { ProductPerformance } from '../models/ProductPerformance.js';
import { SellerCustomer } from '../models/SellerCustomer.js';
import { Lead } from '../models/Lead.js';
import { CustomerActivity } from '../models/CustomerActivity.js';
import { CustomerPipeline } from '../models/CustomerPipeline.js';

class AiSalesAssistantService {
  async processQuery(vendorId, query) {
    const normalized = query.toLowerCase();
    if (normalized.includes('highest converting') || normalized.includes('best product')) {
      return this._getTopConvertingProducts(vendorId);
    }
    if (normalized.includes('sales decreasing') || normalized.includes('why are sales')) {
      return this._getSalesDeclineAnalysis(vendorId);
    }
    if (normalized.includes('best customer') || normalized.includes('top customer')) {
      return this._getTopCustomers(vendorId);
    }
    if (normalized.includes('promote') || normalized.includes('products to promote')) {
      return this._getProductsToPromote(vendorId);
    }
    if (normalized.includes('follow up') || normalized.includes('quotation')) {
      return this._getFollowUpSuggestions(vendorId);
    }
    if (normalized.includes('reorder') || normalized.includes('likely to reorder')) {
      return this._getReorderPredictions(vendorId);
    }
    if (normalized.includes('discount') || normalized.includes('price optimization')) {
      return this._getDiscountSuggestions(vendorId);
    }
    if (normalized.includes('risk') || normalized.includes('warning')) {
      return this._getRiskWarnings(vendorId);
    }
    if (normalized.includes('inventory') || normalized.includes('stock')) {
      return this._getInventoryRecommendations(vendorId);
    }
    return this._getGeneralInsights(vendorId);
  }

  async _getTopConvertingProducts(vendorId) {
    const products = await ProductPerformance.find({ vendor: vendorId })
      .populate('product', 'name price')
      .sort({ conversionRate: -1 })
      .limit(5)
      .lean();
    return {
      type: 'top_converting',
      title: 'Top Converting Products',
      data: products.map(p => ({
        name: p.product?.name || 'Unknown',
        conversionRate: `${Math.round(p.conversionRate)}%`,
        orders: p.totalOrders,
        revenue: p.totalRevenue,
      })),
      summary: products.length > 0
        ? `Your best converting product is "${products[0]?.product?.name}" with ${Math.round(products[0]?.conversionRate)}% conversion rate`
        : 'No product performance data available yet',
    };
  }

  async _getSalesDeclineAnalysis(vendorId) {
    const { default: Order } = await import('../models/Order.js');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000);
    const [recentOrders, previousOrders] = await Promise.all([
      Order.countDocuments({ vendor: vendorId, createdAt: { $gte: thirtyDaysAgo } }),
      Order.countDocuments({ vendor: vendorId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
    ]);
    const recentRevenue = (await Order.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]))[0]?.total || 0;
    const previousRevenue = (await Order.aggregate([
      { $match: { vendor: vendorId, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]))[0]?.total || 0;
    const revenueChange = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const orderChange = previousOrders > 0 ? ((recentOrders - previousOrders) / previousOrders) * 100 : 0;
    return {
      type: 'sales_decline',
      title: 'Sales Trend Analysis',
      data: {
        recentOrders, previousOrders, orderChange: `${Math.round(orderChange)}%`,
        recentRevenue, previousRevenue, revenueChange: `${Math.round(revenueChange)}%`,
        trend: revenueChange < 0 ? 'declining' : 'improving',
      },
      summary: revenueChange < 0
        ? `Sales have declined ${Math.round(Math.abs(revenueChange))}% compared to previous period. Consider reviewing your pricing or reaching out to past customers.`
        : `Sales are ${revenueChange > 0 ? 'improving' : 'stable'} with ${Math.round(Math.abs(revenueChange))}% change.`,
    };
  }

  async _getTopCustomers(vendorId) {
    const customers = await SellerCustomer.find({ vendor: vendorId })
      .populate('buyer', 'name email company')
      .sort({ totalRevenue: -1 })
      .limit(5)
      .lean();
    return {
      type: 'top_customers',
      title: 'Top Customers',
      data: customers.map(c => ({
        name: c.buyer?.name || c.company,
        company: c.company,
        revenue: c.totalRevenue,
        orders: c.totalOrders,
        healthScore: c.healthScore,
      })),
      summary: customers.length > 0
        ? `Your top customer is "${customers[0]?.buyer?.name || customers[0]?.company}" with ${customers[0]?.totalRevenue} in total revenue`
        : 'No customer data available',
    };
  }

  async _getProductsToPromote(vendorId) {
    const products = await ProductPerformance.find({ vendor: vendorId, totalRfqs: { $gt: 0 } })
      .populate('product', 'name price')
      .sort({ conversionRate: 1 })
      .limit(5)
      .lean();
    return {
      type: 'promote_products',
      title: 'Products to Promote',
      data: products.map(p => ({
        name: p.product?.name || 'Unknown',
        rfqs: p.totalRfqs,
        orders: p.totalOrders,
        conversionRate: `${Math.round(p.conversionRate)}%`,
        revenue: p.totalRevenue,
      })),
      summary: products.length > 0
        ? `"${products[0]?.product?.name}" has ${products[0]?.totalRfqs} RFQs but only ${products[0]?.totalOrders} orders. Consider a promotion.`
        : 'All products are performing well',
    };
  }

  async _getFollowUpSuggestions(vendorId) {
    const { default: Quotation } = await import('../models/Quotation.js');
    const expiringQuotes = await Quotation.find({
      vendor: vendorId, status: 'sent',
      expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 7 * 86400000) },
    }).populate('buyer', 'name email').limit(10).lean();
    return {
      type: 'follow_up',
      title: 'Follow-up Suggestions',
      data: expiringQuotes.map(q => ({
        buyerName: q.buyer?.name || 'Unknown',
        total: q.total,
        expiresAt: q.expiresAt,
        daysLeft: Math.ceil((q.expiresAt.getTime() - Date.now()) / 86400000),
      })),
      summary: expiringQuotes.length > 0
        ? `You have ${expiringQuotes.length} quotations expiring soon that need follow-up`
        : 'No quotations require immediate follow-up',
    };
  }

  async _getReorderPredictions(vendorId) {
    const customers = await SellerCustomer.find({
      vendor: vendorId,
      totalOrders: { $gte: 2 },
      lastOrderAt: { $gte: new Date(Date.now() - 90 * 86400000) },
    }).populate('buyer', 'name email company').sort({ totalOrders: -1 }).limit(5);
    return {
      type: 'reorder_predictions',
      title: 'Customers Likely to Reorder',
      data: customers.map(c => ({
        name: c.buyer?.name || c.company,
        company: c.company,
        orders: c.totalOrders,
        lastOrder: c.lastOrderAt,
        averageOrderValue: c.averageOrderValue,
      })),
      summary: customers.length > 0
        ? `${customers.length} repeat customers are active and likely to reorder soon`
        : 'No repeat customer patterns detected yet',
    };
  }

  async _getDiscountSuggestions(vendorId) {
    const products = await ProductPerformance.find({ vendor: vendorId, conversionRate: { $lt: 20 }, totalRfqs: { $gt: 0 } })
      .populate('product', 'name price')
      .sort({ conversionRate: 1 })
      .limit(5)
      .lean();
    return {
      type: 'discount_suggestions',
      title: 'Suggested Discount Opportunities',
      data: products.map(p => ({
        name: p.product?.name || 'Unknown',
        currentPrice: p.product?.price,
        rfqs: p.totalRfqs,
        conversionRate: `${Math.round(p.conversionRate)}%`,
        suggestedDiscount: `${Math.min(20, Math.round(100 - p.conversionRate))}%`,
      })),
      summary: products.length > 0
        ? `Offering discounts on ${products.length} products with low conversion could increase sales`
        : 'Current pricing appears optimal',
    };
  }

  async _getRiskWarnings(vendorId) {
    const atRiskCustomers = await SellerCustomer.find({
      vendor: vendorId, healthScore: { $lt: 40 }, isActive: true,
    }).populate('buyer', 'name email').limit(5);
    const inactiveLeads = await Lead.find({
      vendor: vendorId, isActive: true, stage: { $nin: ['won', 'lost'] },
      updatedAt: { $lte: new Date(Date.now() - 30 * 86400000) },
    }).limit(5);
    return {
      type: 'risk_warnings',
      title: 'Risk Warnings',
      data: {
        atRiskCustomers: atRiskCustomers.map(c => ({
          name: c.buyer?.name || 'Unknown', healthScore: c.healthScore, revenue: c.totalRevenue,
        })),
        inactiveLeads: inactiveLeads.map(l => ({
          company: l.company, stage: l.stage, lastContact: l.updatedAt,
        })),
      },
      summary: atRiskCustomers.length > 0 || inactiveLeads.length > 0
        ? `${atRiskCustomers.length} customers at risk, ${inactiveLeads.length} leads inactive`
        : 'No significant risks detected',
    };
  }

  async _getInventoryRecommendations(vendorId) {
    const products = await ProductPerformance.find({ vendor: vendorId, demandTrend: 'rising' })
      .populate('product', 'name price')
      .limit(5);
    return {
      type: 'inventory_recommendations',
      title: 'Inventory Recommendations',
      data: products.map(p => ({
        name: p.product?.name || 'Unknown',
        trend: p.demandTrend,
        orders: p.totalOrders,
        revenue: p.totalRevenue,
      })),
      summary: products.length > 0
        ? `${products.length} products have rising demand - consider increasing inventory`
        : 'No inventory adjustments needed at this time',
    };
  }

  async _getGeneralInsights(vendorId) {
    const customerCount = await SellerCustomer.countDocuments({ vendor: vendorId });
    const leadCount = await Lead.countDocuments({ vendor: vendorId, isActive: true });
    const productCount = await ProductPerformance.countDocuments({ vendor: vendorId });
    return {
      type: 'general_insights',
      title: 'General Sales Insights',
      data: { customers: customerCount, leads: leadCount, productsTracked: productCount },
      summary: `You have ${customerCount} customers, ${leadCount} active leads, and ${productCount} tracked products.`,
    };
  }
}

export const aiSalesAssistantService = new AiSalesAssistantService();
