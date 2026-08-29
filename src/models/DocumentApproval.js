import mongoose from 'mongoose';

const documentApprovalSchema = new mongoose.Schema({
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  version: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comment: String,
  signedAt: Date,
}, { timestamps: true, toJSON: { virtuals: true } });

documentApprovalSchema.index({ document: 1, status: 1 });
documentApprovalSchema.index({ approver: 1, status: 1 });
documentApprovalSchema.index({ document: 1, version: 1 });

export const DocumentApproval = mongoose.model('DocumentApproval', documentApprovalSchema);
