import mongoose from 'mongoose';

const currencySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  name: String,
  nameAr: String,
  symbol: String,
  symbolNative: String,
  decimalDigits: { type: Number, default: 2 },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  exchangeRateToBase: { type: Number, default: 1 },
  baseCurrency: { type: String, default: 'SAR' },
  updatedAt: { type: Date },
}, { timestamps: true });

const exchangeRateSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  rate: { type: Number, required: true },
  source: { type: String, default: 'manual' },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

exchangeRateSchema.index({ from: 1, to: 1, date: -1 });

export const Currency = mongoose.models.Currency || mongoose.model('Currency', currencySchema);
export const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
