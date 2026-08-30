import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  street: String, city: String, state: String, zip: String, country: String,
}, { _id: false });

const trustedDeviceSchema = new mongoose.Schema({
  deviceId: String, deviceName: String, browser: String, os: String,
  ipAddress: String, lastUsed: Date, addedAt: { type: Date, default: Date.now },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role: { type: String, enum: ['user', 'vendor', 'admin'], default: 'user' },
  roleRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  address: addressSchema,
  phone: String,
  companyName: String,
  companyNameAr: String,
  isActive: { type: Boolean, default: true },
  acceptedTerms: { type: Boolean, default: false },
  avatar: String,
  isVerified: { type: Boolean, default: false },

  // Password reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  resetPasswordUsed: { type: Boolean, default: false },

  // Password change tracking
  passwordChangedAt: Date,
  passwordHistory: [{ type: String }],

  // Account lockout
  failedLoginAttempts: { type: Number, default: 0 },
  lockoutUntil: Date,
  lockedByAdmin: { type: Boolean, default: false },

  // 2FA
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorMethod: { type: String, enum: ['totp', 'email', null], default: null },
  twoFactorSecret: String,
  twoFactorTempSecret: String,
  twoFactorTempSecretExpires: Date,

  // Recovery codes
  recoveryCodes: [{
    code: String,
    used: { type: Boolean, default: false },
    usedAt: Date,
  }],

  // Trusted devices
  trustedDevices: [trustedDeviceSchema],

  // Force password reset
  forcePasswordReset: { type: Boolean, default: false },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  if (this.passwordHistory) {
    this.passwordHistory.unshift(this.password);
    if (this.passwordHistory.length > 5) this.passwordHistory = this.passwordHistory.slice(0, 5);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function () {
  if (this.lockedByAdmin) return true;
  if (this.lockoutUntil && this.lockoutUntil > new Date()) return true;
  return false;
};

userSchema.methods.incrementFailedLogins = async function () {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  if (this.failedLoginAttempts >= 5) {
    this.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  return this.save();
};

userSchema.methods.resetFailedLogins = function () {
  this.failedLoginAttempts = 0;
  this.lockoutUntil = undefined;
  return this.save();
};

userSchema.index({ resetPasswordToken: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isActive: 1, createdAt: -1 });
userSchema.index({ department: 1 });
userSchema.index({ roleRef: 1 });
userSchema.index({ isVerified: 1 });

// ============================================================
// Central wire-format sanitization (Phase 3.7 security pass).
// Strips account-security secrets from EVERY serialized User,
// including populated sub-documents (orders, escrow, disputes).
// Applied on toObject AND toJSON so no representation that
// reaches the client ever contains password hashes, recovery
// codes, 2FA secrets or locked/force-reset flags.
//
// NOTE: this affects SERIALIZATION only — in-memory properties
// (used by comparePassword, admin security tooling, 2FA flows)
// remain fully intact.
// ============================================================
const SENSITIVE_WIRE_FIELDS = [
  'password',
  'passwordHistory',
  'recoveryCodes',
  'trustedDevices',
  'failedLoginAttempts',
  'lockoutUntil',
  'lockedByAdmin',
  'forcePasswordReset',
  'resetPasswordUsed',
  'resetPasswordToken',
  'resetPasswordExpire',
  'passwordChangedAt',
  'twoFactorSecret',
  'twoFactorTempSecret',
  'twoFactorTempSecretExpires',
  'twoFactorEmailCode',
  'twoFactorEmailExpires',
];

// Works for BOTH mongoose documents (via toObject) and lean plain
// objects, so it can be applied at every user serialization site.
export const sanitizeUserWire = (user) => {
  const u = user && typeof user.toObject === 'function' ? user.toObject() : user;
  if (!u || typeof u !== 'object') return u;
  for (const field of SENSITIVE_WIRE_FIELDS) delete u[field];
  return u;
};

const sanitizeUserWireTransform = (doc, ret) => sanitizeUserWire(ret);
userSchema.set('toJSON', { transform: sanitizeUserWireTransform });
userSchema.set('toObject', { transform: sanitizeUserWireTransform });

export default mongoose.model('User', userSchema);
