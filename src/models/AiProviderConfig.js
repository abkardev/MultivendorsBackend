import mongoose from 'mongoose';

const aiProviderConfigSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AiProvider',
    required: true
  },
  key: { type: String, required: true },
  organizationId: String,
  projectId: String,
  deploymentName: String,
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  topP: { type: Number, default: 1 },
  frequencyPenalty: { type: Number, default: 0 },
  presencePenalty: { type: Number, default: 0 },
  customHeaders: { type: mongoose.Schema.Types.Mixed },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true, toJSON: { virtuals: true } });

aiProviderConfigSchema.index({ provider: 1 });
aiProviderConfigSchema.index({ isDefault: 1 });

export const AiProviderConfig = mongoose.model('AiProviderConfig', aiProviderConfigSchema);
