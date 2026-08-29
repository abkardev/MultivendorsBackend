import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['gdpr', 'ccpa', 'hipaa', 'sox', 'pci', 'internal', 'custom'], required: true },
  status: { type: String, enum: ['draft', 'active', 'review', 'non_compliant'], default: 'draft' },
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  rules: [{
    name: { type: String },
    description: { type: String },
    category: { type: String },
    required: { type: Boolean },
    compliant: { type: Boolean },
    evidence: { type: String },
    lastChecked: { type: Date },
  }],
  dataCategories: [{ type: String }],
  retentionPeriods: {
    default: { type: Number },
    audit: { type: Number },
    analytics: { type: Number },
    userData: { type: Number },
    transactions: { type: Number },
    logs: { type: Number },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ region: 1 });

export const ComplianceProfile = mongoose.model('ComplianceProfile', schema);
