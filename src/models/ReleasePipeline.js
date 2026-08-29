import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  strategy: { type: mongoose.Schema.Types.ObjectId, ref: 'DeploymentStrategy' },
  stages: [{
    name: { type: String },
    type: { type: String },
    status: { type: String },
    order: { type: Number },
    steps: [{
      name: { type: String },
      type: { type: String },
      status: { type: String },
      duration: { type: Number },
      output: { type: Object },
    }],
    startedAt: { type: Date },
    completedAt: { type: Date },
  }],
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'rolled_back'], default: 'pending' },
  version: { type: String },
  artifact: {
    name: { type: String },
    url: { type: String },
    checksum: { type: String },
    size: { type: Number },
  },
  approvals: [{
    user: { type: String },
    role: { type: String },
    status: { type: String },
    comment: { type: String },
    timestamp: { type: Date },
  }],
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ strategy: 1 });
schema.index({ status: 1 });
schema.index({ version: 1 });

export const ReleasePipeline = mongoose.model('ReleasePipeline', schema);
