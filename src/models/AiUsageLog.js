import mongoose from 'mongoose';

const aiUsageLogSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'AiProvider' },
  model: String,
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  duration: { type: Number },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  prompt: String,
  response: String,
  status: {
    type: String,
    enum: ['success', 'error'],
    default: 'success'
  },
  errorMessage: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true } });

aiUsageLogSchema.index({ provider: 1, timestamp: -1 });
aiUsageLogSchema.index({ user: 1, timestamp: -1 });
aiUsageLogSchema.index({ sessionId: 1 });
aiUsageLogSchema.index({ model: 1 });
aiUsageLogSchema.index({ status: 1 });
aiUsageLogSchema.index({ timestamp: -1 });

export const AiUsageLog = mongoose.model('AiUsageLog', aiUsageLogSchema);
