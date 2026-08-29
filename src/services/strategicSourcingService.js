import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import { logAuditEvent } from '../services/auditService.js';

class StrategicSourcingService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
  }

  async getSourcingIntelligence(userId) {
    const cacheKey = `sourcing_intel_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const [orders, vendors, products] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').lean(),
      Vendor.find({}).lean(),
      Product.find({ status: 'active' }).lean(),
    ]);

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');

    const vendorMap = {};
    for (const v of vendors) {
      vendorMap[v._id.toString()] = v;
    }

    const categorySpend = {};
    const categoryVendors = {};
    const categoryOrders = {};

    for (const order of completedOrders) {
      const orderValue = parseFloat(order.totalPrice) || order.totalAmount || order.total || 0;
      const vid = order.vendor?.toString();

      if (order.items && Array.isArray(order.items)) {
        for (const item of order.items) {
          const productId = item.product?.toString();
          const product = products.find(p => p._id.toString() === productId);
          const catId = product?.category?.toString() || 'uncategorized';

          if (!categorySpend[catId]) {
            categorySpend[catId] = 0;
            categoryVendors[catId] = new Set();
            categoryOrders[catId] = [];
          }
          categorySpend[catId] += (item.price || item.unitPrice || 0) * (item.quantity || 1);
          if (vid) categoryVendors[catId].add(vid);
          categoryOrders[catId].push(order);
        }
      } else {
        const catId = 'uncategorized';
        if (!categorySpend[catId]) {
          categorySpend[catId] = 0;
          categoryVendors[catId] = new Set();
          categoryOrders[catId] = [];
        }
        categorySpend[catId] += orderValue;
        if (vid) categoryVendors[catId].add(vid);
        categoryOrders[catId].push(order);
      }
    }

    const vendorSpend = {};
    for (const order of completedOrders) {
      const vid = order.vendor?.toString();
      if (vid) {
        vendorSpend[vid] = (vendorSpend[vid] || 0) + (parseFloat(order.totalPrice) || order.totalAmount || order.total || 0);
      }
    }

    const totalSpend = Object.values(vendorSpend).reduce((a, b) => a + b, 0);

    const singleSourceRisk = [];
    const supplierDependency = [];
    const countryDependency = {};
    const supplierShares = [];

    for (const [catId, vendorSet] of Object.entries(categoryVendors)) {
      if (vendorSet.size === 1) {
        const catName = products.find(p => p.category?.toString() === catId)?.category?.toString() || catId;
        singleSourceRisk.push({
          categoryId: catId,
          categoryName: catName,
          vendorId: [...vendorSet][0],
          spend: Math.round(categorySpend[catId]),
          risk: 'high',
          explanation: `Category served by only 1 supplier - critical single point of failure`,
        });
      }
    }

    for (const [vid, spend] of Object.entries(vendorSpend)) {
      const ratio = totalSpend > 0 ? spend / totalSpend : 0;
      const vendor = vendorMap[vid];
      supplierDependency.push({
        vendorId: vid,
        vendorName: vendor?.storeName?.en || vendor?.name || 'Unknown',
        spend: Math.round(spend),
        percentage: Math.round(ratio * 100),
        riskLevel: ratio > 0.4 ? 'critical' : ratio > 0.2 ? 'high' : ratio > 0.1 ? 'medium' : 'low',
      });
      supplierShares.push(ratio);
    }

    for (const vendor of vendors) {
      const vid = vendor._id.toString();
      if (vendorSpend[vid]) {
        const country = vendor.country || vendor.countryOfOrigin || 'Unknown';
        countryDependency[country] = (countryDependency[country] || 0) + vendorSpend[vid];
      }
    }

    const totalCountrySpend = Object.values(countryDependency).reduce((a, b) => a + b, 0);
    const countryShares = Object.entries(countryDependency).map(([country, spend]) => ({
      country,
      spend: Math.round(spend),
      percentage: totalCountrySpend > 0 ? Math.round((spend / totalCountrySpend) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    const hhi = Math.round(supplierShares.reduce((sum, s) => sum + s * s * 10000, 0));

    const alternativeSuppliers = {};
    for (const product of products) {
      const catId = product.category?.toString() || 'uncategorized';
      if (!alternativeSuppliers[catId]) alternativeSuppliers[catId] = new Set();
      alternativeSuppliers[catId].add(product.vendor?.toString());
    }

    const alternativeSupplierAvailability = Object.entries(alternativeSuppliers).map(([catId, vendorSet]) => ({
      categoryId: catId,
      alternativeCount: vendorSet.size,
      hasSingleSourceRisk: vendorSet.size <= 1,
    }));

    const categoriesWithProducts = new Set(products.map(p => p.category?.toString()).filter(Boolean));
    const categoriesWithOrders = new Set(Object.keys(categoryVendors));
    const supplyGaps = [...categoriesWithProducts].filter(c => !categoriesWithOrders.has(c));

    const supplyGapDetection = supplyGaps.map(catId => {
      const catProducts = products.filter(p => p.category?.toString() === catId);
      const catVendors = new Set(catProducts.map(p => p.vendor?.toString()).filter(Boolean));
      return {
        categoryId: catId,
        productCount: catProducts.length,
        potentialVendors: catVendors.size,
        gapType: 'no_prior_orders',
      };
    });

    const recommendations = [];

    if (singleSourceRisk.length > 0) {
      recommendations.push({
        type: 'diversify_single_source',
        priority: 'critical',
        reason: `${singleSourceRisk.length} categor${singleSourceRisk.length > 1 ? 'ies are' : 'y is'} served by only one supplier`,
        action: 'Identify and qualify alternative suppliers for single-source categories',
        expectedImpact: 'Eliminate single point of failure risk',
      });
    }

    const criticalDependencies = supplierDependency.filter(d => d.riskLevel === 'critical');
    if (criticalDependencies.length > 0) {
      recommendations.push({
        type: 'reduce_vendor_concentration',
        priority: 'critical',
        reason: `${criticalDependencies.length} supplier(s) account for >40% of total spend`,
        action: 'Develop risk mitigation plans for over-dependent suppliers',
        expectedImpact: 'Reduce business interruption risk from supplier loss',
      });
    }

    const dominantCountry = countryShares[0];
    if (dominantCountry && dominantCountry.percentage > 60) {
      recommendations.push({
        type: 'diversify_sourcing_countries',
        priority: 'high',
        reason: `${dominantCountry.country} accounts for ${dominantCountry.percentage}% of total procurement spend`,
        action: 'Identify alternative sourcing countries to reduce geopolitical risk',
        expectedImpact: 'Spread country-level supply chain risk',
      });
    }

    if (supplyGapDetection.length > 0) {
      recommendations.push({
        type: 'address_supply_gaps',
        priority: 'medium',
        reason: `${supplyGapDetection.length} product categor${supplyGapDetection.length > 1 ? 'ies have' : 'y has'} no active supplier engagement`,
        action: 'Issue RFQs to potential vendors in unengaged categories',
        expectedImpact: 'Expand procurement coverage and competitive options',
      });
    }

    const result = {
      userId,
      singleSourceRisk,
      supplierDependency: supplierDependency.sort((a, b) => b.percentage - a.percentage),
      countryDependency: countryShares,
      supplyChainConcentration: {
        hhi,
        interpretation: hhi > 2500 ? 'Highly Concentrated' : hhi > 1500 ? 'Moderately Concentrated' : 'Unconcentrated',
        supplierCount: supplierShares.length,
      },
      alternativeSupplierAvailability,
      supplyGapDetection,
      recommendations,
      totalSpend: Math.round(totalSpend),
      totalSuppliersUsed: Object.keys(vendorSpend).length,
      totalActiveVendors: vendors.filter(v => v.isActive !== false).length,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'strategic_sourcing',
      category: 'executive',
      entityType: 'StrategicSourcing',
      entityId: userId,
      description: `Strategic sourcing intelligence generated: ${singleSourceRisk.length} single-source risks`,
      status: 'success',
    });

    return result;
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`sourcing_intel_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new StrategicSourcingService();
