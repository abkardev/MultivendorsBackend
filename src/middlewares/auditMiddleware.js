import { logAuditEvent } from '../services/auditService.js';

/**
 * Middleware that automatically logs API requests to the audit trail
 */
export function audit(category, action) {
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

/**
 * Direct function to create an audit log entry
 */
export const createAuditLog = async (data) => {
  return logAuditEvent(data);
};
