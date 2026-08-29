import UserSession from '../models/UserSession.js';
import { generateTokenId } from './totpService.js';

const SESSION_EXPIRY_DAYS = parseInt(process.env.SESSION_EXPIRY_DAYS) || 30;
const REMEMBER_ME_EXPIRY_DAYS = parseInt(process.env.REMEMBER_ME_EXPIRY_DAYS) || 90;

const parseUserAgent = (ua) => {
  if (!ua) return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' };
  let browser = 'Unknown';
  let os = 'Unknown';
  let deviceType = 'unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('MSIE') || ua.includes('Trident')) browser = 'Internet Explorer';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  if (ua.includes('Mobile')) deviceType = 'mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) deviceType = 'tablet';
  else deviceType = 'desktop';
  return { browser, os, deviceType };
};

export const createSession = async (userId, { ipAddress, userAgent, deviceName, country, city, isTrusted = false, rememberMe = false }) => {
  const tokenId = generateTokenId();
  const ua = parseUserAgent(userAgent);
  const expiresDays = rememberMe ? REMEMBER_ME_EXPIRY_DAYS : SESSION_EXPIRY_DAYS;
  const session = await UserSession.create({
    user: userId, tokenId, deviceName: deviceName || ua.deviceType,
    browser: ua.browser, os: ua.os, deviceType: ua.deviceType,
    ipAddress, country, city, isCurrent: true, isTrusted,
    lastActivity: new Date(), expiresAt: new Date(Date.now() + expiresDays * 86400000),
  });
  return { session, tokenId };
};

export const validateSession = async (tokenId) => {
  const session = await UserSession.findOne({ tokenId, revokedAt: null, expiresAt: { $gt: new Date() } });
  if (!session) return null;
  session.lastActivity = new Date();
  await session.save();
  return session;
};

export const revokeSession = async (tokenId, userId, revokedBy = null) => {
  return UserSession.findOneAndUpdate(
    { tokenId, user: userId },
    { revokedAt: new Date(), isCurrent: false, revokedBy: revokedBy || userId },
    { new: true },
  );
};

export const revokeAllSessions = async (userId, excludeTokenId = null) => {
  const filter = { user: userId, revokedAt: null };
  if (excludeTokenId) filter.tokenId = { $ne: excludeTokenId };
  return UserSession.updateMany(filter, { revokedAt: new Date(), isCurrent: false, revokedBy: userId });
};

export const listSessions = async (userId) => {
  return UserSession.find({ user: userId }).sort({ lastActivity: -1 }).lean();
};

export const cleanupExpiredSessions = async () => {
  return UserSession.deleteMany({ $or: [{ expiresAt: { $lt: new Date() } }, { revokedAt: { $ne: null } }] });
};
