import mongoose from 'mongoose';

const infrastructureCostSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['compute', 'storage', 'network', 'database', 'cache', 'bandwidth', 'ai'],
    required: true,
    index: true
  },
  provider: { type: String, required: true },
  service: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  tags: [{ type: String }],
  breakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

infrastructureCostSchema.index({ category: 1, timestamp: -1 });
infrastructureCostSchema.index({ provider: 1, timestamp: -1 });

export const InfrastructureCost = mongoose.model('InfrastructureCost', infrastructureCostSchema);
