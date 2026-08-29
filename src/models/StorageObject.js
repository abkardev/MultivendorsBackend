import mongoose from 'mongoose';

const storageObjectSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true, unique: true },
  category: { type: String, required: true, index: true },
  subCategory: { type: String, required: true, index: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  provider: { type: String, default: 'cloudflare_r2', index: true },
  bucket: { type: String, required: true },
  isPublic: { type: Boolean, default: false, index: true },
  isProtected: { type: Boolean, default: true },
  checksum: { type: String },
  etag: { type: String },
  version: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  entityType: { type: String, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  storageClass: { type: String, default: 'standard' },
  encryptionStatus: { type: String, enum: ['encrypted', 'unencrypted', 'pending'], default: 'unencrypted' },
  scanStatus: { type: String, enum: ['pending', 'scanning', 'clean', 'infected', 'skipped'], default: 'pending' },
  scanResult: { type: mongoose.Schema.Types.Mixed },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  versions: [{
    storageKey: String,
    size: Number,
    checksum: String,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

storageObjectSchema.index({ vendor: 1, category: 1 });
storageObjectSchema.index({ entityType: 1, entityId: 1 });
storageObjectSchema.index({ uploadedBy: 1, createdAt: -1 });
storageObjectSchema.index({ scanStatus: 1 });
storageObjectSchema.index({ isDeleted: 1, createdAt: -1 });

const StorageObject = mongoose.model('StorageObject', storageObjectSchema);
export default StorageObject;
