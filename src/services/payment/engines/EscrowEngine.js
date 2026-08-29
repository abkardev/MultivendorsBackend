import { EscrowAccountPb } from '../models/EscrowAccount.js';
import { VendorWallet } from '../models/VendorWallet.js';
import { PaymentAudit } from '../models/PaymentAudit.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { CommissionEngine } from './CommissionEngine.js';
import { currencyEngine } from './CurrencyEngine.js';

export class EscrowEngine {
  async holdFunds(order, buyer, vendor, amount, currency = 'SAR', days = 14) {
    const existing = await EscrowAccountPb.findOne({ order: order._id || order });
    if (existing) return existing;
    const escrow = await EscrowAccountPb.create({
      order: order._id || order, buyer: buyer._id || buyer, vendor: vendor._id || vendor,
      amount, currency, status: 'held', autoReleaseDays: days,
      timeline: [{ action: 'held', amount, actor: buyer._id || buyer, note: 'Funds held in escrow' }],
    });
    await VendorWallet.findOneAndUpdate(
      { vendor: vendor._id || vendor },
      { $inc: { escrowBalance: amount } },
      { upsert: true },
    );
    await PaymentAudit.create({ action: 'escrow.hold', actor: buyer._id || buyer, actorRole: 'buyer', order: order._id || order, vendor: vendor._id || vendor, description: `Escrow hold ${amount} ${currency}`, changes: { amount, currency } });
    return escrow;
  }

  async releaseFunds(escrowId, actor, note = '') {
    const escrow = await EscrowAccountPb.findById(escrowId);
    if (!escrow || escrow.status !== 'held') throw new Error('Escrow not found or not held');
    const commissionEngine = new CommissionEngine();
    const commission = await commissionEngine.calculate({
      vendor: escrow.vendor, amount: escrow.amount, currency: escrow.currency, country: null, category: null,
    });
    const netAmount = escrow.amount - commission.amount;
    escrow.status = 'released';
    escrow.releasedAmount = escrow.amount;
    escrow.commissionAmount = commission.amount;
    escrow.releaseDate = new Date();
    escrow.timeline.push({ action: 'released', amount: netAmount, actor, note: note || 'Funds released to vendor' });
    await escrow.save();
    await VendorWallet.findOneAndUpdate(
      { vendor: escrow.vendor },
      { $inc: { escrowBalance: -escrow.amount, availableBalance: netAmount, totalEarned: netAmount, totalCommissionDeducted: commission.amount } },
    );
    await PaymentAudit.create({ action: 'escrow.release', actor, actorRole: 'system', order: escrow.order, vendor: escrow.vendor, description: `Escrow release ${netAmount} ${escrow.currency}`, changes: { gross: escrow.amount, commission: commission.amount, net: netAmount } });
    return { escrow, netAmount, commission: commission.amount };
  }

  async refundFunds(escrowId, actor, reason = '') {
    const escrow = await EscrowAccountPb.findById(escrowId);
    if (!escrow || escrow.status !== 'held') throw new Error('Escrow not found or not held');
    escrow.status = 'refunded';
    escrow.refundedAmount = escrow.amount;
    escrow.disputeDate = new Date();
    escrow.disputeReason = reason;
    escrow.timeline.push({ action: 'refunded', amount: escrow.amount, actor, note: reason || 'Funds refunded to buyer' });
    await escrow.save();
    await VendorWallet.findOneAndUpdate(
      { vendor: escrow.vendor },
      { $inc: { escrowBalance: -escrow.amount } },
    );
    await PaymentAudit.create({ action: 'escrow.refund', actor, actorRole: 'system', order: escrow.order, vendor: escrow.vendor, description: `Escrow refund ${escrow.amount} ${escrow.currency}`, changes: { amount: escrow.amount } });
    return escrow;
  }

  async getEscrowByOrder(orderId) {
    return EscrowAccountPb.findOne({ order: orderId }).populate('buyer vendor', 'name companyName storeName').lean();
  }

  async listVendorEscrows(vendorId) {
    return EscrowAccountPb.find({ vendor: vendorId }).sort({ createdAt: -1 }).lean();
  }
}

export const escrowEngine = new EscrowEngine();
