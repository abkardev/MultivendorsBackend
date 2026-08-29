import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  certifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductionCertification' }],
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  overallScore: { type: Number },
  overallPercentage: { type: Number },
  readinessLevel: { type: String, enum: ['not_ready', 'partially_ready', 'ready', 'fully_ready'] },
  categoryScores: {
    scalability: { type: Number },
    reliability: { type: Number },
    availability: { type: Number },
    performance: { type: Number },
    security: { type: Number },
    monitoring: { type: Number },
    operations: { type: Number },
    compliance: { type: Number },
  },
  blockingIssues: [{ type: String }],
  recommendations: [{ type: String }],
  assessedAt: { type: Date, default: Date.now },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ readinessLevel: 1 });
schema.index({ assessedAt: -1 });

export const ReadinessAssessment = mongoose.model('ReadinessAssessment', schema);
