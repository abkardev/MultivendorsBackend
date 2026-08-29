import mongoose from 'mongoose';

const messageChannelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['direct', 'group', 'team', 'announcement'],
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: Date
  }],
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Object' },
  isArchived: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, toJSON: { virtuals: true } });

messageChannelSchema.index({ type: 1, isArchived: 1 });
messageChannelSchema.index({ organization: 1 });
messageChannelSchema.index({ 'members.user': 1 });

export const MessageChannel = mongoose.model('MessageChannel', messageChannelSchema);
