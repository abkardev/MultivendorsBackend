import mongoose from 'mongoose';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import { Settlement } from '../models/Settlement.js';
import { Invoice } from '../models/Invoice.js';
import { CreditNote } from '../models/CreditNote.js';
import { Refund } from '../models/Refund.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import Wallet from '../models/Wallet.js';
import Dispute from '../models/Dispute.js';
import { Vendor } from '../models/vendorModel.js';
import { logAuditEvent } from './auditService.js';
import { notificationService } from './notificationService.js';

class FinancialAdminService {
  async getFinancialDashboard() {
    const [revenueAgg, pendingSettlements, overdueInvoices, cashFlowAgg, walletAgg] = await Promise.all([
      MarketplaceRevenue.aggregate([
        { $match: { status: 'cleared' } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Settlement.aggregate([
        { $match: { status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      ]),
      Invoice.countDocuments({ status: 'overdue' }),
      MarketplaceRevenue.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
      ]),
      Wallet.aggregate([
        { $group: { _id: null, totalBalance: { $sum: '$balance' }, totalPending: { $sum: '$pendingBalance' } } },
      ]),
    ]);
    const revenueSummary = {};
    for (const r of revenueAgg) revenueSummary[r._id] = r.total;
    return {
      revenueSummary,
      pendingSettlements: { total: pendingSettlements[0]?.total || 0, count: pendingSettlements[0]?.count || 0 },
      overdueInvoices,
      cashFlow: cashFlowAgg,
      walletSummary: walletAgg[0] || { totalBalance: 0, totalPending: 0 },
    };
  }

  async getRevenue(params = {}) {
    const { type, vendorId, startDate, endDate, page = 1, limit = 20 } = params;
    const filter = {};
    if (type) filter.type = type;
    if (vendorId) filter.vendor = vendorId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      MarketplaceRevenue.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      MarketplaceRevenue.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getRevenueByPeriod(type, startDate, endDate) {
    const match = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    if (type && type !== 'all') match.type = type;
    return MarketplaceRevenue.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  async getRevenueForecast() {
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000);
    const monthlyData = await MarketplaceRevenue.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'cleared' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]);
    if (monthlyData.length < 2) return { forecast: [], confidence: 'low' };
    const amounts = monthlyData.map(d => d.amount);
    const avgGrowth = amounts.slice(1).reduce((sum, v, i) => sum + ((v - amounts[i]) / amounts[i]), 0) / (amounts.length - 1);
    const lastAmount = amounts[amounts.length - 1];
    const forecast = [];
    for (let m = 1; m <= 3; m++) {
      const projected = lastAmount * Math.pow(1 + avgGrowth, m);
      forecast.push({ month: new Date(Date.now() + m * 30 * 86400000).toISOString().slice(0, 7), projectedAmount: Math.round(projected * 100) / 100 });
    }
    return { forecast, confidence: monthlyData.length >= 4 ? 'high' : 'medium', avgGrowthRate: Math.round(avgGrowth * 10000) / 100 };
  }

  async getSettlements(query = {}) {
    const { status, vendorId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Settlement.find(filter).populate('vendor', 'storeName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Settlement.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getSettlement(id) {
    const settlement = await Settlement.findById(id).populate('vendor', 'storeName').lean();
    if (!settlement) throw new Error('Settlement not found');
    return settlement;
  }

  async approveSettlement(id, userId) {
    const settlement = await Settlement.findById(id);
    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'pending') throw new Error('Settlement is not in pending status');
    settlement.status = 'approved';
    await settlement.save();
    await logAuditEvent({ userId, action: 'finance.settlement.approve', category: 'finance', entityType: 'settlement', entityId: id, oldValue: { status: 'pending' }, newValue: { status: 'approved' }, amount: settlement.netAmount, currency: settlement.currency, description: `Settlement ${id} approved for payment` });
    return settlement;
  }

  async processSettlement(id, userId) {
    const settlement = await Settlement.findById(id);
    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status !== 'approved') throw new Error('Settlement must be approved first');
    settlement.status = 'paid';
    settlement.paidAt = new Date();
    await settlement.save();
    await logAuditEvent({ userId, action: 'finance.settlement.process', category: 'finance', entityType: 'settlement', entityId: id, amount: settlement.netAmount, currency: settlement.currency, description: `Settlement ${id} processed as paid` });
    return settlement;
  }

  async getPayoutQueue() {
    return Settlement.find({ status: { $in: ['approved', 'processing'] } }).populate('vendor', 'storeName').sort({ createdAt: 1 }).lean();
  }

  async getRefunds(query = {}) {
    const { status, orderId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (orderId) filter.order = orderId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Refund.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Refund.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async processRefund(id, status, notes, userId) {
    const refund = await Refund.findById(id);
    if (!refund) throw new Error('Refund not found');
    refund.status = status;
    if (notes) refund.notes = notes;
    if (status === 'approved') {
      refund.approvedBy = userId;
      refund.approvedAt = new Date();
    }
    if (status === 'completed') refund.completedAt = new Date();
    await refund.save();
    await logAuditEvent({ userId, action: `finance.refund.${status}`, category: 'finance', entityType: 'refund', entityId: id, amount: refund.amount, currency: refund.currency, description: `Refund ${id} ${status}` });
    if (status === 'completed') {
      await notificationService.send({ recipient: refund.order?.buyer || refund._id, type: 'refund_completed', title: 'Refund Processed', body: `Your refund of ${refund.amount} ${refund.currency} has been completed.`, data: { refundId: refund._id } });
    }
    return refund;
  }

  async createRefund(data, userId) {
    const refund = await Refund.create({ ...data, initiator: 'admin' });
    await logAuditEvent({ userId, action: 'finance.refund.create', category: 'finance', entityType: 'refund', entityId: refund._id, amount: refund.amount, currency: refund.currency, description: `Manual refund created` });
    return refund;
  }

  async getCreditNotes(query = {}) {
    const { status, vendorId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      CreditNote.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      CreditNote.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createCreditNote(data, userId) {
    const note = await CreditNote.create({ ...data, issuedBy: userId, issuedAt: new Date(), status: 'issued' });
    await logAuditEvent({ userId, action: 'finance.credit_note.create', category: 'finance', entityType: 'credit_note', entityId: note._id, amount: note.amount, currency: note.currency, description: `Credit note created for ${note.amount}` });
    return note;
  }

  async voidCreditNote(id, userId) {
    const note = await CreditNote.findById(id);
    if (!note) throw new Error('Credit note not found');
    if (note.status === 'applied') throw new Error('Cannot void an applied credit note');
    note.status = 'cancelled';
    await note.save();
    await logAuditEvent({ userId, action: 'finance.credit_note.void', category: 'finance', entityType: 'credit_note', entityId: id, description: `Credit note ${id} voided` });
    return note;
  }

  async getDebitNotes(query = {}) {
    const { DebitNote } = await import('../models/DebitNote.js');
    const { status, vendorId, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      DebitNote.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      DebitNote.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createDebitNote(data, userId) {
    const { DebitNote } = await import('../models/DebitNote.js');
    const note = await DebitNote.create({ ...data, issuedBy: userId, issuedAt: new Date(), status: 'issued' });
    await logAuditEvent({ userId, action: 'finance.debit_note.create', category: 'finance', entityType: 'debit_note', entityId: note._id, amount: note.amount, currency: note.currency, description: `Debit note created for ${note.amount}` });
    return note;
  }

  async voidDebitNote(id, userId) {
    const { DebitNote } = await import('../models/DebitNote.js');
    const note = await DebitNote.findById(id);
    if (!note) throw new Error('Debit note not found');
    if (note.status === 'applied') throw new Error('Cannot void an applied debit note');
    note.status = 'cancelled';
    await note.save();
    await logAuditEvent({ userId, action: 'finance.debit_note.void', category: 'finance', entityType: 'debit_note', entityId: id, description: `Debit note ${id} voided` });
    return note;
  }

  async getInvoices(query = {}) {
    const { status, vendorId, type, page = 1, limit = 20 } = query;
    const filter = {};
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Invoice.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getInvoice(id) {
    const invoice = await Invoice.findById(id).lean();
    if (!invoice) throw new Error('Invoice not found');
    return invoice;
  }

  async createInvoice(data, userId) {
    const number = `INV-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const invoice = await Invoice.create({ ...data, number });
    await logAuditEvent({ userId, action: 'finance.invoice.create', category: 'finance', entityType: 'invoice', entityId: invoice._id, amount: invoice.totalAmount, currency: invoice.currency, description: `Invoice ${number} created` });
    return invoice;
  }

  async sendInvoice(id, userId) {
    const invoice = await Invoice.findByIdAndUpdate(id, { $set: { status: 'sent', issuedAt: new Date() } }, { new: true });
    if (!invoice) throw new Error('Invoice not found');
    await notificationService.send({ recipient: invoice.vendor || invoice.buyer, type: 'invoice_sent', title: 'Invoice Sent', body: `Invoice ${invoice.number} for ${invoice.totalAmount} ${invoice.currency} has been sent.`, data: { invoiceId: invoice._id, number: invoice.number } });
    await logAuditEvent({ userId, action: 'finance.invoice.send', category: 'finance', entityType: 'invoice', entityId: id, description: `Invoice ${invoice.number} sent` });
    return invoice;
  }

  async getTaxReports(startDate, endDate) {
    const match = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    const [revenueByType, revenueByMonth, invoices] = await Promise.all([
      MarketplaceRevenue.aggregate([{ $match: { ...match, status: 'cleared' } }, { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      MarketplaceRevenue.aggregate([{ $match: { ...match, status: 'cleared' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: '$amount' } } }, { $sort: { _id: 1 } }]),
      Invoice.aggregate([{ $match: match }, { $group: { _id: '$status', totalTax: { $sum: '$taxAmount' }, totalAmount: { $sum: '$totalAmount' } } }]),
    ]);
    return { revenueByType, revenueByMonth, invoices, period: { startDate, endDate } };
  }

  async getCashFlow(startDate, endDate) {
    const match = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
    const [inflows, outflows] = await Promise.all([
      MarketplaceRevenue.aggregate([{ $match: { ...match, status: 'cleared' } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Settlement.aggregate([{ $match: { ...match, status: 'paid' } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, amount: { $sum: '$netAmount' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ]);
    const netCashFlow = inflows.map(i => {
      const out = outflows.find(o => o._id === i._id);
      return { date: i._id, inflow: i.amount, outflow: out?.amount || 0, net: i.amount - (out?.amount || 0) };
    });
    const totalInflow = inflows.reduce((s, i) => s + i.amount, 0);
    const totalOutflow = outflows.reduce((s, o) => s + o.amount, 0);
    return { daily: netCashFlow, totalInflow, totalOutflow, netCash: totalInflow - totalOutflow };
  }

  async getOutstandingPayments() {
    const [pendingSettlements, overdueInvoices, pendingRefunds] = await Promise.all([
      Settlement.aggregate([{ $match: { status: { $in: ['pending', 'approved'] } } }, { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }]),
      Invoice.aggregate([{ $match: { status: 'overdue' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
      Refund.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    return {
      pendingSettlements: pendingSettlements[0] || { total: 0, count: 0 },
      overdueInvoices: overdueInvoices[0] || { total: 0, count: 0 },
      pendingRefunds: pendingRefunds[0] || { total: 0, count: 0 },
    };
  }

  async getFinancialKpis() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const [currentRevenue, lastRevenue, orderAgg, invoiceAgg] = await Promise.all([
      MarketplaceRevenue.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      MarketplaceRevenue.aggregate([{ $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: 'cleared' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      (async () => {
        const { Order } = await import('../models/orderModel.js');
        return Order.aggregate([{ $match: { createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: { $toDouble: '$totalPrice' } }, count: { $sum: 1 } } }]);
      })(),
      Invoice.aggregate([{ $match: { status: 'overdue' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    ]);
    const currRev = currentRevenue[0]?.total || 0;
    const lastRev = lastRevenue[0]?.total || 0;
    const growthRate = lastRev > 0 ? ((currRev - lastRev) / lastRev) * 100 : 0;
    const avgOrderValue = orderAgg[0]?.count > 0 ? (orderAgg[0]?.total || 0) / orderAgg[0]?.count : 0;
    return {
      revenue: currRev,
      growthRate: Math.round(growthRate * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalOrders: orderAgg[0]?.count || 0,
      overdueInvoices: invoiceAgg[0]?.count || 0,
      overdueAmount: invoiceAgg[0]?.total || 0,
    };
  }
}

export const financialAdminService = new FinancialAdminService();
