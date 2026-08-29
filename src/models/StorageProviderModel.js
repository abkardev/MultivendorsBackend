import mongoose from 'mongoose';

const storageProviderSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: {
    type: String,
    required: true,
    enum: ['cloudflare_r2', 's3', 'gcs', 'azure_blob', 'bunnycdn'],
  },
  isActive: { type: Boolean, default: false, index: true },
  isDefault: { type: Boolean, default: false },
  config: {
    endpoint: { type: String },
    region: { type: String },
    bucket: { type: String },
    publicBucket: { type: String },
    protectedBucket: { type: String },
    accessKeyId: { type: String },
    secretAccessKey: { type: String },
    publicUrl: { type: String },
    cdnUrl: { type: String },
  },
  capabilities: {
    upload: { type: Boolean, default: true },
    download: { type: Boolean, default: true },
    delete: { type: Boolean, default: true },
    signedUrls: { type: Boolean, default: false },
    publicUrls: { type: Boolean, default: false },
    versioning: { type: Boolean, default: false },
    encryption: { type: Boolean, default: false },
  },
  metrics: {
    totalFiles: { type: Number, default: 0 },
    totalStorage: { type: Number, default: 0 },
    lastCheckAt: { type: Date },
  },
  priority: { type: Number, default: 0 },
  notes: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

storageProviderSchema.index({ type: 1, isActive: 1 });
storageProviderSchema.index({ isDefault: 1 });

const StorageProviderModel = mongoose.model('StorageProvider', storageProviderSchema);
export default StorageProviderModel;
