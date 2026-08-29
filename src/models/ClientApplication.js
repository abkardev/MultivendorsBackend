import mongoose from 'mongoose';
import crypto from 'crypto';

const clientApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: String,
  website: String,
  logo: String,
  clientId: { type: String, required: true, unique: true },
  clientSecret: { type: String },
  redirectUris: [String],
  scopes: [{ type: String }],
  type: { type: String, enum: ['public', 'confidential', 'internal'], default: 'internal' },
  isActive: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'RatePlan' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  lastUsedAt: Date,
}, { timestamps: true });

clientApplicationSchema.index({ clientId: 1 });
clientApplicationSchema.index({ owner: 1 });

clientApplicationSchema.statics.generateClientId = function () {
  return 'app_' + crypto.randomBytes(16).toString('hex');
};

clientApplicationSchema.statics.generateClientSecret = function () {
  return 'sec_' + crypto.randomBytes(32).toString('hex');
};

export const ClientApplication = mongoose.model('ClientApplication', clientApplicationSchema);
