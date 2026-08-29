import mongoose from 'mongoose';

const schedulerExecutionSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'SchedulerJob', required: true },
  jobName: { type: String, required: true },
  status: {
    type: String,
    enum: ['running', 'completed', 'failed', 'retrying', 'cancelled', 'skipped'],
    default: 'running',
  },
  startedAt: { type: Date, required: true },
  completedAt: Date,
  durationMs: Number,
  error: String,
  errorStack: String,
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  nextRetryAt: Date,
  output: mongoose.Schema.Types.Mixed,
  triggeredBy: { type: String, enum: ['scheduler', 'manual', 'webhook'], default: 'scheduler' },
  triggeredByUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  correlationId: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

schedulerExecutionSchema.index({ job: 1, createdAt: -1 });
schedulerExecutionSchema.index({ jobName: 1, createdAt: -1 });
schedulerExecutionSchema.index({ status: 1 });
schedulerExecutionSchema.index({ startedAt: -1 });

export const SchedulerExecution = mongoose.model('SchedulerExecution', schedulerExecutionSchema);
