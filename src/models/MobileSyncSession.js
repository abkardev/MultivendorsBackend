import mongoose from 'mongoose';

const mobileSyncSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true },
  deviceType: { type: String, enum: ['ios', 'android', 'web'], required: true },
  appVersion: { type: String },
  lastSyncAt: { type: Date },
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' },
  syncToken: { type: String },
  lastCursor: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

mobileSyncSessionSchema.index({ user: 1, deviceId: 1 }, { unique: true });
mobileSyncSessionSchema.index({ user: 1, status: 1 });
mobileSyncSessionSchema.index({ syncToken: 1 });
mobileSyncSessionSchema.index({ lastSyncAt: 1 });

const MobileSyncSession = mongoose.model('MobileSyncSession', mobileSyncSessionSchema);
export default MobileSyncSession;
