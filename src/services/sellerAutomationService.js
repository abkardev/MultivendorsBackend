import { SellerAutomationRule } from '../models/SellerAutomationRule.js';
import { CustomerReminder } from '../models/CustomerReminder.js';
import { SellerCustomer } from '../models/SellerCustomer.js';
import { notificationService } from './notificationService.js';

class SellerAutomationService {
  async createRule(vendorId, data) {
    return SellerAutomationRule.create({ ...data, vendor: vendorId });
  }

  async getRules(vendorId) {
    return SellerAutomationRule.find({ vendor: vendorId }).sort({ createdAt: -1 });
  }

  async updateRule(vendorId, ruleId, data) {
    return SellerAutomationRule.findOneAndUpdate({ _id: ruleId, vendor: vendorId }, { $set: data }, { new: true });
  }

  async deleteRule(vendorId, ruleId) {
    return SellerAutomationRule.findOneAndDelete({ _id: ruleId, vendor: vendorId });
  }

  async toggleRule(vendorId, ruleId) {
    const rule = await SellerAutomationRule.findOne({ _id: ruleId, vendor: vendorId });
    if (!rule) throw new Error('Rule not found');
    rule.isActive = !rule.isActive;
    await rule.save();
    return rule;
  }

  async processQuotationExpiryReminders(vendorId) {
    const { default: Quotation } = await import('../models/Quotation.js');
    const rules = await SellerAutomationRule.find({ vendor: vendorId, type: 'quotation_expiry_reminder', isActive: true });
    if (rules.length === 0) return [];
    const expiringSoon = await Quotation.find({
      vendor: vendorId, status: 'sent',
      expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 3 * 86400000) },
    }).populate('buyer', 'name email').limit(20);
    const reminders = [];
    for (const quote of expiringSoon) {
      const daysLeft = Math.ceil((quote.expiresAt.getTime() - Date.now()) / 86400000);
      const reminder = await CustomerReminder.create({
        vendor: vendorId, buyer: quote.buyer?._id,
        title: `Quotation #${quote._id} expires in ${daysLeft} days`,
        type: 'quotation_expiry',
        priority: daysLeft <= 1 ? 'urgent' : 'high',
        dueAt: new Date(Date.now() + 3600000),
      });
      reminders.push(reminder);
    }
    return reminders;
  }

  async processInactiveCustomerReminders(vendorId) {
    const rules = await SellerAutomationRule.find({ vendor: vendorId, type: 'inactive_customer', isActive: true });
    if (rules.length === 0) return [];
    const inactiveDays = 30;
    const inactiveDate = new Date(Date.now() - inactiveDays * 86400000);
    const inactiveCustomers = await SellerCustomer.find({
      vendor: vendorId, isActive: true,
      $or: [{ lastContactAt: { $lte: inactiveDate } }, { lastContactAt: { $exists: false } }],
    }).limit(20);
    const reminders = [];
    for (const customer of inactiveCustomers) {
      const reminder = await CustomerReminder.create({
        vendor: vendorId, buyer: customer.buyer,
        title: `Follow up with inactive customer`,
        description: `${customer.company || 'Customer'} has been inactive for over ${inactiveDays} days`,
        type: 'inactive_customer',
        priority: 'medium',
        dueAt: new Date(Date.now() + 86400000),
      });
      reminders.push(reminder);
    }
    return reminders;
  }

  async processDeliveryFollowUp(vendorId) {
    const { default: Order } = await import('../models/Order.js');
    const rules = await SellerAutomationRule.find({ vendor: vendorId, type: 'delivery_follow_up', isActive: true });
    if (rules.length === 0) return [];
    const deliveredOrders = await Order.find({
      vendor: vendorId, status: 'delivered',
      deliveredAt: { $gte: new Date(Date.now() - 7 * 86400000) },
    }).limit(20);
    const reminders = [];
    for (const order of deliveredOrders) {
      const reminder = await CustomerReminder.create({
        vendor: vendorId, buyer: order.buyer,
        title: 'Follow up after delivery',
        description: `Order #${order._id} was delivered - check customer satisfaction`,
        type: 'delivery_follow_up',
        priority: 'medium',
        dueAt: new Date(Date.now() + 86400000),
      });
      reminders.push(reminder);
    }
    return reminders;
  }

  async processAutomations(vendorId) {
    const results = {
      quotationReminders: await this.processQuotationExpiryReminders(vendorId),
      inactiveReminders: await this.processInactiveCustomerReminders(vendorId),
      deliveryFollowUps: await this.processDeliveryFollowUp(vendorId),
    };
    return results;
  }
}

export const sellerAutomationService = new SellerAutomationService();
