import mongoose from 'mongoose';

const sellerDocumentVersionSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerDocument', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  version: { type: Number, required: true },
  fileUrl: { type: String, required: true },
  fileSize: Number,
  mimeType: String,
  changes: String,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

sellerDocumentVersionSchema.index({ document: 1, version: -1 });

export const SellerDocumentVersion = mongoose.model('SellerDocumentVersion', sellerDocumentVersionSchema);
