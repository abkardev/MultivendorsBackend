import mongoose from 'mongoose';

const backupPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['database', 'storage', 'configuration', 'scheduler', 'full'], required: true },
  description: String,
  schedule: {
    cron: { type: String, required: true },
    timezone: { type: String, default: 'UTC' },
  },
  retention: {
    daily: { type: Number, default: 7 },
    weekly: { type: Number, default: 4 },
    monthly: { type: Number, default: 3 },
    yearly: { type: Number, default: 1 },
  },
  destination: {
    type: { type: String, enum: ['local', 's3', 'cloudflare_r2', 'gcs', 'azure'], default: 'local' },
    bucket: String,
    path: String,
    region: String,
    endpoint: String,
  },
  encryption: {
    enabled: { type: Boolean, default: false },
    algorithm: { type: String, default: 'aes-256-gcm' },
    keyId: String,
  },
  compression: {
    enabled: { type: Boolean, default: true },
    algorithm: { type: String, enum: ['gzip', 'zstd'], default: 'gzip' },
  },
  notification: {
    onSuccess: { type: Boolean, default: false },
    onFailure: { type: Boolean, default: true },
    channels: [{ type: String, enum: ['email', 'slack', 'sms'] }],
  },
  lastBackupAt: Date,
  lastBackupStatus: { type: String, enum: ['success', 'failed', 'never'], default: 'never' },
  lastBackupSize: Number,
  totalBackups: { type: Number, default: 0 },
  totalSizeBytes: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

backupPolicySchema.index({ type: 1, isActive: 1 });

export const BackupPolicy = mongoose.model('BackupPolicy', backupPolicySchema);
