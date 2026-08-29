import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  domain: { type: String, required: true, unique: true },
  brand: { type: mongoose.Schema.Types.ObjectId, ref: 'WhiteLabelBrand', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  verificationStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
  verificationToken: { type: String },
  sslStatus: { type: String, enum: ['pending', 'active', 'failed'], default: 'pending' },
  sslProvider: { type: String },
  sslExpiry: { type: Date },
  dnsRecords: [{
    type: { type: String },
    name: { type: String },
    value: { type: String },
    status: { type: String },
    verified: { type: Boolean },
    verifiedAt: { type: Date },
  }],
  isPrimary: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastVerifiedAt: { type: Date },
  errorMessage: { type: String },
  metadata: { type: Map, of: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ domain: 1 });
schema.index({ brand: 1 });
schema.index({ tenant: 1 });
schema.index({ verificationStatus: 1 });
schema.index({ sslStatus: 1 });
schema.index({ isPrimary: 1 });
schema.index({ isActive: 1 });

export const CustomDomain = mongoose.model('CustomDomain', schema);
