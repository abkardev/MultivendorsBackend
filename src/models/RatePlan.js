import mongoose from 'mongoose';

const ratePlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  label: {
    en: { type: String, required: true },
    ar: { type: String, required: true },
  },
  description: {
    en: String,
    ar: String,
  },
  requestsPerMinute: { type: Number, required: true },
  requestsPerHour: { type: Number, required: true },
  requestsPerDay: { type: Number, required: true },
  rateLimit: {
    perSecond: { type: Number, default: 10 },
    perMinute: { type: Number, default: 60 },
    perHour: { type: Number, default: 1000 },
    perDay: { type: Number, default: 10000 },
  },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  isActive: { type: Boolean, default: true },
  isFree: { type: Boolean, default: false },
  features: [String],
  priority: { type: Number, default: 0 },
}, { timestamps: true });

ratePlanSchema.index({ isActive: 1, priority: -1 });

export const RatePlan = mongoose.model('RatePlan', ratePlanSchema);
