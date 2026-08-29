import mongoose from 'mongoose';

const businessForecastSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['revenue', 'orders', 'growth', 'demand', 'supplier_performance', 'product_demand', 'category_trend'],
    required: true,
  },
  entityType: { type: String },
  entityId: { type: String },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  values: [{
    date: { type: Date },
    predicted: { type: Number },
    lower: { type: Number },
    upper: { type: Number },
    actual: { type: Number },
  }],
  confidence: { type: Number, min: 0, max: 100 },
  method: {
    type: String,
    enum: ['moving_average', 'trend_analysis', 'seasonality'],
    default: 'trend_analysis',
  },
  seasonality: {
    period: Number,
    amplitude: Number,
    phase: Number,
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'stable', 'cyclical'],
    default: 'stable',
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  generatedAt: { type: Date },
}, { timestamps: true, toJSON: { virtuals: true } });

businessForecastSchema.index({ type: 1, 'period.start': -1 });
businessForecastSchema.index({ entityType: 1, entityId: 1 });
businessForecastSchema.index({ generatedAt: -1 });

export const BusinessForecast = mongoose.model('BusinessForecast', businessForecastSchema);
