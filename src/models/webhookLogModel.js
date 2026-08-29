import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema({
  webhookId: { type: String, sparse: true },
  provider: { type: String, enum: ['stripe', 'paypal', 'hyperpay', 'moyasar', 'paytabs', 'adyen'], required: true },
  event: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  headers: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['received', 'processed', 'failed'], default: 'received' },
  error: { type: String },
  ip: { type: String },
  processedAt: { type: Date },
}, { timestamps: true });

webhookLogSchema.index({ webhookId: 1 }, { unique: true, sparse: true });
webhookLogSchema.index({ provider: 1, createdAt: -1 });

webhookLogSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('WebhookLog', webhookLogSchema);
