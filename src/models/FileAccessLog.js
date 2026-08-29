import mongoose from 'mongoose';

const { Schema } = mongoose;

const FileAccessLogSchema = new Schema({
  file: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
  action: { type: String, enum: ['upload', 'download', 'view', 'delete', 'signed_url_generated', 'share', 'update'], required: true },
  accessedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['user', 'vendor', 'admin'] },
  ipAddress: { type: String },
  userAgent: { type: String },
  signedUrlExpiresAt: Date,
  success: { type: Boolean, default: true },
  errorMessage: String,
  duration: Number,
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

FileAccessLogSchema.index({ file: 1, createdAt: -1 });
FileAccessLogSchema.index({ accessedBy: 1, createdAt: -1 });
FileAccessLogSchema.index({ action: 1, createdAt: -1 });
FileAccessLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const FileAccessLog = mongoose.model('FileAccessLog', FileAccessLogSchema);
export default FileAccessLog;
