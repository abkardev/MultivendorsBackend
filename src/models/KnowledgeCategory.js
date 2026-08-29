import mongoose from 'mongoose';

const knowledgeCategorySchema = new mongoose.Schema({
  name: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  slug: { type: String, unique: true, required: true },
  description: {
    en: String,
    ar: String
  },
  icon: String,
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeCategory' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, toJSON: { virtuals: true } });

knowledgeCategorySchema.index({ slug: 1 });
knowledgeCategorySchema.index({ parent: 1 });
knowledgeCategorySchema.index({ order: 1 });

export const KnowledgeCategory = mongoose.model('KnowledgeCategory', knowledgeCategorySchema);
