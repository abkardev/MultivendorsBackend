import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const distributedWorkerSchema = new mongoose.Schema({
  workerId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['queue_worker', 'scheduler', 'batch_processor', 'stream_processor'], required: true },
  status: { type: String, enum: ['idle', 'busy', 'paused', 'offline', 'error'], default: 'idle' },
  queue: { type: String },
  concurrency: { type: Number, default: 1 },
  currentLoad: { type: Number, default: 0 },
  maxLoad: { type: Number, default: 10 },
  processedCount: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  lastHeartbeat: { type: Date },
  lastJobAt: { type: Date },
  version: { type: String },
  metadata: { type: Map, of: String },
}, { timestamps: true });

distributedWorkerSchema.plugin(uniqueValidator, { message: '{PATH} already exists' });

distributedWorkerSchema.index({ workerId: 1 });
distributedWorkerSchema.index({ type: 1, status: 1 });
distributedWorkerSchema.index({ status: 1 });

export const DistributedWorker = mongoose.model('DistributedWorker', distributedWorkerSchema);
