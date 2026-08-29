import mongoose from 'mongoose';

const webhookEndpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  events: [String],
  app: { type: mongoose.Schema.Types.ObjectId, ref: 'DeveloperApp' },
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled'],
    default: 'active'
  },
  retryCount: { type: Number, default: 3 },
  timeout: { type: Number, default: 30000 },
  headers: { type: mongoose.Schema.Types.Mixed },
  lastDeliveryAt: Date,
  lastDeliveryStatus: String
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

webhookEndpointSchema.index({ app: 1 });
webhookEndpointSchema.index({ status: 1 });

export const WebhookEndpoint = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
