import mongoose from 'mongoose';

const sellerDocumentSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['certificate', 'catalog', 'brochure', 'company_profile', 'product_manual',
      'compliance', 'warranty', 'iso_certificate', 'export_document', 'other'],
    required: true,
  },
  description: String,
  fileUrl: { type: String, required: true },
  fileSize: Number,
  mimeType: String,
  version: { type: Number, default: 1 },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: Date,
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  tags: [String],
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

sellerDocumentSchema.index({ vendor: 1, type: 1 });
sellerDocumentSchema.index({ vendor: 1, expiresAt: 1 });
sellerDocumentSchema.index({ vendor: 1, isActive: 1 });

export const SellerDocument = mongoose.model('SellerDocument', sellerDocumentSchema);
