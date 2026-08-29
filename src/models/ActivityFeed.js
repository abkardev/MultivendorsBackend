import mongoose from 'mongoose';

const activityFeedSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Object',
    required: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: { type: String, required: true },
  targetType: { type: String },
  targetId: { type: String },
  context: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'SharedWorkspace' }
}, { timestamps: true, toJSON: { virtuals: true } });

activityFeedSchema.index({ organization: 1, createdAt: -1 });
activityFeedSchema.index({ actor: 1, createdAt: -1 });
activityFeedSchema.index({ action: 1 });
activityFeedSchema.index({ workspace: 1, createdAt: -1 });

export const ActivityFeed = mongoose.model('ActivityFeed', activityFeedSchema);
