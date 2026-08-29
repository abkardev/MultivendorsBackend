import mongoose from 'mongoose';

const integrationConnectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'IntegrationProvider', required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  authType: String,
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'pending'],
    default: 'pending'
  },
  config: { type: mongoose.Schema.Types.Mixed },
  lastTestedAt: Date,
  lastHealthCheckAt: Date,
  healthStatus: String,
  errorCount: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

integrationConnectionSchema.index({ provider: 1, status: 1 });
integrationConnectionSchema.index({ organization: 1 });

export const IntegrationConnection = mongoose.model('IntegrationConnection', integrationConnectionSchema);
