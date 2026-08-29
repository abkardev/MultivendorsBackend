import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  service: { type: String },
  severity: { type: String, enum: ['critical', 'major', 'minor', 'warning'], required: true },
  status: { type: String, enum: ['detected', 'investigating', 'mitigating', 'resolved', 'post_mortem'], default: 'detected' },
  rootCause: { type: String },
  impact: {
    usersAffected: { type: Number },
    requestsAffected: { type: Number },
    duration: { type: Number },
    errorRate: { type: Number },
  },
  timeline: [{
    timestamp: { type: Date },
    action: { type: String },
    user: { type: String },
    description: { type: String },
  }],
  resolution: {
    resolvedAt: { type: Date },
    resolution: { type: String },
    workaround: { type: String },
  },
  slaImpact: {
    breached: { type: Boolean },
    slaType: { type: String },
    breachDuration: { type: Number },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ title: 1 });
schema.index({ service: 1 });
schema.index({ severity: 1 });
schema.index({ status: 1 });
schema.index({ createdAt: -1 });

export const ReliabilityIncident = mongoose.model('ReliabilityIncident', schema);
