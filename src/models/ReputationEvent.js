import mongoose from 'mongoose';

const reputationEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  eventType: {
    type: String,
    enum: [
      'score_change', 'badge_earned', 'badge_revoked', 'verification',
      'review_received', 'review_milestone', 'order_milestone',
      'dispute_closed', 'award', 'level_up',
    ],
    required: true,
  },
  title: { en: String, ar: String },
  description: { en: String, ar: String },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: String,
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

reputationEventSchema.index({ vendor: 1, createdAt: -1 });
reputationEventSchema.index({ user: 1, createdAt: -1 });
reputationEventSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.model('ReputationEvent', reputationEventSchema);
