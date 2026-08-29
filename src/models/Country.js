import mongoose from 'mongoose';

const countrySchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true, maxlength: 2 },
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  phoneCode: { type: String },
  currency: { type: mongoose.Schema.Types.ObjectId, ref: 'Currency' },
  language: { type: String },
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'Region' },
  timezone: { type: String },
  flag: { type: String },
  isActive: { type: Boolean, default: true },
  requiresVat: { type: Boolean, default: false },
  vatRate: { type: Number },
  postalCodeFormat: { type: String },
  businessRegistrationFormat: { type: String },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true, toJSON: { virtuals: true } });

countrySchema.index({ code: 1 });
countrySchema.index({ region: 1 });
countrySchema.index({ isActive: 1 });
countrySchema.index({ currency: 1 });

export const Country = mongoose.models.Country || mongoose.model('Country', countrySchema);
