import expressAsyncHandler from 'express-async-handler';
import { ComplianceVerification } from '../models/ComplianceVerification.js';
import { ComplianceChecklist } from '../models/ComplianceChecklist.js';
import { VerificationProvider } from '../models/VerificationProvider.js';
import { Document } from '../models/Document.js';
import { Vendor } from '../models/vendorModel.js';
import AuditLog from '../models/AuditLog.js';
import { complianceEngine } from '../services/complianceService.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sanitizeBody } from '../utils/sanitize.js';

const ALLOWED_FIELDS = ['vendor', 'type', 'name', 'description', 'file', 'status', 'notes', 'expiryDate'];

export const getComplianceStatus = expressAsyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const status = await complianceEngine.getVerificationStatus(vendorId);
  res.json({ status: true, data: status });
});

export const getComplianceScore = expressAsyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId || req.user._id;
  const verification = await complianceEngine.getOrCreateVerification(vendorId);
  res.json({ status: true, data: { score: verification.score, status: verification.status, riskLevel: verification.riskLevel } });
});

export const uploadComplianceDocument = expressAsyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const { documentId, docType } = req.body;
  if (!documentId || !docType) throw new AppError('documentId and docType are required', 400);

  const doc = await Document.findById(documentId);
  if (!doc) throw new AppError('Document not found', 404);

  const result = await complianceEngine.processDocumentUpload(vendorId, documentId, docType);
  res.json({ status: true, data: result });
});

export const recalculateScore = expressAsyncHandler(async (req, res) => {
  const vendorId = req.params.vendorId || req.user._id;
  const score = await complianceEngine.calculateComplianceScore(vendorId);
  res.json({ status: true, data: { score } });
});

export const getComplianceDashboard = expressAsyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const status = await complianceEngine.getVerificationStatus(vendorId);
  const expiryData = await complianceEngine.getExpiryMonitorData();
  const vendorExpiry = {
    expired: expiryData.expired.filter(e => String(e.vendor) === String(vendorId)),
    expiring90: expiryData.expiring90.filter(e => String(e.vendor) === String(vendorId)),
    expiring30: expiryData.expiring30.filter(e => String(e.vendor) === String(vendorId)),
    expiring7: expiryData.expiring7.filter(e => String(e.vendor) === String(vendorId)),
  };

  res.json({ status: true, data: { ...status, expiryMonitor: vendorExpiry } });
});

export const getAdminComplianceDashboard = expressAsyncHandler(async (req, res) => {
  const dashboard = await complianceEngine.getAdminDashboard();
  res.json({ status: true, data: dashboard });
});

export const getAdminVerificationQueue = expressAsyncHandler(async (req, res) => {
  const queue = await ComplianceVerification.find({
    status: { $in: ['pending_documents', 'pending_review'] },
  }).populate('vendor', 'name email').sort({ updatedAt: -1 });

  const enriched = [];
  for (const v of queue) {
    const vendorProfile = await Vendor.findOne({ user: v.vendor }).select('storeName slug storeImage');
    enriched.push({ verification: v, vendor: vendorProfile });
  }
  res.json({ status: true, data: enriched });
});

export const getExpiryMonitoring = expressAsyncHandler(async (req, res) => {
  const data = await complianceEngine.getExpiryMonitorData();
  res.json({ status: true, data });
});

export const adminReviewCompliance = expressAsyncHandler(async (req, res) => {
  const { vendorId, action, notes, score, badge } = req.body;
  if (!['approve', 'reject', 'conditionally_approve', 'reset'].includes(action)) {
    throw new AppError('Invalid action. Use approve, reject, conditionally_approve, or reset', 400);
  }

  const result = await complianceEngine.adminReview(vendorId, action, { notes, score, badge, performedBy: req.user._id });
  res.json({ status: true, data: result });
});

export const getComplianceReports = expressAsyncHandler(async (req, res) => {
  const { status, riskLevel, badge } = req.query;
  const reports = await complianceEngine.getComplianceReports({ status, riskLevel, badge });
  res.json({ status: true, data: reports });
});

export const getComplianceAuditLogs = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find({ resource: /compliance/ })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('performedBy', 'name email');

  const total = await AuditLog.countDocuments({ resource: /compliance/ });

  res.json({ status: true, data: { logs, total, page: Number(page), pages: Math.ceil(total / limit) } });
});

export const getRiskAnalysis = expressAsyncHandler(async (req, res) => {
  const highRisk = await ComplianceVerification.find({ riskLevel: 'high' })
    .populate('vendor', 'name email')
    .sort({ 'score.total': 1 });

  const mediumRisk = await ComplianceVerification.find({ riskLevel: 'medium' })
    .populate('vendor', 'name email')
    .sort({ 'score.total': 1 });

  const lowRisk = await ComplianceVerification.find({ riskLevel: 'low' })
    .populate('vendor', 'name email')
    .sort({ 'score.total': -1 });

  res.json({
    status: true,
    data: {
      high: { count: highRisk.length, vendors: highRisk },
      medium: { count: mediumRisk.length, vendors: mediumRisk },
      low: { count: lowRisk.length, vendors: lowRisk },
    },
  });
});

export const getChecklists = expressAsyncHandler(async (req, res) => {
  const checklists = await ComplianceChecklist.find({ isActive: true }).sort({ isDefault: -1 });
  res.json({ status: true, data: checklists });
});

export const createChecklist = expressAsyncHandler(async (req, res) => {
  const checklist = await ComplianceChecklist.create(sanitizeBody(req.body, ALLOWED_FIELDS));
  res.status(201).json({ status: true, data: checklist });
});

export const updateChecklist = expressAsyncHandler(async (req, res) => {
  const checklist = await ComplianceChecklist.findByIdAndUpdate(req.params.id, sanitizeBody(req.body, ALLOWED_FIELDS), { new: true, runValidators: true });
  if (!checklist) throw new AppError('Checklist not found', 404);
  res.json({ status: true, data: checklist });
});

export const getProviders = expressAsyncHandler(async (req, res) => {
  const providers = await VerificationProvider.find({}).sort({ priority: -1 });
  res.json({ status: true, data: providers });
});

export const createProvider = expressAsyncHandler(async (req, res) => {
  const provider = await VerificationProvider.create(req.body);
  res.status(201).json({ status: true, data: provider });
});

export const updateProvider = expressAsyncHandler(async (req, res) => {
  const provider = await VerificationProvider.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!provider) throw new AppError('Provider not found', 404);
  res.json({ status: true, data: provider });
});

export const toggleProvider = expressAsyncHandler(async (req, res) => {
  const provider = await VerificationProvider.findById(req.params.id);
  if (!provider) throw new AppError('Provider not found', 404);
  provider.isActive = !provider.isActive;
  await provider.save();
  res.json({ status: true, data: provider });
});

export const getBadgeStatus = expressAsyncHandler(async (req, res) => {
  const vendorId = req.user._id;
  const verification = await ComplianceVerification.findOne({ vendor: vendorId });
  if (!verification || verification.badge === 'none') {
    res.json({ status: true, data: { hasBadge: false, badge: 'none' } });
    return;
  }
  res.json({
    status: true,
    data: {
      hasBadge: true,
      badge: verification.badge,
      assignedAt: verification.badgeAssignedAt,
      expiresAt: verification.badgeExpiresAt,
      isExpired: verification.badgeExpiresAt ? new Date() > verification.badgeExpiresAt : false,
    },
  });
});

export const assignBadge = expressAsyncHandler(async (req, res) => {
  const { vendorId, badge } = req.body;
  if (!['verified_saudi_factory', 'verified_supplier', 'trusted_partner'].includes(badge)) {
    throw new AppError('Invalid badge type', 400);
  }
  const verification = await complianceEngine.getOrCreateVerification(vendorId);
  verification.badge = badge;
  verification.badgeAssignedAt = new Date();
  verification.badgeExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  verification.badgeAssignedBy = req.user._id;
  await verification.save();

  await AuditLog.create({
    action: 'update', resource: 'compliance_badge', resourceId: vendorId,
    description: `Badge ${badge} assigned to vendor`,
    performedBy: req.user._id, performedByRole: 'admin', performedByName: req.user.name,
    metadata: { vendorId, badge },
  });

  res.json({ status: true, data: verification });
});

export const removeBadge = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.body;
  const verification = await ComplianceVerification.findOne({ vendor: vendorId });
  if (!verification) throw new AppError('Verification record not found', 404);

  const oldBadge = verification.badge;
  verification.badge = 'none';
  verification.badgeAssignedAt = null;
  verification.badgeExpiresAt = null;
  verification.badgeAssignedBy = null;
  await verification.save();

  await AuditLog.create({
    action: 'update', resource: 'compliance_badge', resourceId: vendorId,
    description: `Badge ${oldBadge} removed from vendor`,
    performedBy: req.user._id, performedByRole: 'admin', performedByName: req.user.name,
    metadata: { vendorId, oldBadge },
  });

  res.json({ status: true, data: verification });
});
