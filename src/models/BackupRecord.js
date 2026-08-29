import mongoose from 'mongoose';

const backupRecordSchema = new mongoose.Schema({
  policy: { type: mongoose.Schema.Types.ObjectId, ref: 'BackupPolicy', required: true },
  type: { type: String, enum: ['database', 'storage', 'configuration', 'scheduler', 'full'], required: true },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'partial', 'verified'],
    default: 'running',
  },
  startedAt: { type: Date, required: true },
  completedAt: Date,
  durationMs: Number,
  sizeBytes: Number,
  compressedSizeBytes: Number,
  filePath: String,
  fileCount: Number,
  checksum: String,
  checksumAlgorithm: { type: String, default: 'sha256' },
  encryptionAlgorithm: String,
  location: String,
  errorMessage: String,
  errorStack: String,
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verificationStatus: { type: String, enum: ['pending', 'passed', 'failed'] },
  retentionCategory: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  expiresAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

backupRecordSchema.index({ policy: 1, createdAt: -1 });
backupRecordSchema.index({ type: 1, createdAt: -1 });
backupRecordSchema.index({ status: 1 });
backupRecordSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const BackupRecord = mongoose.model('BackupRecord', backupRecordSchema);
