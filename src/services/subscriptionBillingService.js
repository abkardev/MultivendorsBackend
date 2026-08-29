import mongoose from 'mongoose';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { SubscriptionCoupon } from '../models/SubscriptionCoupon.js';
import { UsageRecord } from '../models/UsageRecord.js';
import Subscription from '../models/Subscription.js';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class SubscriptionBillingService {
  async getPlans() { return SubscriptionPlan.find({ isActive: true }).sort('sortOrder').lean(); }

  async getPlan(id) {
    const plan = await SubscriptionPlan.findById(id).lean();
    if (!plan) throw new Error('Plan not found');
    return plan;
  }

  async createPlan(data, userId) {
    const plan = await SubscriptionPlan.create(data);
    await logAuditEvent({ userId, action: 'subscription.plan.create', category: 'billing', entityType: 'subscription_plan', entityId: plan._id, newValue: { name: plan.name, code: plan.code, price: plan.price }, description: `Subscription plan ${plan.name} created` });
    return plan;
  }

  async updatePlan(id, data, userId) {
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!plan) throw new Error('Plan not found');
    await logAuditEvent({ userId, action: 'subscription.plan.update', category: 'billing', entityType: 'subscription_plan', entityId: id, newValue: { name: plan.name, price: plan.price }, description: `Plan ${plan.name} updated` });
    return plan;
  }

  async deletePlan(id, userId) {
    const plan = await SubscriptionPlan.findByIdAndUpdate(id, { $set: { isActive: false, status: 'archived' } }, { new: true });
    if (!plan) throw new Error('Plan not found');
    await logAuditEvent({ userId, action: 'subscription.plan.delete', category: 'billing', entityType: 'subscription_plan', entityId: id, description: `Plan ${plan.name} archived` });
    return { message: 'Plan archived' };
  }

  async getCoupons() { return SubscriptionCoupon.find().sort('-createdAt').lean(); }

  async createCoupon(data, userId) {
    const coupon = await SubscriptionCoupon.create(data);
    await logAuditEvent({ userId, action: 'subscription.coupon.create', category: 'billing', entityType: 'coupon', entityId: coupon._id, newValue: { code: coupon.code, type: coupon.type, value: coupon.value }, description: `Coupon ${coupon.code} created` });
    return coupon;
  }

  async validateCoupon(code, planId) {
    const coupon = await SubscriptionCoupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) throw new Error('Invalid coupon code');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('Coupon has expired');
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new Error('Coupon usage limit reached');
    if (coupon.appliesToPlans && coupon.appliesToPlans.length > 0) {
      if (!coupon.appliesToPlans.some(p => p.toString() === planId)) throw new Error('Coupon does not apply to this plan');
    }
    let discountAmount = 0;
    let description = '';
    if (coupon.type === 'percentage') {
      discountAmount = coupon.value;
      description = `${coupon.value}% off`;
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
      description = `${coupon.value} off`;
    } else if (coupon.type === 'trial_extension') {
      description = `${coupon.value} day trial extension`;
    }
    return { valid: true, coupon, discountAmount, description };
  }

  async getUsageRecords(vendorId) {
    if (!vendorId) throw new Error('Vendor ID is required');
    return UsageRecord.find({ vendor: vendorId }).sort('-periodStart').lean();
  }

  async getUsageAnalytics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [aggregatedUsage, topVendors, planBreakdown] = await Promise.all([
      UsageRecord.aggregate([
        { $group: {
          _id: null,
          totalProducts: { $sum: '$metrics.products' },
          totalOrders: { $sum: '$metrics.orders' },
          totalRfqs: { $sum: '$metrics.rfqs' },
          totalStorage: { $sum: '$metrics.storage' },
          totalApiCalls: { $sum: '$metrics.apiCalls' },
          totalAiQueries: { $sum: '$metrics.aiQueries' },
          totalOverage: { $sum: '$overageAmount' },
          recordCount: { $sum: 1 },
        }},
      ]),
      UsageRecord.aggregate([
        { $group: { _id: '$vendor', totalUsage: { $sum: { $add: ['$metrics.products', '$metrics.orders', '$metrics.apiCalls'] } } } },
        { $sort: { totalUsage: -1 } }, { $limit: 10 },
      ]),
      UsageRecord.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 }, totalOverage: { $sum: '$overageAmount' } } },
      ]),
    ]);
    return {
      aggregated: aggregatedUsage[0] || {},
      topVendors,
      planBreakdown,
      month: startOfMonth.toISOString().slice(0, 7),
    };
  }

  async getBillingHistory(vendorId) {
    if (!vendorId) throw new Error('Vendor ID is required');
    const subscriptions = await Subscription.find({ userId: vendorId }).sort('-createdAt').lean();
    const invoices = (await import('../models/Invoice.js')).Invoice;
    const billingInvoices = await invoices.find({ vendor: vendorId, type: 'subscription' }).sort('-createdAt').lean();
    return { subscriptions, invoices: billingInvoices };
  }

  async getSubscriptionForecast() {
    const activeSubs = await Subscription.find({ status: 'active' }).lean();
    const planIds = [...new Set(activeSubs.filter(s => s.planType).map(s => s.planType))];
    const plans = await SubscriptionPlan.find({ code: { $in: planIds } }).lean();
    const planMap = {};
    for (const p of plans) planMap[p.code] = p.price || 0;
    const now = new Date();
    const forecast = [];
    let totalMrr = 0;
    for (let m = 0; m < 12; m++) {
      const month = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const expiringThisMonth = activeSubs.filter(s => {
        const end = new Date(s.endDate);
        return end.getMonth() === month.getMonth() && end.getFullYear() === month.getFullYear();
      });
      const renewing = activeSubs.filter(s => s.autoRenew).length - expiringThisMonth.length;
      const revenue = activeSubs.reduce((sum, s) => sum + (planMap[s.planType] || 0), 0);
      forecast.push({ month: month.toISOString().slice(0, 7), activeSubscriptions: activeSubs.length, expiring: expiringThisMonth.length, renewing, projectedRevenue: revenue });
      if (m === 0) totalMrr = revenue;
    }
    return { forecast, currentMrr: totalMrr };
  }

  async processUpgrade(vendorId, newPlanId, userId) {
    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) throw new Error('New plan not found');
    const existing = await Subscription.findActiveForUser(vendorId);
    if (existing) {
      existing.status = 'canceled';
      existing.canceledAt = new Date();
      await existing.save();
    }
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const subscription = await Subscription.create({
      userId: vendorId, planType: newPlan.code || newPlan.type,
      status: 'active', startDate: new Date(), endDate,
      commissionRate: 0, features: newPlan.features || {}, autoRenew: true,
    });
    await Vendor.findOneAndUpdate({ user: vendorId }, { $set: { 'subscription.plan': newPlan.type || newPlan.code, 'subscription.startDate': new Date(), 'subscription.endDate': endDate, 'subscription.isActive': true } });
    await logAuditEvent({ userId: userId || vendorId, action: 'subscription.upgrade', category: 'billing', entityType: 'subscription', entityId: subscription._id, newValue: { plan: newPlan.name }, description: `Subscription upgraded to ${newPlan.name}` });
    await notificationService.send({ recipient: vendorId, type: 'subscription_upgraded', title: 'Subscription Upgraded', body: `Your subscription has been upgraded to ${newPlan.name}.`, data: { plan: newPlan.name, subscriptionId: subscription._id } });
    return subscription;
  }

  async processDowngrade(vendorId, newPlanId, userId) {
    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) throw new Error('New plan not found');
    const existing = await Subscription.findActiveForUser(vendorId);
    if (!existing) throw new Error('No active subscription found');
    existing.status = 'canceled';
    existing.canceledAt = new Date();
    await existing.save();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    const subscription = await Subscription.create({
      userId: vendorId, planType: newPlan.code || newPlan.type,
      status: 'active', startDate: new Date(), endDate,
      commissionRate: 0, features: newPlan.features || {}, autoRenew: true,
    });
    await Vendor.findOneAndUpdate({ user: vendorId }, { $set: { 'subscription.plan': newPlan.type || newPlan.code, 'subscription.startDate': new Date(), 'subscription.endDate': endDate, 'subscription.isActive': true } });
    await logAuditEvent({ userId: userId || vendorId, action: 'subscription.downgrade', category: 'billing', entityType: 'subscription', entityId: subscription._id, newValue: { plan: newPlan.name }, description: `Subscription downgraded to ${newPlan.name}` });
    await notificationService.send({ recipient: vendorId, type: 'subscription_downgraded', title: 'Subscription Downgraded', body: `Your subscription has been changed to ${newPlan.name}.`, data: { plan: newPlan.name, subscriptionId: subscription._id } });
    return subscription;
  }

  async processCancellation(vendorId, reason, userId) {
    const sub = await Subscription.findActiveForUser(vendorId);
    if (!sub) throw new Error('No active subscription found');
    sub.status = 'canceled';
    sub.canceledAt = new Date();
    sub.autoRenew = false;
    await sub.save();
    await Vendor.findOneAndUpdate({ user: vendorId }, { $set: { 'subscription.isActive': false } });
    await logAuditEvent({ userId: userId || vendorId, action: 'subscription.cancel', category: 'billing', entityType: 'subscription', entityId: sub._id, oldValue: { status: 'active' }, newValue: { status: 'canceled', reason }, description: `Subscription cancelled: ${reason}` });
    await notificationService.send({ recipient: vendorId, type: 'subscription_cancelled', title: 'Subscription Cancelled', body: `Your subscription has been cancelled.`, data: { reason } });
    return sub;
  }

  async processSuspension(vendorId, userId) {
    const sub = await Subscription.findActiveForUser(vendorId);
    if (!sub) throw new Error('No active subscription found');
    sub.status = 'past_due';
    await sub.save();
    await logAuditEvent({ userId: userId || vendorId, action: 'subscription.suspend', category: 'billing', entityType: 'subscription', entityId: sub._id, description: `Subscription suspended for vendor ${vendorId}` });
    await notificationService.send({ recipient: vendorId, type: 'subscription_suspended', title: 'Subscription Suspended', body: 'Your subscription has been suspended due to payment issues.', data: {} });
    return sub;
  }

  async autoRenew(vendorId) {
    const sub = await Subscription.findActiveForUser(vendorId);
    if (!sub) throw new Error('No active subscription found');
    if (!sub.autoRenew) throw new Error('Auto-renew is disabled');
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    sub.startDate = new Date();
    sub.endDate = endDate;
    sub.status = 'active';
    await sub.save();
    await logAuditEvent({ userId: vendorId, action: 'subscription.auto_renew', category: 'billing', entityType: 'subscription', entityId: sub._id, description: `Subscription auto-renewed for vendor ${vendorId}` });
    await notificationService.send({ recipient: vendorId, type: 'subscription_renewed', title: 'Subscription Renewed', body: 'Your subscription has been automatically renewed.', data: { endDate } });
    return sub;
  }

  async getSubscriptionStats() {
    const [active, trialing, cancelled, pastDue, totalRevenue, mrrAgg] = await Promise.all([
      Subscription.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'pending' }),
      Subscription.countDocuments({ status: 'canceled' }),
      Subscription.countDocuments({ status: 'past_due' }),
      (async () => {
        const { MarketplaceRevenue } = await import('../models/MarketplaceRevenue.js');
        const agg = await MarketplaceRevenue.aggregate([
          { $match: { type: 'subscription', status: 'cleared' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        return agg[0]?.total || 0;
      })(),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $lookup: { from: 'subscriptionplans', localField: 'planType', foreignField: 'code', as: 'plan' } },
        { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
        { $group: { _id: null, mrr: { $sum: { $ifNull: ['$plan.price', 0] } } } },
      ]),
    ]);
    return { active, trialing, cancelled, pastDue, totalSubscriptions: active + trialing + cancelled + pastDue, totalRevenue, mrr: mrrAgg[0]?.mrr || 0 };
  }
}

export const subscriptionBillingService = new SubscriptionBillingService();
