import { Role } from '../models/Role.js';
import { Permission } from '../models/Permission.js';
import { Department } from '../models/Department.js';
import User from '../models/userModel.js';
import { rbacService } from '../services/rbacService.js';

// --- Permissions ---
export const listPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({}).sort({ group: 1, name: 1 });
    res.json({ status: true, data: permissions });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// --- Roles ---
export const listRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).populate('permissions').sort({ priority: -1 });
    res.json({ status: true, data: roles });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate('permissions');
    if (!role) return res.status(404).json({ status: false, message: 'Role not found' });
    res.json({ status: true, data: role });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, label, description, permissions, priority } = req.body;
    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) return res.status(400).json({ status: false, message: 'Role already exists' });

    const role = await Role.create({
      name: name.toLowerCase(),
      label,
      description,
      permissions,
      priority: priority || 0,
      isSystem: false,
    });

    const populated = await Role.findById(role._id).populate('permissions');
    res.status(201).json({ status: true, data: populated });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { label, description, permissions, priority } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { label, description, permissions, priority },
      { new: true, runValidators: true },
    ).populate('permissions');

    if (!role) return res.status(404).json({ status: false, message: 'Role not found' });
    res.json({ status: true, data: role });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ status: false, message: 'Role not found' });
    if (role.isSystem) return res.status(400).json({ status: false, message: 'Cannot delete system role' });

    await Role.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Role deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const assignUserRole = async (req, res) => {
  try {
    const { userId, roleName } = req.body;
    const user = await rbacService.assignRole(userId, roleName);
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    res.json({ status: true, data: user });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// --- Departments ---
export const listDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).populate('headUser', 'name email').populate('parentDepartment', 'name');
    res.json({ status: true, data: departments });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headUser', 'name email')
      .populate('parentDepartment', 'name');
    if (!department) return res.status(404).json({ status: false, message: 'Department not found' });
    res.json({ status: true, data: department });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, headUser, parentDepartment, isActive } = req.body;
    const existing = await Department.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ status: false, message: 'Department code already exists' });

    const department = await Department.create({
      name, code: code.toUpperCase(), description, headUser, parentDepartment, isActive,
    });
    res.status(201).json({ status: true, data: department });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('headUser', 'name email')
      .populate('parentDepartment', 'name');
    if (!department) return res.status(404).json({ status: false, message: 'Department not found' });
    res.json({ status: true, data: department });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ status: false, message: 'Department not found' });
    await Department.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// --- RBAC Initialize ---
export const initializeRBAC = async (req, res) => {
  try {
    await rbacService.initialize();
    res.json({ status: true, message: 'RBAC initialized successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

// --- Bulk user role management ---
export const listUsersWithRoles = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').populate('roleRef', 'name label').populate('department', 'name code');
    res.json({ status: true, data: users });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

