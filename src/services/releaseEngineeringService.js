import { DeploymentStrategy } from '../models/DeploymentStrategy.js';
import { ReleasePipeline } from '../models/ReleasePipeline.js';
import { RolloutPolicy } from '../models/RolloutPolicy.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ReleaseEngineeringService {
  async createStrategy(data) {
    const strategy = await DeploymentStrategy.create(data);
    await logAuditEvent({
      action: 'release.strategy.create', category: 'system',
      entityType: 'DeploymentStrategy', entityId: strategy._id,
      description: `Created deployment strategy: ${strategy.name}`,
      status: 'success',
    });
    return strategy;
  }

  async updateStrategy(id, data) {
    const strategy = await DeploymentStrategy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!strategy) throw new Error('DeploymentStrategy not found');
    await logAuditEvent({
      action: 'release.strategy.update', category: 'system',
      entityType: 'DeploymentStrategy', entityId: id,
      description: `Updated deployment strategy: ${strategy.name}`,
      status: 'success',
    });
    return strategy;
  }

  async getStrategy(id) {
    const strategy = await DeploymentStrategy.findById(id).lean();
    if (!strategy) throw new Error('DeploymentStrategy not found');
    return strategy;
  }

  async listStrategies(filter = {}) {
    const { type, isActive, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      DeploymentStrategy.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      DeploymentStrategy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async createPipeline(data) {
    const pipeline = await ReleasePipeline.create(data);
    await logAuditEvent({
      action: 'release.pipeline.create', category: 'system',
      entityType: 'ReleasePipeline', entityId: pipeline._id,
      description: `Created release pipeline: ${pipeline.name}`,
      status: 'success',
    });
    return pipeline;
  }

  async updatePipeline(id, data) {
    const pipeline = await ReleasePipeline.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!pipeline) throw new Error('ReleasePipeline not found');
    await logAuditEvent({
      action: 'release.pipeline.update', category: 'system',
      entityType: 'ReleasePipeline', entityId: id,
      description: `Updated release pipeline: ${pipeline.name}`,
      status: 'success',
    });
    return pipeline;
  }

  async getPipeline(id) {
    const pipeline = await ReleasePipeline.findById(id).populate('strategy').lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    return pipeline;
  }

  async listPipelines(filter = {}) {
    const { status, limit = 20, offset = 0 } = filter;
    const query = {};
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ReleasePipeline.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ReleasePipeline.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async createRolloutPolicy(data) {
    const policy = await RolloutPolicy.create(data);
    await logAuditEvent({
      action: 'release.rollout_policy.create', category: 'system',
      entityType: 'RolloutPolicy', entityId: policy._id,
      description: `Created rollout policy: ${policy.name}`,
      status: 'success',
    });
    return policy;
  }

  async updateRolloutPolicy(id, data) {
    const policy = await RolloutPolicy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!policy) throw new Error('RolloutPolicy not found');
    await logAuditEvent({
      action: 'release.rollout_policy.update', category: 'system',
      entityType: 'RolloutPolicy', entityId: id,
      description: `Updated rollout policy: ${policy.name}`,
      status: 'success',
    });
    return policy;
  }

  async getRolloutPolicy(id) {
    const policy = await RolloutPolicy.findById(id).populate('pipeline').lean();
    if (!policy) throw new Error('RolloutPolicy not found');
    return policy;
  }

  async listRolloutPolicies(filter = {}) {
    const { type, isActive, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive;
    const [items, total] = await Promise.all([
      RolloutPolicy.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      RolloutPolicy.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async planDeployment(pipelineId) {
    const pipeline = await ReleasePipeline.findById(pipelineId).populate('strategy').lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    const strategy = pipeline.strategy;
    const plan = {
      pipeline: pipeline.name,
      strategy: strategy ? strategy.type : 'rolling',
      stages: [],
      estimatedDuration: 0,
    };
    if (strategy) {
      const warmup = strategy.parameters ? strategy.parameters.warmupTime || 120 : 120;
      const cooldown = strategy.parameters ? strategy.parameters.cooldownTime || 60 : 60;
      plan.stages.push(
        { name: 'Build & Validate', order: 1, estimatedDuration: 300 },
        { name: 'Deploy', order: 2, estimatedDuration: warmup },
        { name: 'Smoke Test', order: 3, estimatedDuration: 60 },
        { name: 'Health Check', order: 4, estimatedDuration: cooldown },
        { name: 'Traffic Shift', order: 5, estimatedDuration: 120 },
        { name: 'Monitor', order: 6, estimatedDuration: 600 },
      );
      plan.estimatedDuration = plan.stages.reduce((s, st) => s + st.estimatedDuration, 0);
    }
    return plan;
  }

  async simulateCanaryDeployment(pipelineId, percent = 10) {
    const pipeline = await ReleasePipeline.findById(pipelineId).lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    const steps = [5, 10, 25, 50, 75, 100];
    return {
      type: 'canary',
      pipeline: pipeline.name,
      simulation: true,
      simulationNote: 'SIMULATION - Canary deployment simulation',
      canaryPercent: percent,
      stages: steps.filter(s => s <= percent).map((pct, i) => ({
        step: i + 1,
        trafficPercent: pct,
        duration: 120,
        status: pct <= percent ? 'ready' : 'pending',
      })),
      rollbackTriggers: ['error_rate > 1%', 'latency_p95 > 500ms', 'health_check_failure'],
    };
  }

  async simulateBlueGreenDeployment(pipelineId) {
    const pipeline = await ReleasePipeline.findById(pipelineId).lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    return {
      type: 'blue_green',
      pipeline: pipeline.name,
      simulation: true,
      simulationNote: 'SIMULATION - Blue/Green deployment simulation',
      stages: [
        { name: 'Provision Green', status: 'completed', duration: 180 },
        { name: 'Deploy to Green', status: 'completed', duration: 120 },
        { name: 'Run Smoke Tests', status: 'completed', duration: 60 },
        { name: 'Health Check Green', status: 'completed', duration: 30 },
        { name: 'Switch Traffic to Green', status: 'pending', requiresConfirmation: true },
        { name: 'Monitor Green', status: 'pending', duration: 600 },
        { name: 'Drain Blue', status: 'pending', duration: 300 },
        { name: 'Terminate Blue', status: 'pending', duration: 120 },
      ],
      rollbackStrategy: 'Switch traffic back to Blue environment',
    };
  }

  async simulateProgressiveRollout(pipelineId, steps = [10, 25, 50, 100]) {
    const pipeline = await ReleasePipeline.findById(pipelineId).lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    return {
      type: 'progressive',
      pipeline: pipeline.name,
      simulation: true,
      simulationNote: 'SIMULATION - Progressive rollout simulation',
      steps: steps.map((pct, i) => ({
        step: i + 1,
        percentage: pct,
        duration: 180,
        validationCriteria: ['error_rate < 0.5%', 'latency_p95 < 300ms', 'throughput_ok'],
        status: 'planned',
      })),
      totalDuration: steps.length * 180,
      gatingCriteria: ['P0 tests pass', 'Security scan clear', 'Performance test pass'],
    };
  }

  async validateRelease(pipelineId) {
    const pipeline = await ReleasePipeline.findById(pipelineId).populate('strategy').lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    const validations = [];
    let allPassed = true;
    if (!pipeline.strategy) {
      validations.push({ name: 'Strategy assigned', status: 'fail', message: 'No deployment strategy configured' });
      allPassed = false;
    } else {
      validations.push({ name: 'Strategy assigned', status: 'pass' });
    }
    if (!pipeline.version) {
      validations.push({ name: 'Version specified', status: 'fail', message: 'No version set' });
      allPassed = false;
    } else {
      validations.push({ name: 'Version specified', status: 'pass' });
    }
    if (!pipeline.artifact || !pipeline.artifact.url) {
      validations.push({ name: 'Artifact configured', status: 'warn', message: 'No artifact URL' });
    } else {
      validations.push({ name: 'Artifact configured', status: 'pass' });
    }
    validations.push({ name: 'Approvals collected', status: pipeline.approvals && pipeline.approvals.length > 0 ? 'pass' : 'warn', message: pipeline.approvals && pipeline.approvals.length > 0 ? undefined : 'No approvals yet' });
    return { pipeline: pipeline.name, validations, allPassed, ready: allPassed };
  }

  async generateDeploymentPlan(pipelineId) {
    const pipeline = await ReleasePipeline.findById(pipelineId).populate('strategy').lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    const strategy = pipeline.strategy;
    const strategyType = strategy ? strategy.type : 'rolling';
    return {
      pipeline: pipeline.name,
      version: pipeline.version,
      strategy: strategyType,
      artifact: pipeline.artifact,
      stages: (pipeline.stages || []).map(s => ({
        name: s.name,
        type: s.type,
        status: s.status,
        order: s.order,
        steps: (s.steps || []).map(st => ({ name: st.name, type: st.type, status: st.status })),
      })),
      approvals: pipeline.approvals,
      estimatedDuration: strategy ? (strategy.parameters ? strategy.parameters.rolloutDuration || 900 : 900) : 900,
      rollbackProcedure: strategyType === 'blue_green' ? 'Switch DNS to previous environment' : 'Revert to previous version via pipeline',
    };
  }

  async getRollbackPlan(pipelineId) {
    const pipeline = await ReleasePipeline.findById(pipelineId).populate('strategy').lean();
    if (!pipeline) throw new Error('ReleasePipeline not found');
    const strategy = pipeline.strategy;
    const strategyType = strategy ? strategy.type : 'rolling';
    const rollbackStrategies = {
      blue_green: {
        type: 'instant',
        procedure: 'Redirect traffic to Blue environment',
        estimatedRTO: 60,
        dataLoss: false,
      },
      canary: {
        type: 'gradual',
        procedure: 'Reduce canary traffic to 0%, revert to previous version',
        estimatedRTO: 180,
        dataLoss: false,
      },
      rolling: {
        type: 'sequential',
        procedure: 'Rollback instances one by one to previous version',
        estimatedRTO: 300,
        dataLoss: false,
      },
      recreate: {
        type: 'full_redeploy',
        procedure: 'Redeploy previous version',
        estimatedRTO: 600,
        dataLoss: false,
      },
      progressive: {
        type: 'gradual',
        procedure: 'Reverse progressive rollout steps',
        estimatedRTO: 240,
        dataLoss: false,
      },
    };
    return {
      pipeline: pipeline.name,
      version: pipeline.version,
      rollbackStrategy: rollbackStrategies[strategyType] || rollbackStrategies.rolling,
      triggers: ['automated_health_check_failure', 'manual_trigger', 'error_rate_threshold_exceeded'],
    };
  }

  async approveDeployment(pipelineId, user) {
    const pipeline = await ReleasePipeline.findById(pipelineId);
    if (!pipeline) throw new Error('ReleasePipeline not found');
    pipeline.approvals.push({ user, role: 'deployer', status: 'approved', timestamp: new Date() });
    await pipeline.save();
    await logAuditEvent({
      action: 'release.approve', category: 'system',
      entityType: 'ReleasePipeline', entityId: pipelineId,
      newValue: { approvedBy: user },
      description: `Deployment ${pipeline.name} approved by ${user}`,
      status: 'success',
    });
    return pipeline;
  }

  async getAllPipelines() {
    const pipelines = await ReleasePipeline.find({}).sort({ createdAt: -1 }).populate('strategy').lean();
    return pipelines.map(p => ({
      id: p._id,
      name: p.name,
      strategy: p.strategy ? p.strategy.type : 'none',
      status: p.status,
      version: p.version,
      stages: (p.stages || []).length,
      approvals: (p.approvals || []).length,
      createdAt: p.createdAt,
    }));
  }
}

export const releaseEngineeringService = new ReleaseEngineeringService();
