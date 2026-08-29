import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  type: {
    type: String,
    enum: ['order', 'subscription', 'refund', 'commission', 'withdrawal', 'tax'],
    required: true,
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  amount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  currency: { type: String, default: 'SAR' },
  status: {
    type: String,
    enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled', 'refunded'],
    default: 'draft',
  },
  dueDate: Date,
  issuedAt: Date,
  paidAt: Date,
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
    taxRate: Number,
  }],
  companyInfo: {
    name: String,
    nameAr: String,
    address: String,
    taxNumber: String,
    crNumber: String,
    phone: String,
    email: String,
  },
  buyerInfo: {
    name: String,
    address: String,
    taxNumber: String,
    email: String,
  },
  notes: String,
  terms: String,
  pdfUrl: String,
}, { timestamps: true });

invoiceSchema.index({ vendor: 1, createdAt: -1 });
invoiceSchema.index({ buyer: 1, createdAt: -1 });
invoiceSchema.index({ type: 1, status: 1 });

export const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
