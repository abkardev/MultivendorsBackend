import mongoose from 'mongoose';

const eventSubscriptionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  eventTypes: [{ type: String, required: true }],
  consumer: { type: String, required: true },
  endpoint: { type: String, required: true },
  protocol: {
    type: String,
    enum: ['webhook', 'internal', 'queue'],
    required: true
  },
  filters: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['active', 'paused', 'disabled'],
    default: 'active'
  },
  retryPolicy: {
    maxRetries: { type: Number, default: 3 },
    backoffStrategy: { type: String, default: 'exponential' },
    retryInterval: { type: Number, default: 1000 }
  },
  timeout: { type: Number, default: 30000 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, toJSON: { virtuals: true } });

eventSubscriptionSchema.index({ status: 1 });
eventSubscriptionSchema.index({ eventTypes: 1 });
eventSubscriptionSchema.index({ consumer: 1 });

export const EventSubscription = mongoose.model('EventSubscription', eventSubscriptionSchema);
