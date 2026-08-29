import { VendorWallet } from '../models/VendorWallet.js';
import { Withdrawal } from '../models/Withdrawal.js';
import { PaymentAudit } from '../models/PaymentAudit.js';
import { paymentOrchestrator } from '../PaymentOrchestrator.js';

export class PayoutEngine {
  async requestPayout(vendorId, amount, currency = 'SAR', bankAccount = {}) {
    const wallet = await VendorWallet.findOne({ vendor: vendorId });
    if (!wallet || wallet.availableBalance < amount) throw new Error('Insufficient available balance');
    const withdrawal = await Withdrawal.create({
      vendor: vendorId, amount, currency, status: 'pending',
      bankAccount, fee: 0, netAmount: amount,
    });
    return withdrawal;
  }

  async approveWithdrawal(withdrawalId, adminId) {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate('vendor');
    if (!withdrawal || withdrawal.status !== 'pending') throw new Error('Withdrawal not found or not pending');
    withdrawal.status = 'approved';
    withdrawal.reviewedBy = adminId;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();
    return withdrawal;
  }

  async processPayout(withdrawalId) {
    const withdrawal = await Withdrawal.findById(withdrawalId).populate('vendor');
    if (!withdrawal || withdrawal.status !== 'approved') throw new Error('Withdrawal not found or not approved');
    withdrawal.status = 'processing';
    await withdrawal.save();
    try {
      const gateway = withdrawal.vendor?.paymentGateway || 'bank_transfer';
      const result = await paymentOrchestrator.payout({
        provider: gateway, amount: withdrawal.amount, currency: withdrawal.currency,
        destination: withdrawal.bankAccount?.iban || withdrawal.bankAccount?.accountNumber,
        description: `Vendor payout ${withdrawal._id}`,
      });
      withdrawal.status = 'completed';
      withdrawal.gatewayReference = result.id;
      withdrawal.completedAt = new Date();
      await withdrawal.save();
      await VendorWallet.findOneAndUpdate(
        { vendor: withdrawal.vendor._id },
        { $inc: { availableBalance: -withdrawal.netAmount, totalWithdrawn: withdrawal.netAmount }, $set: { lastPayoutDate: new Date() } },
      );
      await PaymentAudit.create({
        action: 'payout.completed', actorRole: 'system', vendor: withdrawal.vendor._id,
        description: `Payout ${withdrawal.amount} ${withdrawal.currency}`,
        changes: { withdrawalId: withdrawal._id, amount: withdrawal.amount, gatewayReference: result.id },
      });
    } catch (err) {
      withdrawal.status = 'failed';
      withdrawal.failureReason = err.message;
      await withdrawal.save();
    }
    return withdrawal;
  }

  async cancelWithdrawal(withdrawalId, reason = '') {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal || !['pending', 'approved'].includes(withdrawal.status)) throw new Error('Cannot cancel this withdrawal');
    withdrawal.status = 'cancelled';
    withdrawal.notes = reason;
    await withdrawal.save();
    return withdrawal;
  }

  async getWallet(vendorId) {
    let wallet = await VendorWallet.findOne({ vendor: vendorId });
    if (!wallet) {
      wallet = await VendorWallet.create({ vendor: vendorId });
    }
    return wallet;
  }

  async listWithdrawals(vendorId) {
    return Withdrawal.find({ vendor: vendorId }).sort({ createdAt: -1 }).lean();
  }

  async listAllWithdrawals(filter = {}) {
    return Withdrawal.find(filter).populate('vendor', 'storeName').sort({ createdAt: -1 }).lean();
  }
}

export const payoutEngine = new PayoutEngine();
