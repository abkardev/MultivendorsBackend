import mongoose from 'mongoose';

const salesForecastSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  metrics: {
    revenue: { forecast: Number, actual: Number, variance: Number },
    orders: { forecast: Number, actual: Number, variance: Number },
    rfqs: { forecast: Number, actual: Number, variance: Number },
    conversion: { forecast: Number, actual: Number, variance: Number },
    demand: { forecast: Number, actual: Number, variance: Number },
  },
  productForecasts: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    revenue: { forecast: Number, actual: Number },
    units: { forecast: Number, actual: Number },
  }],
  confidence: { type: Number, min: 0, max: 100, default: 70 },
  methodology: { type: String, enum: ['historical', 'ai', 'manual'], default: 'historical' },
  notes: String,
  calculatedAt: { type: Date },
}, { timestamps: true });

salesForecastSchema.index({ vendor: 1, type: 1, periodStart: -1 });

export const SalesForecast = mongoose.model('SalesForecast', salesForecastSchema);
