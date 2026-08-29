import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  installationId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'], default: 'pending' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  version: { type: String },
  edition: { type: String },
  features: [{ type: String }],
  steps: [{
    name: { type: String },
    status: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: { type: String },
    duration: { type: Number },
  }],
  currentStep: { type: Number, default: 0 },
  totalSteps: { type: Number },
  environment: {
    nodeVersion: { type: String },
    mongodbVersion: { type: String },
    redisVersion: { type: String },
    platform: { type: String },
    arch: { type: String },
    os: { type: String },
  },
  configuration: {
    mongodbUri: { type: String },
    redisUrl: { type: String },
    smtpHost: { type: String },
    smtpPort: { type: Number },
    storageProvider: { type: String },
    aiProvider: { type: String },
    aiApiKey: { type: String },
  },
  adminUser: {
    email: { type: String },
    name: { type: String },
    password: { type: String },
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  failedAt: { type: Date },
  errorMessage: { type: String },
  errorStack: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ installationId: 1 });
schema.index({ status: 1 });
schema.index({ tenant: 1 });

export const InstallationRecord = mongoose.model('InstallationRecord', schema);
