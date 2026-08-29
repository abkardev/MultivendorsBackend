import mongoose from 'mongoose';

const documentVerificationFileSchema = new mongoose.Schema({
  file: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  documentType: {
    type: String,
    required: true,
    enum: ['commercial-registration', 'tax-certificate', 'factory-license', 'iso-certificate', 'vat-certificate', 'national-address', 'bank-document', 'other'],
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'submitted', 'under-review', 'verified', 'rejected', 'expired'],
    default: 'pending',
  },
  verificationNotes: { type: String },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  expiresAt: { type: Date },
  rejectionReason: { type: String },
  resubmittedAt: { type: Date },
  resubmissionCount: { type: Number, default: 0 },
  isCurrent: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

documentVerificationFileSchema.index({ vendor: 1, documentType: 1, isCurrent: 1 });
documentVerificationFileSchema.index({ status: 1, expiresAt: 1 });

const DocumentVerificationFile = mongoose.model('DocumentVerificationFile', documentVerificationFileSchema);
documentVerificationFileSchema.index({ vendor: 1, status: 1 });
documentVerificationFileSchema.index({ file: 1 });

export default DocumentVerificationFile;
