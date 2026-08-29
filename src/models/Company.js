import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  legalName: { type: String },
  registrationNumber: { type: String },
  taxId: { type: String },
  type: { type: String, enum: ['supplier', 'buyer', 'both'] },
  status: { type: String, enum: ['active', 'suspended', 'verified', 'pending', 'rejected'], default: 'pending' },
  country: { type: String },
  city: { type: String },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  industry: { type: String },
  size: { type: String, enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'] },
  foundedYear: { type: Number },
  description: { type: String },
  logo: { type: String },
  documents: [{
    type: { type: String },
    url: { type: String },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  }],
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
  tags: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ isActive: 1 });

export const Company = mongoose.model('Company', schema);
