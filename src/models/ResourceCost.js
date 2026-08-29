import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['compute', 'storage', 'database', 'cache', 'network', 'ai', 'other'], required: true },
  category: { type: String, enum: ['fixed', 'variable', 'reserved'], default: 'variable' },
  usage: {
    amount: { type: Number },
    unit: { type: String },
    period: { type: String },
  },
  cost: {
    hourly: { type: Number },
    daily: { type: Number },
    monthly: { type: Number },
    projected: { type: Number },
    currency: { type: String },
  },
  metrics: {
    utilization: { type: Number },
    efficiency: { type: Number },
    waste: { type: Number },
  },
  tags: [{ type: String }],
  period: {
    start: { type: Date },
    end: { type: Date },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ category: 1 });

export const ResourceCost = mongoose.model('ResourceCost', schema);
