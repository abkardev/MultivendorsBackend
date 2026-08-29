import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  value: { type: Number, required: true },
  lowerBound: Number,
  upperBound: Number,
  confidence: Number
}, { _id: false });

const actualSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  value: { type: Number, required: true }
}, { _id: false });

const predictionModelSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'demand', 'supply', 'revenue', 'gmv', 'rfqs', 'orders',
      'subscriptions', 'vendor_churn', 'buyer_churn', 'price_trends',
      'category_growth', 'country_growth', 'industry_growth',
      'supplier_performance', 'risk_trends', 'marketplace_health'
    ],
    required: true
  },
  metric: { type: String, required: true },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual'],
    required: true
  },
  predictions: [predictionSchema],
  actuals: [actualSchema],
  accuracy: Number,
  lastTrained: Date,
  trainingDataRange: {
    start: Date,
    end: Date
  },
  modelVersion: String,
  status: {
    type: String,
    enum: ['active', 'training', 'retired'],
    default: 'active'
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

predictionModelSchema.index({ type: 1, period: 1 }, { unique: true });
predictionModelSchema.index({ status: 1 });

export const PredictionModel = mongoose.model('PredictionModel', predictionModelSchema);
