import mongoose from 'mongoose';
import { BillingAccount } from '../models/BillingAccount.js';
import { BillingInvoice } from '../models/BillingInvoice.js';
import { UsageBilling } from '../models/UsageBilling.js';
import { BillingAdjustment } from '../models/BillingAdjustment.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseBillingService {
  async createAccount(data) {
    const accountNumber = `ACC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const account = await BillingAccount.create({ ...data, accountNumber });
    await logAuditEvent({
      action: 'billing.account_create',
      category: 'billing',
      entityType: 'BillingAccount',
      entityId: account._id,
      newValue: { accountNumber: account.accountNumber, name: account.name },
      description: `Billing account created: ${account.name} (${accountNumber})`,
    });
    return account;
  }

  async getAccount(id) {
    const account = await BillingAccount.findById(id).lean();
    if (!account) throw new Error('Billing account not found');
    const invoices = await BillingInvoice.find({ account: id }).sort({ issueDate: -1 }).limit(20).lean();
    return { ...account, invoices };
  }

  async updateAccount(id, data) {
    const old = await BillingAccount.findById(id);
    if (!old) throw new Error('Billing account not found');
    const restricted = ['accountNumber', 'balance'];
    for (const f of restricted) delete data[f];
    Object.assign(old, data);
    await old.save();
    await logAuditEvent({
      action: 'billing.account_update',
      category: 'billing',
      entityType: 'BillingAccount',
      entityId: id,
      oldValue: { name: old.name, status: old.status },
      newValue: { name: old.name, status: old.status },
      description: `Billing account updated: ${old.name}`,
    });
    return old;
  }

  async listAccounts(filter = {}) {
    const { page = 1, limit = 20, status, search, tenant, sort = '-createdAt' } = filter;
    const query = {};
    if (status) query.status = status;
    if (tenant) query.tenant = tenant;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { accountNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [accounts, total] = await Promise.all([
      BillingAccount.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      BillingAccount.countDocuments(query),
    ]);
    return { accounts, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async generateInvoice(accountId, period) {
    const account = await BillingAccount.findById(accountId);
    if (!account) throw new Error('Billing account not found');
    const usage = await UsageBilling.find({
      tenant: account.tenant,
      'period.start': { $gte: period.start },
      'period.end': { $lte: period.end },
      status: 'pending',
    }).lean();
    const items = usage.map(u => ({
      description: `${u.type} usage (${u.usage?.consumed || 0} units)`,
      type: u.type,
      quantity: u.usage?.consumed || 0,
      unitPrice: u.rate,
      amount: u.amount,
      taxRate: 0,
      taxAmount: 0,
      total: u.amount,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoice = await BillingInvoice.create({
      account: accountId,
      invoiceNumber,
      period,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + (account.paymentTerms || 30) * 86400000),
      items,
      subtotal,
      taxAmount,
      totalAmount,
      currency: account.currency,
      status: 'draft',
    });
    await UsageBilling.updateMany(
      { tenant: account.tenant, 'period.start': { $gte: period.start }, 'period.end': { $lte: period.end }, status: 'pending' },
      { status: 'billed' },
    );
    await logAuditEvent({
      action: 'billing.invoice_generate',
      category: 'billing',
      entityType: 'BillingInvoice',
      entityId: invoice._id,
      newValue: { invoiceNumber, totalAmount, account: accountId },
      description: `Invoice generated: ${invoiceNumber} for ${totalAmount} ${account.currency}`,
    });
    return invoice;
  }

  async getInvoice(id) {
    const invoice = await BillingInvoice.findById(id).populate('account', 'name accountNumber').lean();
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  async listInvoices(accountId, filter = {}) {
    const { page = 1, limit = 20, status, startDate, endDate, sort = '-issueDate' } = filter;
    const query = { account: accountId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      BillingInvoice.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      BillingInvoice.countDocuments(query),
    ]);
    return { invoices, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async updateInvoiceStatus(id, status) {
    const invoice = await BillingInvoice.findById(id);
    if (!invoice) throw new Error('Invoice not found');
    const oldStatus = invoice.status;
    invoice.status = status;
    if (status === 'paid') invoice.paidAt = new Date();
    await invoice.save();
    await logAuditEvent({
      action: 'billing.invoice_status_update',
      category: 'billing',
      entityType: 'BillingInvoice',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status },
      description: `Invoice ${invoice.invoiceNumber} status changed: ${oldStatus} -> ${status}`,
    });
    return invoice;
  }

  async recordUsage(tenantId, usageData) {
    const usage = await UsageBilling.create({ tenant: tenantId, ...usageData });
    return usage;
  }

  async listUsage(tenantId, period) {
    const query = { tenant: tenantId };
    if (period) {
      query['period.start'] = { $gte: new Date(period.start) };
      query['period.end'] = { $lte: new Date(period.end) };
    }
    return UsageBilling.find(query).sort({ createdAt: -1 }).lean();
  }

  async createAdjustment(accountId, data) {
    const adjustment = await BillingAdjustment.create({ account: accountId, ...data });
    await logAuditEvent({
      action: 'billing.adjustment_create',
      category: 'billing',
      entityType: 'BillingAdjustment',
      entityId: adjustment._id,
      newValue: { type: adjustment.type, amount: adjustment.amount, reason: adjustment.reason },
      description: `Billing adjustment created: ${adjustment.type} ${adjustment.amount} (${adjustment.reason})`,
    });
    return adjustment;
  }

  async applyAdjustment(id) {
    const adjustment = await BillingAdjustment.findById(id);
    if (!adjustment) throw new Error('Adjustment not found');
    if (adjustment.status !== 'pending') throw new Error('Adjustment is not pending');
    const account = await BillingAccount.findById(adjustment.account);
    if (!account) throw new Error('Billing account not found');
    const delta = adjustment.type === 'credit' || adjustment.type === 'write_off' ? -adjustment.amount : adjustment.amount;
    account.balance += delta;
    account.outstandingBalance = Math.max(0, account.outstandingBalance + delta);
    adjustment.status = 'applied';
    adjustment.appliedAt = new Date();
    await Promise.all([account.save(), adjustment.save()]);
    await logAuditEvent({
      action: 'billing.adjustment_apply',
      category: 'billing',
      entityType: 'BillingAdjustment',
      entityId: id,
      oldValue: { status: 'pending' },
      newValue: { status: 'applied', balance: account.balance },
      description: `Adjustment applied: ${adjustment.type} ${adjustment.amount} to account ${account.accountNumber}`,
    });
    return adjustment;
  }

  async calculateTotals(invoiceData) {
    const { items, taxRate = 0, discountAmount = 0 } = invoiceData;
    let subtotal = 0;
    const calculated = (items || []).map(item => {
      const amount = (item.quantity || 0) * (item.unitPrice || 0);
      const taxAmount = amount * ((item.taxRate !== undefined ? item.taxRate : taxRate) / 100);
      const total = amount + taxAmount;
      subtotal += amount;
      return { ...item, amount, taxAmount, total };
    });
    const totalTax = calculated.reduce((s, i) => s + i.taxAmount, 0);
    const totalAmount = subtotal + totalTax - (discountAmount || 0);
    return { items: calculated, subtotal, taxAmount: totalTax, discountAmount: discountAmount || 0, totalAmount };
  }

  async getBillingSummary(accountId) {
    const account = await BillingAccount.findById(accountId).lean();
    if (!account) throw new Error('Billing account not found');
    const [totalInvoices, paidInvoices, overdueInvoices, pendingAdjustments, totalUsage] = await Promise.all([
      BillingInvoice.countDocuments({ account: accountId }),
      BillingInvoice.countDocuments({ account: accountId, status: 'paid' }),
      BillingInvoice.countDocuments({ account: accountId, status: 'overdue' }),
      BillingAdjustment.countDocuments({ account: accountId, status: 'pending' }),
      UsageBilling.countDocuments({ tenant: account.tenant, status: 'pending' }),
    ]);
    const recentInvoices = await BillingInvoice.find({ account: accountId })
      .sort({ issueDate: -1 }).limit(5).select('invoiceNumber totalAmount status issueDate dueDate').lean();
    return {
      account,
      totals: { totalInvoices, paidInvoices, overdueInvoices, pendingAdjustments, totalUsage },
      outstandingBalance: account.outstandingBalance,
      recentInvoices,
    };
  }

  async getOutstandingBalance() {
    const accounts = await BillingAccount.find({ outstandingBalance: { $gt: 0 } })
      .select('name accountNumber outstandingBalance currency')
      .sort({ outstandingBalance: -1 })
      .lean();
    const totalOutstanding = accounts.reduce((sum, a) => sum + (a.outstandingBalance || 0), 0);
    return { accounts, totalOutstanding, count: accounts.length };
  }

  async generateMonthlyInvoices() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const period = { start: startOfMonth, end: endOfMonth };
    const accounts = await BillingAccount.find({ status: 'active' }).lean();
    const results = [];
    for (const account of accounts) {
      try {
        const invoice = await this.generateInvoice(account._id, period);
        results.push({ accountId: account._id, accountNumber: account.accountNumber, invoiceId: invoice._id, success: true });
      } catch (err) {
        results.push({ accountId: account._id, accountNumber: account.accountNumber, error: err.message, success: false });
      }
    }
    return { generated: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  async aggregateUsage() {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const usage = await UsageBilling.aggregate([
      { $match: { createdAt: { $gte: yesterday, $lt: today } } },
      { $group: { _id: { tenant: '$tenant', type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    return { date: yesterday, aggregated: usage, totalRecords: usage.length };
  }

  async getBillingAnalytics(period) {
    const match = {};
    if (period) {
      match.createdAt = {};
      if (period.start) match.createdAt.$gte = new Date(period.start);
      if (period.end) match.createdAt.$lte = new Date(period.end);
    }
    const [revenueByStatus, revenueByCurrency, topAccounts, invoiceCount, totalRevenue] = await Promise.all([
      BillingInvoice.aggregate([
        { $match: { ...match, status: { $in: ['paid', 'pending', 'overdue'] } } },
        { $group: { _id: '$status', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      BillingInvoice.aggregate([
        { $match: { ...match, status: { $in: ['paid', 'pending', 'overdue'] } } },
        { $group: { _id: '$currency', total: { $sum: '$totalAmount' } } },
      ]),
      BillingInvoice.aggregate([
        { $match: { ...match, status: 'paid' } },
        { $group: { _id: '$account', total: { $sum: '$totalAmount' } } },
        { $sort: { total: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'billingaccounts', localField: '_id', foreignField: '_id', as: 'account' } },
        { $unwind: { path: '$account', preserveNullAndEmptyArrays: true } },
        { $project: { accountName: '$account.name', accountNumber: '$account.accountNumber', total: 1 } },
      ]),
      BillingInvoice.countDocuments(match),
      BillingInvoice.aggregate([
        { $match: { ...match, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);
    return {
      invoiceCount,
      totalRevenue: totalRevenue[0]?.total || 0,
      byStatus: revenueByStatus.reduce((acc, r) => { acc[r._id] = { total: r.total, count: r.count }; return acc; }, {}),
      byCurrency: revenueByCurrency.reduce((acc, r) => { acc[r._id] = r.total; return acc; }, {}),
      topAccounts,
      period,
    };
  }
}

export const enterpriseBillingService = new EnterpriseBillingService();
