import mongoose from 'mongoose';

const knowledgeArticleSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  slug: { type: String, unique: true, required: true },
  content: {
    en: { type: String, required: true },
    ar: { type: String, required: true }
  },
  excerpt: {
    en: String,
    ar: String
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeCategory' },
  tags: [String],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featuredImage: String,
  attachments: [{
    name: String,
    url: String,
    size: Number
  }],
  views: { type: Number, default: 0 },
  helpful: { type: Number, default: 0 },
  notHelpful: { type: Number, default: 0 },
  seoMetadata: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  publishedAt: Date
}, { timestamps: true, toJSON: { virtuals: true } });

knowledgeArticleSchema.index({ slug: 1 });
knowledgeArticleSchema.index({ status: 1, publishedAt: -1 });
knowledgeArticleSchema.index({ category: 1, status: 1 });
knowledgeArticleSchema.index({ author: 1 });
knowledgeArticleSchema.index({ tags: 1 });
knowledgeArticleSchema.index({ 'title.en': 'text', 'content.en': 'text', 'title.ar': 'text', 'content.ar': 'text' });

export const KnowledgeArticle = mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
