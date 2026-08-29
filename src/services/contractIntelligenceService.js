import mongoose from 'mongoose';
import { Order } from '../models/orderModel.js';
import { Vendor } from '../models/vendorModel.js';
import Dispute from '../models/Dispute.js';
import Review from '../models/reviewModel.js';
import { logAuditEvent } from '../services/auditService.js';

class ContractIntelligenceService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 15 * 60 * 1000;
  }

  async getContractOverview(userId) {
    const cacheKey = `contract_overview_${userId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) return cached.data;

    const [orders, vendors, disputes, reviews] = await Promise.all([
      Order.find({ buyer: userId }).sort('-createdAt').lean(),
      Vendor.find({}).lean(),
      Dispute.find({ buyer: userId }).lean(),
      Review.find({ user: userId }).lean(),
    ]);

    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const totalSpend = completedOrders.reduce((sum, o) => sum + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);

    const orderCount = orders.length;
    const completedCount = completedOrders.length;

    const estimatedContractValue = Math.round(totalSpend * 1.25);

    const vendorContractMap = {};
    for (const vendor of vendors) {
      const vid = vendor._id.toString();
      const vendorOrders = completedOrders.filter(o => o.vendor?.toString() === vid);
      if (vendorOrders.length > 0) {
        const vendorSpend = vendorOrders.reduce((s, o) => s + (parseFloat(o.totalPrice) || o.totalAmount || o.total || 0), 0);
        const vendorDisputes = disputes.filter(d => d.vendor?.toString() === vid);
        const vendorReviews = reviews.filter(r => r.vendor?.toString() === vid);
        const avgRating = vendorReviews.length > 0
          ? vendorReviews.reduce((s, r) => s + (r.rating || 0), 0) / vendorReviews.length
          : 0;

        const disputeRate = vendorOrders.length > 0 ? vendorDisputes.length / vendorOrders.length : 0;
        const satisfactionScore = avgRating > 0 ? Math.round((avgRating / 5) * 100) : 50;

        const spendRatio = totalSpend > 0 ? vendorSpend / totalSpend : 0;
        const contractValue = Math.round(vendorSpend * 1.2);
        const spendAgainstContract = contractValue > 0 ? Math.round((vendorSpend / contractValue) * 100) : 0;

        const renewalRisk = this.calcRenewalRisk(disputeRate, satisfactionScore, vendorOrders.length);
        const recommendation = this.calcContractRecommendation(renewalRisk, satisfactionScore, spendRatio);

        vendorContractMap[vid] = {
          vendorId: vid,
          vendorName: vendor.storeName?.en || vendor.name || 'Unknown',
          orderCount: vendorOrders.length,
          totalSpend: Math.round(vendorSpend),
          contractValue,
          spendAgainstContract,
          disputeRate: Math.round(disputeRate * 100),
          satisfactionScore,
          avgRating: Math.round(avgRating * 10) / 10,
          renewalRisk,
          recommendation,
          contractEndDate: this.estimateContractEndDate(vendorOrders),
        };
      }
    }

    const contractEntries = Object.values(vendorContractMap);
    const contractCompliance = contractEntries.length > 0
      ? Math.round(contractEntries.filter(e => e.spendAgainstContract <= 100).length / contractEntries.length * 100)
      : 0;

    const overview = {
      userId,
      totalContracts: contractEntries.length,
      activeContracts: contractEntries.filter(e => e.recommendation !== 'terminate').length,
      totalContractValue: estimatedContractValue,
      totalSpend: Math.round(totalSpend),
      contractCompliance,
      spendAgainstContract: estimatedContractValue > 0
        ? Math.round((totalSpend / estimatedContractValue) * 100)
        : 0,
      contractEntries,
      summary: {
        renew: contractEntries.filter(e => e.recommendation === 'renew').length,
        renegotiate: contractEntries.filter(e => e.recommendation === 'renegotiate').length,
        terminate: contractEntries.filter(e => e.recommendation === 'terminate').length,
        monitor: contractEntries.filter(e => e.recommendation === 'monitor').length,
      },
      generatedAt: new Date().toISOString(),
    };

    this.cache.set(cacheKey, { data: overview, timestamp: Date.now() });

    await logAuditEvent({
      userId,
      action: 'contract_overview',
      category: 'executive',
      entityType: 'ContractIntelligence',
      entityId: userId,
      description: `Contract overview generated: ${contractEntries.length} contracts`,
      status: 'success',
    });

    return overview;
  }

  async getExpiringContracts(userId, days = 30) {
    const overview = await this.getContractOverview(userId);
    const now = new Date();
    const expiryThreshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const expiring = overview.contractEntries.filter(entry => {
      if (!entry.contractEndDate) return false;
      const endDate = new Date(entry.contractEndDate);
      return endDate <= expiryThreshold && endDate >= now;
    });

    return {
      totalExpiring: expiring.length,
      days,
      expiringContracts: expiring.map(e => ({
        ...e,
        daysUntilExpiry: e.contractEndDate
          ? Math.round((new Date(e.contractEndDate) - now) / (1000 * 60 * 60 * 24))
          : null,
      })).sort((a, b) => (a.daysUntilExpiry || 999) - (b.daysUntilExpiry || 999)),
      generatedAt: new Date().toISOString(),
    };
  }

  calcRenewalRisk(disputeRate, satisfactionScore, orderCount) {
    let risk = 30;

    if (disputeRate > 0.2) risk += 30;
    else if (disputeRate > 0.1) risk += 15;

    if (satisfactionScore < 40) risk += 25;
    else if (satisfactionScore < 60) risk += 10;

    if (orderCount < 2) risk += 15;

    return Math.min(100, risk);
  }

  calcContractRecommendation(renewalRisk, satisfactionScore, spendRatio) {
    if (renewalRisk < 30 && satisfactionScore > 75) return 'renew';
    if (renewalRisk > 60 || satisfactionScore < 40) return 'terminate';
    if (spendRatio > 0.2 && renewalRisk < 50) return 'renegotiate';
    return 'monitor';
  }

  estimateContractEndDate(orders) {
    if (orders.length === 0) return null;
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const lastOrderDate = new Date(sorted[0].createdAt);
    const contractDuration = 365;
    return new Date(lastOrderDate.getTime() + contractDuration * 24 * 60 * 60 * 1000).toISOString();
  }

  clearCache(userId) {
    if (userId) {
      this.cache.delete(`contract_overview_${userId}`);
    } else {
      this.cache.clear();
    }
  }
}

export default new ContractIntelligenceService();
