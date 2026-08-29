import mongoose from 'mongoose';

const knowledgeVideoSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  description: {
    en: String,
    ar: String
  },
  url: { type: String, required: true },
  thumbnail: String,
  duration: { type: Number },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeCategory' },
  tags: [String],
  instructor: String,
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  views: { type: Number, default: 0 }
}, { timestamps: true, toJSON: { virtuals: true } });

knowledgeVideoSchema.index({ status: 1, createdAt: -1 });
knowledgeVideoSchema.index({ category: 1 });
knowledgeVideoSchema.index({ tags: 1 });

export const KnowledgeVideo = mongoose.model('KnowledgeVideo', knowledgeVideoSchema);
