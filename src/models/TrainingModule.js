import mongoose from 'mongoose';

const trainingModuleSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  description: {
    en: String,
    ar: String
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeCategory' },
  lessons: [{
    title: {
      en: { type: String, required: true },
      ar: { type: String, required: true }
    },
    content: {
      en: String,
      ar: String
    },
    type: {
      type: String,
      enum: ['article', 'video', 'quiz', 'assignment'],
      required: true
    },
    duration: Number,
    order: { type: Number, default: 0 }
  }],
  duration: { type: Number },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TrainingModule' }],
  certification: { type: mongoose.Schema.Types.ObjectId, ref: 'Certification' },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  enrolledCount: { type: Number, default: 0 },
  completionRate: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true } });

trainingModuleSchema.index({ status: 1 });
trainingModuleSchema.index({ category: 1 });
trainingModuleSchema.index({ difficulty: 1 });

export const TrainingModule = mongoose.model('TrainingModule', trainingModuleSchema);
