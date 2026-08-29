import SecurityEvent from '../models/SecurityEvent.js';
import LoginHistory from '../models/LoginHistory.js';

export const logSecurityEvent = async ({ user, performedBy, action, status = 'info', ipAddress, userAgent, deviceName, browser, os, country, details, metadata }) => {
  try {
    return SecurityEvent.create({ user, performedBy, action, status, ipAddress, userAgent, deviceName, browser, os, country, details, metadata });
  } catch (err) {
    console.error('Failed to log security event:', err.message);
  }
};

export const logLoginAttempt = async ({ user, status, ipAddress, country, city, deviceName, browser, browserVersion, os, osVersion, deviceType, userAgent, authMethod = 'password', failureReason, metadata }) => {
  try {
    return LoginHistory.create({ user, status, ipAddress, country, city, deviceName, browser, browserVersion, os, osVersion, deviceType, userAgent, authMethod, failureReason, metadata });
  } catch (err) {
    console.error('Failed to log login attempt:', err.message);
  }
};

export const getLoginHistory = async (userId, limit = 50) => {
  return LoginHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
};

export const getSecurityEvents = async (filter = {}, limit = 100) => {
  return SecurityEvent.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).limit(limit).lean();
};

export const getAccountStatus = async (user) => {
  const recentEvents = await SecurityEvent.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).lean();
  const recentLogins = await LoginHistory.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).lean();
  const passwordStrength = evaluatePasswordStrength(user.passwordHistory?.[0] || '');
  return {
    twoFactorEnabled: !!user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
    passwordStrength,
    recentEvents,
    recentLogins,
    isLocked: user.isLocked ? user.isLocked() : false,
    failedLoginAttempts: user.failedLoginAttempts || 0,
    recommendations: generateRecommendations(user, passwordStrength),
  };
};

const evaluatePasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'none', color: 'gray' };
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 15;
  if (password.length >= 16) score += 10;
  if (score >= 80) return { score, label: 'strong', color: 'green' };
  if (score >= 60) return { score, label: 'good', color: 'blue' };
  if (score >= 40) return { score, label: 'fair', color: 'yellow' };
  return { score, label: 'weak', color: 'red' };
};

const generateRecommendations = (user, strength) => {
  const recs = [];
  if (!user.twoFactorEnabled) recs.push({ key: 'enable_2fa', severity: 'high', message: 'Enable two-factor authentication to add an extra layer of security.' });
  if (strength.label === 'weak' || strength.label === 'fair') recs.push({ key: 'stronger_password', severity: 'medium', message: 'Use a stronger password with at least 12 characters including uppercase, lowercase, numbers, and symbols.' });
  if (user.failedLoginAttempts >= 3) recs.push({ key: 'recent_failures', severity: 'medium', message: `${user.failedLoginAttempts} failed login attempts detected. Review your login history.` });
  return recs;
};
