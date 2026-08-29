import mongoose from 'mongoose';

const taxRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  region: String,
  rate: { type: Number, required: true },
  type: { type: String, enum: ['vat', 'gst', 'sales_tax', 'custom'], required: true },
  isActive: { type: Boolean, default: true },
  appliesTo: [String],
  rules: {
    exemptCategories: [String],
    minAmount: Number,
    maxAmount: Number,
    isDefault: { type: Boolean, default: false },
  },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const TaxRule = mongoose.models.TaxRule || mongoose.model('TaxRule', taxRuleSchema);
