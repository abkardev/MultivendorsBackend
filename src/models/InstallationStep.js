import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  installation: { type: mongoose.Schema.Types.ObjectId, ref: 'InstallationRecord', required: true },
  name: { type: String, required: true },
  description: { type: String },
  order: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'], default: 'pending' },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  error: { type: String },
  result: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ installation: 1 });
schema.index({ installation: 1, order: 1 });
schema.index({ status: 1 });

export const InstallationStep = mongoose.model('InstallationStep', schema);
