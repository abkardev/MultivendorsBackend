import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessageChannel',
    required: true
  },
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'MessageThread' },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: { type: String, required: true },
  contentType: {
    type: String,
    enum: ['text', 'html', 'markdown'],
    default: 'text'
  },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  attachments: [{
    name: String,
    url: String,
    size: Number,
    mimeType: String,
    type: String
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isPinned: { type: Boolean, default: false },
  editedAt: Date,
  deletedAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true, toJSON: { virtuals: true } });

messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ thread: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ replyTo: 1 });
messageSchema.index({ isPinned: 1 });
messageSchema.index({ deletedAt: 1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
