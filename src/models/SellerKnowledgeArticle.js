import mongoose from 'mongoose';

const sellerKnowledgeArticleSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  title: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  content: {
    en: { type: String, required: true },
    ar: { type: String },
  },
  summary: {
    en: String,
    ar: String,
  },
  category: {
    type: String,
    enum: ['sales_playbook', 'negotiation', 'export_guide', 'marketing_tips',
      'best_practices', 'training', 'faq', 'marketplace_guide'],
    required: true,
  },
  tags: [String],
  isPublished: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  notHelpfulCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date,
}, { timestamps: true });

sellerKnowledgeArticleSchema.index({ category: 1, isPublished: 1 });
sellerKnowledgeArticleSchema.index({ category: 1, isFeatured: -1 });

export const SellerKnowledgeArticle = mongoose.model('SellerKnowledgeArticle', sellerKnowledgeArticleSchema);
