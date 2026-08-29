import mongoose from 'mongoose';

const copilotSessionSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'buyer', 'supplier', 'executive', 'finance', 'compliance', 'sales', 'support', 'moderator', 'operations'],
    required: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  context: {
    activeRoute: String,
    currentEntityType: String,
    currentEntityId: String,
    filters: mongoose.Schema.Types.Mixed,
    recentActions: [{
      action: String,
      entityType: String,
      entityId: String,
      timestamp: Date
    }]
  },
  metadata: {
    browser: String,
    platform: String,
    timezone: String
  },
  expiresAt: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

copilotSessionSchema.index({ userId: 1, isActive: 1 });
copilotSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CopilotSession = mongoose.model('CopilotSession', copilotSessionSchema);
