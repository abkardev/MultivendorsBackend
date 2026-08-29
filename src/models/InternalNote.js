import mongoose from 'mongoose';

const internalNoteSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, maxlength: 5000 },
  attachments: [{
    fileName: String, originalName: String, mimeType: String, size: Number, storageUrl: String,
  }],
  isPinned: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

internalNoteSchema.index({ author: 1, createdAt: -1 });

export const InternalNote = mongoose.model('InternalNote', internalNoteSchema);
