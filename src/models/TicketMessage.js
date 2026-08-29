import mongoose from 'mongoose';

const ticketMessageSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, maxlength: 5000 },
  isInternal: { type: Boolean, default: false },
  isSystemMessage: { type: Boolean, default: false },
  attachments: [{
    fileName: String, originalName: String, mimeType: String, size: Number,
    storageUrl: String, signedUrl: String,
  }],
  readBy: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, readAt: { type: Date, default: Date.now } }],
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

ticketMessageSchema.index({ ticket: 1, createdAt: 1 });

ticketMessageSchema.index({ user: 1, createdAt: -1 });

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
