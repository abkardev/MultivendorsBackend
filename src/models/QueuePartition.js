import mongoose from 'mongoose';

const queuePartitionSchema = new mongoose.Schema({
  queue: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributedQueue' },
  partitionId: { type: String, required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'DistributedWorker' },
  status: { type: String, enum: ['active', 'idle', 'paused', 'error'], default: 'idle' },
  priority: { type: Number, default: 0 },
  jobCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
  processingCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  lastActivity: { type: Date },
  metadata: { type: Map, of: String },
}, { timestamps: true });

queuePartitionSchema.index({ queue: 1, partitionId: 1 }, { unique: true });
queuePartitionSchema.index({ worker: 1 });
queuePartitionSchema.index({ status: 1 });

export const QueuePartition = mongoose.model('QueuePartition', queuePartitionSchema);
