import mongoose from 'mongoose';

const developerAppSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  appUrl: String,
  redirectUris: [String],
  scopes: [String],
  clientId: { type: String, unique: true, required: true },
  clientSecret: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'suspended', 'revoked'],
    default: 'active'
  },
  rateLimit: { type: Number, default: 100 },
  monthlyRequestLimit: { type: Number, default: 10000 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

developerAppSchema.index({ developer: 1 });
developerAppSchema.index({ clientId: 1 }, { unique: true });
developerAppSchema.index({ status: 1 });

export const DeveloperApp = mongoose.model('DeveloperApp', developerAppSchema);
