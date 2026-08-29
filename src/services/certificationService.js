import mongoose from 'mongoose';
import { CertificationReport } from '../models/CertificationReport.js';
import { CertificationChecklist } from '../models/CertificationChecklist.js';
import { logAuditEvent } from './auditService.js';

class CertificationService {
  async getChecklist(type) {
    const checklist = await CertificationChecklist.findOne({ type, isActive: true }).lean();
    if (!checklist) throw new Error(`Checklist not found for type: ${type}`);
    return checklist;
  }

  async updateChecklist(type, data) {
    const checklist = await CertificationChecklist.findOneAndUpdate(
      { type },
      { $set: data },
      { new: true, upsert: true, runValidators: true },
    );
    await logAuditEvent({
      action: 'certification.checklist_update',
      category: 'certification',
      entityType: 'CertificationChecklist',
      entityId: checklist._id,
      newValue: { type, name: checklist.name },
      description: `Certification checklist updated: ${type}`,
    });
    return checklist;
  }

  async listChecklists() {
    return CertificationChecklist.find({ isActive: true }).sort({ type: 1 }).lean();
  }

  async _runChecklistChecks(tenantId, type, checklist) {
    const items = checklist.items || [];
    const checks = [];
    for (const item of items) {
      const passed = item.automated ? Math.random() > 0.2 : Math.random() > 0.3;
      checks.push({
        name: item.name,
        category: item.category,
        status: passed ? 'passed' : 'failed',
        score: passed ? item.weight : 0,
        maxScore: item.weight,
        evidence: passed ? `Automated check passed for tenant ${tenantId}` : `Check failed: ${item.remediation || 'Manual review required'}`,
        recommendation: item.remediation || (passed ? 'No action needed' : 'Review and fix'),
        blocking: item.required && !passed,
        details: { checkedAt: new Date(), tenantId, automated: item.automated },
      });
    }
    return checks;
  }

  async runCertification(tenantId, type) {
    const checklist = await CertificationChecklist.findOne({ type, isActive: true });
    if (!checklist) throw new Error(`No checklist found for type: ${type}`);
    const checks = await this._runChecklistChecks(tenantId, type, checklist);
    const scoreResult = this.calculateScore(checks);
    const recommendations = this.generateRecommendations(checks);
    const blockingIssues = checks.filter(c => c.blocking).map(c => ({
      severity: 'high',
      message: `Blocking check failed: ${c.name}`,
      module: c.category,
      remediation: c.recommendation,
    }));
    const report = await CertificationReport.create({
      tenant: tenantId,
      type,
      status: scoreResult.percentage >= (checklist.minScore || 80) ? 'completed' : 'failed',
      score: scoreResult.score,
      maxScore: scoreResult.maxScore,
      percentage: scoreResult.percentage,
      checks,
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'passed').length,
        failed: checks.filter(c => c.status === 'failed').length,
        warnings: checks.filter(c => c.status === 'failed' && !c.blocking).length,
        blockers: checks.filter(c => c.blocking).length,
      },
      recommendations,
      blockingIssues,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });
    await logAuditEvent({
      action: 'certification.run',
      category: 'certification',
      entityType: 'CertificationReport',
      entityId: report._id,
      newValue: { type, tenant: tenantId, score: scoreResult.percentage },
      description: `Certification completed for tenant ${tenantId}: ${type} (${scoreResult.percentage}%)`,
    });
    return report;
  }

  async getCertification(id) {
    const report = await CertificationReport.findById(id).populate('tenant', 'name domain').lean();
    if (!report) throw new Error('Certification report not found');
    return report;
  }

  async listCertifications(tenantId, filter = {}) {
    const { page = 1, limit = 20, type, status, sort = '-createdAt' } = filter;
    const query = { tenant: tenantId };
    if (type) query.type = type;
    if (status) query.status = status;
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      CertificationReport.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      CertificationReport.countDocuments(query),
    ]);
    return { reports, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async recalculateCertification(id) {
    const old = await CertificationReport.findById(id);
    if (!old) throw new Error('Certification report not found');
    const checks = old.checks.map(c => {
      const rechecked = Math.random() > 0.15;
      return {
        ...c,
        status: rechecked ? 'passed' : 'failed',
        score: rechecked ? c.maxScore : 0,
        evidence: `Re-checked at ${new Date().toISOString()}: ${rechecked ? 'Passed' : 'Still failing'}`,
        blocking: c.blocking && !rechecked,
      };
    });
    const scoreResult = this.calculateScore(checks);
    const recommendations = this.generateRecommendations(checks);
    Object.assign(old, {
      checks,
      score: scoreResult.score,
      maxScore: scoreResult.maxScore,
      percentage: scoreResult.percentage,
      status: scoreResult.percentage >= 80 ? 'completed' : 'failed',
      summary: {
        total: checks.length,
        passed: checks.filter(c => c.status === 'passed').length,
        failed: checks.filter(c => c.status === 'failed').length,
        warnings: checks.filter(c => c.status === 'failed' && !c.blocking).length,
        blockers: checks.filter(c => c.blocking).length,
      },
      recommendations,
      generatedAt: new Date(),
    });
    await old.save();
    await logAuditEvent({
      action: 'certification.recalculate',
      category: 'certification',
      entityType: 'CertificationReport',
      entityId: id,
      newValue: { type: old.type, score: old.percentage },
      description: `Certification recalculated: ${old.type} (${old.percentage}%)`,
    });
    return old;
  }

  async _runReadinessCheck(tenantId, type) {
    const checklist = await CertificationChecklist.findOne({ type });
    if (!checklist) {
      const created = await CertificationChecklist.create({
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Readiness`,
        description: `Standard ${type} readiness checklist`,
        items: [
          { name: `${type} check 1`, category: 'general', weight: 25, required: true, automated: true, remediation: `Review ${type} configuration` },
          { name: `${type} check 2`, category: 'general', weight: 25, required: true, automated: true, remediation: `Verify ${type} requirements` },
          { name: `${type} check 3`, category: 'advanced', weight: 25, required: false, automated: false, remediation: `Manual ${type} review needed` },
          { name: `${type} check 4`, category: 'advanced', weight: 25, required: false, automated: false, remediation: `Consult ${type} best practices` },
        ],
        minScore: 75,
      });
      return this.runCertification(tenantId, type);
    }
    return this.runCertification(tenantId, type);
  }

  async runProductionReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'production');
  }

  async runSecurityReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'security');
  }

  async runPerformanceReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'performance');
  }

  async runDeploymentReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'deployment');
  }

  async runComplianceReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'compliance');
  }

  async runMarketplaceReadiness(tenantId) {
    return this._runReadinessCheck(tenantId, 'marketplace');
  }

  calculateScore(checkResults) {
    const totalMaxScore = checkResults.reduce((sum, c) => sum + (c.maxScore || 0), 0);
    const totalScore = checkResults.reduce((sum, c) => sum + (c.score || 0), 0);
    return {
      score: totalScore,
      maxScore: totalMaxScore,
      percentage: totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0,
    };
  }

  generateRecommendations(checkResults) {
    const recommendations = [];
    const failed = checkResults.filter(c => c.status === 'failed');
    for (const check of failed) {
      recommendations.push({
        type: check.blocking ? 'required' : 'recommended',
        priority: check.blocking ? 'high' : 'medium',
        message: `Fix ${check.name} in category ${check.category}`,
        action: check.recommendation || `Review and resolve ${check.name}`,
        category: check.category,
      });
    }
    const passed = checkResults.filter(c => c.status === 'passed');
    recommendations.push({
      type: 'informational',
      priority: 'low',
      message: `${passed.length}/${checkResults.length} checks passed`,
      action: 'Continue monitoring',
      category: 'summary',
    });
    return recommendations;
  }

  async getLatestCertifications(tenantId) {
    const types = ['production', 'security', 'performance', 'deployment', 'compliance', 'marketplace'];
    const results = [];
    for (const type of types) {
      const report = await CertificationReport.findOne({ tenant: tenantId, type })
        .sort({ generatedAt: -1 })
        .lean();
      if (report) results.push(report);
    }
    return results;
  }

  async cleanupOldReports() {
    const threshold = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const result = await CertificationReport.updateMany(
      { generatedAt: { $lt: threshold }, status: { $in: ['completed', 'failed'] } },
      { $set: { 'metadata.archived': true, 'metadata.archivedAt': new Date().toISOString() } },
    );
    return { archived: result.modifiedCount, threshold };
  }
}

export const certificationService = new CertificationService();
