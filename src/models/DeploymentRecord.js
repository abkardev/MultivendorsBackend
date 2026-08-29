import mongoose from 'mongoose';

const deploymentRecordSchema = new mongoose.Schema({
  version: { type: String, required: true },
  environment: { type: String, enum: ['development', 'staging', 'production', 'dr'], required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back', 'cancelled'],
    default: 'pending',
  },
  commitId: String,
  branch: String,
  tag: String,
  releaseNotes: String,
  artifacts: [{
    name: String,
    url: String,
    checksum: String,
    size: Number,
  }],
  checks: {
    type: [{
      name: String,
      status: { type: String, enum: ['pending', 'passed', 'failed', 'skipped'] },
      details: String,
      durationMs: Number,
    }],
    default: [],
  },
  rollbackVersion: String,
  rollbackReason: String,
  deployedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deployedAt: Date,
  completedAt: Date,
  durationMs: Number,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

deploymentRecordSchema.index({ environment: 1, createdAt: -1 });
deploymentRecordSchema.index({ status: 1 });
deploymentRecordSchema.index({ version: 1 });

export const DeploymentRecord = mongoose.model('DeploymentRecord', deploymentRecordSchema);
