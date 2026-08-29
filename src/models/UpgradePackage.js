import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  fromVersion: { type: String, required: true },
  toVersion: { type: String, required: true },
  packageFile: { type: String },
  checksum: { type: String },
  size: { type: Number },
  status: { type: String, enum: ['pending', 'downloaded', 'validated', 'installing', 'completed', 'failed', 'rolled_back'], default: 'pending' },
  steps: [{
    name: { type: String },
    type: { type: String },
    status: { type: String },
    order: { type: Number },
    script: { type: String },
    rollbackScript: { type: String },
    duration: { type: Number },
  }],
  prerequisites: [{
    name: { type: String },
    met: { type: Boolean },
    message: { type: String },
  }],
  compatibilityIssues: [{
    module: { type: String },
    severity: { type: String },
    message: { type: String },
    resolution: { type: String },
  }],
  dryRunResults: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ status: 1 });
schema.index({ fromVersion: 1, toVersion: 1 });

export const UpgradePackage = mongoose.model('UpgradePackage', schema);
