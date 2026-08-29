import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  transactionId: { type: String, unique: true, sparse: true },
  providerTransactionId: String,
  provider: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  settledCurrency: String,
  exchangeRate: { type: Number, default: 1 },
  fee: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  type: {
    type: String,
    enum: ['payment', 'refund', 'payout', 'subscription', 'escrow_hold', 'escrow_release'],
    required: true,
  },
  paymentMethod: String,
  paymentMethodType: String,
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  refundedAmount: { type: Number, default: 0 },
  capturedAt: Date,
  refundedAt: Date,
  ipAddress: String,
  userAgent: String,
  riskScore: { type: Number, default: 0 },
  isTest: { type: Boolean, default: false },
}, { timestamps: true });

paymentTransactionSchema.index({ order: 1 });
paymentTransactionSchema.index({ vendor: 1, createdAt: -1 });
paymentTransactionSchema.index({ status: 1, createdAt: -1 });

export const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
