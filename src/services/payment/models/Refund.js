import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  reason: String,
  type: { type: String, enum: ['full', 'partial'], default: 'full' },
  initiatedBy: { type: String, enum: ['buyer', 'vendor', 'admin', 'system'], required: true },
  initiatedByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  providerRefundId: String,
  gatewayResponse: mongoose.Schema.Types.Mixed,
  failureReason: String,
  completedAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const Refund = mongoose.models.Refund || mongoose.model('Refund', refundSchema);
