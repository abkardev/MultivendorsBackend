import mongoose from 'mongoose';

const regionPolicySchema = new mongoose.Schema({
  region: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  name: { type: String, required: true },
  type: { type: String, enum: ['routing', 'failover', 'data_residency', 'compliance'], required: true },
  rules: [{
    condition: { type: String },
    action: { type: String },
    priority: { type: Number },
    active: { type: Boolean },
  }],
  failoverPriority: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' }],
  readPreference: { type: String, enum: ['primary', 'secondary', 'nearest', 'local'], default: 'primary' },
  writeRegion: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

regionPolicySchema.index({ region: 1, type: 1 });
regionPolicySchema.index({ isActive: 1 });

export const RegionPolicy = mongoose.model('RegionPolicy', regionPolicySchema);
