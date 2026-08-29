import { ComplianceVerification } from '../models/ComplianceVerification.js';
import { ComplianceChecklist } from '../models/ComplianceChecklist.js';
import { VerificationProvider } from '../models/VerificationProvider.js';
import { Document } from '../models/Document.js';
import { Vendor } from '../models/vendorModel.js';
import AuditLog from '../models/AuditLog.js';
import { notificationService } from './notificationService.js';
import { providerRegistry, getProviderChain } from './verificationProviderService.js';

const SCORE_WEIGHTS = {
  commercial_registration: { weight: 30, label: { en: 'Commercial Registration', ar: 'السجل التجاري' } },
  vat_certificate: { weight: 20, label: { en: 'VAT Certificate', ar: 'شهادة ضريبة القيمة المضافة' } },
  national_address: { weight: 15, label: { en: 'National Address', ar: 'العنوان الوطني' } },
  factory_license: { weight: 20, label: { en: 'Factory License', ar: 'رخصة المصنع' } },
  iso_certifications: { weight: 10, label: { en: 'ISO Certifications', ar: 'شهادات الآيزو' } },
  additional_certifications: { weight: 5, label: { en: 'Additional Certifications', ar: 'شهادات إضافية' } },
};

class ComplianceVerificationEngine {
  async getOrCreateVerification(vendorId) {
    let verification = await ComplianceVerification.findOne({ vendor: vendorId })
      .populate('documents.document');
    if (!verification) {
      verification = await ComplianceVerification.create({
        vendor: vendorId,
        status: 'unverified',
        score: { total: 0, commercialRegistration: 0, vatCertificate: 0, nationalAddress: 0, factoryLicense: 0, isoCertifications: 0, additionalCertifications: 0 },
      });
    }
    return verification;
  }

  async getVerificationStatus(vendorId) {
    const verification = await this.getOrCreateVerification(vendorId);
    const checklist = await ComplianceChecklist.findOne({ isDefault: true }) || await this._createDefaultChecklist();
    const requiredDocs = checklist.items.filter(i => i.required).map(i => i.docType);
    const uploadedDocs = verification.documents.filter(d => d.status !== 'pending');
    const missingDocs = requiredDocs.filter(rd => !uploadedDocs.some(ud => ud.docType === rd));
    const expiringDocs = verification.documents.filter(d =>
      d.expiryDate && !d.isExpired && d.expiryDate < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    );
    return {
      verification,
      checklist: checklist.items,
      requiredDocs,
      uploadedDocs,
      missingDocs,
      expiringDocs,
      progress: requiredDocs.length > 0 ? Math.round((uploadedDocs.length / requiredDocs.length) * 100) : 0,
    };
  }

  async processDocumentUpload(vendorId, documentId, docType) {
    const document = await Document.findById(documentId);
    if (!document) throw new Error('Document not found');

    let verification = await this.getOrCreateVerification(vendorId);
    const docEntry = verification.documents.find(d => String(d.document) === documentId);

    if (!docEntry) {
      verification.documents.push({
        document: documentId,
        docType,
        status: 'processing',
        extractedData: {},
        validationResults: [],
        expiryDate: document.expiryDate,
      });
      await verification.save();
    }

    verification = await ComplianceVerification.findOne({ vendor: vendorId });
    const entry = verification.documents.find(d => String(d.document) === documentId) ||
      verification.documents[verification.documents.length - 1];

    const providerChain = await getProviderChain(null, docType);
    const mockContent = `${document.title?.en || 'Document'} ${docType} ${Date.now()}`;
    const docForProviders = { content: mockContent, fileName: document.versions?.[0]?.fileName || '', fileSize: document.versions?.[0]?.fileSize };

    entry.ocrStatus = 'processing';
    await verification.save();

    const { results: ocrResults, bestResult: ocrBest } = await providerRegistry.verifyWithChain(
      docForProviders, ['ocr'], {}
    );

    entry.ocrStatus = ocrBest?.status === 'success' ? 'completed' : 'failed';
    entry.ocrConfidence = ocrBest?.confidence || 0;
    entry.extractedData = ocrBest?.data?.extracted || {};
    entry.verificationAttempts.push({ provider: 'ocr', status: ocrBest?.status || 'failed', confidence: ocrBest?.confidence || 0, result: ocrBest, duration: 0 });
    await verification.save();

    const { results: aiResults, bestResult: aiBest } = await providerRegistry.verifyWithChain(
      docForProviders, ['ai'], entry.extractedData
    );

    if (aiBest) {
      entry.validationResults = aiBest.data?.validations || [];
      entry.validationScore = aiBest.confidence;
      entry.verificationAttempts.push({ provider: 'ai', status: aiBest.status, confidence: aiBest.confidence, result: aiBest, duration: 0 });
    }
    await verification.save();

    if (ocrBest?.status === 'success' && aiBest?.status === 'success' && aiBest.confidence >= 70) {
      entry.status = 'verified';
    } else if (aiBest?.confidence >= 40) {
      entry.status = 'pending';
    } else {
      entry.status = 'rejected';
    }
    await verification.save();

    const scoreResult = await this.calculateComplianceScore(vendorId);
    await this._updateOverallStatus(vendorId);

    await this._logAudit('upload', 'document', documentId, {
      vendor: vendorId, docType, ocrConfidence: entry.ocrConfidence, validationScore: entry.validationScore,
      status: entry.status, score: scoreResult.total,
      message: `Document ${docType} processed with OCR confidence ${entry.ocrConfidence}%`,
    });

    if (entry.status === 'verified') {
      const user = await Vendor.findOne({ user: vendorId }).populate('user', 'name email');
      await notificationService.send({
        recipient: vendorId,
        type: 'verification_submitted',
        title: { en: 'Document Verified', ar: 'تم التحقق من المستند' },
        body: { en: `Your ${docType.replace(/_/g, ' ')} has been verified.`, ar: `تم التحقق من ${docType}.` },
        priority: 'medium',
        channels: ['in_app', 'email'],
        link: '/vendor/compliance',
      });
    }

    return { document: entry, score: scoreResult, verification };
  }

  async calculateComplianceScore(vendorId) {
    const verification = await this.getOrCreateVerification(vendorId)
      .then(v => ComplianceVerification.findOne({ vendor: vendorId }).populate('documents.document'));

    const score = {
      commercialRegistration: 0,
      vatCertificate: 0,
      nationalAddress: 0,
      factoryLicense: 0,
      isoCertifications: 0,
      additionalCertifications: 0,
    };

    const breakdown = [];

    for (const doc of verification.documents) {
      if (doc.status !== 'verified' && doc.status !== 'approved') continue;
      const weight = SCORE_WEIGHTS[doc.docType];
      if (!weight) continue;

      const qualityFactor = doc.validationScore / 100;
      const earnedScore = Math.round(weight.weight * qualityFactor);

      const keyMap = {
        commercial_registration: 'commercialRegistration',
        vat_certificate: 'vatCertificate',
        national_address: 'nationalAddress',
        factory_license: 'factoryLicense',
        iso_certifications: 'isoCertifications',
        additional_certifications: 'additionalCertifications',
      };

      const scoreKey = keyMap[doc.docType];
      if (scoreKey && score[scoreKey] === 0) {
        score[scoreKey] = Math.min(earnedScore, weight.weight);
      } else if (scoreKey && doc.docType === 'iso_certifications') {
        score.isoCertifications = Math.min(score.isoCertifications + earnedScore, 10);
      } else if (scoreKey && doc.docType === 'additional_certifications') {
        score.additionalCertifications = Math.min(score.additionalCertifications + earnedScore, 5);
      }
    }

    const total = Object.values(score).reduce((s, v) => s + v, 0);

    for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
      const scoreKeyMap = {
        commercial_registration: 'commercialRegistration',
        vat_certificate: 'vatCertificate',
        national_address: 'nationalAddress',
        factory_license: 'factoryLicense',
        iso_certifications: 'isoCertifications',
        additional_certifications: 'additionalCertifications',
      };
      const sk = scoreKeyMap[key];
      breakdown.push({
        category: key,
        label: weight.label,
        weight: weight.weight,
        score: score[sk] || 0,
        maxScore: weight.weight,
        details: `${score[sk] || 0}/${weight.weight} points`,
      });
    }

    verification.score = {
      total: Math.min(total, 100),
      ...score,
      lastCalculated: new Date(),
      breakdown,
    };
    await verification.save();

    await this._logAudit('update', 'compliance_score', String(vendorId), {
      vendor: vendorId, score: total, breakdown,
      message: `Compliance score updated to ${total}/100`,
    });

    return verification.score;
  }

  async _updateOverallStatus(vendorId) {
    const verification = await this.getOrCreateVerification(vendorId);
    const score = verification.score.total;
    const allVerified = verification.documents.length > 0 && verification.documents.every(d =>
      d.status === 'verified' || d.status === 'approved'
    );
    const hasPending = verification.documents.some(d => d.status === 'pending' || d.status === 'processing');
    const hasRejected = verification.documents.some(d => d.status === 'rejected');

    let newStatus = verification.status;
    let newRiskLevel = verification.riskLevel;

    if (verification.documents.length === 0) {
      newStatus = 'unverified';
      newRiskLevel = 'uncalculated';
    } else if (hasPending) {
      newStatus = 'pending_review';
      newRiskLevel = 'medium';
    } else if (hasRejected) {
      newStatus = 'rejected';
      newRiskLevel = 'high';
    } else if (score >= 90 && allVerified) {
      newStatus = 'verified';
      newRiskLevel = 'low';
      if (verification.badge === 'none') {
        verification.badge = 'verified_saudi_factory';
        verification.badgeAssignedAt = new Date();
        verification.badgeExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
    } else if (score >= 70 && allVerified) {
      newStatus = 'conditionally_verified';
      newRiskLevel = 'medium';
    } else {
      newStatus = 'pending_review';
      newRiskLevel = score >= 50 ? 'medium' : 'high';
    }

    if (newStatus !== verification.status || newRiskLevel !== verification.riskLevel) {
      const oldStatus = verification.status;
      verification.status = newStatus;
      verification.riskLevel = newRiskLevel;
      await verification.save();

      await this._logAudit('update', 'compliance_status', String(vendorId), {
        vendor: vendorId, oldStatus, newStatus, newRiskLevel,
        message: `Compliance status changed from ${oldStatus} to ${newStatus}`,
      });

      if (newStatus === 'verified' || newStatus === 'conditionally_verified') {
        const user = await Vendor.findOne({ user: vendorId });
        if (user) {
          user.isVerified = true;
          user.verificationStatus = 'approved';
          await user.save();
        }
        await notificationService.send({
          recipient: vendorId,
          type: 'verification_approved',
          title: { en: 'Verification Approved', ar: 'تمت الموافقة على التحقق' },
          body: { en: `Your compliance score is ${score}/100.`, ar: `نسبة الامتثال لديك ${score}/100.` },
          priority: 'high',
          channels: ['in_app', 'email'],
          link: '/vendor/compliance',
        });
      } else if (newStatus === 'rejected') {
        await notificationService.send({
          recipient: vendorId,
          type: 'verification_rejected',
          title: { en: 'Verification Requires Attention', ar: 'التحقق يحتاج إلى مراجعة' },
          body: { en: 'Some documents failed verification. Please re-submit.', ar: 'فشل التحقق من بعض المستندات. يرجى إعادة التقديم.' },
          priority: 'high',
          channels: ['in_app', 'email'],
          link: '/vendor/compliance',
        });
      }
    }
  }

  async getExpiryMonitorData() {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiring = await ComplianceVerification.find({
      'documents.expiryDate': { $exists: true },
      'documents.isExpired': false,
    }).populate({
      path: 'documents.document',
      select: 'title status',
    });

    const result = { expired: [], expiring90: [], expiring30: [], expiring7: [] };

    for (const v of expiring) {
      for (const doc of v.documents) {
        if (!doc.expiryDate || doc.isExpired) continue;
        const expiry = new Date(doc.expiryDate);
        if (expiry < now) {
          result.expired.push({ vendor: v.vendor, document: doc, daysOverdue: Math.ceil((now - expiry) / (1000 * 60 * 60 * 24)) });
          doc.isExpired = true;
          await v.save();
        } else if (expiry <= in7Days) {
          result.expiring7.push({ vendor: v.vendor, document: doc, daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) });
          this._sendExpiryNotification(v.vendor, doc, 7);
        } else if (expiry <= in30Days) {
          result.expiring30.push({ vendor: v.vendor, document: doc, daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) });
          if (!doc.notifiedDaysBefore.includes(30)) {
            this._sendExpiryNotification(v.vendor, doc, 30);
            doc.notifiedDaysBefore.push(30);
            await v.save();
          }
        } else if (expiry <= in90Days && !doc.notifiedDaysBefore.includes(90)) {
          result.expiring90.push({ vendor: v.vendor, document: doc, daysRemaining: Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)) });
          this._sendExpiryNotification(v.vendor, doc, 90);
          doc.notifiedDaysBefore.push(90);
          await v.save();
        }
      }
    }
    return result;
  }

  async _sendExpiryNotification(vendorId, docEntry, daysBefore) {
    if (daysBefore <= 0) {
      await notificationService.send({
        recipient: vendorId,
        type: 'system_announcement',
        title: { en: 'Document Expired', ar: 'انتهت صلاحية المستند' },
        body: { en: `Your ${docEntry.docType?.replace(/_/g, ' ')} has expired. Please renew immediately.`, ar: `انتهت صلاحية ${docEntry.docType}. يرجى التجديد فوراً.` },
        priority: 'high', channels: ['in_app', 'email'],
        link: '/vendor/compliance',
      });
    } else {
      await notificationService.send({
        recipient: vendorId,
        type: 'system_announcement',
        title: { en: `Document Expiring in ${daysBefore} Days`, ar: `المستند سينتهي خلال ${daysBefore} يوماً` },
        body: { en: `Your ${docEntry.docType?.replace(/_/g, ' ')} expires in ${daysBefore} days.`, ar: `سينتهي ${docEntry.docType} خلال ${daysBefore} يوماً.` },
        priority: 'medium', channels: ['in_app', 'email'],
        link: '/vendor/compliance',
      });
    }
  }

  async adminReview(vendorId, action, { notes, score, badge }) {
    const verification = await this.getOrCreateVerification(vendorId);
    const vendor = await Vendor.findOne({ user: vendorId });

    const oldStatus = verification.status;
    verification.reviewedAt = new Date();
    verification.reviewNotes = notes || '';

    if (action === 'approve') {
      verification.status = 'verified';
      verification.riskLevel = 'low';
      if (badge) {
        verification.badge = badge;
        verification.badgeAssignedAt = new Date();
        verification.badgeExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      } else {
        verification.badge = 'verified_supplier';
        verification.badgeAssignedAt = new Date();
        verification.badgeExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }
      if (vendor) {
        vendor.isVerified = true;
        vendor.verificationStatus = 'approved';
        await vendor.save();
      }
      if (score) {
        verification.score.total = score;
        verification.score.lastCalculated = new Date();
      }
    } else if (action === 'reject') {
      verification.status = 'rejected';
      verification.riskLevel = 'high';
      verification.badge = 'none';
      if (vendor) {
        vendor.isVerified = false;
        vendor.verificationStatus = 'rejected';
        vendor.verificationNotes = notes || '';
        await vendor.save();
      }
    } else if (action === 'conditionally_approve') {
      verification.status = 'conditionally_verified';
      verification.riskLevel = 'medium';
      verification.badge = 'verified_supplier';
      verification.badgeAssignedAt = new Date();
      verification.badgeExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      if (vendor) {
        vendor.isVerified = true;
        vendor.verificationStatus = 'approved';
        vendor.verificationNotes = notes || '';
        await vendor.save();
      }
    } else if (action === 'reset') {
      verification.status = 'unverified';
      verification.riskLevel = 'uncalculated';
      verification.badge = 'none';
      verification.documents = [];
      verification.score = { total: 0, commercialRegistration: 0, vatCertificate: 0, nationalAddress: 0, factoryLicense: 0, isoCertifications: 0, additionalCertifications: 0 };
      if (vendor) {
        vendor.isVerified = false;
        vendor.verificationStatus = 'none';
        await vendor.save();
      }
    }

    await verification.save();

    await this._logAudit('update', 'compliance_review', String(vendorId), {
      vendor: vendorId, action, oldStatus, newStatus: verification.status,
      notes, message: `Admin ${action}d compliance for vendor`,
    });

    return verification;
  }

  async getAdminDashboard() {
    const stats = await ComplianceVerification.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          conditionallyVerified: { $sum: { $cond: [{ $eq: ['$status', 'conditionally_verified'] }, 1, 0] } },
          pendingReview: { $sum: { $cond: [{ $in: ['$status', ['pending_documents', 'pending_review']] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          unverified: { $sum: { $cond: [{ $eq: ['$status', 'unverified'] }, 1, 0] } },
          lowRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] } },
          mediumRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] } },
          highRisk: { $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] } },
          avgScore: { $avg: '$score.total' },
        },
      },
    ]);

    const scoreDistribution = await ComplianceVerification.aggregate([
      {
        $bucket: {
          groupBy: '$score.total',
          boundaries: [0, 50, 70, 90, 101],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            vendors: { $push: { vendor: '$vendor', score: '$score.total' } },
          },
        },
      },
    ]);

    const recentVerifications = await ComplianceVerification.find()
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('vendor', 'name email')
      .select('status riskLevel score.total badge updatedAt');

    const recentAudits = await AuditLog.find({ resource: /compliance/i })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('performedBy', 'name email');

    return {
      stats: stats[0] || { total: 0, verified: 0, conditionallyVerified: 0, pendingReview: 0, rejected: 0, unverified: 0, lowRisk: 0, mediumRisk: 0, highRisk: 0, avgScore: 0 },
      scoreDistribution,
      recentVerifications,
      recentAudits,
    };
  }

  async getComplianceReports(filters = {}) {
    const match = {};
    if (filters.status) match.status = filters.status;
    if (filters.riskLevel) match.riskLevel = filters.riskLevel;
    if (filters.badge) match.badge = filters.badge;

    const data = await ComplianceVerification.find(match)
      .populate('vendor', 'name email')
      .sort({ updatedAt: -1 })
      .select('status riskLevel score badge documents verifiedAt reviewedAt');

    const summary = {
      total: data.length,
      avgScore: data.length > 0 ? Math.round(data.reduce((s, v) => s + v.score.total, 0) / data.length) : 0,
      byStatus: {},
      byRisk: {},
      byBadge: {},
    };

    for (const v of data) {
      summary.byStatus[v.status] = (summary.byStatus[v.status] || 0) + 1;
      summary.byRisk[v.riskLevel] = (summary.byRisk[v.riskLevel] || 0) + 1;
      summary.byBadge[v.badge] = (summary.byBadge[v.badge] || 0) + 1;
    }

    return { data, summary };
  }

  async _createDefaultChecklist() {
    return ComplianceChecklist.create({
      country: 'SA',
      countryName: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية' },
      isDefault: true,
      isActive: true,
      items: [
        { docType: 'commercial_registration', label: { en: 'Commercial Registration', ar: 'السجل التجاري' }, required: true, weight: 30, maxScore: 30, order: 1, acceptsExpiry: true, expiryRequired: true, renewPeriodDays: 365 },
        { docType: 'vat_certificate', label: { en: 'VAT Certificate', ar: 'شهادة ضريبة القيمة المضافة' }, required: true, weight: 20, maxScore: 20, order: 2, acceptsExpiry: true, expiryRequired: true, renewPeriodDays: 365 },
        { docType: 'national_address', label: { en: 'National Address', ar: 'العنوان الوطني' }, required: true, weight: 15, maxScore: 15, order: 3 },
        { docType: 'factory_license', label: { en: 'Factory License', ar: 'رخصة المصنع' }, required: true, weight: 20, maxScore: 20, order: 4, acceptsExpiry: true, expiryRequired: true, renewPeriodDays: 365 },
        { docType: 'iso_certifications', label: { en: 'ISO Certifications', ar: 'شهادات الآيزو' }, required: false, weight: 10, maxScore: 10, order: 5, acceptsExpiry: true, renewPeriodDays: 1095 },
        { docType: 'additional_certifications', label: { en: 'Additional Certifications', ar: 'شهادات إضافية' }, required: false, weight: 5, maxScore: 5, order: 6, acceptsExpiry: true },
      ],
      scoringRules: {
        maxTotalScore: 100,
        thresholds: { fullyVerified: 90, conditionallyVerified: 70, requiresReview: 50, rejected: 0 },
      },
      providerConfig: { preferredProvider: 'ocr', fallbackProviders: ['ai', 'manual'] },
    });
  }

  async _logAudit(action, resource, resourceId, extra = {}) {
    try {
      await AuditLog.create({
        action,
        resource: `compliance_${resource}`,
        resourceId,
        description: extra.message || `${action} on ${resource}`,
        performedBy: extra.performedBy || extra.vendor || null,
        performedByRole: 'system',
        performedByName: 'Compliance Engine',
        metadata: extra,
      });
    } catch (err) {
      console.error('Audit log error:', err.message);
    }
  }

  getScoreWeights() {
    return SCORE_WEIGHTS;
  }

  getComplianceThresholds() {
    return { fullyVerified: 90, conditionallyVerified: 70, requiresReview: 50, rejected: 0 };
  }

  /* ─── Verification Request Management ─── */

  async getVerificationRequests(query = {}) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const { status, type, page = 1, limit = 20 } = query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (type) filter.type = type;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      VerifReq.find(filter).populate('company', 'name').populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      VerifReq.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getVerificationRequest(id) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const request = await VerifReq.findById(id).populate('company', 'name legalName').populate('assignedTo', 'name email').populate('reviewedBy', 'name email').lean();
    if (!request) throw new Error('Verification request not found');
    return request;
  }

  async createVerificationRequest(data, userId) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const request = await VerifReq.create({ ...data, isActive: true });
    const company = await (await import('../models/Company.js')).Company.findById(data.company).lean();
    await this._logAudit('create', 'verification_request', String(request._id), {
      performedBy: userId, company: data.company, type: data.type,
      message: `Verification request created for ${company?.name || data.company}`,
    });
    return request;
  }

  async assignVerification(id, userId, adminId) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const request = await VerifReq.findByIdAndUpdate(id, { $set: { assignedTo: userId, status: 'in_review' } }, { new: true });
    if (!request) throw new Error('Verification request not found');
    await this._logAudit('assign', 'verification_request', id, {
      performedBy: adminId, assignedTo: userId,
      message: `Verification request ${id} assigned to ${userId}`,
    });
    return request;
  }

  async approveVerification(id, notes, adminId) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const request = await VerifReq.findByIdAndUpdate(id, {
      $set: { status: 'approved', reviewedBy: adminId, reviewedAt: new Date(), notes },
    }, { new: true });
    if (!request) throw new Error('Verification request not found');
    if (request.company) {
      await (await import('../models/Company.js')).Company.findByIdAndUpdate(request.company, { $set: { status: 'verified', verifiedAt: new Date(), verifiedBy: adminId } });
    }
    await this._logAudit('approve', 'verification_request', id, {
      performedBy: adminId, notes,
      message: `Verification request ${id} approved`,
    });
    await notificationService.send({
      recipient: adminId, type: 'verification_approved',
      title: 'Verification Approved',
      body: `Verification request for ${request.company || request.vendor} has been approved.`,
      data: { requestId: id },
    });
    return request;
  }

  async rejectVerification(id, notes, adminId) {
    const { VerifReq } = await import('../models/VerificationRequest.js');
    const request = await VerifReq.findByIdAndUpdate(id, {
      $set: { status: 'rejected', reviewedBy: adminId, reviewedAt: new Date(), notes },
    }, { new: true });
    if (!request) throw new Error('Verification request not found');
    if (request.company) {
      await (await import('../models/Company.js')).Company.findByIdAndUpdate(request.company, { $set: { status: 'rejected' } });
    }
    await this._logAudit('reject', 'verification_request', id, {
      performedBy: adminId, notes,
      message: `Verification request ${id} rejected`,
    });
    return request;
  }

  /* ─── Compliance Rules ─── */

  async getComplianceRules() {
    const { ComplianceRule } = await import('../models/ComplianceRule.js');
    return ComplianceRule.find({ isActive: true }).sort('-createdAt').lean();
  }

  async createComplianceRule(data, userId) {
    const { ComplianceRule } = await import('../models/ComplianceRule.js');
    const rule = await ComplianceRule.create(data);
    await this._logAudit('create', 'compliance_rule', String(rule._id), {
      performedBy: userId, name: rule.name, type: rule.type,
      message: `Compliance rule "${rule.name}" created`,
    });
    return rule;
  }

  async updateComplianceRule(id, data, userId) {
    const { ComplianceRule } = await import('../models/ComplianceRule.js');
    const rule = await ComplianceRule.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!rule) throw new Error('Compliance rule not found');
    await this._logAudit('update', 'compliance_rule', id, {
      performedBy: userId, name: rule.name,
      message: `Compliance rule "${rule.name}" updated`,
    });
    return rule;
  }

  async deleteComplianceRule(id, userId) {
    const { ComplianceRule } = await import('../models/ComplianceRule.js');
    const rule = await ComplianceRule.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!rule) throw new Error('Compliance rule not found');
    await this._logAudit('delete', 'compliance_rule', id, {
      performedBy: userId, name: rule.name,
      message: `Compliance rule "${rule.name}" deactivated`,
    });
    return { message: 'Compliance rule deleted' };
  }

  async checkCompliance(entityType, entityId) {
    const { ComplianceRule } = await import('../models/ComplianceRule.js');
    const Company = (await import('../models/Company.js')).Company;
    const rules = await ComplianceRule.find({ entityType, isActive: true }).lean();
    const entity = entityType === 'company' ? await Company.findById(entityId).lean() : null;
    if (!entity) throw new Error(`${entityType} not found`);
    const results = [];
    for (const rule of rules) {
      let passed = false;
      let details = '';
      const fieldValue = entity[rule.condition?.field];
      if (fieldValue !== undefined) {
        switch (rule.condition.operator) {
          case 'eq': passed = fieldValue === rule.condition.value; break;
          case 'ne': passed = fieldValue !== rule.condition.value; break;
          case 'in': passed = Array.isArray(rule.condition.value) && rule.condition.value.includes(fieldValue); break;
          case 'contains': passed = String(fieldValue).toLowerCase().includes(String(rule.condition.value).toLowerCase()); break;
          case 'gte': passed = Number(fieldValue) >= Number(rule.condition.value); break;
          case 'lte': passed = Number(fieldValue) <= Number(rule.condition.value); break;
          default: passed = false;
        }
        details = `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}: ${fieldValue}`;
      } else {
        details = `Field ${rule.condition?.field} not found on entity`;
      }
      results.push({
        ruleId: rule._id, ruleName: rule.name, severity: rule.severity,
        action: rule.action, condition: rule.condition,
        passed, details,
        status: passed ? 'compliant' : 'non_compliant',
      });
    }
    const summary = {
      total: results.length,
      compliant: results.filter(r => r.passed).length,
      nonCompliant: results.filter(r => !r.passed).length,
      flags: results.filter(r => !r.passed && r.action === 'flag').length,
      rejects: results.filter(r => !r.passed && r.action === 'reject').length,
    };
    return { entityType, entityId, results, summary };
  }

  /* ─── Certificates ─── */

  async getCertificates(query = {}) {
    const { status, vendorId, page = 1, limit = 20 } = query;
    const filter = { isActive: true };
    if (status) filter.status = status;
    if (vendorId) filter.vendor = vendorId;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Certificate.find(filter).populate('vendor', 'storeName').sort({ expiresAt: 1 }).skip(skip).limit(Number(limit)).lean(),
      Certificate.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async createCertificate(data, userId) {
    const cert = await Certificate.create(data);
    await this._logAudit('create', 'certificate', String(cert._id), {
      performedBy: userId, name: cert.name, vendor: cert.vendor,
      message: `Certificate "${cert.name}" created for vendor`,
    });
    return cert;
  }

  async verifyCertificate(id, userId) {
    const cert = await Certificate.findByIdAndUpdate(id, {
      $set: { verified: true, verifiedBy: userId, verifiedAt: new Date(), status: 'active' },
    }, { new: true });
    if (!cert) throw new Error('Certificate not found');
    await this._logAudit('verify', 'certificate', id, {
      performedBy: userId, name: cert.name,
      message: `Certificate "${cert.name}" verified`,
    });
    await notificationService.send({
      recipient: cert.vendor, type: 'certificate_verified',
      title: 'Certificate Verified',
      body: `Your certificate "${cert.name}" has been verified.`,
      data: { certificateId: cert._id },
    });
    return cert;
  }

  async checkExpiringDocuments(days = 30) {
    const threshold = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const [certs, verifDocs] = await Promise.all([
      Certificate.find({ expiresAt: { $lte: threshold, $gte: new Date() }, isActive: true }).populate('vendor', 'storeName email').lean(),
      VerificationRequest.find({ 'documents.expiresAt': { $lte: threshold, $gte: new Date() }, isActive: true }).lean(),
    ]);
    const grouped = {};
    for (const c of certs) {
      const vid = c.vendor?._id || c.vendor;
      if (!grouped[vid]) grouped[vid] = { vendor: c.vendor, certificates: [], documents: [] };
      grouped[vid].certificates.push({ name: c.name, type: c.type, expiresAt: c.expiresAt, daysRemaining: Math.ceil((c.expiresAt - new Date()) / 86400000) });
    }
    for (const v of verifDocs) {
      for (const d of v.documents) {
        if (!d.expiresAt || d.expiresAt > threshold || d.expiresAt < new Date()) continue;
        const key = v.company || v.vendor;
        if (!grouped[key]) grouped[key] = { vendor: { _id: key }, certificates: [], documents: [] };
        grouped[key].documents.push({ type: d.type, expiresAt: d.expiresAt, daysRemaining: Math.ceil((d.expiresAt - new Date()) / 86400000) });
      }
    }
    return Object.values(grouped);
  }

  async getComplianceDashboard() {
    const certStats = await Certificate.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const verifStats = await VerificationRequest.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const ruleCount = await (await import('../models/ComplianceRule.js')).ComplianceRule.countDocuments({ isActive: true });
    const expiringSoon = await Certificate.countDocuments({ expiresAt: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 86400000) }, isActive: true });
    const totalCerts = certStats.reduce((s, c) => s + c.count, 0);
    const certStatusMap = {}; for (const s of certStats) certStatusMap[s._id] = s.count;
    const verifStatusMap = {}; for (const s of verifStats) verifStatusMap[s._id] = s.count;
    return {
      totalCertificates: totalCerts,
      certificateStatus: certStatusMap,
      verificationStatus: verifStatusMap,
      activeRules: ruleCount,
      expiringWithin30Days: expiringSoon,
      lastUpdated: new Date(),
    };
  }

  async getVerificationTimeline(requestId) {
    const request = await VerificationRequest.findById(requestId).lean();
    if (!request) throw new Error('Verification request not found');
    const AuditLog = (await import('../models/AuditLog.js')).default || (await import('../models/AuditLog.js'));
    const logs = await AuditLog.find({ resourceId: requestId, resource: /verification/i })
      .sort({ createdAt: 1 })
      .populate('performedBy', 'name email')
      .lean();
    const timeline = [
      { event: 'request_created', timestamp: request.createdAt, actor: request.company, description: 'Verification request created' },
      ...logs.map(l => ({ event: l.action, timestamp: l.createdAt, actor: l.performedBy, description: l.description })),
    ];
    if (request.reviewedAt) {
      timeline.push({ event: `request_${request.status}`, timestamp: request.reviewedAt, actor: request.reviewedBy, description: `Request ${request.status}` });
    }
    return timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async addToBlacklist(entityType, entityId, reason, userId) {
    const BlacklistModel = mongoose.model('BlacklistEntry', new mongoose.Schema({
      entityType: { type: String, enum: ['company', 'vendor', 'user', 'product'] },
      entityId: { type: String },
      reason: { type: String },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
    }));
    const entry = await BlacklistModel.create({ entityType, entityId, reason, addedBy: userId });
    await this._logAudit('create', 'blacklist', String(entry._id), {
      performedBy: userId, entityType, entityId, reason,
      message: `${entityType} ${entityId} added to blacklist: ${reason}`,
    });
    return entry;
  }

  async removeFromBlacklist(entityType, entityId, userId) {
    const BlacklistModel = mongoose.model('BlacklistEntry');
    const entry = await BlacklistModel.findOneAndDelete({ entityType, entityId });
    if (!entry) throw new Error('Blacklist entry not found');
    await this._logAudit('delete', 'blacklist', String(entry._id), {
      performedBy: userId, entityType, entityId,
      message: `${entityType} ${entityId} removed from blacklist`,
    });
    return { message: 'Removed from blacklist' };
  }

  async getWhitelist() {
    const WhitelistModel = mongoose.model('WhitelistEntry', new mongoose.Schema({
      entityType: { type: String, enum: ['company', 'vendor', 'user', 'product'] },
      entityId: { type: String },
      reason: { type: String },
      addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      addedAt: { type: Date, default: Date.now },
    }));
    return WhitelistModel.find().sort('-addedAt').populate('addedBy', 'name email').lean();
  }

  async getVerificationAnalytics() {
    const [statusDist, typeDist, monthlyTrend, avgTime] = await Promise.all([
      VerificationRequest.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      VerificationRequest.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
      VerificationRequest.aggregate([
        { $match: { isActive: true, createdAt: { $gte: new Date(Date.now() - 365 * 86400000) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      VerificationRequest.aggregate([
        { $match: { reviewedAt: { $ne: null }, createdAt: { $ne: null } } },
        { $project: { timeToReview: { $subtract: ['$reviewedAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$timeToReview' } } },
      ]),
    ]);
    const avgReviewHours = avgTime[0] ? Math.round(avgTime[0].avgMs / 3600000) : 0;
    const totalRequests = statusDist.reduce((s, d) => s + d.count, 0);
    const approved = statusDist.find(s => s._id === 'approved')?.count || 0;
    return {
      statusDistribution: statusDist,
      typeDistribution: typeDist,
      monthlyTrend,
      totalRequests,
      approvalRate: totalRequests > 0 ? Math.round((approved / totalRequests) * 100) : 0,
      averageReviewTimeHours: avgReviewHours,
    };
  }
}

export const complianceEngine = new ComplianceVerificationEngine();
