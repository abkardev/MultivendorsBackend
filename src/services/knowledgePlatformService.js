import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { KnowledgeCategory } from '../models/KnowledgeCategory.js';
import { KnowledgeVideo } from '../models/KnowledgeVideo.js';
import { TrainingModule } from '../models/TrainingModule.js';
import { LearningPath } from '../models/LearningPath.js';
import { Certification } from '../models/Certification.js';
import { Enrollment } from '../models/Enrollment.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class KnowledgePlatformService {
  async getArticles(filters = {}) {
    const { page = 1, limit = 20, category, tags, status, search, author, sort } = filters;
    const query = {};
    if (category) query.category = category;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (status) query.status = status;
    if (author) query.author = author;
    if (search) {
      query.$or = [
        { 'title.en': { $regex: search, $options: 'i' } },
        { 'title.ar': { $regex: search, $options: 'i' } },
        { 'content.en': { $regex: search, $options: 'i' } },
        { 'content.ar': { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { publishedAt: -1, createdAt: -1 };
    const [articles, total] = await Promise.all([
      KnowledgeArticle.find(query)
        .populate('author', 'name email avatar')
        .populate('category', 'name slug')
        .sort(sortOrder).skip(skip).limit(limit).lean(),
      KnowledgeArticle.countDocuments(query),
    ]);
    return { articles, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getArticle(id) {
    const article = await KnowledgeArticle.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    )
      .populate('author', 'name email avatar')
      .populate('category', 'name slug description')
      .lean();
    if (!article) throw new Error('Article not found');
    return article;
  }

  async createArticle(userId, data) {
    const slug = data.slug || data.title.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const article = await KnowledgeArticle.create({
      ...data, slug, author: userId,
      status: data.status || 'draft',
    });
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'knowledge_article', entityId: article._id,
      newValue: { title: article.title, slug: article.slug },
      description: `Created article: ${article.title.en}`,
    });
    return article;
  }

  async updateArticle(userId, id, data) {
    const article = await KnowledgeArticle.findById(id);
    if (!article) throw new Error('Article not found');
    const oldValue = { title: article.title, status: article.status, category: article.category };
    Object.assign(article, data);
    if (data.status === 'published' && !article.publishedAt) {
      article.publishedAt = new Date();
    }
    await article.save();
    await logAuditEvent({
      userId, action: 'update', category: 'knowledge',
      entityType: 'knowledge_article', entityId: id,
      oldValue, newValue: data,
      description: `Updated article: ${article.title.en}`,
    });
    return article;
  }

  async deleteArticle(userId, id) {
    const article = await KnowledgeArticle.findById(id);
    if (!article) throw new Error('Article not found');
    article.status = 'archived';
    await article.save();
    await logAuditEvent({
      userId, action: 'delete', category: 'knowledge',
      entityType: 'knowledge_article', entityId: id,
      description: `Archived article: ${article.title.en}`,
    });
    return { success: true };
  }

  async markHelpful(userId, id, helpful) {
    const field = helpful ? 'helpful' : 'notHelpful';
    const article = await KnowledgeArticle.findByIdAndUpdate(
      id,
      { $inc: { [field]: 1 } },
      { new: true },
    );
    if (!article) throw new Error('Article not found');
    return article;
  }

  async getCategories(parentId = null) {
    const query = parentId ? { parent: parentId } : { parent: null };
    const categories = await KnowledgeCategory.find({ ...query, isActive: true })
      .sort({ order: 1 })
      .lean();
    const withChildren = await Promise.all(
      categories.map(async (cat) => {
        const children = await KnowledgeCategory.find({ parent: cat._id, isActive: true })
          .sort({ order: 1 }).lean();
        return { ...cat, children };
      }),
    );
    return withChildren;
  }

  async createCategory(userId, data) {
    const slug = data.slug || data.name.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = await KnowledgeCategory.create({ ...data, slug });
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'knowledge_category', entityId: category._id,
      newValue: { name: category.name, slug: category.slug },
      description: `Created category: ${category.name.en}`,
    });
    return category;
  }

  async updateCategory(userId, id, data) {
    const category = await KnowledgeCategory.findById(id);
    if (!category) throw new Error('Category not found');
    Object.assign(category, data);
    await category.save();
    await logAuditEvent({
      userId, action: 'update', category: 'knowledge',
      entityType: 'knowledge_category', entityId: id,
      description: `Updated category: ${category.name.en}`,
    });
    return category;
  }

  async getVideos(filters = {}) {
    const { page = 1, limit = 20, category, tags, status } = filters;
    const query = {};
    if (category) query.category = category;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [videos, total] = await Promise.all([
      KnowledgeVideo.find(query)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      KnowledgeVideo.countDocuments(query),
    ]);
    return { videos, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createVideo(userId, data) {
    const video = await KnowledgeVideo.create({ ...data, status: data.status || 'draft' });
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'knowledge_video', entityId: video._id,
      newValue: { title: video.title },
      description: `Created video: ${video.title.en}`,
    });
    return video;
  }

  async getTrainingModules(filters = {}) {
    const { page = 1, limit = 20, category, difficulty, status } = filters;
    const query = {};
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [modules, total] = await Promise.all([
      TrainingModule.find(query)
        .populate('category', 'name slug')
        .populate('prerequisites', 'title')
        .populate('certification', 'name code')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      TrainingModule.countDocuments(query),
    ]);
    return { modules, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createTrainingModule(userId, data) {
    const lessons = (data.lessons || []).map((l, i) => ({ ...l, order: l.order ?? i }));
    const totalDuration = lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
    const module = await TrainingModule.create({
      ...data, lessons, duration: data.duration || totalDuration,
      status: data.status || 'draft',
    });
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'training_module', entityId: module._id,
      newValue: { title: module.title, lessonsCount: lessons.length },
      description: `Created training module: ${module.title.en}`,
    });
    return module;
  }

  async updateTrainingModule(userId, id, data) {
    const mod = await TrainingModule.findById(id);
    if (!mod) throw new Error('Training module not found');
    if (data.lessons) {
      data.lessons = data.lessons.map((l, i) => ({ ...l, order: l.order ?? i }));
      data.duration = data.duration || data.lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
    }
    Object.assign(mod, data);
    await mod.save();
    await logAuditEvent({
      userId, action: 'update', category: 'knowledge',
      entityType: 'training_module', entityId: id,
      description: `Updated training module: ${mod.title.en}`,
    });
    return mod;
  }

  async getLearningPaths() {
    return LearningPath.find({ status: 'published' })
      .populate('modules.module', 'title duration difficulty')
      .populate('certification', 'name code badge')
      .sort({ createdAt: -1 })
      .lean();
  }

  async createLearningPath(userId, data) {
    const path = await LearningPath.create({ ...data, status: data.status || 'draft' });
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'learning_path', entityId: path._id,
      newValue: { title: path.title },
      description: `Created learning path: ${path.title.en}`,
    });
    return path;
  }

  async enrollUser(userId, targetType, targetId) {
    const existing = await Enrollment.findOne({ user: userId, targetType, targetId });
    if (existing) throw new Error('Already enrolled');
    const enrollment = await Enrollment.create({
      user: userId, targetType, targetId,
      status: 'enrolled', startedAt: new Date(),
    });
    const updateField = targetType === 'training_module' ? 'TrainingModule' : 'LearningPath';
    const Model = targetType === 'training_module' ? TrainingModule : LearningPath;
    await Model.findByIdAndUpdate(targetId, { $inc: { enrolledCount: 1 } });
    await logAuditEvent({
      userId, action: 'enroll', category: 'knowledge',
      entityType: `enrollment_${targetType}`, entityId: enrollment._id,
      newValue: { targetType, targetId },
      description: `Enrolled in ${targetType}: ${targetId}`,
    });
    return enrollment;
  }

  async updateProgress(userId, enrollmentId, lessonId) {
    const enrollment = await Enrollment.findOne({ _id: enrollmentId, user: userId });
    if (!enrollment) throw new Error('Enrollment not found');
    const lessonKey = lessonId.toString();
    if (enrollment.completedLessons.includes(lessonKey)) {
      return enrollment;
    }
    enrollment.completedLessons.push(lessonKey);
    if (enrollment.targetType === 'training_module') {
      const mod = await TrainingModule.findById(enrollment.targetId);
      if (mod) {
        const total = mod.lessons.length;
        const completed = enrollment.completedLessons.length;
        enrollment.progress = Math.round((completed / total) * 100);
      }
    } else {
      const path = await LearningPath.findById(enrollment.targetId).populate('modules.module');
      if (path) {
        let total = 0;
        for (const entry of path.modules || []) {
          const m = entry.module;
          if (m) total += m.lessons?.length || 1;
        }
        const completed = enrollment.completedLessons.length;
        enrollment.progress = Math.min(100, Math.round((completed / Math.max(total, 1)) * 100));
      }
    }
    if (enrollment.progress >= 100) {
      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
    } else if (enrollment.status === 'enrolled') {
      enrollment.status = 'in_progress';
    }
    await enrollment.save();
    return enrollment;
  }

  async getCertifications() {
    return Certification.find({ isActive: true }).sort({ name: 1 }).lean();
  }

  async createCertification(userId, data) {
    const cert = await Certification.create(data);
    await logAuditEvent({
      userId, action: 'create', category: 'knowledge',
      entityType: 'certification', entityId: cert._id,
      newValue: { name: cert.name, code: cert.code },
      description: `Created certification: ${cert.name.en}`,
    });
    return cert;
  }

  async issueCertificate(userId, enrollmentId) {
    const enrollment = await Enrollment.findOne({ _id: enrollmentId, user: userId });
    if (!enrollment) throw new Error('Enrollment not found');
    if (enrollment.progress < 100) throw new Error('Progress must be 100% to issue certificate');
    enrollment.certificateIssuedAt = new Date();
    enrollment.status = 'completed';
    await enrollment.save();
    await logAuditEvent({
      userId, action: 'issue_certificate', category: 'knowledge',
      entityType: 'enrollment', entityId: enrollmentId,
      description: 'Certificate issued for completed enrollment',
    });
    return enrollment;
  }

  async getEnrollments(userId) {
    return Enrollment.find({ user: userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getKnowledgeAnalytics() {
    const [articles, articleViews, totalEnrollments, completedEnrollments] = await Promise.all([
      KnowledgeArticle.countDocuments({ status: 'published' }),
      KnowledgeArticle.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, total: { $sum: '$views' } } },
      ]),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'completed' }),
    ]);
    return {
      totalArticles: articles,
      totalViews: articleViews[0]?.total || 0,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
    };
  }

  async searchKnowledge(query) {
    const regex = new RegExp(query, 'i');
    const [articles, videos, modules] = await Promise.all([
      KnowledgeArticle.find({
        status: 'published',
        $or: [
          { 'title.en': regex }, { 'title.ar': regex },
          { 'content.en': regex }, { 'content.ar': regex },
          { tags: regex },
        ],
      }).select('title excerpt slug category views').limit(20).lean(),
      KnowledgeVideo.find({
        status: 'published',
        $or: [
          { 'title.en': regex }, { 'title.ar': regex },
          { 'description.en': regex }, { 'description.ar': regex },
          { tags: regex },
        ],
      }).select('title description url duration').limit(10).lean(),
      TrainingModule.find({
        status: 'published',
        $or: [
          { 'title.en': regex }, { 'title.ar': regex },
          { 'description.en': regex }, { 'description.ar': regex },
        ],
      }).select('title description difficulty duration').limit(10).lean(),
    ]);
    return { articles, videos, modules };
  }
}

export const knowledgePlatformService = new KnowledgePlatformService();
