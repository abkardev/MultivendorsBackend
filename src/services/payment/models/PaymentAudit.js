import mongoose from 'mongoose';

const paymentAuditSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  description: String,
  changes: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  ipAddress: String,
}, { timestamps: true });

paymentAuditSchema.index({ transaction: 1 });
paymentAuditSchema.index({ createdAt: -1 });

export const PaymentAudit = mongoose.model('PaymentAudit', paymentAuditSchema);
