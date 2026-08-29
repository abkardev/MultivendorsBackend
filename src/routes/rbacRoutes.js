import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  listPermissions,
  listRoles, getRole, createRole, updateRole, deleteRole,
  assignUserRole,
  listDepartments, getDepartment, createDepartment, updateDepartment, deleteDepartment,
  initializeRBAC,
  listUsersWithRoles,
} from '../controllers/rbacController.js';

const router = Router();

// Initialize RBAC (admin only)
router.post('/rbac/initialize', protect, authorize('admin'), initializeRBAC);

// Permissions
router.get('/rbac/permissions', protect, authorize('admin'), listPermissions);

// Roles
router.get('/rbac/roles', protect, authorize('admin'), listRoles);
router.get('/rbac/roles/:id', protect, authorize('admin'), getRole);
router.post('/rbac/roles', protect, authorize('admin'), createRole);
router.put('/rbac/roles/:id', protect, authorize('admin'), updateRole);
router.delete('/rbac/roles/:id', protect, authorize('admin'), deleteRole);

// User-Role assignment
router.post('/rbac/users/assign-role', protect, authorize('admin'), assignUserRole);
router.get('/rbac/users', protect, authorize('admin'), listUsersWithRoles);

// Departments
router.get('/rbac/departments', protect, listDepartments);
router.get('/rbac/departments/:id', protect, getDepartment);
router.post('/rbac/departments', protect, authorize('admin'), createDepartment);
router.put('/rbac/departments/:id', protect, authorize('admin'), updateDepartment);
router.delete('/rbac/departments/:id', protect, authorize('admin'), deleteDepartment);

export default router;
