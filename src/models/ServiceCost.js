import mongoose from 'mongoose';

const serviceCostSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  category: { type: String, required: true },
  amount: { type: Number, required: true },
  usage: { type: Number },
  unit: { type: String },
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  costPerUnit: { type: Number },
  trend: {
    type: String,
    enum: ['increasing', 'decreasing', 'stable'],
    default: 'stable'
  },
}, { timestamps: true, toJSON: { virtuals: true } });

serviceCostSchema.index({ service: 1, trend: 1 });
serviceCostSchema.index({ category: 1, 'period.start': -1 });

export const ServiceCost = mongoose.model('ServiceCost', serviceCostSchema);
