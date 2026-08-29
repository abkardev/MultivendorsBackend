import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  type: { type: String, enum: ['platform_fee', 'commission', 'subscription', 'credit_note', 'debit_note'] },
  number: { type: String, unique: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number },
  taxAmount: { type: Number },
  totalAmount: { type: Number },
  currency: { type: String },
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  dueDate: { type: Date },
  issuedAt: { type: Date },
  paidAt: { type: Date },
  items: [{
    description: { type: String },
    amount: { type: Number },
    tax: { type: Number }
  }],
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ number: 1 });
schema.index({ vendor: 1 });
schema.index({ buyer: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', schema);
