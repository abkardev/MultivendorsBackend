import mongoose from 'mongoose';

const enterpriseInsightSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['executive', 'marketplace', 'seller', 'buyer', 'operations', 'financial', 'ai'],
    required: true,
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String },
  severity: {
    type: String,
    enum: ['info', 'important', 'critical'],
    default: 'info',
  },
  confidence: { type: Number, min: 0, max: 100 },
  evidence: [{
    metric: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    change: { type: mongoose.Schema.Types.Mixed },
    direction: { type: String, enum: ['up', 'down', 'flat'] },
  }],
  relatedMetrics: [{
    name: { type: String },
    value: { type: mongoose.Schema.Types.Mixed },
    change: { type: mongoose.Schema.Types.Mixed },
  }],
  supportingData: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'dismissed', 'resolved'],
    default: 'active',
  },
  generatedAt: { type: Date },
  expiresAt: { type: Date },
  tags: [{ type: String }],
}, { timestamps: true, toJSON: { virtuals: true } });

enterpriseInsightSchema.index({ type: 1, status: 1 });
enterpriseInsightSchema.index({ severity: 1, status: 1 });
enterpriseInsightSchema.index({ generatedAt: -1 });
enterpriseInsightSchema.index({ tags: 1 });
enterpriseInsightSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const EnterpriseInsight = mongoose.model('EnterpriseInsight', enterpriseInsightSchema);
