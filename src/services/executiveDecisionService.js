import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Dispute from '../models/Dispute.js';
import { Announcement } from '../models/announcementModel.js';
import { Quotation } from '../models/Quotation.js';
import { logAuditEvent } from '../services/auditService.js';

class ExecutiveDecisionService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
  }

  async getRecommendations(userId) {
    const cacheKey = `recommendations_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const data = await this.collectData(userId);
    const recommendations = this.generateRecommendations(data);

    this.cache.set(cacheKey, { data: recommendations, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'generate_recommendations',
      category: 'executive',
      entityType: 'ExecutiveDecision',
      entityId: userId,
      description: `Generated ${recommendations.length} executive recommendations`,
      status: 'success',
    });

    return recommendations;
  }

  async collectData(userId) {
    const vendorObjectId = new mongoose.Types.ObjectId(userId);

    const [orders, rfqs, disputes, vendors, quotations] = await Promise.all([
      Order.find({ buyer: userId }).lean(),
      Announcement.find({ buyer: userId }).lean(),
      Dispute.find({ buyer: userId }).lean(),
      Vendor.find({}).lean(),
      Quotation.find({ buyer: userId }).lean(),
    ]);

    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing');
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const totalSpend = completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);

    const highValueNoEscrow = completedOrders.filter(o => {
      const val = parseFloat(o.totalPrice) || o.totalAmount || o.total || 0;
      return val > 50000 && o.paymentMethod !== 'escrow' && o.paymentMethods !== 'escrow';
    });

    const vendorCountries = {};
    const vendorSpend = {};
    for (const order of completedOrders) {
      const vid = order.vendor ? order.vendor.toString() : null;
      if (vid) {
        vendorSpend[vid] = (vendorSpend[vid] || 0) + (parseFloat(order.totalPrice) || o.totalAmount || order.total || 0);
      }
    }

    for (const vendor of vendors) {
      const vid = vendor._id.toString();
      if (vendorSpend[vid]) {
        const country = vendor.country || vendor.countryOfOrigin || 'Unknown';
        vendorCountries[country] = (vendorCountries[country] || 0) + vendorSpend[vid];
      }
    }

    const openRfqs = rfqs.filter(r => r.status === 'open' || r.status === 'pending');

    const uniqueSupplierIds = new Set(completedOrders.map(o => o.vendor?.toString()).filter(Boolean));
    const localVendors = vendors.filter(v => v.country === 'Saudi Arabia' || v.countryOfOrigin === 'Saudi Arabia');
    const localSupplierCount = [...uniqueSupplierIds].filter(id => localVendors.some(v => v._id.toString() === id)).length;

    const disputeRate = orders.length > 0 ? disputes.length / orders.length : 0;

    return {
      userId,
      orders,
      pendingOrders,
      completedOrders,
      rfqs,
      openRfqs,
      disputes,
      vendors,
      quotations,
      totalSpend,
      highValueNoEscrow,
      vendorCountries,
      vendorSpend,
      uniqueSupplierIds: uniqueSupplierIds.size,
      localSupplierCount,
      totalVendors: vendors.length,
      disputeRate,
    };
  }

  generateRecommendations(data) {
    const recommendations = [];
    let idCounter = 1;

    const pushRec = (type, priority, reason, title, expectedImpact, estimatedSavings, estimatedRiskReduction, confidence, extraData = {}) => {
      recommendations.push({
        id: `exec_rec_${idCounter++}`,
        type,
        title: title || this.getDefaultTitle(type),
        reason,
        expectedImpact,
        confidence,
        estimatedSavings,
        estimatedRiskReduction,
        priority,
        data: {
          userId: data.userId,
          timestamp: new Date().toISOString(),
          ...extraData,
        },
      });
    };

    if (data.pendingOrders.length > 5) {
      pushRec(
        'consolidate_orders',
        'high',
        `${data.pendingOrders.length} pending orders can be consolidated into fewer bulk orders`,
        'Consolidate Pending Orders',
        'Reduce logistics overhead by grouping pending orders',
        Math.round(data.pendingOrders.length * 500),
        15,
        85,
        { pendingCount: data.pendingOrders.length }
      );
    }

    if (data.totalSpend > 500000) {
      pushRec(
        'negotiate_pricing',
        'critical',
        `Total spend of ${Math.round(data.totalSpend).toLocaleString()} SAR qualifies for volume-based pricing negotiation`,
        'Negotiate Volume Pricing',
        'Leverage total spend for bulk discount negotiations',
        Math.round(data.totalSpend * 0.1),
        10,
        90,
        { totalSpend: data.totalSpend }
      );
    }

    if (data.vendorCountries) {
      const countryEntries = Object.entries(data.vendorCountries);
      if (countryEntries.length > 0) {
        const topCountry = countryEntries.sort((a, b) => b[1] - a[1])[0];
        const topCountryRatio = topCountry[1] / Object.values(data.vendorCountries).reduce((a, b) => a + b, 0);
        if (topCountryRatio > 0.6) {
          pushRec(
            'diversify_countries',
            'high',
            `${topCountry[0]} accounts for ${Math.round(topCountryRatio * 100)}% of total procurement spend`,
            'Diversify Supplier Countries',
            'Reduce country-level supply chain risk',
            Math.round(data.totalSpend * 0.05),
            30,
            80,
            { dominantCountry: topCountry[0], concentration: topCountryRatio }
          );
        }
      }
    }

    const vendorSpendEntries = Object.entries(data.vendorSpend || {});
    if (vendorSpendEntries.length > 0) {
      const topVendor = vendorSpendEntries.sort((a, b) => b[1] - a[1])[0];
      const topVendorRatio = topVendor[1] / data.totalSpend;
      if (topVendorRatio > 0.4) {
        const topVendorDoc = data.vendors.find(v => v._id.toString() === topVendor[0]);
        pushRec(
          'increase_supplier_diversity',
          'critical',
          `Single vendor ${topVendorDoc?.storeName?.en || 'Unknown'} accounts for ${Math.round(topVendorRatio * 100)}% of total spend`,
          'Reduce Supplier Dependency',
          'Spread spend across multiple suppliers to reduce single-point-of-failure risk',
          Math.round(data.totalSpend * 0.08),
          40,
        75,
          { dominantVendorId: topVendor[0], dependenceRatio: topVendorRatio }
        );
      }
    }

    const localRatio = data.uniqueSupplierIds > 0 ? data.localSupplierCount / data.uniqueSupplierIds : 0;
    if (localRatio < 0.3 && data.uniqueSupplierIds > 0) {
      pushRec(
        'increase_local_procurement',
        'medium',
        `Only ${Math.round(localRatio * 100)}% of suppliers are local. Target local procurement to reduce lead times`,
        'Increase Local Procurement',
        'Reduce lead times and logistics costs by sourcing locally',
        Math.round(data.totalSpend * 0.03),
        20,
        70,
        { localSupplierRatio: localRatio }
      );
    }

    if (data.disputeRate > 0.1) {
      pushRec(
        'reduce_supplier_risk',
        'critical',
        `Dispute rate is ${Math.round(data.disputeRate * 100)}% - significantly above the 10% threshold`,
        'Reduce Supplier Risk',
        'Implement stricter supplier vetting and quality checks',
        Math.round(data.totalSpend * 0.06),
        50,
        80,
        { disputeRate: data.disputeRate }
      );
    }

    if (data.openRfqs.length > 3) {
      pushRec(
        'approve_purchase',
        'high',
        `${data.openRfqs.length} outstanding RFQs require decision action`,
        'Approve Pending RFQs',
        'Process open RFQs to capture current market pricing',
        Math.round(data.openRfqs.length * 2000),
        5,
        60,
        { openRfqCount: data.openRfqs.length }
      );
    }

    if (data.highValueNoEscrow && data.highValueNoEscrow.length > 0) {
      pushRec(
        'negotiate_pricing',
        'high',
        `${data.highValueNoEscrow.length} high-value order(s) executed without escrow protection`,
        'Use Escrow for Large Orders',
        'Protect high-value payments with escrow payment method',
        Math.round(data.totalSpend * 0.02),
        35,
        75,
        { unprotectedHighValueOrders: data.highValueNoEscrow.length }
      );
    }

    if (data.uniqueSupplierIds > 0 && data.totalVendors > data.uniqueSupplierIds * 3) {
      pushRec(
        'increase_supplier_diversity',
        'low',
        `Only ${data.uniqueSupplierIds} of ${data.totalVendors} available vendors have been utilized`,
        'Explore New Suppliers',
        'Test new vendors to increase competition',
        0,
        10,
        50,
        { utilizedVendors: data.uniqueSupplierIds, availableVendors: data.totalVendors }
      );
    }

    return recommendations;
  }

  getDefaultTitle(type) {
    const titles = {
      approve_purchase: 'Approve Pending Purchase',
      delay_purchase: 'Delay Purchase Decision',
      split_procurement: 'Split Procurement Across Suppliers',
      negotiate_pricing: 'Negotiate Supplier Pricing',
      increase_supplier_diversity: 'Increase Supplier Diversity',
      reduce_supplier_risk: 'Reduce Supplier Risk Exposure',
      consolidate_orders: 'Consolidate Pending Orders',
      diversify_countries: 'Diversify Sourcing Countries',
      increase_local_procurement: 'Increase Local Procurement',
      increase_export_procurement: 'Increase Export Procurement',
    };
    return titles[type] || 'Executive Recommendation';
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`recommendations_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new ExecutiveDecisionService();
