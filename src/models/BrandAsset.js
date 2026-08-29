import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'WhiteLabelBrand', required: true },
  type: {
    type: String,
    enum: ['logo', 'favicon', 'background', 'icon', 'banner', 'screenshot', 'document', 'email_template', 'pdf_template', 'other'],
    required: true,
  },
  url: { type: String, required: true },
  fileSize: { type: Number },
  mimeType: { type: String },
  dimensions: {
    width: { type: Number },
    height: { type: Number },
  },
  isPublic: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  tags: [{ type: String }],
  metadata: { type: Map, of: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.index({ brand: 1 });
schema.index({ type: 1 });
schema.index({ brand: 1, type: 1 });
schema.index({ isPublic: 1 });

export const BrandAsset = mongoose.model('BrandAsset', schema);
