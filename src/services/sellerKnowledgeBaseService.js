import { SellerKnowledgeArticle } from '../models/SellerKnowledgeArticle.js';

class SellerKnowledgeBaseService {
  async createArticle(vendorId, data) {
    return SellerKnowledgeArticle.create({ ...data, vendor: vendorId });
  }

  async getArticles(vendorId, options = {}) {
    const { category, tag, search } = options;
    const filter = { vendor: vendorId };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (search) filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
    const articles = await SellerKnowledgeArticle.find(filter).sort({ updatedAt: -1 });
    return articles;
  }

  async getArticle(vendorId, articleId) {
    const article = await SellerKnowledgeArticle.findOne({ _id: articleId, vendor: vendorId });
    if (article) {
      article.viewCount = (article.viewCount || 0) + 1;
      await article.save();
    }
    return article;
  }

  async updateArticle(vendorId, articleId, data) {
    return SellerKnowledgeArticle.findOneAndUpdate({ _id: articleId, vendor: vendorId }, { $set: data }, { new: true });
  }

  async deleteArticle(vendorId, articleId) {
    return SellerKnowledgeArticle.findOneAndDelete({ _id: articleId, vendor: vendorId });
  }

  async getCategories(vendorId) {
    const categories = await SellerKnowledgeArticle.distinct('category', { vendor: vendorId });
    return categories;
  }

  async getTags(vendorId) {
    const tags = await SellerKnowledgeArticle.distinct('tags', { vendor: vendorId });
    return tags.filter(Boolean);
  }

  async searchArticles(vendorId, query) {
    return SellerKnowledgeArticle.find({
      vendor: vendorId,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { tags: { $regex: query, $options: 'i' } },
      ],
    }).sort({ viewCount: -1 });
  }

  async getPopularArticles(vendorId, limit = 5) {
    return SellerKnowledgeArticle.find({ vendor: vendorId }).sort({ viewCount: -1 }).limit(limit);
  }
}

export const sellerKnowledgeBaseService = new SellerKnowledgeBaseService();
