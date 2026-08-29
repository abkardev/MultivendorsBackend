import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  version: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['schema', 'data', 'configuration', 'index'], required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'rolled_back'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  affectedDocuments: { type: Number },
  error: { type: String },
  rollbackSteps: [{
    name: { type: String },
    description: { type: String },
    script: { type: String },
  }],
  checksum: { type: String },
  metadata: { type: Map, of: String },
  executedBy: { type: String },
}, { timestamps: true });

schema.index({ version: 1 });
schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ version: 1, name: 1 }, { unique: true });

export const MigrationHistory = mongoose.model('MigrationHistory', schema);
