import mongoose from 'mongoose';

const eventStoreSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  source: { type: String, required: true },
  sourceId: String,
  producer: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['published', 'delivered', 'failed', 'expired'],
    default: 'published'
  },
  publishedAt: { type: Date, default: Date.now },
  deliveredAt: Date,
  retryCount: { type: Number, default: 0 },
  partition: { type: Number },
  sequence: { type: Number, indexed: true }
}, { timestamps: true, toJSON: { virtuals: true } });

eventStoreSchema.index({ eventType: 1, status: 1, publishedAt: -1 });
eventStoreSchema.index({ source: 1, sourceId: 1 });
eventStoreSchema.index({ status: 1, retryCount: 1 });
eventStoreSchema.index({ sequence: 1 });

export const EventStore = mongoose.model('EventStore', eventStoreSchema);
