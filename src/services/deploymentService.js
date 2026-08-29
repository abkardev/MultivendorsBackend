import { DeploymentRecord } from '../models/DeploymentRecord.js';
import { ProductionReadiness } from '../models/ProductionReadiness.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class DeploymentService {
  async createDeployment(data, userId) {
    const deployment = await DeploymentRecord.create({ ...data, deployedBy: userId, deployedAt: new Date() });
    await logAuditEvent({
      userId, action: 'deployment.create', category: 'system',
      entityType: 'DeploymentRecord', entityId: deployment._id,
      newValue: { version: data.version, environment: data.environment, commitId: data.commitId },
      description: `Deployment created: ${data.version} to ${data.environment}`,
    });
    return deployment;
  }

  async updateDeploymentStatus(id, status, userId) {
    const update = { status };
    if (status === 'completed') update.completedAt = new Date();
    const deployment = await DeploymentRecord.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (deployment) {
      await logAuditEvent({
        userId, action: `deployment.${status}`, category: 'system',
        entityType: 'DeploymentRecord', entityId: deployment._id,
        description: `Deployment ${deployment.version} ${status}`,
      });
    }
    return deployment;
  }

  async listDeployments(options = {}) {
    const { environment, status, limit = 20, offset = 0 } = options;
    const filter = {};
    if (environment) filter.environment = environment;
    if (status) filter.status = status;
    const [deployments, total] = await Promise.all([
      DeploymentRecord.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit)
        .populate('deployedBy', 'name email'),
      DeploymentRecord.countDocuments(filter),
    ]);
    return { deployments, total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async getDeployment(id) {
    return DeploymentRecord.findById(id).populate('deployedBy', 'name email');
  }

  async rollbackDeployment(id, userId, reason) {
    const deployment = await DeploymentRecord.findById(id);
    if (!deployment) throw new Error('Deployment not found');
    deployment.status = 'rolled_back';
    deployment.rollbackReason = reason;
    deployment.rollbackVersion = deployment.version;
    await deployment.save();
    await logAuditEvent({
      userId, action: 'deployment.rollback', category: 'system',
      entityType: 'DeploymentRecord', entityId: deployment._id,
      oldValue: { status: 'completed', version: deployment.version },
      newValue: { status: 'rolled_back', reason },
      description: `Rolled back deployment ${deployment.version} from ${deployment.environment}`,
    });
    return deployment;
  }

  async assessProductionReadiness(environment, userId) {
    const checks = [];
    const blockingIssues = [];
    const warnings = [];
    const recommendations = [];

    const checkCategories = [
      { name: 'Environment variables', category: 'environment', check: () => !!process.env.NODE_ENV },
      { name: 'Database connection', category: 'environment', check: () => !!process.env.MONGODB_URI },
      { name: 'JWT secret configured', category: 'secrets', check: () => !!process.env.JWT_SECRET },
      { name: 'Storage configured', category: 'storage', check: () => !!process.env.S3_BUCKET || !!process.env.CLOUDFLARE_R2_BUCKET },
      { name: 'Payment gateway', category: 'payments', check: () => !!process.env.STRIPE_SECRET_KEY },
    ];

    for (const c of checkCategories) {
      const passed = c.check();
      const checkResult = {
        category: c.category, name: c.name,
        status: passed ? 'passed' : 'failed',
        message: passed ? `${c.name} is configured` : `${c.name} is not configured`,
        severity: passed ? 'info' : 'blocking',
      };
      checks.push(checkResult);
      if (!passed) {
        blockingIssues.push(`${c.name} is not configured`);
        recommendations.push({ priority: 'critical', category: c.category, message: `Configure ${c.name}`, action: `Set ${c.name} in environment` });
      }
    }

    const score = checks.length > 0
      ? Math.round((checks.filter(c => c.status === 'passed').length / checks.length) * 100) : 0;

    const readiness = await ProductionReadiness.create({
      environment, checks, score, blockingIssues, warnings, recommendations,
      assessedBy: userId, assessedAt: new Date(),
    });

    await logAuditEvent({
      userId, action: 'production.readiness.assess', category: 'system',
      entityType: 'ProductionReadiness', entityId: readiness._id,
      newValue: { environment, score, blockingIssues: blockingIssues.length },
      description: `Production readiness assessed for ${environment}: ${score}%`,
    });

    return readiness;
  }

  async getLatestReadiness(environment) {
    return ProductionReadiness.findOne({ environment }).sort({ assessedAt: -1 });
  }

  async getReadinessHistory(environment) {
    return ProductionReadiness.find({ environment }).sort({ assessedAt: -1 }).limit(20);
  }
}

export const deploymentService = new DeploymentService();
