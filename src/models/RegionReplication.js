import mongoose from 'mongoose';

const regionReplicationSchema = new mongoose.Schema({
  source: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentRegion' },
  type: { type: String, enum: ['full', 'partial', 'read_only'], default: 'full' },
  status: { type: String, enum: ['active', 'syncing', 'paused', 'failed'], default: 'active' },
  collections: [{ type: String }],
  latency: { type: Number },
  lastSynced: { type: Date },
  lag: { type: Number },
  metadata: { type: Map, of: String },
}, { timestamps: true });

regionReplicationSchema.index({ source: 1, target: 1 }, { unique: true });
regionReplicationSchema.index({ status: 1 });

export const RegionReplication = mongoose.model('RegionReplication', regionReplicationSchema);
