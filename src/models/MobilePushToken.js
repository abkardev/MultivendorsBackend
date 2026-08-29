import mongoose from 'mongoose';

const mobilePushTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
  deviceId: { type: String },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

mobilePushTokenSchema.index({ user: 1, platform: 1 });
mobilePushTokenSchema.index({ token: 1 }, { unique: true });
mobilePushTokenSchema.index({ isActive: 1, lastUsedAt: 1 });

const MobilePushToken = mongoose.model('MobilePushToken', mobilePushTokenSchema);
export default MobilePushToken;
