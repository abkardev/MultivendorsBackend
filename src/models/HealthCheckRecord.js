import mongoose from 'mongoose';

const healthCheckRecordSchema = new mongoose.Schema({
  component: {
    type: String,
    enum: ['database', 'cache', 'storage', 'search', 'email', 'payment',
      'ai', 'scheduler', 'queue', 'notification', 'websocket', 'api'],
    required: true,
  },
  status: { type: String, enum: ['healthy', 'degraded', 'unhealthy'], required: true },
  latencyMs: Number,
  message: String,
  error: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  checkedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

healthCheckRecordSchema.index({ component: 1, checkedAt: -1 });
healthCheckRecordSchema.index({ status: 1, checkedAt: -1 });

export const HealthCheckRecord = mongoose.model('HealthCheckRecord', healthCheckRecordSchema);
