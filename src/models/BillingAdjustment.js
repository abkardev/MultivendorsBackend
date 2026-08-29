import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingAccount', required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingInvoice' },
  type: {
    type: String,
    enum: ['credit', 'debit', 'write_off', 'correction', 'promotion'],
    required: true,
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'applied', 'rejected'],
    default: 'pending',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  appliedAt: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ account: 1 });
schema.index({ invoice: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ account: 1, status: 1 });

export const BillingAdjustment = mongoose.model('BillingAdjustment', schema);
