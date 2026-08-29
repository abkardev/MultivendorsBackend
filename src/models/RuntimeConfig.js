import mongoose from 'mongoose';

const runtimeConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed },
  type: { type: String, enum: ['string', 'number', 'boolean', 'json', 'array'], default: 'string' },
  environment: { type: String, enum: ['development', 'staging', 'production', 'all'], default: 'all' },
  source: { type: String, enum: ['manual', 'env_file', 'platform_setting', 'system'], default: 'manual' },
  description: String,
  isOverridden: { type: Boolean, default: false },
  overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  overriddenAt: Date,
  expiresAt: Date,
}, { timestamps: true });

runtimeConfigSchema.index({ environment: 1 });
runtimeConfigSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RuntimeConfig = mongoose.model('RuntimeConfig', runtimeConfigSchema);
