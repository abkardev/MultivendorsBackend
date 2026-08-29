import mongoose from 'mongoose';

const customerReminderSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['follow_up', 'quotation_expiry', 'rfq_response', 'inactive_customer',
      'delivery_follow_up', 'repeat_order', 'birthday', 'anniversary', 'goal', 'other'],
    default: 'follow_up',
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  dueAt: { type: Date, required: true },
  completedAt: Date,
  isCompleted: { type: Boolean, default: false },
  isRecurring: { type: Boolean, default: false },
  recurringInterval: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notifiedAt: Date,
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

customerReminderSchema.index({ vendor: 1, dueAt: 1 });
customerReminderSchema.index({ vendor: 1, isCompleted: 1 });
customerReminderSchema.index({ vendor: 1, type: 1, dueAt: 1 });

export const CustomerReminder = mongoose.model('CustomerReminder', customerReminderSchema);
