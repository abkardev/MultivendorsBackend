import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  type: { type: String, enum: ['document', 'certification', 'age', 'region', 'industry', 'custom'] },
  entityType: { type: String, enum: ['company', 'supplier', 'buyer', 'product'] },
  condition: {
    field: { type: String },
    operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'] },
    value: { type: mongoose.Schema.Types.Mixed }
  },
  action: { type: String, enum: ['flag', 'reject', 'restrict', 'review', 'approve'] },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ type: 1 });
schema.index({ entityType: 1 });
schema.index({ action: 1 });
schema.index({ severity: 1 });
schema.index({ isActive: 1 });

export const ComplianceRule = mongoose.model('ComplianceRule', schema);
