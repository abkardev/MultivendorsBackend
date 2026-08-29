import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'BillingAccount', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['invoice', 'credit_note', 'debit_note', 'proforma'],
    default: 'invoice',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
  },
  period: {
    start: { type: Date },
    end: { type: Date },
  },
  issueDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  paidAt: { type: Date },
  items: [{
    description: { type: String },
    type: { type: String },
    quantity: { type: Number },
    unitPrice: { type: Number },
    amount: { type: Number },
    taxRate: { type: Number },
    taxAmount: { type: Number },
    total: { type: Number },
    metadata: { type: Object },
  }],
  subtotal: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  notes: { type: String },
  terms: { type: String },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ invoiceNumber: 1 });
schema.index({ account: 1 });
schema.index({ status: 1 });
schema.index({ account: 1, status: 1 });
schema.index({ issueDate: 1 });
schema.index({ dueDate: 1 });

export const BillingInvoice = mongoose.model('BillingInvoice', schema);
