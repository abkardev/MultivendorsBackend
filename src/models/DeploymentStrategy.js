import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['blue_green', 'canary', 'rolling', 'recreate', 'progressive'], required: true },
  description: { type: String },
  parameters: {
    canaryPercent: { type: Number },
    canarySteps: [{ type: Number }],
    warmupTime: { type: Number },
    cooldownTime: { type: Number },
    healthCheckInterval: { type: Number },
    maxSurge: { type: Number },
    maxUnavailable: { type: Number },
    failureThreshold: { type: Number },
    rolloutDuration: { type: Number },
  },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const DeploymentStrategy = mongoose.model('DeploymentStrategy', schema);
