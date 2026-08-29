import mongoose from 'mongoose';

const serviceHealthSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['healthy', 'degraded', 'down', 'maintenance'],
    required: true
  },
  latency: { type: Number, default: 0 },
  errorRate: { type: Number, default: 0 },
  uptime: { type: Number, default: 0 },
  lastChecked: { type: Date, default: Date.now },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  previousStatus: { type: String },
}, { timestamps: true, toJSON: { virtuals: true } });

serviceHealthSchema.index({ status: 1 });
serviceHealthSchema.index({ lastChecked: -1 });

export const ServiceHealth = mongoose.model('ServiceHealth', serviceHealthSchema);
