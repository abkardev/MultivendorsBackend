import mongoose from 'mongoose';

const { Schema } = mongoose;

const SignedUrlSchema = new Schema({
  file: { type: Schema.Types.ObjectId, ref: 'File', required: true, index: true },
  token: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  maxDownloads: { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['view', 'download', 'share'], default: 'view' },
  isRevoked: { type: Boolean, default: false },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

SignedUrlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SignedUrlSchema.index({ token: 1, isRevoked: 1 });
SignedUrlSchema.index({ file: 1, isRevoked: 1 });

const SignedUrl = mongoose.model('SignedUrl', SignedUrlSchema);
export default SignedUrl;
