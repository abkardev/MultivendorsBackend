import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['scalability', 'reliability', 'availability', 'performance', 'security', 'monitoring', 'operations', 'compliance'], required: true },
  status: { type: String, enum: ['draft', 'in_progress', 'completed', 'failed'], default: 'draft' },
  score: { type: Number },
  maxScore: { type: Number },
  percentage: { type: Number },
  readiness: { type: String, enum: ['not_ready', 'partially_ready', 'ready', 'fully_ready'], default: 'not_ready' },
  checks: [{
    name: { type: String },
    category: { type: String },
    status: { type: String },
    score: { type: Number },
    maxScore: { type: Number },
    evidence: { type: String },
    recommendation: { type: String },
    blocking: { type: Boolean },
    details: { type: Object },
  }],
  summary: {
    total: { type: Number },
    passed: { type: Number },
    failed: { type: Number },
    warnings: { type: Number },
    blockers: { type: Number },
  },
  recommendations: [{
    priority: { type: String },
    category: { type: String },
    message: { type: String },
    action: { type: String },
  }],
  blockingIssues: [{
    severity: { type: String },
    message: { type: String },
    module: { type: String },
    remediation: { type: String },
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const ProductionCertification = mongoose.model('ProductionCertification', schema);
