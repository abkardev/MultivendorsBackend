import mongoose from 'mongoose';

const aiFeedbackSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Object', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  recommendationType: { type: String },
  wasAccepted: { type: Boolean },
  userRating: { type: Number, min: 1, max: 5 },
  userFeedback: { type: String },
  aiService: { type: String, index: true },
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true, toJSON: { virtuals: true } });

aiFeedbackSchema.index({ userId: 1, timestamp: -1 });
aiFeedbackSchema.index({ aiService: 1, timestamp: -1 });
aiFeedbackSchema.index({ wasAccepted: 1 });

export const AiFeedback = mongoose.model('AiFeedback', aiFeedbackSchema);
