import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  type: { type: String, enum: ['company', 'supplier', 'buyer', 'document'] },
  status: { type: String, enum: ['pending', 'in_review', 'approved', 'rejected', 'expired'], default: 'pending' },
  documents: [{
    type: { type: String },
    url: { type: String },
    verified: { type: Boolean, default: false },
    notes: { type: String }
  }],
  notes: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  expiresAt: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ company: 1 });
schema.index({ vendor: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ assignedTo: 1 });
schema.index({ isActive: 1 });

export const VerificationRequest = mongoose.model('VerificationRequest', schema);
