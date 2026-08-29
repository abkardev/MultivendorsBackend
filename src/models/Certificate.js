import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  name: { type: String },
  issuer: { type: String },
  type: { type: String },
  number: { type: String },
  fileUrl: { type: String },
  issuedAt: { type: Date },
  expiresAt: { type: Date },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  status: { type: String, enum: ['active', 'expired', 'revoked', 'pending'], default: 'pending' },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ vendor: 1 });
schema.index({ company: 1 });
schema.index({ status: 1 });
schema.index({ expiresAt: 1 });
schema.index({ isActive: 1 });

export const Certificate = mongoose.model('Certificate', schema);
