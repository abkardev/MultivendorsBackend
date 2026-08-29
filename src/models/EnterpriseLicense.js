import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const schema = new mongoose.Schema({
  licenseKey: { type: String, required: true, unique: true },
  type: { type: String, enum: ['trial', 'subscription', 'lifetime', 'enterprise', 'development'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'expired', 'revoked', 'suspended'], default: 'active' },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  organization: { type: String },
  contactName: { type: String },
  contactEmail: { type: String },
  contactPhone: { type: String },
  maxSeats: { type: Number },
  maxDevices: { type: Number },
  features: [{ type: String }],
  edition: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  trialEndDate: { type: Date },
  gracePeriodEnd: { type: Date },
  autoRenew: { type: Boolean, default: false },
  lastValidated: { type: Date },
  validationCount: { type: Number, default: 0 },
  activationLimit: { type: Number, default: 10 },
  metadata: { type: Map, of: String },
  signedBy: { type: String },
  signature: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schema.plugin(uniqueValidator, { message: '{PATH} already exists' });

schema.index({ licenseKey: 1 });
schema.index({ type: 1 });
schema.index({ status: 1 });
schema.index({ tenant: 1 });
schema.index({ endDate: 1 });
schema.index({ autoRenew: 1 });

export const EnterpriseLicense = mongoose.model('EnterpriseLicense', schema);
