import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  eventType: { type: String, required: true },
  eventId: String,
  status: {
    type: String,
    enum: ['received', 'processing', 'completed', 'failed', 'ignored'],
    default: 'received',
  },
  payload: mongoose.Schema.Types.Mixed,
  headers: mongoose.Schema.Types.Mixed,
  signature: String,
  processingAttempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  lastError: String,
  processedAt: Date,
  processedBy: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, status: 1 });
webhookEventSchema.index({ createdAt: -1 });

export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);
