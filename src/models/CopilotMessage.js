import mongoose from 'mongoose';

const copilotMessageSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'CopilotSession', required: true },
  role: {
    type: String,
    enum: ['user', 'copilot', 'system'],
    required: true
  },
  content: { type: String, required: true },
  intent: String,
  confidence: Number,
  context: {
    entities: [{
      type: String,
      id: String,
      name: String
    }],
    actions: [{
      type: String,
      label: String,
      endpoint: String
    }]
  },
  evidence: [{
    source: String,
    title: String,
    url: String,
    relevance: Number
  }],
  metadata: mongoose.Schema.Types.Mixed,
  tokensUsed: Number,
  responseTime: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

copilotMessageSchema.index({ session: 1, createdAt: -1 });

export const CopilotMessage = mongoose.model('CopilotMessage', copilotMessageSchema);
