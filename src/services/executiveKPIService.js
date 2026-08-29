import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import { Product } from '../models/productModel.js';
import Review from '../models/reviewModel.js';
import { Announcement } from '../models/announcementModel.js';
import { Quotation } from '../models/Quotation.js';
import Dispute from '../models/Dispute.js';
import { logAuditEvent } from '../services/auditService.js';

class ExecutiveKPIService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 10 * 60 * 1000;
  }

  async getKPIs(userId) {
    const cacheKey = `kpis_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last365Days = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [allOrders, recentOrders7, recentOrders30, annualOrders, rfqs, quotations, disputes, reviews, vendors] = await Promise.all([
      Order.find({ buyer: userId }).lean(),
      Order.find({ buyer: userId, createdAt: { $gte: last7Days } }).lean(),
      Order.find({ buyer: userId, createdAt: { $gte: last30Days } }).lean(),
      Order.find({ buyer: userId, createdAt: { $gte: last365Days } }).lean(),
      Announcement.find({ buyer: userId }).lean(),
      Quotation.find({ buyer: userId }).lean(),
      Dispute.find({ buyer: userId }).lean(),
      Review.find({ user: userId }).lean(),
      Vendor.find({}).lean(),
    ]);

    const completedOrders = allOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const completedAnnual = annualOrders.filter(o => o.status === 'delivered' || o.status === 'completed');

    const annualSpend = completedAnnual.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);
    const monthlySpend = recentOrders7.length > 0
      ? completedAnnual.filter(o => new Date(o.createdAt) >= last30Days).reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0)
      : 0;
    const weeklySpend = completedOrders.filter(o => new Date(o.createdAt) >= last7Days).reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);

    const costSavings = Math.round(annualSpend * 0.1);

    const cycleTimes = completedOrders.map(o => {
      const created = new Date(o.createdAt).getTime();
      const delivered = o.updatedAt ? new Date(o.updatedAt).getTime() : Date.now();
      return (delivered - created) / (1000 * 60 * 60);
    }).filter(t => t > 0);
    const avgProcurementCycle = cycleTimes.length > 0
      ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
      : 0;

    const rfqsWithQuotes = rfqs.filter(r => r.responses && r.responses.length > 0);
    const rfqConversionRate = rfqs.length > 0
      ? Math.round((rfqsWithQuotes.length / rfqs.length) * 100)
      : 0;

    const responseTimes = quotations.map(q => q.responseTime || 0).filter(t => t > 0);
    const supplierResponseRate = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length * 10) / 10
      : 0;

    const deliveryDays = completedOrders.map(o => {
      const created = new Date(o.createdAt);
      const delivered = o.updatedAt ? new Date(o.updatedAt) : new Date();
      return Math.max(0, (delivered - created) / (1000 * 60 * 60 * 24));
    }).filter(d => d > 0);
    const avgDeliveryTime = deliveryDays.length > 0
      ? Math.round((deliveryDays.reduce((a, b) => a + b, 0) / deliveryDays.length) * 10) / 10
      : 0;

    const escrowOrders = allOrders.filter(o => o.paymentMethod === 'escrow' || o.paymentMethods === 'escrow');
    const escrowUsage = allOrders.length > 0
      ? Math.round((escrowOrders.length / allOrders.length) * 100)
      : 0;

    const disputeRate = allOrders.length > 0
      ? Math.round((disputes.length / allOrders.length) * 100)
      : 0;

    const uniqueSupplierIds = new Set(completedOrders.map(o => o.vendor?.toString()).filter(Boolean));
    const supplierDiversity = uniqueSupplierIds.size;

    const vendorOrderCounts = {};
    for (const order of completedOrders) {
      const vid = order.vendor?.toString();
      if (vid) {
        vendorOrderCounts[vid] = (vendorOrderCounts[vid] || 0) + 1;
      }
    }
    const repeatSupplierIds = Object.entries(vendorOrderCounts).filter(([, count]) => count > 1).length;
    const repeatSupplierRate = supplierDiversity > 0
      ? Math.round((repeatSupplierIds / supplierDiversity) * 100)
      : 0;

    const procurementROI = annualSpend > 0
      ? Math.round((costSavings / annualSpend) * 100)
      : 0;

    const kpis = {
      annualSpend: Math.round(annualSpend),
      monthlySpend: Math.round(monthlySpend),
      weeklySpend: Math.round(weeklySpend),
      costSavings,
      avgProcurementCycle,
      rfqConversionRate,
      supplierResponseRate,
      avgDeliveryTime,
      escrowUsage,
      disputeRate,
      supplierDiversity,
      repeatSupplierRate,
      procurementROI,
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: kpis, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'generate_kpis',
      category: 'executive',
      entityType: 'ExecutiveKPI',
      entityId: userId,
      description: 'Generated executive KPIs',
      status: 'success',
    });

    return kpis;
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`kpis_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new ExecutiveKPIService();
