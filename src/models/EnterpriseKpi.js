import mongoose from 'mongoose';

const enterpriseKpiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['operational', 'financial', 'marketplace', 'seller', 'buyer', 'ai'],
    required: true,
    index: true
  },
  value: { type: Number, required: true },
  target: { type: Number },
  previousValue: { type: Number },
  unit: { type: String },
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  variance: { type: Number },
  status: {
    type: String,
    enum: ['on_track', 'at_risk', 'critical', 'exceeded'],
    default: 'on_track'
  },
  tags: [{ type: String }],
}, { timestamps: true, toJSON: { virtuals: true } });

enterpriseKpiSchema.index({ name: 1, 'period.start': -1 });
enterpriseKpiSchema.index({ status: 1, category: 1 });

export const EnterpriseKpi = mongoose.model('EnterpriseKpi', enterpriseKpiSchema);
