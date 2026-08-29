import mongoose from 'mongoose';

const taxRegionSchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  countries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Country' }],
  taxRate: { type: Number, default: 0 },
  taxType: {
    type: String,
    enum: ['vat', 'gst', 'sales_tax', 'income_tax', 'withholding'],
    default: 'vat',
  },
  rules: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

taxRegionSchema.index({ isActive: 1 });
taxRegionSchema.index({ taxType: 1 });

export const TaxRegion = mongoose.model('TaxRegion', taxRegionSchema);
