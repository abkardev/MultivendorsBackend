import AuditLog from '../models/AuditLog.js';

/**
 * Log an auditable event to the immutable audit trail
 */
export async function logAuditEvent(data) {
  const {
    userId, userRole, ip, userAgent, deviceFingerprint,
    action, category,
    entityType, entityId,
    oldValue, newValue,
    amount, currency, referenceNumber, correlationId, ledgerEntryId,
    description, status
  } = data;

  try {
    const log = await AuditLog.create({
      userId, userRole, ip, userAgent, deviceFingerprint,
      action, category,
      entityType, entityId,
      // Only store diffs, not full objects
      oldValue: oldValue ? extractDiff(oldValue, newValue) : undefined,
      newValue: newValue ? extractDiff(newValue, oldValue) : undefined,
      amount, currency, referenceNumber, correlationId, ledgerEntryId,
      description: description || `${action} on ${entityType || category}`,
      status: status || 'success',
    });
    return log;
  } catch (err) {
    console.error('Audit log creation failed:', err.message);
    // Audit logging should never throw - it's non-critical
    return null;
  }
}

/**
 * Extract only the changed fields between two objects
 */
function extractDiff(current, previous) {
  if (!previous) return current;
  
  const diff = {};
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'object' && value !== null && previous[key]) {
      const nestedDiff = extractDiff(value, previous[key]);
      if (Object.keys(nestedDiff).length > 0) {
        diff[key] = nestedDiff;
      }
    } else if (value !== previous[key]) {
      diff[key] = value;
    }
  }
  return diff;
}

/**
 * Generate a correlation ID for traceability
 */
export function generateCorrelationId() {
  return `CORR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create audit middleware that automatically logs requests
 */
export function auditMiddleware(category, action) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent({
          userId: req.user?._id,
          userRole: req.user?.role,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          action: action || req.method.toLowerCase(),
          category,
          entityType: req.baseUrl.split('/').pop(),
          entityId: req.params?.id,
          newValue: req.body,
          description: `${req.method} ${req.originalUrl}`,
          status: 'success',
        });
      }
      return originalJson(body);
    };
    next();
  };
}
