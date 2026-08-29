import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ChaosExperiment' },
  name: { type: String, required: true },
  type: { type: String, required: true },
  target: { type: String, required: true },
  action: { type: String, required: true },
  parameters: { type: Object },
  expectedImpact: { type: String },
  actualImpact: { type: String },
  status: { type: String, enum: ['pending', 'injected', 'recovered', 'failed'], default: 'pending' },
  startedAt: { type: Date },
  recoveredAt: { type: Date },
  duration: { type: Number },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ experiment: 1 });
schema.index({ name: 1 });
schema.index({ status: 1 });

export const FailureScenario = mongoose.model('FailureScenario', schema);
