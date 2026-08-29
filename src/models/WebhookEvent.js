import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  endpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'WebhookEndpoint', required: true },
  event: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  headers: { type: Map, of: String },
  signature: String,
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'retrying', 'cancelled'],
    default: 'pending',
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  lastAttemptAt: Date,
  nextAttemptAt: Date,
  responseStatusCode: Number,
  responseBody: String,
  responseHeaders: { type: Map, of: String },
  durationMs: Number,
  errorMessage: String,
  deliveredAt: Date,
  correlationId: { type: String },
}, { timestamps: true });

webhookEventSchema.index({ endpoint: 1, createdAt: -1 });
webhookEventSchema.index({ status: 1, nextAttemptAt: 1 });
webhookEventSchema.index({ correlationId: 1 });

export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
