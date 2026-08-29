import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPermissions = [
  { _id: 'p1', name: 'products:read' },
  { _id: 'p2', name: 'products:create' },
  { _id: 'p3', name: 'users:create' },
  { _id: 'p4', name: 'orders:read' },
];

const mockRole = {
  _id: 'r1',
  name: 'admin',
  permissions: mockPermissions,
};

vi.mock('../models/Role.js', () => ({
  Role: { findOne: vi.fn(), find: vi.fn(), findOneAndUpdate: vi.fn() },
}));

vi.mock('../models/Permission.js', () => ({
  Permission: { find: vi.fn(), findOneAndUpdate: vi.fn() },
}));

vi.mock('../models/userModel.js', () => ({
  default: { findById: vi.fn(), findByIdAndUpdate: vi.fn(), find: vi.fn() },
}));

describe('RBAC Service', () => {
  let rbacService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/rbacService.js');
    rbacService = mod.rbacService;
  });

  it('should return permissions for admin role via getSystemRoles', () => {
    const roles = rbacService.getSystemRoles();
    expect(roles.admin).toBeDefined();
    expect(roles.admin.permissions).toContain('products:create');
    expect(roles.admin.permissions).toContain('permissions:manage');
  });

  it('should have vendor role with limited permissions', () => {
    const roles = rbacService.getSystemRoles();
    expect(roles.vendor.permissions).toContain('products:create');
    expect(roles.vendor.permissions).not.toContain('users:manage');
  });

  it('should have user role with minimal permissions', () => {
    const roles = rbacService.getSystemRoles();
    expect(roles.user.permissions).toContain('products:read');
    expect(roles.user.permissions).not.toContain('products:create');
    expect(roles.user.permissions).not.toContain('roles:manage');
  });

  it('should return permission definitions', () => {
    const defs = rbacService.getPermissionDefinitions();
    const products = defs.filter(d => d.group === 'products');
    expect(products.length).toBeGreaterThanOrEqual(4);
  });

  it('should check permission via checkPermission', async () => {
    const User = (await import('../models/userModel.js')).default;
    const userMock = {
      _id: 'uid1',
      role: 'admin',
      roleRef: {
        _id: 'r1',
        permissions: [...mockPermissions],
        populate: vi.fn().mockReturnThis(),
      },
      populate: vi.fn(function () { return Promise.resolve(this); }),
    };
    User.findById.mockReturnValue(userMock);
    const result = await rbacService.checkPermission('uid1', 'products:read');
    expect(result).toBe(true);
  });

  it('should return false for missing permission', async () => {
    const User = (await import('../models/userModel.js')).default;
    const userMock = {
      _id: 'uid1',
      role: 'admin',
      roleRef: {
        _id: 'r1',
        permissions: [...mockPermissions],
        populate: vi.fn().mockReturnThis(),
      },
      populate: vi.fn(function () { return Promise.resolve(this); }),
    };
    User.findById.mockReturnValue(userMock);
    const result = await rbacService.checkPermission('uid1', 'nonexistent:perm');
    expect(result).toBe(false);
  });
});
