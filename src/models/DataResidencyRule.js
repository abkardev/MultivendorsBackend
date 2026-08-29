import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  dataType: { type: String, enum: ['user', 'transaction', 'analytics', 'logs', 'ai', 'compliance', 'all'], required: true },
  restriction: { type: String, enum: ['must_stay', 'must_not_leave', 'preferred_region', 'require_copy'], required: true },
  enforcement: { type: String, enum: ['strict', 'warning', 'log_only'], default: 'strict' },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ region: 1 });
schema.index({ dataType: 1 });
schema.index({ isActive: 1 });

export const DataResidencyRule = mongoose.model('DataResidencyRule', schema);
