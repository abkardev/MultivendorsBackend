import mongoose from 'mongoose';

const { Schema } = mongoose;

const FileSchema = new Schema({
  originalName: { type: String, required: true },
  storageKey: { type: String, required: true },
  category: { type: String, required: true, index: true },
  subCategory: { type: String },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  provider: { type: String, default: 'cloudflare_r2' },
  bucket: { type: String },
  isPublic: { type: Boolean, default: false, index: true },
  isProtected: { type: Boolean, default: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  entityType: { type: String },
  entityId: { type: Schema.Types.ObjectId, index: true },
  metadata: { type: Schema.Types.Mixed },
  checksum: { type: String },
  versions: [{
    storageKey: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: Schema.Types.Mixed,
  }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: Date,
}, { timestamps: true });

FileSchema.index({ vendor: 1, category: 1 });
FileSchema.index({ entityType: 1, entityId: 1 });
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ storageKey: 1 }, { unique: true });
FileSchema.index({ isDeleted: 1, createdAt: -1 });
FileSchema.index({ isPublic: 1, isDeleted: 1 });

const File = mongoose.model('File', FileSchema);
export default File;
