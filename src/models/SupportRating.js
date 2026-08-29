import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 },
  categories: {
    responseTime: { type: Number, min: 1, max: 5 },
    resolution: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 },
  },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

ratingSchema.index({ user: 1 });

export const SupportRating = mongoose.model('SupportRating', ratingSchema);
