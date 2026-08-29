import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

// Comprehensive security headers
export const securityHeaders = helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://*.cloudfront.net'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://*.stripe.com', 'wss://*'],
      frameSrc: ["'self'", 'https://*.stripe.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: ['self'],
      accelerometer: [],
      gyroscope: [],
      magnetometer: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// CSRF Protection (double-submit cookie pattern)
export const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const token = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  const cookieToken = req.cookies?.csrfToken;
  if (!token || !cookieToken || token !== cookieToken) {
    return res.status(403).json({ status: false, message: 'CSRF token validation failed' });
  }
  next();
};

// Input sanitization (NoSQL injection, prototype pollution, XSS)
export const inputSanitizer = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (key.startsWith('$')) continue; // Prevent NoSQL operators
      sanitized[key] = typeof value === 'object' ? sanitize(value) : value;
    }
    return sanitized;
  };
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
};

// Rate limiters
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, message: { status: false, message: 'Too many requests' },
  standardHeaders: true, legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, message: { status: false, message: 'Too many auth attempts' },
  standardHeaders: true, legacyHeaders: false,
});

export const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, message: { status: false, message: 'AI rate limit exceeded' },
  standardHeaders: true, legacyHeaders: false,
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20, message: { status: false, message: 'Too many payment operations' },
  standardHeaders: true, legacyHeaders: false,
});

export const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 50, message: { status: false, message: 'Upload limit reached' },
  standardHeaders: true, legacyHeaders: false,
});

// Request size limiter
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (contentLength > maxSize) {
    return res.status(413).json({ status: false, message: 'Request entity too large' });
  }
  next();
};

// SQL/NoSQL injection detection
const injectionPatterns = /\$ne|\$gt|\$lt|\$in|\$nin|\$or|\$and|\$where|\bselect\b.*\bfrom\b|\bunion\b|\bdrop\b|\bdelete\b.*\bfrom\b|\binsert\b|\bexec\b|\bxp_cmdshell\b/i;

export const injectionDetector = (req, res, next) => {
  const check = (obj) => {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string' && injectionPatterns.test(obj)) return true;
      return false;
    }
    return Object.values(obj).some(v => check(v));
  };
  if (check(req.body) || check(req.query)) {
    return res.status(400).json({ status: false, message: 'Suspicious input detected' });
  }
  next();
};
