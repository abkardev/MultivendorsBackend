import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  type: {
    type: String,
    enum: ['production', 'security', 'performance', 'deployment', 'compliance', 'marketplace'],
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'completed', 'failed'],
    default: 'draft',
  },
  score: { type: Number },
  maxScore: { type: Number },
  percentage: { type: Number },
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
    type: { type: String },
    priority: { type: String },
    message: { type: String },
    action: { type: String },
    category: { type: String },
  }],
  blockingIssues: [{
    severity: { type: String },
    message: { type: String },
    module: { type: String },
    remediation: { type: String },
  }],
  generatedAt: { type: Date },
  expiresAt: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1, type: 1 }, { unique: true });
schema.index({ tenant: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });

export const CertificationReport = mongoose.model('CertificationReport', schema);
