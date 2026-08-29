import { SchedulerJob } from '../models/SchedulerJob.js';
import { SchedulerExecution } from '../models/SchedulerExecution.js';
import { logAuditEvent } from './auditService.js';
import scheduler from './scheduler.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class EnterpriseSchedulerService {
  constructor() {
    this.retryQueues = new Map();
    this.deadLetterQueues = new Map();
    this.pausedJobs = new Set();
  }

  async registerJob(data, userId) {
    const job = await SchedulerJob.create({ ...data, createdBy: userId });
    if (job.status === 'active' && !job.isPaused) {
      scheduler.addJob(job.name, job.cronExpression, () => this._executeJob(job._id));
    }
    await logAuditEvent({
      userId, action: 'scheduler.job.register', category: 'system',
      entityType: 'SchedulerJob', entityId: job._id,
      newValue: { name: data.name, cron: data.cronExpression },
      description: `Registered scheduler job: ${data.name}`,
    });
    return job;
  }

  async updateJob(id, data, userId) {
    const job = await SchedulerJob.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (job) {
      scheduler.removeJob(job.name);
      if (job.status === 'active' && !job.isPaused) {
        scheduler.addJob(job.name, job.cronExpression, () => this._executeJob(job._id));
      }
      await logAuditEvent({
        userId, action: 'scheduler.job.update', category: 'system',
        entityType: 'SchedulerJob', entityId: job._id,
        newValue: data,
        description: `Updated scheduler job: ${job.name}`,
      });
    }
    return job;
  }

  async listJobs(options = {}) {
    const { status, type, limit = 50, offset = 0 } = options;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const [jobs, total] = await Promise.all([
      SchedulerJob.find(filter).sort({ name: 1 }).skip(offset).limit(limit),
      SchedulerJob.countDocuments(filter),
    ]);
    return { jobs, total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async getJob(id) {
    return SchedulerJob.findById(id);
  }

  async pauseJob(id, userId, reason) {
    const job = await SchedulerJob.findByIdAndUpdate(id, {
      isPaused: true, pausedAt: new Date(), pausedBy: userId, pausedReason: reason,
    }, { new: true });
    if (job) {
      scheduler.removeJob(job.name);
      this.pausedJobs.add(job.name);
      await logAuditEvent({
        userId, action: 'scheduler.job.pause', category: 'system',
        entityType: 'SchedulerJob', entityId: job._id,
        description: `Paused scheduler job: ${job.name}`,
      });
    }
    return job;
  }

  async resumeJob(id, userId) {
    const job = await SchedulerJob.findByIdAndUpdate(id, {
      isPaused: false, pausedAt: null, pausedBy: null, pausedReason: null,
    }, { new: true });
    if (job) {
      this.pausedJobs.delete(job.name);
      if (job.status === 'active') {
        scheduler.addJob(job.name, job.cronExpression, () => this._executeJob(job._id));
      }
      await logAuditEvent({
        userId, action: 'scheduler.job.resume', category: 'system',
        entityType: 'SchedulerJob', entityId: job._id,
        description: `Resumed scheduler job: ${job.name}`,
      });
    }
    return job;
  }

  async executeJobManually(id, userId) {
    return this._executeJob(id, 'manual', userId);
  }

  async _executeJob(jobId, triggeredBy = 'scheduler', userId = null) {
    const job = await SchedulerJob.findById(jobId);
    if (!job || job.isPaused) return null;

    const execution = await SchedulerExecution.create({
      job: jobId, jobName: job.name, status: 'running', startedAt: new Date(),
      triggeredBy, triggeredByUser: userId,
    });

    const t0 = Date.now();

    try {
      const handlerPath = job.handler;
      const handler = await this._resolveHandler(handlerPath);
      if (handler) {
        await handler({ job, execution });
      }
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - t0;

      job.lastRunAt = new Date();
      job.lastRunStatus = 'success';
      job.lastRunDuration = execution.durationMs;
      job.totalRuns++;
      job.successfulRuns++;
      job.consecutiveFailures = 0;

      const avg = job.averageDuration || 0;
      job.averageDuration = Math.round((avg * (job.totalRuns - 1) + execution.durationMs) / job.totalRuns);
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
      execution.errorStack = err.stack;
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - t0;

      job.lastRunAt = new Date();
      job.lastRunStatus = 'failed';
      job.lastRunError = err.message;
      job.lastRunDuration = execution.durationMs;
      job.totalRuns++;
      job.failedRuns++;
      job.consecutiveFailures++;

      if (job.queue.retryQueue && job.consecutiveFailures <= job.maxRetries) {
        execution.status = 'retrying';
        execution.retryCount++;
        execution.nextRetryAt = new Date(Date.now() + job.retryDelayMs * Math.pow(2, execution.retryCount - 1));
        this._scheduleRetry(execution);
      } else if (job.queue.deadLetterQueue && job.consecutiveFailures > job.maxRetries) {
        this._moveToDeadLetterQueue(job, execution);
      }
    }

    await execution.save();
    await job.save();

    if (triggeredBy === 'scheduler') {
      this._updateSchedulerJob(job);
    }

    return execution;
  }

  async _resolveHandler(handlerPath) {
    try {
      const mod = await import(/* @vite-ignore */ `../${handlerPath}`);
      return mod.default || mod.handler || Object.values(mod)[0];
    } catch (e) {
      logger.error(`Failed to resolve handler: ${handlerPath}`, e);
      return null;
    }
  }

  _scheduleRetry(execution) {
    const delay = execution.nextRetryAt.getTime() - Date.now();
    if (delay > 0) {
      setTimeout(async () => {
        const job = await SchedulerJob.findById(execution.job);
        if (job && !job.isPaused) {
          await this._executeJob(execution.job);
        }
      }, delay);
    }
  }

  _moveToDeadLetterQueue(job, execution) {
    if (!this.deadLetterQueues.has(job.name)) {
      this.deadLetterQueues.set(job.name, []);
    }
    this.deadLetterQueues.get(job.name).push(execution);
    if (this.deadLetterQueues.get(job.name).length > 100) {
      this.deadLetterQueues.get(job.name).shift();
    }
  }

  _updateSchedulerJob(job) {
    scheduler.removeJob(job.name);
    if (!job.isPaused && job.status === 'active') {
      scheduler.addJob(job.name, job.cronExpression, () => this._executeJob(job._id));
    }
  }

  async getExecutions(jobId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;
    const filter = { job: jobId };
    if (status) filter.status = status;
    const [executions, total] = await Promise.all([
      SchedulerExecution.find(filter).sort({ startedAt: -1 }).skip(offset).limit(limit),
      SchedulerExecution.countDocuments(filter),
    ]);
    return { executions, total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async getQueueStats() {
    const [active, paused, failed, completed] = await Promise.all([
      SchedulerJob.countDocuments({ status: 'active', isPaused: false }),
      SchedulerJob.countDocuments({ isPaused: true }),
      SchedulerExecution.countDocuments({ status: 'failed', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
      SchedulerExecution.countDocuments({ status: 'completed', createdAt: { $gte: new Date(Date.now() - 86400000) } }),
    ]);
    return {
      activeJobs: active, pausedJobs: paused,
      failedToday: failed, completedToday: completed,
      retryQueues: this.retryQueues.size,
      deadLetterQueues: Array.from(this.deadLetterQueues.entries()).map(([name, items]) => ({ name, count: items.length })),
      pausedJobsList: Array.from(this.pausedJobs),
    };
  }

  async getDependencyGraph() {
    const jobs = await SchedulerJob.find({}).lean();
    return jobs.map(j => ({
      id: j._id, name: j.name, status: j.isPaused ? 'paused' : j.status,
      dependsOn: j.dependsOn || [],
      dependencies: j.dependencies || [],
    }));
  }

  async retryFailedExecution(executionId) {
    const execution = await SchedulerExecution.findById(executionId);
    if (!execution) throw new Error('Execution not found');
    execution.status = 'pending';
    execution.retryCount = 0;
    execution.error = null;
    execution.errorStack = null;
    await execution.save();
    return this._executeJob(execution.job);
  }
}

export const enterpriseSchedulerService = new EnterpriseSchedulerService();
