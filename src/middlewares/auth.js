import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { validateSession } from '../services/sessionService.js';

export const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.twoFactorPending) {
      return res.status(401).json({ success: false, message: 'Two-factor authentication required', requiresTwoFactor: true });
    }
    const session = await validateSession(decoded.tokenId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session expired or revoked. Please log in again.' });
    }
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }
    if (user.lockedByAdmin) {
      return res.status(423).json({ success: false, message: 'Account locked by administrator.' });
    }
    req.user = user;
    req.tokenId = decoded.tokenId;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }
};

export const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.twoFactorPending) {
      const user = await User.findById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.tokenId = decoded.tokenId;
      }
    }
  } catch {}
  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "You don't have permission" });
    }
    return next();
  };
};

export const checkForcePasswordReset = (req, res, next) => {
  if (req.user?.forcePasswordReset) {
    return res.status(403).json({ success: false, message: 'Password reset required', forcePasswordReset: true });
  }
  next();
};

export { auth as protect };
export default auth;
