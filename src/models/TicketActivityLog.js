import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: {
    type: String, required: true,
    enum: [
      'created', 'assigned', 'reassigned', 'priority_changed', 'department_changed',
      'category_changed', 'status_changed', 'message_sent', 'note_added',
      'escalated', 'merged', 'resolved', 'closed', 'reopened', 'rating_submitted',
    ],
  },
  from: String, to: String,
  description: { type: String, maxlength: 500 },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

activityLogSchema.index({ ticket: 1, createdAt: -1 });

activityLogSchema.index({ actor: 1, createdAt: -1 });

export const TicketActivityLog = mongoose.model('TicketActivityLog', activityLogSchema);
