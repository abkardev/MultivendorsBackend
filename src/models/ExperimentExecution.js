import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ChaosExperiment' },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'stopped'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  scenarios: [{
    name: { type: String },
    status: { type: String },
    duration: { type: Number },
    impact: { type: Object },
  }],
  metrics: {
    baseline: { type: Object },
    during: { type: Object },
    recovery: { type: Object },
    comparison: { type: Object },
  },
  results: {
    successRate: { type: Number },
    avgLatencyImpact: { type: Number },
    errorRateImpact: { type: Number },
    servicesStable: { type: Boolean },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ experiment: 1 });
schema.index({ status: 1 });
schema.index({ createdAt: -1 });

export const ExperimentExecution = mongoose.model('ExperimentExecution', schema);
