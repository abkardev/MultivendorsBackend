import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema({
  entryId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  escrowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escrow' },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  type: { 
    type: String, 
    enum: [
      'commission', 'escrow_hold', 'escrow_release', 'escrow_refund',
      'payment_received', 'payment_sent', 'withdrawal', 'deposit',
      'subscription', 'refund', 'adjustment', 'fee', 'bonus', 'penalty'
    ],
    required: true 
  },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'SAR', uppercase: true },
  fee: { type: Number, default: 0 },
  netAmount: { type: Number },
  balanceBefore: { type: Number },
  balanceAfter: { type: Number },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
  description: { type: String },
  reference: { type: String },
  correlationId: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip: { type: String },
  userAgent: { type: String },
}, { timestamps: true });

ledgerEntrySchema.index({ userId: 1, createdAt: -1 });
ledgerEntrySchema.index({ orderId: 1 });
ledgerEntrySchema.index({ escrowId: 1 });
ledgerEntrySchema.index({ type: 1, createdAt: -1 });
ledgerEntrySchema.index({ correlationId: 1 });
ledgerEntrySchema.index({ createdAt: -1 });
ledgerEntrySchema.index({ vendorId: 1, createdAt: -1 });
ledgerEntrySchema.index({ status: 1, createdAt: -1 });
ledgerEntrySchema.index({ userId: 1, type: 1, createdAt: -1 });

ledgerEntrySchema.pre('findOneAndUpdate', () => { throw new Error('Ledger entries are immutable'); });
ledgerEntrySchema.pre('updateOne', () => { throw new Error('Ledger entries are immutable'); });
ledgerEntrySchema.pre('updateMany', () => { throw new Error('Ledger entries are immutable'); });

export default mongoose.model('LedgerEntry', ledgerEntrySchema);
