import mongoose from 'mongoose';

const aiQualityScoreSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  metric: {
    type: String,
    enum: [
      'accuracy', 'adoption', 'acceptance', 'confidence',
      'success_rate', 'false_recommendation'
    ],
    required: true
  },
  score: { type: Number, min: 0, max: 100, required: true },
  sampleSize: { type: Number, default: 0 },
  period: {
    start: { type: Date },
    end: { type: Date }
  },
  trend: { type: String },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, toJSON: { virtuals: true } });

aiQualityScoreSchema.index({ service: 1, metric: 1, 'period.start': -1 });

export const AiQualityScore = mongoose.model('AiQualityScore', aiQualityScoreSchema);
