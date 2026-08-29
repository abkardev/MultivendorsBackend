import mongoose from 'mongoose';

const messageThreadSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessageChannel',
    required: true
  },
  subject: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPinned: { type: Boolean, default: false },
  lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true, toJSON: { virtuals: true } });

messageThreadSchema.index({ channel: 1, lastActivityAt: -1 });
messageThreadSchema.index({ createdBy: 1 });
messageThreadSchema.index({ isPinned: 1 });

export const MessageThread = mongoose.model('MessageThread', messageThreadSchema);
