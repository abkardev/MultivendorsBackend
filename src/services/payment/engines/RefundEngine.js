import { Refund } from '../models/Refund.js';
import { PaymentTransaction } from '../models/PaymentTransaction.js';
import { PaymentAudit } from '../models/PaymentAudit.js';
import { VendorWallet } from '../models/VendorWallet.js';
import { paymentOrchestrator } from '../PaymentOrchestrator.js';

export class RefundEngine {
  async createRefund(transactionId, amount, reason, initiatedBy, initiatedByUser, orderId) {
    const tx = await PaymentTransaction.findById(transactionId);
    if (!tx) throw new Error('Transaction not found');
    const refundType = amount >= tx.amount ? 'full' : 'partial';
    const refund = await Refund.create({
      transaction: transactionId, order: orderId || tx.order, amount, currency: tx.currency,
      status: 'pending', reason, type: refundType, initiatedBy, initiatedByUser,
    });
    return refund;
  }

  async processRefund(refundId) {
    const refund = await Refund.findById(refundId).populate('transaction');
    if (!refund || refund.status !== 'pending') throw new Error('Refund not found or not pending');
    refund.status = 'processing';
    await refund.save();
    try {
      const tx = refund.transaction;
      const result = await paymentOrchestrator.refundPayment(tx.providerTransactionId, refund.amount, refund.reason, tx.provider);
      refund.status = 'completed';
      refund.providerRefundId = result.id;
      refund.gatewayResponse = result;
      refund.completedAt = new Date();
      await refund.save();
      await PaymentTransaction.findByIdAndUpdate(refund.transaction._id, {
        $inc: { refundedAmount: refund.amount },
        status: refund.type === 'full' ? 'refunded' : 'partially_refunded',
        refundedAt: new Date(),
      });
      const vendorWallet = await VendorWallet.findOne({ vendor: tx.vendor });
      if (vendorWallet) {
        const deductFrom = vendorWallet.availableBalance >= refund.amount ? 'availableBalance' : 'escrowBalance';
        await VendorWallet.findOneAndUpdate(
          { vendor: tx.vendor },
          { $inc: { [deductFrom]: -refund.amount, totalEarned: -refund.amount } },
        );
      }
      await PaymentAudit.create({
        action: 'refund.completed', actorRole: 'system', transaction: tx._id, order: tx.order, vendor: tx.vendor,
        description: `Refund ${refund.amount} ${refund.currency}`,
        changes: { refundId: refund._id, amount: refund.amount, reason: refund.reason },
      });
    } catch (err) {
      refund.status = 'failed';
      refund.failureReason = err.message;
      await refund.save();
    }
    return refund;
  }

  async listRefunds(filter = {}) {
    return Refund.find(filter).populate('transaction', 'transactionId amount').populate('order', 'orderNumber').sort({ createdAt: -1 }).lean();
  }
}

export const refundEngine = new RefundEngine();
