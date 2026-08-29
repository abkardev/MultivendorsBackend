import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  sourceVersion: { type: String, required: true },
  targetVersion: { type: String, required: true },
  status: {
    type: String,
    enum: ['compatible', 'incompatible', 'requires_upgrade', 'unknown'],
    default: 'unknown',
  },
  modules: [{
    name: { type: String },
    sourceVersion: { type: String },
    targetVersion: { type: String },
    compatible: { type: Boolean },
    issues: [{ type: String }],
    resolution: { type: String },
  }],
  issues: [{
    module: { type: String },
    severity: { type: String },
    type: { type: String },
    message: { type: String },
    resolution: { type: String },
    automated: { type: Boolean },
  }],
  summary: {
    total: { type: Number },
    compatible: { type: Number },
    incompatible: { type: Number },
    warnings: { type: Number },
    blockers: { type: Number },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ sourceVersion: 1, targetVersion: 1 }, { unique: true });
schema.index({ sourceVersion: 1 });
schema.index({ targetVersion: 1 });
schema.index({ status: 1 });

export const CompatibilityReport = mongoose.model('CompatibilityReport', schema);
