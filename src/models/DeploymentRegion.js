import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const deploymentRegionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  provider: { type: String, enum: ['aws', 'azure', 'gcp', 'digitalocean', 'oracle', 'private'], default: 'private' },
  status: { type: String, enum: ['active', 'inactive', 'degraded'], default: 'active' },
  priority: { type: Number, default: 0 },
  isPreferred: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  capabilities: [{ type: String }],
  latency: {
    p50: { type: Number },
    p95: { type: Number },
    p99: { type: Number },
  },
  metadata: { type: Map, of: String },
}, { timestamps: true });

deploymentRegionSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

deploymentRegionSchema.index({ code: 1 });
deploymentRegionSchema.index({ provider: 1, status: 1 });
deploymentRegionSchema.index({ isActive: 1, priority: -1 });

export const DeploymentRegion = mongoose.model('DeploymentRegion', deploymentRegionSchema);
