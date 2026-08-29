import mongoose from 'mongoose';

const quotationVersionSchema = new mongoose.Schema({
  quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  version: { type: Number, required: true },
  snapshot: { type: mongoose.Schema.Types.Mixed },
  changes: { type: String },
  totalBefore: Number,
  totalAfter: Number,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

quotationVersionSchema.index({ quotation: 1, version: -1 });

export const QuotationVersion = mongoose.model('QuotationVersion', quotationVersionSchema);
