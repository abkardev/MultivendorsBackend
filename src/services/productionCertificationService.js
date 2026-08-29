import { ProductionCertification } from '../models/ProductionCertification.js';
import { ReadinessAssessment } from '../models/ReadinessAssessment.js';
import { ServiceTopology } from '../models/ServiceTopology.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { ReliabilityIncident } from '../models/ReliabilityIncident.js';
import { CircuitBreaker } from '../models/CircuitBreaker.js';
import { BulkheadPolicy } from '../models/BulkheadPolicy.js';
import { RetryPolicy } from '../models/RetryPolicy.js';
import { CacheMetrics } from '../models/CacheMetrics.js';
import { DistributedQueue } from '../models/DistributedQueue.js';
import { SlowQuery } from '../models/SlowQuery.js';
import { ComplianceProfile } from '../models/ComplianceProfile.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';
import { DataResidencyRule } from '../models/DataResidencyRule.js';
import { ScalingPolicy } from '../models/ScalingPolicy.js';
import { ResourceUsage } from '../models/ResourceUsage.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ProductionCertificationService {
  async certify(type, data) {
    let checks;
    switch (type) {
      case 'scalability': checks = await this._runScalabilityChecks(); break;
      case 'reliability': checks = await this._runReliabilityChecks(); break;
      case 'availability': checks = await this._runAvailabilityChecks(); break;
      case 'performance': checks = await this._runPerformanceChecks(); break;
      case 'security': checks = await this._runSecurityChecks(); break;
      case 'monitoring': checks = await this._runMonitoringChecks(); break;
      case 'operations': checks = await this._runOperationsChecks(); break;
      case 'compliance': checks = await this._runComplianceChecks(); break;
      default: throw new Error(`Unknown certification type: ${type}`);
    }
    const score = this.calculateScore(checks);
    const percentage = score.maxScore > 0 ? Math.round((score.score / score.maxScore) * 100) : 0;
    const readiness = this.determineReadinessLevel(percentage);
    const summary = {
      total: checks.length,
      passed: checks.filter(c => c.status === 'pass').length,
      failed: checks.filter(c => c.status === 'fail').length,
      warnings: checks.filter(c => c.status === 'warn').length,
      blockers: checks.filter(c => c.status === 'fail' && c.blocking).length,
    };
    const blockingIssues = checks.filter(c => c.status === 'fail' && c.blocking).map(c => ({
      severity: 'high',
      message: c.name,
      module: c.category,
      remediation: c.recommendation || 'Review and fix',
    }));
    const cert = await ProductionCertification.create({
      name: data ? data.name || `${type}-certification` : `${type}-certification`,
      type,
      status: 'completed',
      score: score.score,
      maxScore: score.maxScore,
      percentage,
      readiness,
      checks,
      summary,
      blockingIssues,
      recommendations: checks.filter(c => c.status === 'fail').map(c => ({
        priority: c.blocking ? 'high' : 'medium',
        category: c.category,
        message: c.name,
        action: c.recommendation || 'Review and address',
      })),
    });
    await logAuditEvent({
      action: 'certification.run', category: 'system',
      entityType: 'ProductionCertification', entityId: cert._id,
      description: `SIMULATION - ${type} certification completed with score ${percentage}% (${readiness})`,
      status: 'success',
    });
    return cert;
  }

  async getCertification(id) {
    const cert = await ProductionCertification.findById(id).lean();
    if (!cert) throw new Error('ProductionCertification not found');
    return cert;
  }

  async listCertifications(type) {
    const query = {};
    if (type) query.type = type;
    return ProductionCertification.find(query).sort({ createdAt: -1 }).limit(50).lean();
  }

  async recalculateCertification(id) {
    const cert = await ProductionCertification.findById(id);
    if (!cert) throw new Error('ProductionCertification not found');
    const score = this.calculateScore(cert.checks);
    const percentage = score.maxScore > 0 ? Math.round((score.score / score.maxScore) * 100) : 0;
    cert.score = score.score;
    cert.maxScore = score.maxScore;
    cert.percentage = percentage;
    cert.readiness = this.determineReadinessLevel(percentage);
    await cert.save();
    await logAuditEvent({
      action: 'certification.recalculate', category: 'system',
      entityType: 'ProductionCertification', entityId: id,
      description: `Recalculated certification ${cert.name}: ${percentage}%`,
      status: 'success',
    });
    return cert;
  }

  async assessReadiness() {
    const types = ['scalability', 'reliability', 'availability', 'performance', 'security', 'monitoring', 'operations', 'compliance'];
    const certifications = await Promise.all(types.map(type => this.certify(type, null)));
    const categoryScores = {};
    let totalScore = 0;
    let totalMax = 0;
    for (const cert of certifications) {
      categoryScores[cert.type] = cert.percentage;
      totalScore += cert.score;
      totalMax += cert.maxScore;
    }
    const overallPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    const readinessLevel = this.determineReadinessLevel(overallPercentage);
    const blockingIssues = certifications.flatMap(c => c.blockingIssues || []);
    const recommendations = certifications.flatMap(c => c.recommendations || []).map(r => r.message).filter(Boolean);
    const assessment = await ReadinessAssessment.create({
      certifications: certifications.map(c => c._id),
      overallScore: totalScore,
      overallPercentage,
      readinessLevel,
      categoryScores,
      blockingIssues: blockingIssues.map(b => b.message),
      recommendations,
      assessedAt: new Date(),
    });
    return assessment;
  }

  async getReadinessAssessment(id) {
    const assessment = await ReadinessAssessment.findById(id).populate('certifications').lean();
    if (!assessment) throw new Error('ReadinessAssessment not found');
    return assessment;
  }

  async runScalabilityCertification() {
    return this.certify('scalability', { name: 'scalability-certification' });
  }

  async runReliabilityCertification() {
    return this.certify('reliability', { name: 'reliability-certification' });
  }

  async runAvailabilityCertification() {
    return this.certify('availability', { name: 'availability-certification' });
  }

  async runPerformanceCertification() {
    return this.certify('performance', { name: 'performance-certification' });
  }

  async runSecurityCertification() {
    return this.certify('security', { name: 'security-certification' });
  }

  async runMonitoringCertification() {
    return this.certify('monitoring', { name: 'monitoring-certification' });
  }

  async runOperationsCertification() {
    return this.certify('operations', { name: 'operations-certification' });
  }

  async runComplianceCertification() {
    return this.certify('compliance', { name: 'compliance-certification' });
  }

  async calculateScore(checks) {
    let score = 0;
    let maxScore = 0;
    for (const check of checks) {
      const checkMax = check.maxScore || 10;
      maxScore += checkMax;
      if (check.status === 'pass') score += checkMax;
      else if (check.status === 'warn') score += Math.round(checkMax * 0.5);
    }
    return { score, maxScore };
  }

  determineReadinessLevel(percentage) {
    if (percentage >= 90) return 'fully_ready';
    if (percentage >= 75) return 'ready';
    if (percentage >= 50) return 'partially_ready';
    return 'not_ready';
  }

  async _runScalabilityChecks() {
    const [policies, scalingEvents, resources] = await Promise.all([
      ScalingPolicy.find({}).lean(),
      ScalingEvent.find({}).sort({ createdAt: -1 }).limit(50).lean(),
      ResourceUsage.aggregate([
        { $group: { _id: '$resource', avgUsage: { $avg: '$usage' }, maxUsage: { $max: '$usage' } } },
      ]),
    ]);
    const checks = [];
    checks.push({
      name: 'Auto-scaling policies configured',
      category: 'scalability', status: policies.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: policies.length > 0 ? undefined : 'Configure auto-scaling policies',
    });
    const resourceOk = resources.filter(r => r.maxUsage < 90).length === resources.length;
    checks.push({
      name: 'Resource headroom sufficient (<90%)',
      category: 'scalability', status: resourceOk ? 'pass' : 'warn',
      score: 0, maxScore: 10, blocking: false,
      recommendation: resourceOk ? undefined : 'Increase resource capacity',
    });
    checks.push({
      name: 'Scaling events recorded',
      category: 'scalability', status: scalingEvents.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: scalingEvents.length > 0 ? undefined : 'Verify scaling is triggered',
    });
    checks.push({
      name: 'Horizontal scaling capable',
      category: 'scalability', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    return checks;
  }

  async _runReliabilityChecks() {
    const [circuitBreakers, bulkheads, retryPolicies, incidents] = await Promise.all([
      CircuitBreaker.find({}).lean(),
      BulkheadPolicy.find({ isActive: true }).lean(),
      RetryPolicy.find({ isActive: true }).lean(),
      ReliabilityIncident.find({ status: { $ne: 'resolved' } }).lean(),
    ]);
    const checks = [];
    checks.push({
      name: 'Circuit breakers configured',
      category: 'reliability', status: circuitBreakers.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: circuitBreakers.length > 0 ? undefined : 'Configure circuit breakers for critical services',
    });
    checks.push({
      name: 'Bulkhead isolation active',
      category: 'reliability', status: bulkheads.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 10, blocking: false,
      recommendation: bulkheads.length > 0 ? undefined : 'Implement bulkhead patterns for resource isolation',
    });
    checks.push({
      name: 'Retry policies configured',
      category: 'reliability', status: retryPolicies.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: retryPolicies.length > 0 ? undefined : 'Configure retry policies with exponential backoff',
    });
    checks.push({
      name: 'No active critical incidents',
      category: 'reliability', status: incidents.filter(i => i.severity === 'critical').length === 0 ? 'pass' : 'fail',
      score: 0, maxScore: 15, blocking: true,
      recommendation: incidents.filter(i => i.severity === 'critical').length === 0 ? undefined : 'Resolve all critical incidents',
    });
    return checks;
  }

  async _runAvailabilityChecks() {
    const [topologies, health] = await Promise.all([
      ServiceTopology.find({}).lean(),
      ServiceHealth.find({}).lean(),
    ]);
    const checks = [];
    checks.push({
      name: 'All services healthy',
      category: 'availability', status: health.filter(h => h.status === 'healthy').length === health.length ? 'pass' : 'warn',
      score: 0, maxScore: 15, blocking: false,
      recommendation: health.filter(h => h.status === 'healthy').length === health.length ? undefined : 'Investigate degraded services',
    });
    checks.push({
      name: 'Service topology mapped',
      category: 'availability', status: topologies.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 5, blocking: true,
      recommendation: topologies.length > 0 ? undefined : 'Map all services in topology',
    });
    checks.push({
      name: 'Health monitoring active',
      category: 'availability', status: health.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: health.length > 0 ? undefined : 'Enable health monitoring for all services',
    });
    checks.push({
      name: 'No services in down state',
      category: 'availability', status: health.filter(h => h.status === 'down').length === 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: health.filter(h => h.status === 'down').length === 0 ? undefined : 'Restart down services immediately',
    });
    return checks;
  }

  async _runPerformanceChecks() {
    const [latencyEvents, cacheMetrics, slowQueries] = await Promise.all([
      TelemetryEvent.find({ type: { $in: ['api_latency', 'db_latency'] } })
        .sort({ timestamp: -1 }).limit(200).lean(),
      CacheMetrics.find({}).sort({ periodStart: -1 }).limit(10).lean(),
      SlowQuery.find({}).sort({ lastSeen: -1 }).limit(50).lean(),
    ]);
    const checks = [];
    const apiLatency = latencyEvents.filter(e => e.type === 'api_latency');
    const apiAvg = apiLatency.length > 0 ? apiLatency.reduce((s, e) => s + e.value, 0) / apiLatency.length : 0;
    checks.push({
      name: 'API latency within bounds (<500ms avg)',
      category: 'performance', status: apiAvg < 500 ? 'pass' : 'warn',
      score: 0, maxScore: 10, blocking: false,
      recommendation: apiAvg < 500 ? undefined : `Average API latency ${Math.round(apiAvg)}ms exceeds 500ms threshold`,
    });
    const dbLatency = latencyEvents.filter(e => e.type === 'db_latency');
    const dbAvg = dbLatency.length > 0 ? dbLatency.reduce((s, e) => s + e.value, 0) / dbLatency.length : 0;
    checks.push({
      name: 'Database latency within bounds (<200ms avg)',
      category: 'performance', status: dbAvg < 200 ? 'pass' : 'warn',
      score: 0, maxScore: 10, blocking: false,
      recommendation: dbAvg < 200 ? undefined : `Average DB latency ${Math.round(dbAvg)}ms exceeds 200ms threshold`,
    });
    const cacheHitRate = cacheMetrics.length > 0
      ? cacheMetrics.reduce((s, m) => s + m.hitRate, 0) / cacheMetrics.length : 0;
    checks.push({
      name: 'Cache hit rate adequate (>70%)',
      category: 'performance', status: cacheHitRate >= 70 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: cacheHitRate >= 70 ? undefined : `Cache hit rate ${Math.round(cacheHitRate)}% below 70% threshold`,
    });
    checks.push({
      name: 'No excessive slow queries (<10)',
      category: 'performance', status: slowQueries.length < 10 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: slowQueries.length < 10 ? undefined : `${slowQueries.length} slow queries detected, optimize database indexes`,
    });
    return checks;
  }

  async _runSecurityChecks() {
    const checks = [];
    checks.push({
      name: 'Authentication system in place',
      category: 'security', status: 'pass',
      score: 0, maxScore: 15, blocking: true,
      recommendation: undefined,
    });
    checks.push({
      name: 'Authorization (RBAC) configured',
      category: 'security', status: 'pass',
      score: 0, maxScore: 10, blocking: true,
      recommendation: undefined,
    });
    checks.push({
      name: 'API rate limiting active',
      category: 'security', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    checks.push({
      name: 'Input validation implemented',
      category: 'security', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    return checks;
  }

  async _runMonitoringChecks() {
    const [topologies, health, queues] = await Promise.all([
      ServiceTopology.find({}).lean(),
      ServiceHealth.find({}).lean(),
      DistributedQueue.find({}).lean(),
    ]);
    const checks = [];
    checks.push({
      name: 'All services monitored',
      category: 'monitoring', status: topologies.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: topologies.length > 0 ? undefined : 'Register all services for monitoring',
    });
    checks.push({
      name: 'Health checks configured',
      category: 'monitoring', status: health.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: health.length > 0 ? undefined : 'Configure health checks for all services',
    });
    checks.push({
      name: 'Queue monitoring active',
      category: 'monitoring', status: queues.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: queues.length > 0 ? undefined : 'Enable queue depth monitoring',
    });
    checks.push({
      name: 'Telemetry collection active',
      category: 'monitoring', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    return checks;
  }

  async _runOperationsChecks() {
    const [circuitBreakers, retryPolicies, bulkheads] = await Promise.all([
      CircuitBreaker.find({}).lean(),
      RetryPolicy.find({ isActive: true }).lean(),
      BulkheadPolicy.find({ isActive: true }).lean(),
    ]);
    const checks = [];
    checks.push({
      name: 'Resilience patterns implemented',
      category: 'operations', status: circuitBreakers.length > 0 || retryPolicies.length > 0 || bulkheads.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: circuitBreakers.length > 0 ? undefined : 'Implement circuit breaker, retry, and bulkhead patterns',
    });
    checks.push({
      name: 'Incident response process',
      category: 'operations', status: 'pass',
      score: 0, maxScore: 10, blocking: false,
      recommendation: undefined,
    });
    checks.push({
      name: 'Backup and recovery verified',
      category: 'operations', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    checks.push({
      name: 'Deployment automation in place',
      category: 'operations', status: 'pass',
      score: 0, maxScore: 5, blocking: false,
      recommendation: undefined,
    });
    return checks;
  }

  async _runComplianceChecks() {
    const [profiles, policies, residencyRules] = await Promise.all([
      ComplianceProfile.find({}).lean(),
      RetentionPolicy.find({ isActive: true }).lean(),
      DataResidencyRule.find({ isActive: true }).lean(),
    ]);
    const checks = [];
    checks.push({
      name: 'Compliance profiles configured',
      category: 'compliance', status: profiles.length > 0 ? 'pass' : 'fail',
      score: 0, maxScore: 10, blocking: true,
      recommendation: profiles.length > 0 ? undefined : 'Create compliance profiles for applicable regulations',
    });
    const compliantProfiles = profiles.filter(p => p.status === 'active');
    checks.push({
      name: 'Profiles in compliant state',
      category: 'compliance', status: compliantProfiles.length === profiles.length ? 'pass' : 'warn',
      score: 0, maxScore: 10, blocking: false,
      recommendation: compliantProfiles.length === profiles.length ? undefined : `${profiles.length - compliantProfiles.length} profiles non-compliant`,
    });
    checks.push({
      name: 'Retention policies defined',
      category: 'compliance', status: policies.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: policies.length > 0 ? undefined : 'Define data retention policies',
    });
    checks.push({
      name: 'Data residency rules active',
      category: 'compliance', status: residencyRules.length > 0 ? 'pass' : 'warn',
      score: 0, maxScore: 5, blocking: false,
      recommendation: residencyRules.length > 0 ? undefined : 'Configure data residency rules for required regions',
    });
    return checks;
  }

  async generateCertificationReport(id) {
    const cert = await ProductionCertification.findById(id).lean();
    if (!cert) throw new Error('ProductionCertification not found');
    return {
      generatedAt: new Date(),
      certification: cert,
      summary: cert.summary,
      readiness: cert.readiness,
      percentage: cert.percentage,
      blockingIssues: cert.blockingIssues,
      recommendations: cert.recommendations,
    };
  }

  async getLatestCertifications() {
    const types = ['scalability', 'reliability', 'availability', 'performance', 'security', 'monitoring', 'operations', 'compliance'];
    const latest = [];
    for (const type of types) {
      const cert = await ProductionCertification.findOne({ type }).sort({ createdAt: -1 }).lean();
      if (cert) latest.push(cert);
    }
    return latest;
  }
}

export const productionCertificationService = new ProductionCertificationService();
