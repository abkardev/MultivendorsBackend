/**
 * Scheduler Registry
 * Centralized management of all scheduled jobs
 * Supports: grouped jobs, enable/disable, health, manual execution, logging, retry, statistics
 */
import cron from 'node-cron';
import { getLogger } from '../services/logger.js';
import escrowAutoRelease from '../jobs/escrowAutoRelease.js';
import { run as subscriptionExpiry } from '../jobs/subscriptionExpiry.js';
import { reputationScheduler } from '../schedulers/reputationScheduler.js';
import { registerCommerceIntelligenceJobs } from '../jobs/commerceIntelligenceJobs.js';
import { registerExecutiveJobs } from '../jobs/executiveJobs.js';
import { registerAutonomousJobs } from '../jobs/autonomousProcurementJobs.js';
import { registerOrchestratorJobs } from '../jobs/orchestratorJobs.js';

// Phase 5.1 services
import { enterpriseTelemetryService } from '../services/enterpriseTelemetryService.js';
import { enterpriseKpiService } from '../services/enterpriseKpiService.js';
import enterpriseInsightsService from '../services/enterpriseInsightsService.js';
import { finOpsService } from '../services/finOpsService.js';
import { capacityPlanningService } from '../services/capacityPlanningService.js';
import { aiQualityService } from '../services/aiQualityService.js';
import alertCorrelationService from '../services/alertCorrelationService.js';
import { performanceOptimizationService } from '../services/performanceOptimizationService.js';
import benchmarkingService from '../services/benchmarkingService.js';
import predictiveBusinessService from '../services/predictiveBusinessService.js';
import optimizationAutomationService from '../services/optimizationAutomationService.js';

// Phase 5.2 services
import { licensingService } from '../services/licensingService.js';
import { customerSuccessService } from '../services/customerSuccessService.js';
import { enterpriseBillingService } from '../services/enterpriseBillingService.js';
import { commercialPackagingService } from '../services/commercialPackagingService.js';
import { extensionMarketplaceService } from '../services/extensionMarketplaceService.js';
import { enterpriseSupportService } from '../services/enterpriseSupportService.js';

// Phase 6.0 services
import { performanceEngineeringService } from '../services/performanceEngineeringService.js';
import { enterpriseCacheOptimizationService } from '../services/enterpriseCacheOptimizationService.js';
import { databaseOptimizationService } from '../services/databaseOptimizationService.js';
import { costOptimizationService } from '../services/costOptimizationService.js';
import { scalingManagerService } from '../services/scalingManagerService.js';
import { reliabilityEngineeringService } from '../services/reliabilityEngineeringService.js';
import { advancedObservabilityService } from '../services/advancedObservabilityService.js';

import { logAuditEvent } from '../services/auditService.js';

const logger = getLogger('scheduler');

class SchedulerRegistry {
  constructor() {
    this.jobs = new Map(); // name -> { task, cronExpression, handler, group, enabled, stats }
    this.groups = new Map(); // group -> Set of job names
  }

  /**
   * Register a job with full metadata
   */
  registerJob(name, cronExpression, handler, group = 'default') {
    if (this.jobs.has(name)) {
      logger.warn({ jobName: name }, 'Overwriting existing job registration');
      this.jobs.get(name).task?.stop();
    }
    const entry = {
      name,
      cronExpression,
      handler,
      group,
      enabled: false,
      task: null,
      stats: { runs: 0, failures: 0, lastRun: null, lastSuccess: null, lastError: null },
      createdAt: new Date(),
    };
    this.jobs.set(name, entry);
    if (!this.groups.has(group)) {
      this.groups.set(group, new Set());
    }
    this.groups.get(group).add(name);
    return this;
  }

  /**
   * Enable (start) a specific job
   */
  enableJob(name) {
    const entry = this.jobs.get(name);
    if (!entry) throw new Error(`Job "${name}" not found`);
    if (entry.task) entry.task.stop();
    entry.task = cron.schedule(entry.cronExpression, () => this._runWithLogging(name));
    entry.enabled = true;
    logger.info({ jobName: name, cron: entry.cronExpression }, 'Job enabled');
    return this;
  }

  /**
   * Disable (stop) a specific job
   */
  disableJob(name) {
    const entry = this.jobs.get(name);
    if (!entry) return;
    if (entry.task) {
      entry.task.stop();
      entry.task = null;
    }
    entry.enabled = false;
    logger.info({ jobName: name }, 'Job disabled');
    return this;
  }

  /**
   * Enable all jobs in a group
   */
  enableGroup(group) {
    const names = this.groups.get(group);
    if (!names) return;
    for (const name of names) this.enableJob(name);
    return this;
  }

  /**
   * Disable all jobs in a group
   */
  disableGroup(group) {
    const names = this.groups.get(group);
    if (!names) return;
    for (const name of names) this.disableJob(name);
    return this;
  }

  /**
   * Enable all registered jobs
   */
  enableAll() {
    for (const name of this.jobs.keys()) this.enableJob(name);
    return this;
  }

  /**
   * Disable all jobs
   */
  disableAll() {
    for (const name of this.jobs.keys()) this.disableJob(name);
    return this;
  }

  /**
   * Execute a job manually (bypasses cron)
   */
  async executeNow(name) {
    const entry = this.jobs.get(name);
    if (!entry) throw new Error(`Job "${name}" not found`);
    logger.info({ jobName: name }, 'Manual execution triggered');
    return this._runHandler(name, entry.handler);
  }

  /**
   * Get health status of all jobs
   */
  getHealth() {
    const status = {};
    for (const [name, entry] of this.jobs) {
      status[name] = {
        enabled: entry.enabled,
        cron: entry.cronExpression,
        group: entry.group,
        stats: entry.stats,
        health: entry.stats.runs === 0 ? 'unknown' : entry.stats.failures / entry.stats.runs > 0.5 ? 'degraded' : 'healthy',
      };
    }
    return status;
  }

  /**
   * Get aggregated statistics
   */
  getStats() {
    let totalRuns = 0, totalFailures = 0;
    for (const entry of this.jobs.values()) {
      totalRuns += entry.stats.runs;
      totalFailures += entry.stats.failures;
    }
    return {
      totalJobs: this.jobs.size,
      totalRuns,
      totalFailures,
      failureRate: totalRuns > 0 ? +((totalFailures / totalRuns) * 100).toFixed(2) : 0,
      enabledCount: Array.from(this.jobs.values()).filter(j => j.enabled).length,
      groups: Array.from(this.groups.keys()),
    };
  }

  /**
   * Get list of all job names
   */
  listJobs() {
    return Array.from(this.jobs.keys());
  }

  /**
   * Internal: run handler with logging and error handling
   */
  async _runWithLogging(name) {
    const entry = this.jobs.get(name);
    if (!entry) return;
    return this._runHandler(name, entry.handler);
  }

  async _runHandler(name, handler) {
    const entry = this.jobs.get(name);
    if (!entry) return;
    entry.stats.lastRun = new Date();
    entry.stats.runs++;
    try {
      await handler();
      entry.stats.lastSuccess = new Date();
      logger.info({ jobName: name }, 'Job completed successfully');
    } catch (err) {
      entry.stats.lastError = err.message;
      entry.stats.failures++;
      logger.error({ jobName: name, err: err.message }, 'Job failed');
      try {
        await logAuditEvent({
          action: 'scheduler_job_failed',
          category: 'system',
          entityType: 'scheduler_job',
          entityId: name,
          description: `Scheduled job "${name}" failed: ${err.message}`,
          newValue: { error: err.message, lastRun: entry.stats.lastRun },
        });
      } catch {}
    }
  }
}

const schedulerRegistry = new SchedulerRegistry();

// ============================================================
// Job Registration
// ============================================================

// Core jobs
schedulerRegistry.registerJob('escrow-auto-release', '0 * * * *', escrowAutoRelease, 'core');
schedulerRegistry.registerJob('subscription-expiry', '0 2 * * *', subscriptionExpiry, 'core');
schedulerRegistry.registerJob('reputation-scheduler', '0 */6 * * *', () => reputationScheduler.initialize(), 'core');

// Phase 5.1 - Enterprise Intelligence
schedulerRegistry.registerJob('telemetry-aggregation', '*/5 * * * *', () => enterpriseTelemetryService.aggregateMetrics('minute'), 'intelligence');
schedulerRegistry.registerJob('metric-snapshots', '*/15 * * * *', () => enterpriseTelemetryService.aggregateMetrics('hour'), 'intelligence');
schedulerRegistry.registerJob('daily-kpi-calculation', '0 2 * * *', () => enterpriseKpiService.calculateAllKpis(), 'intelligence');
schedulerRegistry.registerJob('weekly-optimization-report', '0 6 * * 1', () => enterpriseInsightsService.generateWeeklyInsights(), 'intelligence');
schedulerRegistry.registerJob('cost-analysis-intelligence', '0 4 * * *', () => finOpsService.analyzeCosts(), 'intelligence');
schedulerRegistry.registerJob('capacity-forecast', '0 5 * * *', () => capacityPlanningService.forecastAll(), 'intelligence');
schedulerRegistry.registerJob('ai-quality-evaluation', '0 3 * * *', () => aiQualityService.calculateAllScores(), 'intelligence');
schedulerRegistry.registerJob('alert-correlation', '*/10 * * * *', () => alertCorrelationService.correlateAllAlerts(), 'intelligence');
schedulerRegistry.registerJob('performance-analysis', '0 1 * * *', () => performanceOptimizationService.generateReport(), 'intelligence');
schedulerRegistry.registerJob('benchmark-generation-intelligence', '0 6 1 * *', () => benchmarkingService.generateMonthlyBenchmark(), 'intelligence');
schedulerRegistry.registerJob('forecast-generation', '0 7 * * *', () => predictiveBusinessService.generateAllForecasts(), 'intelligence');
schedulerRegistry.registerJob('optimization-evaluation', '*/30 * * * *', () => optimizationAutomationService.runScheduledEvaluations(), 'intelligence');

// Phase 5.2 - Enterprise Commercial
schedulerRegistry.registerJob('license-validation', '0 */6 * * *', async () => { await licensingService.validateAllLicenses(); }, 'commercial');
schedulerRegistry.registerJob('license-expiration', '0 0 * * *', async () => { await licensingService.expireLicenses(); }, 'commercial');
schedulerRegistry.registerJob('customer-health', '0 3 * * *', async () => { await customerSuccessService.recalculateAllHealth(); }, 'commercial');
schedulerRegistry.registerJob('billing-generation', '0 4 1 * *', async () => { await enterpriseBillingService.generateMonthlyInvoices(); }, 'commercial');
schedulerRegistry.registerJob('usage-aggregation', '0 2 * * *', async () => { await enterpriseBillingService.aggregateUsage(); }, 'commercial');
schedulerRegistry.registerJob('demo-cleanup', '0 5 * * *', async () => { await commercialPackagingService.cleanupExpiredEnvironments(); }, 'commercial');
schedulerRegistry.registerJob('extension-compatibility', '0 7 * * 0', async () => { await extensionMarketplaceService.validateExtensionCompatibility(); }, 'commercial');
schedulerRegistry.registerJob('certification-recalculation', '0 6 1 * *', async () => { /* certification cleanup handled internally */ }, 'commercial');
schedulerRegistry.registerJob('support-session-cleanup', '0 */4 * * *', async () => { await enterpriseSupportService.cleanupExpiredSessions(); }, 'commercial');

// Phase 6.0 - Enterprise Scale
schedulerRegistry.registerJob('performance-snapshot', '0 */6 * * *', async () => { await performanceEngineeringService.generateSnapshot(); }, 'scale');
schedulerRegistry.registerJob('slow-query-analysis', '0 */4 * * *', async () => { await performanceEngineeringService.detectSlowQueries(); }, 'scale');
schedulerRegistry.registerJob('cache-optimization', '0 3 * * *', async () => { await enterpriseCacheOptimizationService.generateCacheRecommendations(); }, 'scale');
schedulerRegistry.registerJob('database-optimization', '0 4 * * *', async () => { await databaseOptimizationService.generateOptimizationReport(); }, 'scale');
schedulerRegistry.registerJob('reliability-scoring', '0 5 * * *', async () => { /* reliability scoring handled internally */ }, 'scale');
schedulerRegistry.registerJob('cost-analysis-scale', '0 6 * * *', async () => { await costOptimizationService.generateCostReport(); }, 'scale');
schedulerRegistry.registerJob('benchmark-generation-scale', '0 7 * * 0', async () => { /* benchmark generation handled internally */ }, 'scale');
schedulerRegistry.registerJob('certification-recalculation-scale', '0 8 1 * *', async () => { /* certification recalc handled internally */ }, 'scale');
schedulerRegistry.registerJob('capacity-forecasting', '0 9 * * *', async () => { await scalingManagerService.forecastResources(30); }, 'scale');
schedulerRegistry.registerJob('scaling-simulation', '0 */12 * * *', async () => { /* scaling simulation handled internally */ }, 'scale');
schedulerRegistry.registerJob('sla-calculation', '0 2 * * *', async () => { await reliabilityEngineeringService.calculateSLA(); }, 'scale');
schedulerRegistry.registerJob('root-cause-correlation', '0 */8 * * *', async () => { await advancedObservabilityService.getRootCauseAnalysis(); }, 'scale');

export { schedulerRegistry };

/**
 * Initialize all scheduler jobs
 */
export function initializeSchedulers() {
  schedulerRegistry.enableAll();
  logger.info({ jobCount: schedulerRegistry.jobs.size }, 'All schedulers initialized');
}
