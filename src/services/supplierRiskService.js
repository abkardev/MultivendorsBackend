import { Vendor } from '../models/vendorModel.js';
import { Order } from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import Dispute from '../models/Dispute.js';

class SupplierRiskService {
  async calculateVendorRisk(vendorId) {
    const vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) return null;

    const [orders, reviews, disputes] = await Promise.all([
      Order.find({ vendor: vendorId }).lean(),
      Review.find({ vendor: vendorId }).lean(),
      Dispute.find({ vendor: vendorId }).lean(),
    ]);

    const deliveryRisk = this.calculateDeliveryRisk(orders);
    const financialRisk = this.calculateFinancialRisk(orders, vendor);
    const disputeRisk = this.calculateDisputeRisk(disputes, orders.length);
    const qualityRisk = this.calculateQualityRisk(reviews);
    const communicationRisk = this.calculateCommunicationRisk(reviews, orders);
    const complianceRisk = this.calculateComplianceRisk(vendor);

    const overall = Math.round(
      deliveryRisk * 0.2 +
      financialRisk * 0.15 +
      disputeRisk * 0.2 +
      qualityRisk * 0.2 +
      communicationRisk * 0.1 +
      complianceRisk * 0.15
    );

    const reasons = [];
    const actions = [];

    if (deliveryRisk > 50) { reasons.push('Delivery delays detected'); actions.push('Review shipping partners and logistics processes'); }
    if (financialRisk > 50) { reasons.push('Financial stability concerns'); actions.push('Request updated financial statements'); }
    if (disputeRisk > 50) { reasons.push('Multiple disputes filed'); actions.push('Review dispute resolution process'); }
    if (qualityRisk > 50) { reasons.push('Product quality concerns'); actions.push('Implement quality assurance checks'); }
    if (communicationRisk > 50) { reasons.push('Communication delays'); actions.push('Establish clear communication channels'); }
    if (complianceRisk > 50) { reasons.push('Compliance gaps detected'); actions.push('Review certification and regulatory compliance'); }

    return {
      vendorId: vendor._id,
      overall,
      level: overall <= 15 ? 'Excellent' : overall <= 30 ? 'Low' : overall <= 50 ? 'Moderate' : overall <= 75 ? 'High' : 'Critical',
      scores: { deliveryRisk, financialRisk, disputeRisk, qualityRisk, communicationRisk, complianceRisk },
      reasons,
      suggestedActions: actions,
    };
  }

  calculateDeliveryRisk(orders) {
    if (!orders.length) return 50;
    const completed = orders.filter(o => o.status === 'delivered' || o.status === 'completed');
    const delayed = orders.filter(o => o.delayed === true).length;
    const lateDeliveries = Math.min(delayed, completed.length);
    return completed.length > 0 ? Math.round((lateDeliveries / completed.length) * 100) : 0;
  }

  calculateFinancialRisk(orders, vendor) {
    let score = 0;
    if (!orders.length) score += 30;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    if (orders.length > 0) score += (cancelled / orders.length) * 50;
    const refunds = orders.filter(o => o.status === 'refunded').length;
    if (orders.length > 0) score += (refunds / orders.length) * 50;
    return Math.round(Math.min(100, score));
  }

  calculateDisputeRisk(disputes, totalOrders) {
    if (!totalOrders) return 30;
    const openDisputes = disputes.filter(d => d.status === 'open').length;
    const resolvedAgainst = disputes.filter(d => d.resolvedIn === 'buyer').length;
    let score = (disputes.length / totalOrders) * 60;
    score += (openDisputes / Math.max(1, disputes.length)) * 20;
    score += (resolvedAgainst / Math.max(1, disputes.length)) * 20;
    return Math.round(Math.min(100, score));
  }

  calculateQualityRisk(reviews) {
    if (!reviews.length) return 50;
    const avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
    const lowRatings = reviews.filter(r => (r.rating || 0) <= 2).length;
    let score = (5 - avgRating) * 15;
    score += (lowRatings / reviews.length) * 25;
    return Math.round(Math.min(100, score));
  }

  calculateCommunicationRisk(reviews, orders) {
    if (!reviews.length && !orders.length) return 50;
    const lowCommReviews = reviews.filter(r => (r.communication || 5) <= 2).length;
    let score = reviews.length > 0 ? (lowCommReviews / reviews.length) * 50 : 0;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    score += orders.length > 0 ? (pendingOrders / orders.length) * 50 : 0;
    return Math.round(Math.min(100, score));
  }

  calculateExportRisk(vendorId) {
    return this.calculateVendorRisk(vendorId).then(r => r?.scores?.complianceRisk || 50);
  }

  calculateComplianceRisk(vendor) {
    if (!vendor) return 50;
    let score = 0;
    if (!vendor.certifications || !vendor.certifications.length) score += 40;
    if (!vendor.registrationNumber) score += 20;
    if (!vendor.taxNumber) score += 20;
    if (vendor.status !== 'active') score += 20;
    return Math.round(Math.min(100, score));
  }
}

export default new SupplierRiskService();
