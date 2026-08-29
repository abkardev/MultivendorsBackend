import mongoose from 'mongoose';

const workerExecutionSchema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributedWorker' },
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributedQueue' },
  jobId: { type: String },
  jobType: { type: String },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed', 'retrying', 'cancelled'], default: 'queued' },
  priority: { type: Number, default: 0 },
  payload: { type: Object },
  result: { type: Object },
  error: {
    message: { type: String },
    stack: { type: String },
    code: { type: String },
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  scheduledAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  duration: { type: Number },
  metadata: { type: Map, of: String },
}, { timestamps: true });

workerExecutionSchema.index({ worker: 1, status: 1 });
workerExecutionSchema.index({ queue: 1, status: 1 });
workerExecutionSchema.index({ jobId: 1 });
workerExecutionSchema.index({ status: 1, priority: -1 });

export const WorkerExecution = mongoose.model('WorkerExecution', workerExecutionSchema);
