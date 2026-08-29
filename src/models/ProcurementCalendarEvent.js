import mongoose from 'mongoose';

const procurementCalendarEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  eventType: { type: String, enum: ['shipment', 'delivery', 'rfq_deadline', 'tender_deadline', 'payment', 'reminder', 'other'], required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  allDay: { type: Boolean, default: false },
  referenceType: String,
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  color: String,
  isCompleted: { type: Boolean, default: false },
}, { timestamps: true });

procurementCalendarEventSchema.index({ user: 1, startDate: 1 });
procurementCalendarEventSchema.index({ referenceType: 1, referenceId: 1 });
export default mongoose.model('ProcurementCalendarEvent', procurementCalendarEventSchema);
