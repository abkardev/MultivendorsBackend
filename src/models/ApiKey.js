import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, unique: true, required: true },
  hashedKey: { type: String, required: true },
  developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  app: { type: mongoose.Schema.Types.ObjectId, ref: 'DeveloperApp' },
  scopes: [String],
  permissions: [String],
  expiresAt: Date,
  lastUsedAt: Date,
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
  },
  rateLimit: { type: Number, default: 60 }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

apiKeySchema.index({ key: 1 }, { unique: true });
apiKeySchema.index({ developer: 1 });
apiKeySchema.index({ app: 1 });
apiKeySchema.index({ status: 1, expiresAt: 1 });

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
