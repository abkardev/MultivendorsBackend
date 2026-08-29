import mongoose from 'mongoose';

const securityEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'login_failed', 'login_locked',
      'password_changed', 'password_reset', 'password_reset_requested',
      '2fa_enabled', '2fa_disabled', '2fa_failed', '2fa_recovery_used',
      'session_revoked', 'all_sessions_revoked',
      'device_trusted', 'device_removed',
      'recovery_codes_generated', 'recovery_codes_used',
      'account_locked', 'account_unlocked',
      'force_password_reset', 'profile_updated',
      'suspicious_activity', 'email_changed',
    ],
  },
  status: { type: String, enum: ['success', 'failure', 'info'], default: 'info' },
  ipAddress: String,
  userAgent: String,
  deviceName: String,
  browser: String,
  os: String,
  country: String,
  details: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

securityEventSchema.index({ user: 1, createdAt: -1 });
securityEventSchema.index({ action: 1, createdAt: -1 });
securityEventSchema.index({ createdAt: -1 });
securityEventSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('SecurityEvent', securityEventSchema);
