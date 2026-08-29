import mongoose from 'mongoose';

const integrationEndpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['rest', 'webhook', 'import', 'export', 'sync'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  },
  config: {
    url: String,
    method: String,
    headers: mongoose.Schema.Types.Mixed,
    auth: {
      type: String,
      credentials: mongoose.Schema.Types.Mixed
    },
    rateLimit: {
      max: Number,
      window: Number
    },
    retry: {
      maxAttempts: { type: Number, default: 3 },
      backoff: { type: Number, default: 1000 }
    }
  },
  lastSyncAt: Date,
  lastError: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

integrationEndpointSchema.index({ type: 1, status: 1 });

export const IntegrationEndpoint = mongoose.model('IntegrationEndpoint', integrationEndpointSchema);
