import mongoose from 'mongoose';

const scalingEventSchema = new mongoose.Schema({
  policy: { type: mongoose.Schema.Types.ObjectId, ref: 'ScalingPolicy' },
  type: { type: String, enum: ['scale_up', 'scale_down', 'simulation'], required: true },
  direction: { type: String, enum: ['up', 'down'] },
  from: { type: Number },
  to: { type: Number },
  reason: { type: String },
  metric: {
    name: { type: String },
    value: { type: Number },
    threshold: { type: Number },
  },
  simulated: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'executed', 'failed', 'rolled_back'], default: 'executed' },
  metadata: { type: Map, of: String },
  triggeredBy: { type: String },
}, { timestamps: true });

scalingEventSchema.index({ policy: 1, createdAt: -1 });
scalingEventSchema.index({ type: 1 });
scalingEventSchema.index({ status: 1 });

export const ScalingEvent = mongoose.model('ScalingEvent', scalingEventSchema);
