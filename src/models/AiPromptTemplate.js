import mongoose from 'mongoose';

const aiPromptTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'AiProvider' },
  model: String,
  systemPrompt: String,
  userPromptTemplate: String,
  variables: [{
    name: { type: String, required: true },
    type: { type: String, default: 'string' },
    required: { type: Boolean, default: false }
  }],
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  category: String,
  tags: [String],
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, { timestamps: true, toJSON: { virtuals: true } });

aiPromptTemplateSchema.index({ name: 1, version: 1 }, { unique: true });
aiPromptTemplateSchema.index({ status: 1 });
aiPromptTemplateSchema.index({ category: 1 });
aiPromptTemplateSchema.index({ tags: 1 });

export const AiPromptTemplate = mongoose.model('AiPromptTemplate', aiPromptTemplateSchema);
