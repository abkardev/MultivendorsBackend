import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  collection: { type: String, required: true },
  type: { type: String, enum: ['time_based', 'size_based', 'event_based'], required: true },
  retentionPeriod: { type: Number },
  retentionUnit: { type: String, enum: ['hours', 'days', 'months', 'years'], default: 'days' },
  maxSize: { type: Number },
  cleanUpSchedule: { type: String },
  actions: [{
    type: { type: String },
    params: { type: Object },
  }],
  isActive: { type: Boolean, default: true },
  metadata: { type: Map, of: String },
}, { timestamps: true });

schema.index({ name: 1 });
schema.index({ collection: 1 });
schema.index({ type: 1 });
schema.index({ isActive: 1 });

export const RetentionPolicy = mongoose.model('RetentionPolicy', schema);
