import mongoose from 'mongoose';

const eventDeadLetterSchema = new mongoose.Schema({
  originalEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventStore',
    required: true
  },
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventSubscription'
  },
  error: { type: String, required: true },
  errorCount: { type: Number, default: 1 },
  lastAttemptAt: { type: Date, default: Date.now },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['pending', 'retrying', 'failed', 'archived'],
    default: 'pending'
  }
}, { timestamps: true, toJSON: { virtuals: true } });

eventDeadLetterSchema.index({ originalEvent: 1 });
eventDeadLetterSchema.index({ subscription: 1 });
eventDeadLetterSchema.index({ status: 1 });

export const EventDeadLetter = mongoose.model('EventDeadLetter', eventDeadLetterSchema);
