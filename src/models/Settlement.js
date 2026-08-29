import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  periodStart: { type: Date },
  periodEnd: { type: Date },
  totalRevenue: { type: Number },
  commissionAmount: { type: Number },
  feesAmount: { type: Number },
  netAmount: { type: Number },
  currency: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'processing', 'paid', 'failed'], default: 'pending' },
  items: [{
    type: { type: String },
    amount: { type: Number },
    reference: { type: String },
    referenceId: { type: String }
  }],
  paidAt: { type: Date },
  paymentMethod: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ vendor: 1 });
schema.index({ status: 1 });
schema.index({ periodStart: 1, periodEnd: 1 });
schema.index({ isActive: 1 });

export const Settlement = mongoose.model('Settlement', schema);
