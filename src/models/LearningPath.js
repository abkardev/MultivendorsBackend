import mongoose from 'mongoose';

const learningPathSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  description: {
    en: String,
    ar: String
  },
  modules: [{
    module: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingModule', required: true },
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: true }
  }],
  duration: { type: Number },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  certification: { type: mongoose.Schema.Types.ObjectId, ref: 'Certification' },
  enrolledCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  }
}, { timestamps: true, toJSON: { virtuals: true } });

learningPathSchema.index({ status: 1 });
learningPathSchema.index({ difficulty: 1 });

export const LearningPath = mongoose.model('LearningPath', learningPathSchema);
