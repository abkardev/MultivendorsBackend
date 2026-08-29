import mongoose from 'mongoose';

const scalingPolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['horizontal', 'vertical', 'automatic', 'scheduled'], required: true },
  target: { type: String, enum: ['worker', 'queue', 'service', 'database'], required: true },
  metric: { type: String, enum: ['cpu', 'memory', 'latency', 'throughput', 'queue_depth', 'error_rate', 'concurrent_users'], required: true },
  minInstances: { type: Number, default: 1 },
  maxInstances: { type: Number, default: 10 },
  targetValue: { type: Number },
  cooldownPeriod: { type: Number, default: 300 },
  scaleUpThreshold: { type: Number },
  scaleDownThreshold: { type: Number },
  scaleUpBy: { type: Number, default: 1 },
  scaleDownBy: { type: Number, default: 1 },
  schedule: {
    enabled: { type: Boolean },
    cronUp: { type: String },
    cronDown: { type: String },
    timezone: { type: String },
  },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

scalingPolicySchema.index({ type: 1, target: 1 });
scalingPolicySchema.index({ isActive: 1 });
scalingPolicySchema.index({ createdBy: 1 });

export const ScalingPolicy = mongoose.model('ScalingPolicy', scalingPolicySchema);
