import mongoose from 'mongoose';

const performanceProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['api', 'database', 'memory', 'cpu', 'render', 'bundle'], required: true },
  endpoint: { type: String },
  method: { type: String },
  duration: { type: Number, default: 0 },
  threshold: { type: Number },
  unit: { type: String, default: 'ms' },
  metadata: { type: Map, of: String },
  tags: [{ type: String }],
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: true });

performanceProfileSchema.index({ type: 1 });
performanceProfileSchema.index({ name: 1 });

export const PerformanceProfile = mongoose.model('PerformanceProfile', performanceProfileSchema);
