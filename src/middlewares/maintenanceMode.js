import { getLogger } from '../services/logger.js';

const logger = getLogger('api');

/**
 * Maintenance Mode Middleware
 * Blocks all non-admin traffic when maintenance mode is enabled
 */
export function maintenanceMode(req, res, next) {
  const maintenanceEnabled = process.env.MAINTENANCE_MODE === 'true';
  
  if (!maintenanceEnabled) {
    return next();
  }

  // Allow health check endpoints
  if (req.path === '/health' || req.path === '/live' || req.path === '/ready') {
    return next();
  }

  // Allow whitelisted IPs
  const whitelist = (process.env.MAINTENANCE_WHITELIST || '').split(',').filter(Boolean);
  if (whitelist.includes(req.ip)) {
    return next();
  }

  // Allow admin users
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') {
    return next();
  }

  const message = process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.';
  const eta = process.env.MAINTENANCE_ETA || '';

  logger.info({ ip: req.ip, path: req.path }, 'Request blocked by maintenance mode');

  res.status(503).json({
    status: false,
    message,
    ...(eta && { estimatedReturnTime: eta }),
    maintenance: true,
  });
}
