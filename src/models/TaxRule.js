import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String },
  country: { type: String },
  region: { type: String },
  rate: { type: Number },
  type: { type: String, enum: ['vat', 'gst', 'sales_tax', 'customs', 'withholding'] },
  appliesTo: { type: String, enum: ['all', 'products', 'services', 'digital'] },
  productCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  isDefault: { type: Boolean, default: false },
  effectiveFrom: { type: Date },
  effectiveTo: { type: Date },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ country: 1, region: 1 });
schema.index({ type: 1 });
schema.index({ isDefault: 1 });
schema.index({ isActive: 1 });

export const TaxRule = mongoose.models.TaxRule || mongoose.model('TaxRule', schema);
