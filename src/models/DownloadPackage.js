import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  type: {
    type: String,
    enum: ['full', 'update', 'patch', 'plugin', 'theme', 'documentation', 'sample_data'],
    required: true,
  },
  platform: {
    type: String,
    enum: ['linux', 'windows', 'macos', 'docker', 'source'],
    default: 'docker',
  },
  fileUrl: { type: String },
  fileSize: { type: Number },
  checksum: { type: String },
  checksumType: { type: String, default: 'sha256' },
  releaseNotes: { type: String },
  isActive: { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1, version: 1, platform: 1 }, { unique: true });
schema.index({ name: 1 });
schema.index({ version: 1 });
schema.index({ type: 1 });
schema.index({ platform: 1 });
schema.index({ isActive: 1 });

export const DownloadPackage = mongoose.model('DownloadPackage', schema);
