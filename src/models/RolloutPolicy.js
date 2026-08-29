import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  pipeline: { type: mongoose.Schema.Types.ObjectId, ref: 'ReleasePipeline' },
  type: { type: String, enum: ['automatic', 'manual', 'scheduled', 'feature_flagged'], default: 'automatic' },
  rules: [{
    condition: { type: String },
    action: { type: String },
    value: { type: Object },
  }],
  schedule: {
    startTime: { type: Date },
    endTime: { type: Date },
    timezone: { type: String },
  },
  targets: [{
    type: { type: String },
    value: { type: String },
    percentage: { type: Number },
  }],
  rollbackCriteria: [{
    metric: { type: String },
    operator: { type: String },
    threshold: { type: Number },
    action: { type: String },
  }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ pipeline: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const RolloutPolicy = mongoose.model('RolloutPolicy', schema);
