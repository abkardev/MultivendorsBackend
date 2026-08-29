import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import StoreEmployee from "../models/StoreEmployee.js";
import { Vendor } from "../models/vendorModel.js";
import User from "../models/userModel.js";
import { AppError } from "../middlewares/errorHandler.js";
import mongoose from "mongoose";

const popOptions = [
  { path: "user", select: "name email phone isActive" },
  { path: "role", select: "name label" },
  { path: "permissions", select: "name label" },
  { path: "assignedBy", select: "name email" },
];

// @desc Get all employees for the vendor's store
// @route GET /api/store-employees
// @access Private/Vendor
export const getEmployees = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const { status, page = 1, limit = 20 } = req.query;
  const filter = { vendor: vendor._id };
  if (status) filter.status = status;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [employees, total] = await Promise.all([
    StoreEmployee.find(filter).populate(popOptions).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    StoreEmployee.countDocuments(filter),
  ]);

  res.json({
    status: true,
    data: employees,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
  });
});

// @desc Get a single employee
// @route GET /api/store-employees/:id
// @access Private/Vendor
export const getEmployee = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const employee = await StoreEmployee.findOne({ _id: req.params.id, vendor: vendor._id }).populate(popOptions);
  if (!employee) throw new AppError("Employee not found", 404);

  res.json({ status: true, data: employee });
});

// @desc Add an existing user as employee
// @route POST /api/store-employees/add
// @access Private/Vendor
export const addEmployee = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const { email, role, permissions, notes } = req.body;
  if (!email) throw new AppError("Email is required", 400);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError("No user found with this email", 404);

  const existing = await StoreEmployee.findOne({ vendor: vendor._id, user: user._id });
  if (existing) throw new AppError("This user is already an employee of your store", 400);

  const employee = await StoreEmployee.create({
    vendor: vendor._id,
    user: user._id,
    role: role || undefined,
    permissions: permissions || [],
    status: "active",
    joinedAt: new Date(),
    assignedBy: req.user._id,
    notes,
  });

  const populated = await StoreEmployee.findById(employee._id).populate(popOptions);
  res.status(201).json({ status: true, data: populated });
});

// @desc Invite a new user via email
// @route POST /api/store-employees/invite
// @access Private/Vendor
export const inviteEmployee = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const { email, role, permissions, notes } = req.body;
  if (!email) throw new AppError("Email is required", 400);

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const alreadyEmployee = await StoreEmployee.findOne({ vendor: vendor._id, user: existingUser._id });
    if (alreadyEmployee) throw new AppError("This user is already associated with your store", 400);
  }

  const existingInvite = await StoreEmployee.findOne({
    vendor: vendor._id,
    "invitation.email": email.toLowerCase(),
    status: "invited",
  });
  if (existingInvite) throw new AppError("An invitation has already been sent to this email", 400);

  const token = crypto.randomBytes(32).toString("hex");
  const employee = await StoreEmployee.create({
    vendor: vendor._id,
    user: existingUser?._id || undefined,
    role: role || undefined,
    permissions: permissions || [],
    status: "invited",
    invitation: {
      token,
      email: email.toLowerCase(),
      invitedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    assignedBy: req.user._id,
    notes,
  });

  const populated = await StoreEmployee.findById(employee._id).populate(popOptions);
  res.status(201).json({
    status: true,
    data: populated,
    invitationLink: `${process.env.FRONTEND_URL || "http://localhost:5173"}/accept-invitation?token=${token}`,
  });
});

// @desc Update employee role/permissions/status
// @route PUT /api/store-employees/:id
// @access Private/Vendor
export const updateEmployee = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const { role, permissions, status, notes } = req.body;
  const update = {};
  if (role !== undefined) update.role = role || null;
  if (permissions !== undefined) update.permissions = permissions;
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = notes;

  const employee = await StoreEmployee.findOneAndUpdate(
    { _id: req.params.id, vendor: vendor._id },
    update,
    { new: true, runValidators: true }
  ).populate(popOptions);

  if (!employee) throw new AppError("Employee not found", 404);
  res.json({ status: true, data: employee });
});

// @desc Remove employee
// @route DELETE /api/store-employees/:id
// @access Private/Vendor
export const removeEmployee = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const employee = await StoreEmployee.findOneAndDelete({ _id: req.params.id, vendor: vendor._id });
  if (!employee) throw new AppError("Employee not found", 404);

  res.json({ status: true, message: "Employee removed from store" });
});

// @desc Accept invitation (by invited user)
// @route POST /api/store-employees/accept-invitation
// @access Private
export const acceptInvitation = expressAsyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError("Token is required", 400);

  const employee = await StoreEmployee.findOne({ "invitation.token": token, status: "invited" });
  if (!employee) throw new AppError("Invalid or expired invitation", 404);
  if (employee.invitation.expiresAt < new Date()) throw new AppError("Invitation has expired", 410);

  employee.status = "active";
  employee.user = req.user._id;
  employee.joinedAt = new Date();
  employee.invitation.acceptedAt = new Date();
  employee.invitation.token = undefined;
  await employee.save();

  const populated = await StoreEmployee.findById(employee._id).populate(popOptions);
  res.json({ status: true, data: populated });
});

// @desc Get employee count for the vendor (for plan limit checks)
// @route GET /api/store-employees/count
// @access Private/Vendor
export const getEmployeeCount = expressAsyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) throw new AppError("Vendor profile not found", 404);

  const count = await StoreEmployee.countDocuments({ vendor: vendor._id, status: "active" });
  res.json({ status: true, data: { count } });
});

