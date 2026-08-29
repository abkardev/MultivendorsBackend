import mongoose from 'mongoose';

const schedulerJobSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: String,
  type: { type: String, enum: ['cron', 'interval', 'delayed', 'queue'], default: 'cron' },
  cronExpression: String,
  interval: Number,
  handler: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'paused', 'failed', 'completed', 'disabled'],
    default: 'active',
  },
  concurrency: { type: Number, default: 1 },
  maxRetries: { type: Number, default: 3 },
  retryDelayMs: { type: Number, default: 5000 },
  timeoutMs: { type: Number, default: 300000 },
  isPaused: { type: Boolean, default: false },
  pausedAt: Date,
  pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pausedReason: String,
  lastRunAt: Date,
  lastRunStatus: { type: String, enum: ['success', 'failed', 'running'] },
  lastRunDuration: Number,
  lastRunError: String,
  averageDuration: { type: Number, default: 0 },
  totalRuns: { type: Number, default: 0 },
  successfulRuns: { type: Number, default: 0 },
  failedRuns: { type: Number, default: 0 },
  consecutiveFailures: { type: Number, default: 0 },
  dependencies: [{ type: String }],
  dependsOn: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchedulerJob' }],
  queue: {
    enabled: { type: Boolean, default: false },
    maxConcurrent: { type: Number, default: 1 },
    retryQueue: { type: Boolean, default: true },
    deadLetterQueue: { type: Boolean, default: true },
  },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

schedulerJobSchema.index({ status: 1 });
schedulerJobSchema.index({ type: 1 });
schedulerJobSchema.index({ lastRunAt: -1 });

export const SchedulerJob = mongoose.model('SchedulerJob', schedulerJobSchema);
