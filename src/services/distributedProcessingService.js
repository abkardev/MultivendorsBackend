import { DistributedWorker } from '../models/DistributedWorker.js';
import { DistributedQueue } from '../models/DistributedQueue.js';
import { QueuePartition } from '../models/QueuePartition.js';
import { WorkerExecution } from '../models/WorkerExecution.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class DistributedProcessingService {
  async registerWorker(data) {
    const existing = await DistributedWorker.findOne({ workerId: data.workerId });
    if (existing) {
      Object.assign(existing, data);
      return existing.save();
    }
    const worker = await DistributedWorker.create(data);
    await logAuditEvent({
      action: 'worker.register', category: 'system',
      entityType: 'DistributedWorker', entityId: worker._id,
      description: `Registered worker: ${data.name} (${data.workerId})`,
      status: 'success',
    });
    return worker;
  }

  async getWorker(id) {
    return DistributedWorker.findById(id).lean();
  }

  async listWorkers(filter) {
    const { type, status, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      DistributedWorker.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      DistributedWorker.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async updateWorkerStatus(id, status) {
    const worker = await DistributedWorker.findByIdAndUpdate(id, { status, lastHeartbeat: new Date() }, { new: true });
    await logAuditEvent({
      action: 'worker.status.update', category: 'system',
      entityType: 'DistributedWorker', entityId: id,
      newValue: { status },
      description: `Updated worker ${worker?.workerId || id} status to ${status}`,
      status: 'success',
    });
    return worker;
  }

  async createQueue(data) {
    const queue = await DistributedQueue.create(data);
    if (queue.partitions > 0) {
      const partitionDocs = [];
      for (let i = 0; i < queue.partitions; i++) {
        partitionDocs.push({
          queue: queue._id,
          partitionId: `${queue.name}-p${i}`,
          priority: 0,
        });
      }
      await QueuePartition.insertMany(partitionDocs);
    }
    await logAuditEvent({
      action: 'queue.create', category: 'system',
      entityType: 'DistributedQueue', entityId: queue._id,
      description: `Created distributed queue: ${data.name} with ${queue.partitions} partitions`,
      status: 'success',
    });
    return queue;
  }

  async getQueue(id) {
    const queue = await DistributedQueue.findById(id).lean();
    if (!queue) return null;
    const partitions = await QueuePartition.find({ queue: queue._id }).lean();
    return { ...queue, partitions };
  }

  async listQueues(filter) {
    const { type, status, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      DistributedQueue.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      DistributedQueue.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async updateQueueStatus(id, status) {
    const queue = await DistributedQueue.findByIdAndUpdate(id, { status }, { new: true });
    await logAuditEvent({
      action: 'queue.status.update', category: 'system',
      entityType: 'DistributedQueue', entityId: id,
      newValue: { status },
      description: `Updated queue ${queue?.name || id} status to ${status}`,
      status: 'success',
    });
    return queue;
  }

  async enqueueJob(queueId, jobData) {
    const queue = await DistributedQueue.findById(queueId);
    if (!queue) throw new Error('Queue not found');
    const partition = await QueuePartition.findOne({ queue: queueId, status: 'active' }).sort({ pendingCount: 1 });
    const execution = await WorkerExecution.create({
      queue: queueId,
      partition: partition?._id,
      jobId: jobData.jobId || `job_${Date.now()}`,
      jobType: jobData.jobType,
      payload: jobData.payload,
      priority: jobData.priority || 0,
      status: 'queued',
      scheduledAt: jobData.delay ? new Date(Date.now() + jobData.delay) : new Date(),
      maxAttempts: queue.retryMax || 3,
    });
    await DistributedQueue.updateOne({ _id: queueId }, { $inc: { jobCount: 1, pendingCount: 1 } });
    if (partition) {
      await QueuePartition.updateOne({ _id: partition._id }, { $inc: { jobCount: 1, pendingCount: 1 } });
    }
    return execution;
  }

  async dequeueJob(workerId) {
    const worker = await DistributedWorker.findById(workerId);
    if (!worker) throw new Error('Worker not found');
    const execution = await WorkerExecution.findOneAndUpdate(
      { status: 'queued', scheduledAt: { $lte: new Date() } },
      { $set: { status: 'processing', startedAt: new Date(), worker: workerId } },
      { sort: { priority: -1, createdAt: 1 }, new: true }
    );
    if (!execution) return null;
    await DistributedWorker.updateOne({ _id: workerId }, { $inc: { currentLoad: 1, processedCount: 1 }, lastJobAt: new Date(), status: 'busy' });
    if (execution.queue) {
      await DistributedQueue.updateOne({ _id: execution.queue }, { $inc: { pendingCount: -1, processingCount: 1 } });
    }
    if (execution.partition) {
      await QueuePartition.updateOne({ _id: execution.partition }, { $inc: { pendingCount: -1, processingCount: 1 } });
    }
    return execution;
  }

  async completeJob(executionId, result) {
    const execution = await WorkerExecution.findByIdAndUpdate(
      executionId,
      { $set: { status: 'completed', result, completedAt: new Date(), duration: Date.now() - (new Date(execution.startedAt || Date.now())).getTime() } },
      { new: true }
    );
    if (!execution) throw new Error('Execution not found');
    if (execution.worker) {
      await DistributedWorker.updateOne({ _id: execution.worker }, { $inc: { currentLoad: -1 } });
    }
    if (execution.queue) {
      await DistributedQueue.updateOne({ _id: execution.queue }, { $inc: { processingCount: -1, completedCount: 1 } });
    }
    if (execution.partition) {
      await QueuePartition.updateOne({ _id: execution.partition }, { $inc: { processingCount: -1, completedCount: 1 } });
    }
    return execution;
  }

  async failJob(executionId, error) {
    const execution = await WorkerExecution.findById(executionId);
    if (!execution) throw new Error('Execution not found');
    const attempts = (execution.attempts || 0) + 1;
    const maxAttempts = execution.maxAttempts || 3;
    let status, action;
    if (attempts >= maxAttempts) {
      status = 'cancelled';
      action = 'dead_letter';
    } else {
      status = 'retrying';
      action = 'retry';
    }
    execution.status = status;
    execution.attempts = attempts;
    execution.error = { message: error.message, stack: error.stack, code: error.code };
    if (action === 'retry') {
      execution.scheduledAt = new Date(Date.now() + 5000 * Math.pow(2, attempts));
    }
    await execution.save();
    if (execution.worker) {
      await DistributedWorker.updateOne({ _id: execution.worker }, { $inc: { currentLoad: -1, errorCount: 1 } });
    }
    if (execution.queue) {
      const update = { $inc: { processingCount: -1 } };
      if (action === 'dead_letter') update.$inc.failedCount = 1;
      await DistributedQueue.updateOne({ _id: execution.queue }, update);
    }
    await logAuditEvent({
      action: 'job.fail', category: 'system',
      entityType: 'WorkerExecution', entityId: executionId,
      newValue: { status, attempts, action },
      description: `Job ${execution.jobId} failed after ${attempts} attempts - ${action}`,
      status: 'success',
    });
    return execution;
  }

  async retryJob(executionId) {
    const execution = await WorkerExecution.findByIdAndUpdate(
      executionId,
      { $set: { status: 'queued', scheduledAt: new Date(Date.now() + 5000), error: null, worker: null }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!execution) throw new Error('Execution not found');
    if (execution.queue) {
      await DistributedQueue.updateOne({ _id: execution.queue }, { $inc: { failedCount: -1, pendingCount: 1 } });
    }
    await logAuditEvent({
      action: 'job.retry', category: 'system',
      entityType: 'WorkerExecution', entityId: executionId,
      description: `Retrying job ${execution.jobId}`,
      status: 'success',
    });
    return execution;
  }

  async getQueueMetrics(queueId) {
    const queue = await DistributedQueue.findById(queueId).lean();
    if (!queue) throw new Error('Queue not found');
    return {
      queueId: queue._id,
      name: queue.name,
      jobCount: queue.jobCount || 0,
      pendingCount: queue.pendingCount || 0,
      processingCount: queue.processingCount || 0,
      completedCount: queue.completedCount || 0,
      failedCount: queue.failedCount || 0,
      depth: (queue.pendingCount || 0) + (queue.processingCount || 0),
    };
  }

  async getWorkerLoad(workerId) {
    const worker = await DistributedWorker.findById(workerId).lean();
    if (!worker) throw new Error('Worker not found');
    const activeJobs = await WorkerExecution.countDocuments({ worker: workerId, status: 'processing' });
    return {
      workerId: worker._id,
      name: worker.name,
      currentLoad: worker.currentLoad || 0,
      maxLoad: worker.maxLoad || 10,
      utilization: worker.maxLoad ? ((worker.currentLoad || 0) / worker.maxLoad) * 100 : 0,
      activeJobs,
      processedCount: worker.processedCount || 0,
      errorCount: worker.errorCount || 0,
      status: worker.status,
    };
  }

  async rebalanceQueues() {
    const workers = await DistributedWorker.find({ status: { $in: ['idle', 'busy'] } }).sort({ currentLoad: 1 }).lean();
    const queues = await DistributedQueue.find({ status: 'active', pendingCount: { $gt: 0 } }).sort({ priority: -1 }).lean();
    const reassigned = [];
    for (const queue of queues) {
      const availableWorker = workers.find(w => (w.currentLoad || 0) < (w.maxLoad || 10));
      if (!availableWorker) break;
      const job = await WorkerExecution.findOneAndUpdate(
        { queue: queue._id, status: 'queued' },
        { $set: { worker: availableWorker._id } },
        { sort: { priority: -1, createdAt: 1 }, new: true }
      );
      if (job) {
        reassigned.push({ queue: queue.name, worker: availableWorker.name, jobId: job.jobId });
        await DistributedWorker.updateOne({ _id: availableWorker._id }, { $inc: { currentLoad: 1 } });
      }
    }
    logger.info({ reassignedCount: reassigned.length }, 'Queue rebalance complete');
    return { reassigned, count: reassigned.length };
  }

  async processDeadLetterQueue(queueId) {
    const queue = await DistributedQueue.findById(queueId);
    if (!queue) throw new Error('Queue not found');
    const deadJobs = await WorkerExecution.find({ queue: queueId, status: 'cancelled', attempts: { $gte: queue.retryMax || 3 } }).lean();
    const reprocessed = [];
    for (const job of deadJobs) {
      await WorkerExecution.findByIdAndUpdate(job._id, { $set: { status: 'queued', attempts: 0, error: null, scheduledAt: new Date() } });
      reprocessed.push(job.jobId);
    }
    if (reprocessed.length > 0) {
      await DistributedQueue.updateOne({ _id: queueId }, { $inc: { failedCount: -reprocessed.length, pendingCount: reprocessed.length } });
    }
    await logAuditEvent({
      action: 'queue.dead_letter.process', category: 'system',
      entityType: 'DistributedQueue', entityId: queueId,
      description: `Reprocessed ${reprocessed.length} dead letter jobs from queue ${queue.name}`,
      status: 'success',
    });
    return { queueId, queueName: queue.name, reprocessed, count: reprocessed.length };
  }

  async getJobHistory(filter) {
    const { status, queue, worker, limit = 100, offset = 0 } = filter || {};
    const query = {};
    if (status) query.status = status;
    if (queue) query.queue = queue;
    if (worker) query.worker = worker;
    const [items, total] = await Promise.all([
      WorkerExecution.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      WorkerExecution.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }
}

export const distributedProcessingService = new DistributedProcessingService();
