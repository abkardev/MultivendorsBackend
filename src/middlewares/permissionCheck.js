import { rbacService } from '../services/rbacService.js';

export const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: false, message: 'Not authenticated' });
    }

    try {
      const userPermissions = await rbacService.getUserPermissions(req.user._id);
      const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

      if (!hasAll) {
        return res.status(403).json({ status: false, message: "You don't have permission" });
      }

      next();
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Error checking permissions' });
    }
  };
};

export const checkAnyPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: false, message: 'Not authenticated' });
    }

    try {
      const userPermissions = await rbacService.getUserPermissions(req.user._id);
      const hasAny = requiredPermissions.some(p => userPermissions.includes(p));

      if (!hasAny) {
        return res.status(403).json({ status: false, message: "You don't have permission" });
      }

      next();
    } catch (error) {
      return res.status(500).json({ status: false, message: 'Error checking permissions' });
    }
  };
};
