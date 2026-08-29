const SENSITIVE_FIELDS = ['password', 'secretKey', 'apiKey', 'accessToken', 'webhookSecret', 'token', 'refreshToken', 'stripeSecretKey', 'privateKey'];

/**
 * Whitelist-based sanitization: returns only allowed fields from body.
 * Prevents mass-assignment vulnerabilities.
 */
export function sanitizeBody(body, allowedFields) {
  if (!body || typeof body !== 'object') return body;
  if (Array.isArray(body)) return body.map(item => sanitizeBody(item, allowedFields));

  if (allowedFields && Array.isArray(allowedFields)) {
    // Whitelist mode: only keep allowed fields
    const sanitized = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        sanitized[key] = typeof body[key] === 'object' && body[key] !== null && !Array.isArray(body[key])
          ? sanitizeBody(body[key], allowedFields)
          : body[key];
      }
    }
    return sanitized;
  }

  // Blacklist mode: remove sensitive fields
  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    sanitized[key] = typeof value === 'object' && value !== null ? sanitizeBody(value, allowedFields) : value;
  }
  return sanitized;
}

/**
 * Deep strip sensitive fields from an object (mutates/creates new).
 * Alternative entry point with same signature as sanitizeBody.js.
 */
export { sanitizeBody as stripSensitive };
