import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const distributedQueueSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, enum: ['fifo', 'priority', 'delayed', 'dead_letter'], default: 'fifo' },
  status: { type: String, enum: ['active', 'paused', 'draining'], default: 'active' },
  partitions: { type: Number, default: 1 },
  concurrency: { type: Number, default: 5 },
  retryMax: { type: Number, default: 3 },
  retryDelay: { type: Number, default: 1000 },
  priority: { type: Number, default: 0 },
  jobCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  processingCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  deadLetterQueue: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

distributedQueueSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

distributedQueueSchema.index({ name: 1 });
distributedQueueSchema.index({ type: 1, status: 1 });
distributedQueueSchema.index({ status: 1 });

export const DistributedQueue = mongoose.model('DistributedQueue', distributedQueueSchema);
