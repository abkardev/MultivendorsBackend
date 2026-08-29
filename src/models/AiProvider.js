import mongoose from 'mongoose';

const aiProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  provider: {
    type: String,
    enum: ['openai', 'azure_openai', 'anthropic', 'google_gemini', 'ollama', 'local', 'custom'],
    required: true
  },
  baseUrl: String,
  apiVersion: String,
  models: [{
    name: { type: String, required: true },
    contextLength: Number,
    costPerToken: Number,
    capabilities: [String]
  }],
  isActive: { type: Boolean, default: true },
  priority: { type: Number, default: 0 },
  isFallback: { type: Boolean, default: false },
  rateLimit: {
    requestsPerMinute: Number,
    tokensPerMinute: Number,
    concurrentRequests: Number
  },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, toJSON: { virtuals: true } });

aiProviderSchema.index({ provider: 1, isActive: 1 });
aiProviderSchema.index({ priority: 1 });
aiProviderSchema.index({ isFallback: 1 });

export const AiProvider = mongoose.model('AiProvider', aiProviderSchema);
