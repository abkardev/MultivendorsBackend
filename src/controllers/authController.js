import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { Vendor } from '../models/vendorModel.js';
import { createSession, revokeSession, revokeAllSessions, listSessions, validateSession } from '../services/sessionService.js';
import { generateSecret, generateQRCode, verifyTOTP, encryptSecret, decryptSecret, generateRecoveryCodes, generateEmailVerificationCode } from '../services/totpService.js';
import { logSecurityEvent, logLoginAttempt, getLoginHistory, getAccountStatus, getSecurityEvents } from '../services/securityAuditService.js';
import { sendEmail, sendPasswordResetEmail, sendPasswordChangedEmail, sendTwoFactorEnabledEmail, sendTwoFactorDisabledEmail, sendNewDeviceLoginEmail, sendRecoveryCodesUsedEmail } from '../services/emailService.js';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=<>?/{}~|]).{8,}$/;

const generateToken = (id, extra = {}) => jwt.sign({ id, ...extra }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });

const getDeviceInfo = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || '0.0.0.0',
  userAgent: req.headers['user-agent'] || '',
  deviceName: req.body.deviceName || req.headers['x-device-name'],
  country: req.headers['cf-ipcountry'] || req.headers['x-country'],
  city: req.headers['x-city'],
});

const sanitizeUser = (user) => {
  const u = user.toObject ? user.toObject() : user;
  delete u.password;
  delete u.twoFactorSecret;
  delete u.twoFactorTempSecret;
  delete u.resetPasswordToken;
  delete u.passwordHistory;
  return u;
};

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, companyName, companyNameEn, companyNameAr, crName, crNameEn, crNameAr, briefEn, briefAr, industry, firstName, lastName, phone, country, state, city, acceptedTerms } = req.body;
    if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ success: false, message: 'User already exists' });
    const userRole = role === 'vendor' ? 'vendor' : 'user';
    let vendorId = null;
    if (userRole === 'vendor') {
      const vendor = await Vendor.create({
        storeName: { en: companyNameEn || companyName, ar: companyNameAr || companyName },
        storeDescription: { en: briefEn || '', ar: briefAr || '' },
        industry, crName, crNameEn, crNameAr, email, phone,
        verificationStatus: 'none', isVerified: false,
      });
      vendorId = vendor._id;
    }
    const user = await User.create({
      name, firstName, lastName, email: email.toLowerCase(), password, role: userRole,
      companyName: companyName || companyNameEn, companyNameAr, phone,
      address: { country, state, city }, acceptedTerms,
    });
    const { tokenId } = await createSession(user._id, { ...deviceInfo, rememberMe: false });
    const token = generateToken(user._id, { tokenId });
    await logSecurityEvent({ user: user._id, action: 'login', status: 'success', ipAddress: deviceInfo.ipAddress, userAgent: deviceInfo.userAgent });
    await logLoginAttempt({ user: user._id, status: 'success', ...deviceInfo });
    res.status(201).json({ success: true, data: { user: sanitizeUser(user), token, tokenId, requiresTwoFactor: false }, message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      await logLoginAttempt({ user: null, status: 'failed', ...getDeviceInfo(req), failureReason: 'User not found' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    if (user.isLocked()) {
      await logSecurityEvent({ user: user._id, action: 'login_locked', status: 'failure', ...getDeviceInfo(req), details: 'Account locked' });
      await logLoginAttempt({ user: user._id, status: 'locked', ...getDeviceInfo(req), failureReason: 'Account locked' });
      return res.status(423).json({ success: false, message: 'Account is temporarily locked. Try again later.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incrementFailedLogins();
      await logSecurityEvent({ user: user._id, action: 'login_failed', status: 'failure', ...getDeviceInfo(req) });
      await logLoginAttempt({ user: user._id, status: 'failed', ...getDeviceInfo(req), failureReason: 'Invalid password' });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    await user.resetFailedLogins();
    const deviceInfo = getDeviceInfo(req);
    await logLoginAttempt({ user: user._id, status: 'success', ...deviceInfo, authMethod: 'password' });
    if (user.twoFactorEnabled) {
      const partialTokenId = crypto.randomBytes(32).toString('hex');
      const partialToken = generateToken(user._id, { tokenId: partialTokenId, twoFactorPending: true });
      return res.json({
        success: true, data: { requiresTwoFactor: true, method: user.twoFactorMethod, token: partialToken, tokenId: partialTokenId, userId: user._id },
        message: 'Two-factor authentication required',
      });
    }
    const { tokenId } = await createSession(user._id, { ...deviceInfo, rememberMe });
    const token = generateToken(user._id, { tokenId });
    await logSecurityEvent({ user: user._id, action: 'login', status: 'success', ...deviceInfo });
    res.json({ success: true, data: { user: sanitizeUser(user), token, tokenId, requiresTwoFactor: false }, message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { token: twoFactorToken, code, method } = req.body;
    const decoded = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
    if (!decoded.twoFactorPending) return res.status(400).json({ success: false, message: 'Invalid verification token' });
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    let valid = false;
    let authMethod = '2fa_totp';
    if (method === 'totp' || !method) {
      const secret = user.twoFactorSecret;
      valid = verifyTOTP(code, secret);
    } else if (method === 'email') {
      if (user.twoFactorEmailCode !== code || user.twoFactorEmailExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired code' });
      }
      valid = true;
      authMethod = '2fa_email';
      user.twoFactorEmailCode = undefined;
      user.twoFactorEmailExpires = undefined;
      await user.save();
    } else if (method === 'recovery') {
      const found = user.recoveryCodes.find(c => c.code === code && !c.used);
      if (!found) return res.status(400).json({ success: false, message: 'Invalid recovery code' });
      found.used = true;
      found.usedAt = new Date();
      valid = true;
      authMethod = 'recovery_code';
      const remaining = user.recoveryCodes.filter(c => !c.used).length;
      await user.save();
      await sendRecoveryCodesUsedEmail(user, remaining, req.headers['x-locale'] || 'en');
      await logSecurityEvent({ user: user._id, action: '2fa_recovery_used', status: 'success', ...getDeviceInfo(req) });
    }
    if (!valid) {
      await logSecurityEvent({ user: user._id, action: '2fa_failed', status: 'failure', ...getDeviceInfo(req) });
      await logLoginAttempt({ user: user._id, status: '2fa_failed', ...getDeviceInfo(req), authMethod });
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    const deviceInfo = getDeviceInfo(req);
    const { tokenId } = await createSession(user._id, { ...deviceInfo, rememberMe: req.body.rememberMe });
    const token = generateToken(user._id, { tokenId });
    await logSecurityEvent({ user: user._id, action: 'login', status: 'success', ...deviceInfo, details: `2FA via ${authMethod}` });
    await logLoginAttempt({ user: user._id, status: '2fa_success', ...deviceInfo, authMethod });
    res.json({ success: true, data: { user: sanitizeUser(user), token, tokenId, requiresTwoFactor: false }, message: 'Login successful' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired verification token' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
    user.resetPasswordUsed = false;
    await user.save();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
    try {
      await sendPasswordResetEmail(user, resetUrl, req.headers['x-locale'] || 'en');
    } catch (emailErr) {
      // Never log the reset URL (it is a bearer secret). In production, email
      // delivery is required — fail loudly instead of reporting success.
      if (process.env.NODE_ENV === 'production') {
        throw emailErr;
      }
      console.error('Password reset email failed to send (dev only):', emailErr.message);
    }
    await logSecurityEvent({ user: user._id, action: 'password_reset_requested', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!PASSWORD_REGEX.test(password)) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() },
      resetPasswordUsed: false,
    });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordUsed = true;
    user.forcePasswordReset = false;
    await user.save();
    await revokeAllSessions(user._id);
    await sendPasswordChangedEmail(user, req.headers['x-locale'] || 'en');
    await logSecurityEvent({ user: user._id, action: 'password_reset', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!PASSWORD_REGEX.test(newPassword)) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    if (user.passwordHistory) {
      for (const oldHash of user.passwordHistory) {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return res.status(400).json({ success: false, message: 'You cannot reuse a recent password' });
        }
      }
    }
    user.password = newPassword;
    await user.save();
    const revokeOthers = req.body.revokeOtherSessions !== false;
    if (revokeOthers) {
      const currentSession = req.headers.authorization?.split(' ')[1];
      let currentTokenId = null;
      if (currentSession) {
        try {
          const decoded = jwt.verify(currentSession, process.env.JWT_SECRET);
          currentTokenId = decoded.tokenId;
        } catch {}
      }
      await revokeAllSessions(user._id, currentTokenId);
    }
    await sendPasswordChangedEmail(user, req.headers['x-locale'] || 'en');
    await logSecurityEvent({ user: user._id, action: 'password_changed', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const fields = ['name', 'firstName', 'lastName', 'phone', 'companyName', 'companyNameAr'];
    for (const f of fields) {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    }
    if (req.body.address) {
      const addr = typeof req.body.address === 'string' ? JSON.parse(req.body.address) : req.body.address;
      for (const k of ['street', 'city', 'state', 'zip', 'country']) {
        if (addr[k] !== undefined) user.address[k] = addr[k];
      }
    }
    await user.save();
    await logSecurityEvent({ user: user._id, action: 'profile_updated', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, data: sanitizeUser(user), message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users.map(sanitizeUser), count: users.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let tokenId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        tokenId = decoded.tokenId;
      } catch {}
    }
    if (tokenId) await revokeSession(tokenId, req.user._id);
    await logSecurityEvent({ user: req.user._id, action: 'logout', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* 2FA */
export const generateTwoFactorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA already enabled' });
    const secret = generateSecret(user.email);
    const qrCode = await generateQRCode(secret.otpauthUrl);
    user.twoFactorTempSecret = encryptSecret(secret.base32);
    user.twoFactorTempSecretExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    res.json({ success: true, data: { secret: secret.base32, qrCode, otpauthUrl: secret.otpauthUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const verifyTwoFactorSetup = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.twoFactorTempSecret || user.twoFactorTempSecretExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Setup session expired. Please restart.' });
    }
    const secret = decryptSecret(user.twoFactorTempSecret);
    const valid = verifyTOTP(code, secret);
    if (!valid) return res.status(400).json({ success: false, message: 'Invalid verification code. Ensure your authenticator app is set up correctly.' });
    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'totp';
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorTempSecretExpires = undefined;
    if (!user.recoveryCodes || user.recoveryCodes.length === 0) {
      user.recoveryCodes = generateRecoveryCodes(10);
    }
    await user.save();
    await sendTwoFactorEnabledEmail(user, req.headers['x-locale'] || 'en');
    await logSecurityEvent({ user: user._id, action: '2fa_enabled', status: 'success', ...getDeviceInfo(req) });
    res.json({
      success: true, data: {
        recoveryCodes: user.recoveryCodes.map(c => ({ code: c.code, used: c.used })),
      }, message: 'Two-factor authentication enabled successfully. Save your recovery codes.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const disableTwoFactor = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });
    if (code) {
      const secret = decryptSecret(user.twoFactorSecret);
      const valid = verifyTOTP(code, secret);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }
    user.twoFactorEnabled = false;
    user.twoFactorMethod = null;
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.recoveryCodes = [];
    await user.save();
    await sendTwoFactorDisabledEmail(user, req.headers['x-locale'] || 'en');
    await logSecurityEvent({ user: user._id, action: '2fa_disabled', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecoveryCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });
    res.json({ success: true, data: { recoveryCodes: user.recoveryCodes.map(c => ({ code: c.code, used: c.used, usedAt: c.usedAt })) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const regenerateRecoveryCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.twoFactorEnabled) return res.status(400).json({ success: false, message: '2FA is not enabled' });
    user.recoveryCodes = generateRecoveryCodes(10);
    await user.save();
    await logSecurityEvent({ user: user._id, action: 'recovery_codes_generated', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, data: { recoveryCodes: user.recoveryCodes.map(c => ({ code: c.code, used: false })) }, message: 'Recovery codes regenerated. Old codes are no longer valid.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendEmailTwoFactorCode = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id || req.body.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const code = generateEmailVerificationCode();
    user.twoFactorEmailCode = code;
    user.twoFactorEmailExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: req.headers['x-locale'] === 'ar' ? 'رمز التحقق بخطوتين' : 'Your Two-Factor Authentication Code',
      html: `<html><body><div style="max-width:600px;margin:40px auto;padding:40px;background:#fff;border-radius:12px"><h1 style="color:#1a1a2e">${req.headers['x-locale'] === 'ar' ? 'رمز التحقق' : 'Verification Code'}</h1><p>${req.headers['x-locale'] === 'ar' ? `مرحباً ${user.name}،` : `Hi ${user.name},`}</p><p>${req.headers['x-locale'] === 'ar' ? 'رمز التحقق الخاص بك هو:' : 'Your verification code is:'}</p><div style="text-align:center;margin:24px 0;padding:20px;background:#f0f4ff;border-radius:12px;font-size:36px;font-weight:700;letter-spacing:8px;color:#2563eb">${code}</div><p style="color:#888;font-size:14px">${req.headers['x-locale'] === 'ar' ? 'هذا الرمز صالح لمدة 5 دقائق.' : 'This code expires in 5 minutes.'}</p></div></body></html>`,
    });
    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Sessions */
export const getSessions = async (req, res) => {
  try {
    const sessions = await listSessions(req.user._id);
    const token = req.headers.authorization?.split(' ')[1];
    let currentTokenId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentTokenId = decoded.tokenId;
      } catch {}
    }
    const mapped = sessions.map(s => ({ ...s, isCurrent: s.tokenId === currentTokenId }));
    res.json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const revokeSessionById = async (req, res) => {
  try {
    const session = await revokeSession(req.params.tokenId, req.user._id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    await logSecurityEvent({ user: req.user._id, action: 'session_revoked', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Session revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const revokeOtherSessions = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let currentTokenId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentTokenId = decoded.tokenId;
      } catch {}
    }
    await revokeAllSessions(req.user._id, currentTokenId);
    await logSecurityEvent({ user: req.user._id, action: 'all_sessions_revoked', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Other sessions revoked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLoginHistoryHandler = async (req, res) => {
  try {
    const history = await getLoginHistory(req.user._id, parseInt(req.query.limit) || 50);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSecurityStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    const status = await getAccountStatus(user);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getSecurityEventsHandler = async (req, res) => {
  try {
    const events = await getSecurityEvents({ user: req.user._id }, parseInt(req.query.limit) || 50);
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* Admin */
export const adminForcePasswordReset = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.forcePasswordReset = true;
    await user.save();
    await revokeAllSessions(user._id);
    await logSecurityEvent({ user: user._id, performedBy: req.user._id, action: 'force_password_reset', status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: 'Force password reset applied. User will be required to change password on next login.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminToggleLock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const action = user.lockedByAdmin ? 'account_unlocked' : 'account_locked';
    user.lockedByAdmin = !user.lockedByAdmin;
    if (user.lockedByAdmin) {
      user.lockoutUntil = new Date(Date.now() + 365 * 86400000 * 100);
    } else {
      user.lockoutUntil = undefined;
      user.failedLoginAttempts = 0;
    }
    await user.save();
    if (user.lockedByAdmin) await revokeAllSessions(user._id);
    await logSecurityEvent({ user: user._id, performedBy: req.user._id, action, status: 'success', ...getDeviceInfo(req) });
    res.json({ success: true, message: user.lockedByAdmin ? 'Account locked' : 'Account unlocked' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminDisableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.twoFactorEnabled = false;
    user.twoFactorMethod = null;
    user.twoFactorSecret = undefined;
    user.recoveryCodes = [];
    await user.save();
    await logSecurityEvent({ user: user._id, performedBy: req.user._id, action: '2fa_disabled', status: 'success', details: 'Disabled by admin', ...getDeviceInfo(req) });
    res.json({ success: true, message: '2FA disabled for user' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminGetUserSecurity = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const status = await getAccountStatus(user);
    const events = await getSecurityEvents({ user: user._id }, 50);
    const history = await getLoginHistory(user._id, 50);
    res.json({ success: true, data: { ...status, events, history, user: sanitizeUser(user) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
