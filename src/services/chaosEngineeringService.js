import { ChaosExperiment } from '../models/ChaosExperiment.js';
import { FailureScenario } from '../models/FailureScenario.js';
import { ExperimentExecution } from '../models/ExperimentExecution.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class ChaosEngineeringService {
  async createExperiment(data) {
    const experiment = await ChaosExperiment.create({ ...data, isSimulated: true });
    await logAuditEvent({
      action: 'chaos.experiment.create', category: 'system',
      entityType: 'ChaosExperiment', entityId: experiment._id,
      description: `[SIMULATED] Created chaos experiment: ${data.name} (always simulated)`,
      status: 'success',
    });
    return experiment;
  }

  async updateExperiment(id, data) {
    const experiment = await ChaosExperiment.findByIdAndUpdate(id, { ...data, isSimulated: true }, { new: true });
    await logAuditEvent({
      action: 'chaos.experiment.update', category: 'system',
      entityType: 'ChaosExperiment', entityId: id,
      description: `[SIMULATED] Updated chaos experiment: ${experiment?.name || id}`,
      status: 'success',
    });
    return experiment;
  }

  async getExperiment(id) {
    const experiment = await ChaosExperiment.findById(id).lean();
    if (!experiment) return null;
    const scenarios = await FailureScenario.find({ experiment: id }).lean();
    return { ...experiment, scenarios };
  }

  async listExperiments(filter) {
    const { type, target, status, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (target) query.target = target;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ChaosExperiment.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ChaosExperiment.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async deleteExperiment(id) {
    const experiment = await ChaosExperiment.findByIdAndDelete(id);
    await FailureScenario.deleteMany({ experiment: id });
    await ExperimentExecution.deleteMany({ experiment: id });
    await logAuditEvent({
      action: 'chaos.experiment.delete', category: 'system',
      entityType: 'ChaosExperiment', entityId: id,
      description: `[SIMULATED] Deleted chaos experiment: ${experiment?.name || id}`,
      status: 'success',
    });
    return experiment;
  }

  async runExperiment(experimentId) {
    const experiment = await ChaosExperiment.findById(experimentId);
    if (!experiment) throw new Error('Experiment not found');
    experiment.status = 'running';
    await experiment.save();
    const execution = await ExperimentExecution.create({
      experiment: experimentId,
      status: 'running',
      startedAt: new Date(),
      metrics: { baseline: {}, during: {}, recovery: {}, comparison: {} },
      results: {},
    });
    const scenarios = await FailureScenario.find({ experiment: experimentId }).lean();
    const scenarioResults = [];
    for (const scenario of scenarios) {
      const impact = this._simulateImpact(scenario);
      scenarioResults.push({
        name: scenario.name,
        status: 'completed',
        duration: Math.floor(Math.random() * 5000 + 1000),
        impact,
      });
      await FailureScenario.findByIdAndUpdate(scenario._id, {
        status: 'recovered',
        actualImpact: JSON.stringify(impact),
        duration: Math.floor(Math.random() * 5000 + 1000),
      });
    }
    execution.scenarios = scenarioResults;
    execution.results = {
      successRate: Math.random() * 20 + 80,
      avgLatencyImpact: Math.random() * 200 + 50,
      errorRateImpact: Math.random() * 5 + 1,
      servicesStable: true,
    };
    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.duration = new Date().getTime() - new Date(execution.startedAt).getTime();
    await execution.save();
    experiment.status = 'completed';
    await experiment.save();
    await logAuditEvent({
      action: 'chaos.experiment.run', category: 'system',
      entityType: 'ChaosExperiment', entityId: experimentId,
      description: `[SIMULATED] Executed chaos experiment: ${experiment.name} - ${scenarios.length} scenarios simulated`,
      status: 'success',
    });
    return { experiment, execution };
  }

  async stopExperiment(executionId) {
    const execution = await ExperimentExecution.findByIdAndUpdate(
      executionId,
      { $set: { status: 'stopped', completedAt: new Date() } },
      { new: true }
    );
    if (execution?.experiment) {
      await ChaosExperiment.findByIdAndUpdate(execution.experiment, { status: 'stopped' });
    }
    await logAuditEvent({
      action: 'chaos.experiment.stop', category: 'system',
      entityType: 'ExperimentExecution', entityId: executionId,
      description: `[SIMULATED] Stopped experiment execution ${executionId}`,
      status: 'success',
    });
    return execution;
  }

  async getExperimentStatus(executionId) {
    const execution = await ExperimentExecution.findById(executionId).lean();
    if (!execution) throw new Error('Execution not found');
    return {
      executionId: execution._id,
      status: execution.status,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      duration: execution.duration,
      scenariosCompleted: execution.scenarios?.filter(s => s.status === 'completed').length || 0,
      scenariosTotal: execution.scenarios?.length || 0,
    };
  }

  async createFailureScenario(experimentId, data) {
    const scenario = await FailureScenario.create({ experiment: experimentId, ...data });
    await logAuditEvent({
      action: 'chaos.scenario.create', category: 'system',
      entityType: 'FailureScenario', entityId: scenario._id,
      description: `[SIMULATED] Created failure scenario: ${data.name} for experiment ${experimentId}`,
      status: 'success',
    });
    return scenario;
  }

  async simulateDatabaseFailure(params) {
    const impact = {
      type: 'database_failure',
      simulated: true,
      estimatedRequestsAffected: Math.floor(Math.random() * 1000 + 100),
      estimatedErrorRate: Math.random() * 30 + 10,
      estimatedLatencyIncrease: Math.random() * 500 + 100,
      durationMs: params.duration || 5000,
      message: `[SIMULATED] Database failure impact analysis for ${params.target || 'primary'} - no actual failure injected`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.database_failure', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Database failure simulation - ${params.target || 'primary'} (no real failure)`,
      status: 'success',
    });
    return impact;
  }

  async simulateCacheFailure(params) {
    const impact = {
      type: 'cache_failure',
      simulated: true,
      estimatedCacheMissRate: Math.random() * 60 + 40,
      estimatedLatencyImpact: Math.random() * 300 + 50,
      estimatedRequestCount: Math.floor(Math.random() * 5000 + 500),
      durationMs: params.duration || 3000,
      message: `[SIMULATED] Cache failure impact analysis for ${params.target || 'default'} - no actual failure injected`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.cache_failure', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Cache failure simulation - ${params.target || 'default'} (no real failure)`,
      status: 'success',
    });
    return impact;
  }

  async simulateNetworkLatency(params) {
    const impact = {
      type: 'network_latency',
      simulated: true,
      addedLatencyMs: params.latencyMs || 200,
      estimatedTimeoutRate: Math.random() * 15 + 2,
      estimatedDegradationPercent: Math.random() * 30 + 10,
      durationMs: params.duration || 10000,
      message: `[SIMULATED] Network latency impact analysis - added ${params.latencyMs || 200}ms (no actual latency injected)`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.network_latency', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Network latency simulation - ${params.latencyMs || 200}ms added (no real latency)`,
      status: 'success',
    });
    return impact;
  }

  async simulateServiceDegradation(params) {
    const impact = {
      type: 'service_degradation',
      simulated: true,
      targetService: params.target || 'unknown',
      estimatedErrorRate: Math.random() * 50 + 20,
      estimatedLatencyIncrease: Math.random() * 1000 + 200,
      estimatedUsersAffected: Math.floor(Math.random() * 2000 + 200),
      durationMs: params.duration || 15000,
      message: `[SIMULATED] Service degradation impact for ${params.target || 'unknown'} - no actual degradation injected`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.service_degradation', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Service degradation simulation - ${params.target || 'unknown'} (no real degradation)`,
      status: 'success',
    });
    return impact;
  }

  async simulateWorkerOutage(params) {
    const impact = {
      type: 'worker_outage',
      simulated: true,
      workersAffected: params.count || 1,
      estimatedQueueBacklog: Math.floor(Math.random() * 10000 + 500),
      estimatedProcessingDelay: Math.random() * 60000 + 10000,
      estimatedJobsAffected: Math.floor(Math.random() * 500 + 50),
      durationMs: params.duration || 30000,
      message: `[SIMULATED] Worker outage impact - ${params.count || 1} workers (no actual outage injected)`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.worker_outage', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Worker outage simulation - ${params.count || 1} workers affected (no real outage)`,
      status: 'success',
    });
    return impact;
  }

  async simulateResourceExhaustion(params) {
    const impact = {
      type: 'resource_exhaustion',
      simulated: true,
      resourceType: params.resource || 'memory',
      estimatedUsagePercent: Math.random() * 40 + 60,
      estimatedDegradation: Math.random() * 50 + 20,
      estimatedTimeToImpact: Math.floor(Math.random() * 120 + 30),
      durationMs: params.duration || 20000,
      message: `[SIMULATED] Resource exhaustion impact - ${params.resource || 'memory'} at ${params.percentage || 90}% (no actual exhaustion)`,
    };
    await logAuditEvent({
      action: 'chaos.simulate.resource_exhaustion', category: 'system',
      entityType: 'ChaosExperiment',
      description: `[SIMULATED] Resource exhaustion simulation - ${params.resource || 'memory'} (no real exhaustion)`,
      status: 'success',
    });
    return impact;
  }

  async getFailureImpactAnalysis(experimentId) {
    const experiment = await ChaosExperiment.findById(experimentId).lean();
    if (!experiment) throw new Error('Experiment not found');
    const scenarios = await FailureScenario.find({ experiment: experimentId }).lean();
    const analysis = scenarios.map(s => {
      const impact = this._simulateImpact(s);
      return {
        scenario: s.name,
        type: s.type,
        target: s.target,
        action: s.action,
        simulatedImpact: impact,
        riskLevel: impact.estimatedErrorRate > 30 ? 'high' : impact.estimatedErrorRate > 10 ? 'medium' : 'low',
      };
    });
    return {
      experimentId: experiment._id,
      experimentName: experiment.name,
      isSimulated: true,
      analysis,
      overallRisk: analysis.some(a => a.riskLevel === 'high') ? 'high' : analysis.some(a => a.riskLevel === 'medium') ? 'medium' : 'low',
    };
  }

  async getExperimentHistory(filter) {
    const { experiment, status, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (experiment) query.experiment = experiment;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      ExperimentExecution.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      ExperimentExecution.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async generateChaosReport() {
    const [experiments, executions] = await Promise.all([
      ChaosExperiment.find({}).lean(),
      ExperimentExecution.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ]);
    const byType = {};
    for (const e of experiments) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    const completedExecs = executions.filter(e => e.status === 'completed');
    const avgSuccessRate = completedExecs.length > 0
      ? completedExecs.reduce((s, e) => s + (e.results?.successRate || 0), 0) / completedExecs.length
      : 0;
    return {
      generatedAt: new Date(),
      isSimulated: true,
      summary: {
        totalExperiments: experiments.length,
        executions: executions.length,
        experimentsByType: byType,
        avgSuccessRate: Math.round(avgSuccessRate * 100) / 100,
        totalScenarios: experiments.reduce((s, e) => s + (e.scenario ? 1 : 0), 0),
      },
      note: 'All chaos experiments are simulated. No real failures were injected.',
    };
  }

  async validateExperiment(experimentId) {
    const experiment = await ChaosExperiment.findById(experimentId).lean();
    if (!experiment) throw new Error('Experiment not found');
    const scenarios = await FailureScenario.find({ experiment: experimentId }).lean();
    const allSimulated = experiment.isSimulated !== false;
    const warnings = [];
    if (!allSimulated) {
      warnings.push('Experiment is not marked as simulated');
    }
    return {
      experimentId: experiment._id,
      experimentName: experiment.name,
      validated: allSimulated,
      isSimulated: allSimulated,
      scenariosCount: scenarios.length,
      warnings,
      message: allSimulated ? 'Experiment validated - all scenarios are simulated' : 'WARNING: Experiment is not marked as simulated',
    };
  }

  _simulateImpact(scenario) {
    return {
      estimatedErrorRate: Math.random() * 40 + 5,
      estimatedLatencyMs: Math.random() * 500 + 50,
      estimatedRequestsAffected: Math.floor(Math.random() * 1000 + 100),
      servicesDegraded: [scenario.target || 'unknown'],
      recoveryTime: Math.floor(Math.random() * 10000 + 2000),
    };
  }
}

export const chaosEngineeringService = new ChaosEngineeringService();
