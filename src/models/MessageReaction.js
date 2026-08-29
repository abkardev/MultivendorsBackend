import mongoose from 'mongoose';

const messageReactionSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emoji: { type: String, required: true }
}, { timestamps: true, toJSON: { virtuals: true } });

messageReactionSchema.index({ message: 1, user: 1, emoji: 1 }, { unique: true });
messageReactionSchema.index({ user: 1 });

export const MessageReaction = mongoose.model('MessageReaction', messageReactionSchema);
