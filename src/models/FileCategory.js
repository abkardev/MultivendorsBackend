import mongoose from 'mongoose';

const fileCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  labelAr: { type: String },
  description: { type: String },
  descriptionAr: { type: String },
  path: { type: String, required: true },
  parent: { type: String },
  isPublic: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  maxFileSize: { type: Number, default: 10 * 1024 * 1024 },
  allowedMimeTypes: [{ type: String }],
  allowedExtensions: [{ type: String }],
  requiresVendor: { type: Boolean, default: false },
  requiresVerification: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

fileCategorySchema.index({ parent: 1, sortOrder: 1 });
fileCategorySchema.index({ isActive: 1 });

const FileCategory = mongoose.model('FileCategory', fileCategorySchema);
export default FileCategory;
