import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number },
  currency: { type: String },
  reason: { type: String },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt: { type: Date },
  status: { type: String, enum: ['draft', 'issued', 'cancelled', 'applied'], default: 'draft' },
  appliedAt: { type: Date },
  items: [{
    description: { type: String },
    amount: { type: Number }
  }],
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ vendor: 1 });
schema.index({ buyer: 1 });
schema.index({ order: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });

export const CreditNote = mongoose.model('CreditNote', schema);
