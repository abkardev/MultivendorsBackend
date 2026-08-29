import mongoose from 'mongoose';

const resourceUsageSchema = new mongoose.Schema({
  resource: {
    type: String,
    enum: ['memory', 'cpu', 'disk', 'network'],
    required: true,
    index: true
  },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  usage: { type: Number, min: 0, max: 100, required: true },
  limit: { type: Number },
  process: { type: String },
  host: { type: String, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

resourceUsageSchema.index({ resource: 1, host: 1, timestamp: -1 });

export const ResourceUsage = mongoose.model('ResourceUsage', resourceUsageSchema);
