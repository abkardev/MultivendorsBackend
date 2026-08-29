import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import User from '../models/userModel.js';

const PERMISSION_DEFINITIONS = [
  // Products
  { name: 'products:create', label: { en: 'Create Products', ar: 'إنشاء المنتجات' }, group: 'products' },
  { name: 'products:read', label: { en: 'View Products', ar: 'عرض المنتجات' }, group: 'products' },
  { name: 'products:update', label: { en: 'Edit Products', ar: 'تعديل المنتجات' }, group: 'products' },
  { name: 'products:delete', label: { en: 'Delete Products', ar: 'حذف المنتجات' }, group: 'products' },
  // Orders
  { name: 'orders:create', label: { en: 'Create Orders', ar: 'إنشاء الطلبات' }, group: 'orders' },
  { name: 'orders:read', label: { en: 'View Orders', ar: 'عرض الطلبات' }, group: 'orders' },
  { name: 'orders:update', label: { en: 'Update Orders', ar: 'تحديث الطلبات' }, group: 'orders' },
  { name: 'orders:delete', label: { en: 'Delete Orders', ar: 'حذف الطلبات' }, group: 'orders' },
  // Users
  { name: 'users:create', label: { en: 'Create Users', ar: 'إنشاء المستخدمين' }, group: 'users' },
  { name: 'users:read', label: { en: 'View Users', ar: 'عرض المستخدمين' }, group: 'users' },
  { name: 'users:update', label: { en: 'Update Users', ar: 'تحديث المستخدمين' }, group: 'users' },
  { name: 'users:delete', label: { en: 'Delete Users', ar: 'حذف المستخدمين' }, group: 'users' },
  // Analytics
  { name: 'analytics:view', label: { en: 'View Analytics', ar: 'عرض التحليلات' }, group: 'analytics' },
  { name: 'analytics:export', label: { en: 'Export Analytics', ar: 'تصدير التحليلات' }, group: 'analytics' },
  // Tenders
  { name: 'tenders:create', label: { en: 'Create Tenders', ar: 'إنشاء المناقصات' }, group: 'tenders' },
  { name: 'tenders:read', label: { en: 'View Tenders', ar: 'عرض المناقصات' }, group: 'tenders' },
  { name: 'tenders:update', label: { en: 'Update Tenders', ar: 'تحديث المناقصات' }, group: 'tenders' },
  { name: 'tenders:delete', label: { en: 'Delete Tenders', ar: 'حذف المناقصات' }, group: 'tenders' },
  { name: 'tenders:bid', label: { en: 'Bid on Tenders', ar: 'تقديم عروض المناقصات' }, group: 'tenders' },
  // RFQ
  { name: 'rfq:create', label: { en: 'Create RFQ', ar: 'إنشاء طلب عروض الأسعار' }, group: 'rfq' },
  { name: 'rfq:read', label: { en: 'View RFQ', ar: 'عرض طلبات عروض الأسعار' }, group: 'rfq' },
  { name: 'rfq:update', label: { en: 'Update RFQ', ar: 'تحديث طلب عروض الأسعار' }, group: 'rfq' },
  { name: 'rfq:delete', label: { en: 'Delete RFQ', ar: 'حذف طلب عروض الأسعار' }, group: 'rfq' },
  // Procurement
  { name: 'procurement:create', label: { en: 'Create Procurement', ar: 'إنشاء المشتريات' }, group: 'procurement' },
  { name: 'procurement:read', label: { en: 'View Procurement', ar: 'عرض المشتريات' }, group: 'procurement' },
  { name: 'procurement:update', label: { en: 'Update Procurement', ar: 'تحديث المشتريات' }, group: 'procurement' },
  { name: 'procurement:approve', label: { en: 'Approve Procurement', ar: 'الموافقة على المشتريات' }, group: 'procurement' },
  // Reviews
  { name: 'reviews:create', label: { en: 'Create Reviews', ar: 'إنشاء التقييمات' }, group: 'reviews' },
  { name: 'reviews:approve', label: { en: 'Approve Reviews', ar: 'الموافقة على التقييمات' }, group: 'reviews' },
  { name: 'reviews:delete', label: { en: 'Delete Reviews', ar: 'حذف التقييمات' }, group: 'reviews' },
  // Brands
  { name: 'brands:create', label: { en: 'Create Brands', ar: 'إنشاء العلامات التجارية' }, group: 'brands' },
  { name: 'brands:update', label: { en: 'Update Brands', ar: 'تحديث العلامات التجارية' }, group: 'brands' },
  { name: 'brands:delete', label: { en: 'Delete Brands', ar: 'حذف العلامات التجارية' }, group: 'brands' },
  // Categories
  { name: 'categories:create', label: { en: 'Create Categories', ar: 'إنشاء الفئات' }, group: 'categories' },
  { name: 'categories:update', label: { en: 'Update Categories', ar: 'تحديث الفئات' }, group: 'categories' },
  { name: 'categories:delete', label: { en: 'Delete Categories', ar: 'حذف الفئات' }, group: 'categories' },
  // Support
  { name: 'support:read', label: { en: 'View Tickets', ar: 'عرض التذاكر' }, group: 'support' },
  { name: 'support:update', label: { en: 'Update Tickets', ar: 'تحديث التذاكر' }, group: 'support' },
  { name: 'support:assign', label: { en: 'Assign Tickets', ar: 'تعيين التذاكر' }, group: 'support' },
  { name: 'support:delete', label: { en: 'Delete Tickets', ar: 'حذف التذاكر' }, group: 'support' },
  // Advertising
  { name: 'advertising:create', label: { en: 'Create Campaigns', ar: 'إنشاء الحملات' }, group: 'advertising' },
  { name: 'advertising:read', label: { en: 'View Campaigns', ar: 'عرض الحملات' }, group: 'advertising' },
  { name: 'advertising:update', label: { en: 'Update Campaigns', ar: 'تحديث الحملات' }, group: 'advertising' },
  { name: 'advertising:delete', label: { en: 'Delete Campaigns', ar: 'حذف الحملات' }, group: 'advertising' },
  // Settings
  { name: 'settings:read', label: { en: 'View Settings', ar: 'عرض الإعدادات' }, group: 'settings' },
  { name: 'settings:update', label: { en: 'Update Settings', ar: 'تحديث الإعدادات' }, group: 'settings' },
  // Documents
  { name: 'documents:upload', label: { en: 'Upload Documents', ar: 'رفع المستندات' }, group: 'documents' },
  { name: 'documents:read', label: { en: 'View Documents', ar: 'عرض المستندات' }, group: 'documents' },
  { name: 'documents:delete', label: { en: 'Delete Documents', ar: 'حذف المستندات' }, group: 'documents' },
  { name: 'documents:verify', label: { en: 'Verify Documents', ar: 'التحقق من المستندات' }, group: 'documents' },
  // Notifications
  { name: 'notifications:send', label: { en: 'Send Notifications', ar: 'إرسال الإشعارات' }, group: 'notifications' },
  { name: 'notifications:read', label: { en: 'View Notifications', ar: 'عرض الإشعارات' }, group: 'notifications' },
  // Departments
  { name: 'departments:manage', label: { en: 'Manage Departments', ar: 'إدارة الأقسام' }, group: 'departments' },
  // Roles
  { name: 'roles:manage', label: { en: 'Manage Roles', ar: 'إدارة الأدوار' }, group: 'roles' },
  // Permissions
  { name: 'permissions:manage', label: { en: 'Manage Permissions', ar: 'إدارة الصلاحيات' }, group: 'permissions' },
];

const SYSTEM_ROLES = {
  admin: {
    permissions: PERMISSION_DEFINITIONS.map(p => p.name),
    label: { en: 'Administrator', ar: 'مسؤول النظام' },
    description: { en: 'Full system access', ar: 'صلاحية كاملة للنظام' },
    priority: 100,
  },
  vendor: {
    permissions: [
      'products:create', 'products:read', 'products:update', 'products:delete',
      'orders:create', 'orders:read', 'orders:update',
      'tenders:read', 'tenders:bid',
      'rfq:read',
      'reviews:read',
      'advertising:create', 'advertising:read', 'advertising:update', 'advertising:delete',
      'analytics:view',
      'documents:upload', 'documents:read',
      'notifications:read',
    ],
    label: { en: 'Vendor', ar: 'مورد' },
    description: { en: 'Vendor access to products, orders, and campaigns', ar: 'صلاحية المورد للمنتجات والطلبات والحملات' },
    priority: 50,
  },
  user: {
    permissions: [
      'products:read',
      'orders:create', 'orders:read',
      'tenders:read', 'tenders:create',
      'rfq:create', 'rfq:read',
      'reviews:create',
      'analytics:view',
      'documents:upload', 'documents:read',
      'notifications:read',
    ],
    label: { en: 'Buyer', ar: 'مشتري' },
    description: { en: 'Buyer access to orders, tenders, and RFQ', ar: 'صلاحية المشتري للطلبات والمناقصات وطلبات عروض الأسعار' },
    priority: 10,
  },
};

class RBACService {
  async initialize() {
    await this._seedPermissions();
    await this._seedRoles();
    await this._migrateExistingUsers();
  }

  async _seedPermissions() {
    for (const def of PERMISSION_DEFINITIONS) {
      await Permission.findOneAndUpdate(
        { name: def.name },
        { $setOnInsert: { ...def } },
        { upsert: true, new: true },
      );
    }
  }

  async _seedRoles() {
    const allPermissions = await Permission.find({});
    const permMap = {};
    for (const p of allPermissions) {
      permMap[p.name] = p._id;
    }

    for (const [roleName, config] of Object.entries(SYSTEM_ROLES)) {
      const permissionIds = config.permissions
        .filter(name => permMap[name])
        .map(name => permMap[name]);

      await Role.findOneAndUpdate(
        { name: roleName },
        {
          $set: {
            label: config.label,
            description: config.description,
            isSystem: true,
            priority: config.priority,
          },
          $addToSet: { permissions: { $each: permissionIds } },
        },
        { upsert: true, new: true },
      );
    }
  }

  async _migrateExistingUsers() {
    const roles = await Role.find({});
    const roleMap = {};
    for (const r of roles) {
      roleMap[r.name] = r._id;
    }

    const users = await User.find({ role: { $in: ['user', 'vendor', 'admin'] } });
    for (const user of users) {
      const roleId = roleMap[user.role];
      if (roleId && (!user.roleRef || String(user.roleRef) !== String(roleId))) {
        await User.findByIdAndUpdate(user._id, { roleRef: roleId });
      }
    }
  }

  async getUserPermissions(userId) {
    const user = await User.findById(userId).populate({
      path: 'roleRef',
      populate: { path: 'permissions' },
    });
    if (!user || !user.roleRef) return [];
    return user.roleRef.permissions.map(p => p.name);
  }

  async checkPermission(userId, permissionName) {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionName);
  }

  async getRolePermissions(roleName) {
    const role = await Role.findOne({ name: roleName }).populate('permissions');
    if (!role) return [];
    return role.permissions.map(p => p.name);
  }

  async assignRole(userId, roleName) {
    const role = await Role.findOne({ name: roleName });
    if (!role) throw new Error(`Role '${roleName}' not found`);
    return User.findByIdAndUpdate(userId, {
      role: roleName,
      roleRef: role._id,
    }, { new: true });
  }

  getSystemRoles() {
    return SYSTEM_ROLES;
  }

  getPermissionDefinitions() {
    return PERMISSION_DEFINITIONS;
  }
}

export const rbacService = new RBACService();

