import { Router } from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/authController.js';
import { turnstileService } from '../services/turnstileService.js';

const router = Router();

const turnstile = turnstileService.createMiddleware();

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { success: false, message: 'Too many password reset requests. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

const twoFactorLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, max: 10,
  message: { success: false, message: 'Too many 2FA attempts. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

/* Public — Turnstile-protected when CF_TURNSTILE keys are configured */
router.post('/register', turnstile, c.registerUser);
router.post('/login', turnstile, c.loginUser);
router.post('/verify-2fa', twoFactorLimiter, c.verifyTwoFactorLogin);
router.post('/send-2fa-email', twoFactorLimiter, c.sendEmailTwoFactorCode);
router.post('/forgot-password', turnstile, forgotLimiter, c.forgotPassword);
router.post('/reset-password/:token', turnstile, forgotLimiter, c.resetPassword);

/* Authenticated */
router.get('/profile', auth, c.getProfile);
router.put('/profile', auth, c.updateProfile);
router.post('/logout', auth, c.logout);
router.post('/change-password', auth, c.changePassword);

/* 2FA Management */
router.post('/2fa/generate', auth, c.generateTwoFactorSetup);
router.post('/2fa/verify', auth, c.verifyTwoFactorSetup);
router.post('/2fa/disable', auth, c.disableTwoFactor);
router.get('/2fa/recovery-codes', auth, c.getRecoveryCodes);
router.post('/2fa/recovery-codes/regenerate', auth, c.regenerateRecoveryCodes);
router.post('/2fa/send-email-code', auth, c.sendEmailTwoFactorCode);

/* Sessions */
router.get('/sessions', auth, c.getSessions);
router.delete('/sessions/:tokenId', auth, c.revokeSessionById);
router.post('/sessions/revoke-others', auth, c.revokeOtherSessions);

/* Security */
router.get('/security/status', auth, c.getSecurityStatus);
router.get('/security/events', auth, c.getSecurityEventsHandler);
router.get('/security/login-history', auth, c.getLoginHistoryHandler);

/* Admin */
router.get('/users', auth, authorize('admin'), c.getAllUsers);
router.delete('/users/:id', auth, authorize('admin'), c.deleteUser);
router.post('/users/:id/force-reset', auth, authorize('admin'), c.adminForcePasswordReset);
router.post('/users/:id/toggle-lock', auth, authorize('admin'), c.adminToggleLock);
router.post('/users/:id/disable-2fa', auth, authorize('admin'), c.adminDisableTwoFactor);
router.get('/users/:id/security', auth, authorize('admin'), c.adminGetUserSecurity);

export default router;
