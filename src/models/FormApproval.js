import mongoose from 'mongoose';

const formApprovalSchema = new mongoose.Schema({
  submission: { type: mongoose.Schema.Types.ObjectId, ref: 'FormSubmission', required: true },
  approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  comment: String,
  signedAt: Date,
  signature: String,
}, { timestamps: true, toJSON: { virtuals: true } });

formApprovalSchema.index({ submission: 1 });
formApprovalSchema.index({ approver: 1, status: 1 });
formApprovalSchema.index({ submission: 1, approver: 1 }, { unique: true });

export const FormApproval = mongoose.model('FormApproval', formApprovalSchema);
