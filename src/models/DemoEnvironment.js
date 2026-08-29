import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  status: {
    type: String,
    enum: ['creating', 'ready', 'active', 'expired', 'deleted'],
    default: 'creating',
  },
  type: {
    type: String,
    enum: ['onboarding', 'evaluation', 'training', 'presentation'],
    default: 'evaluation',
  },
  dataset: { type: mongoose.Schema.Types.ObjectId, ref: 'DemoDataset' },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date },
  accessUrl: { type: String },
  accessCredentials: {
    username: { type: String },
    password: { type: String },
    apiKey: { type: String },
  },
  configuration: {
    features: [{ type: String }],
    sampleData: { type: Boolean },
    aiEnabled: { type: Boolean },
    analyticsEnabled: { type: Boolean },
  },
  isIsolated: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ tenant: 1 });
schema.index({ status: 1 });
schema.index({ type: 1 });
schema.index({ expiresAt: 1 });

export const DemoEnvironment = mongoose.model('DemoEnvironment', schema);
