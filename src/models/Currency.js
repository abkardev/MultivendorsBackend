import mongoose from 'mongoose';

const currencySchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true, uppercase: true, maxlength: 3 },
  name: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  symbol: { type: String, required: true },
  exchangeRate: { type: Number, default: 1 },
  isDefault: { type: Boolean, default: false },
  decimalPlaces: { type: Number, default: 2 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true, toJSON: { virtuals: true } });

currencySchema.index({ code: 1 });
currencySchema.index({ isDefault: 1 });
currencySchema.index({ isActive: 1 });

export const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
