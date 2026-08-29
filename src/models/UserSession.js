import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenId: { type: String, required: true, unique: true },
  deviceName: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  deviceType: { type: String, enum: ['desktop', 'tablet', 'mobile', 'unknown'], default: 'unknown' },
  ipAddress: String,
  country: String,
  city: String,
  isCurrent: { type: Boolean, default: false },
  isTrusted: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

userSessionSchema.index({ user: 1, lastActivity: -1 });
userSessionSchema.index({ user: 1, isCurrent: 1 });
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('UserSession', userSessionSchema);
