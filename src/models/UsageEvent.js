import mongoose from 'mongoose';

const usageEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  event: {
    type: String,
    enum: [
      'page_view', 'feature_use', 'api_call', 'search', 'ai_query',
      'automation_run', 'workflow_start', 'report_view', 'export'
    ],
    required: true
  },
  category: String,
  module: {
    type: String,
    enum: [
      'admin', 'buyer', 'seller', 'intelligence', 'executive',
      'autonomous', 'orchestrator', 'enterprise', 'enterpriseOps',
      'ai_copilot', 'workflow', 'reporting', 'integration'
    ]
  },
  properties: mongoose.Schema.Types.Mixed,
  duration: Number,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

usageEventSchema.index({ userId: 1, timestamp: -1 });
usageEventSchema.index({ event: 1, timestamp: -1 });
usageEventSchema.index({ module: 1, timestamp: -1 });

export const UsageEvent = mongoose.model('UsageEvent', usageEventSchema);
