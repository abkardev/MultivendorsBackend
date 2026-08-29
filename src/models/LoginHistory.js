import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  status: { type: String, enum: ['success', 'failed', 'locked', '2fa_required', '2fa_success', '2fa_failed'], required: true },
  ipAddress: String,
  country: String,
  city: String,
  deviceName: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  deviceType: { type: String, enum: ['desktop', 'tablet', 'mobile', 'unknown'], default: 'unknown' },
  userAgent: String,
  authMethod: { type: String, enum: ['password', '2fa_totp', '2fa_email', 'recovery_code', 'remember_me'], default: 'password' },
  failureReason: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

loginHistorySchema.index({ user: 1, createdAt: -1 });
loginHistorySchema.index({ createdAt: -1 });
loginHistorySchema.index({ status: 1, createdAt: -1 });
loginHistorySchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model('LoginHistory', loginHistorySchema);
