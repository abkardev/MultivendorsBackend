import mongoose from 'mongoose';

const quotationTemplateSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true, trim: true },
  description: String,
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    description: String,
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
  }],
  terms: String,
  validUntilDays: { type: Number, default: 30 },
  currency: { type: String, default: 'SAR' },
  taxRate: { type: Number, default: 0 },
  discountRate: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,
}, { timestamps: true });

quotationTemplateSchema.index({ vendor: 1, isActive: 1 });

export const QuotationTemplate = mongoose.model('QuotationTemplate', quotationTemplateSchema);
