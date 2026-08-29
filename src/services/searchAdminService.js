import { SearchAnalytics } from '../models/SearchAnalytics.js';
import { logAuditEvent } from './auditService.js';

class SearchAdminService {
  constructor() {
    this.synonyms = new Map();
    this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were']);
    this.rankingRules = ['relevance', 'rating', 'price:asc', 'price:desc'];
    this.boostRules = new Map();
    this.indexes = new Map();
  }

  async getSearchAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [totalSearches, uniqueUsers, noResultCount, topQueries, dailyStats] = await Promise.all([
      SearchAnalytics.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      SearchAnalytics.distinct('userId', { createdAt: { $gte: thirtyDaysAgo }, userId: { $ne: null } }),
      SearchAnalytics.countDocuments({ hasResults: false, createdAt: { $gte: thirtyDaysAgo } }),
      SearchAnalytics.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$query', count: { $sum: 1 }, avgDuration: { $avg: '$searchDurationMs' }, noResults: { $sum: { $cond: [{ $eq: ['$hasResults', false] }, 1, 0] } } } },
        { $sort: { count: -1 } },
        { $limit: 50 },
      ]),
      SearchAnalytics.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, avgDuration: { $avg: '$searchDurationMs' } } },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
    ]);
    return {
      totalSearches,
      uniqueUsers: uniqueUsers.length,
      noResultRate: totalSearches > 0 ? (noResultCount / totalSearches) * 100 : 0,
      topQueries, dailyStats, synonyms: Array.from(this.synonyms.entries()),
      stopWords: Array.from(this.stopWords), rankingRules: this.rankingRules,
      activeBoosts: Array.from(this.boostRules.entries()).map(([id, boost]) => ({ productId: id, boost })),
    };
  }

  async getPopularSearches(limit = 20) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const results = await SearchAnalytics.aggregate([
      { $match: { hasResults: true, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$query', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit },
    ]);
    return results.map(r => ({ query: r._id, count: r.count }));
  }

  async getFailedSearches(limit = 20) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const results = await SearchAnalytics.aggregate([
      { $match: { hasResults: false, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$query', count: { $sum: 1 }, lastAttempt: { $max: '$createdAt' } } },
      { $sort: { count: -1 } },
      { $limit },
    ]);
    return results.map(r => ({ query: r._id, attempts: r.count, lastAttempt: r.lastAttempt }));
  }

  async manageSynonyms(word, synonyms = []) {
    const existing = this.synonyms.get(word) || [];
    const merged = [...new Set([...existing, ...synonyms])];
    this.synonyms.set(word, merged);
    return { word, synonyms: merged, total: this.synonyms.size };
  }

  async manageStopWords(words = []) {
    for (const w of words) this.stopWords.add(w.toLowerCase().trim());
    return { stopWords: Array.from(this.stopWords), total: this.stopWords.size };
  }

  async getRankingRules() {
    return { rules: this.rankingRules };
  }

  async addBoostRule(productId, boost) {
    this.boostRules.set(productId, boost);
    return { productId, boost, active: true };
  }

  async getSuggestions(query) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const popular = await this.getPopularSearches(10);
    const filtered = popular.filter(s => s.query.toLowerCase().includes(q));
    const synonyms = Array.from(this.synonyms.entries())
      .filter(([word]) => word.toLowerCase().includes(q))
      .flatMap(([, syns]) => syns);
    return [...new Set([...filtered.map(s => s.query), ...synonyms])].slice(0, 8);
  }

  async getIndexStatus() {
    return {
      indexes: Array.from(this.indexes.entries()).map(([name, idx]) => ({
        name, documentCount: idx.count || 0, lastBuilt: idx.lastBuilt,
        status: idx.status || 'unknown',
      })),
      synonymsConfigured: this.synonyms.size,
      stopWordsConfigured: this.stopWords.size,
      boostRulesActive: this.boostRules.size,
    };
  }

  async rebuildIndex(entityType) {
    const idx = { name: entityType, count: 0, lastBuilt: new Date(), status: 'building' };
    this.indexes.set(entityType, idx);
    await logAuditEvent({
      action: 'search.index_rebuild', category: 'system',
      entityType: 'SearchIndex', entityId: entityType,
      newValue: { entityType, startedAt: idx.lastBuilt },
      description: `Search index rebuild triggered for ${entityType}`,
    });
    return { entityType, status: 'building', startedAt: idx.lastBuilt };
  }

  async getSearchPerformance() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const stats = await SearchAnalytics.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: 1 },
          avgLatency: { $avg: '$searchDurationMs' },
          maxLatency: { $max: '$searchDurationMs' },
          p95Latency: { $percentile: { input: '$searchDurationMs', p: [95] } },
          errors: { $sum: { $cond: [{ $eq: ['$hasResults', false] }, 1, 0] } },
        },
      },
    ]);
    const s = stats[0] || {};
    return {
      qps: Math.round((s.totalQueries || 0) / 3600 * 100) / 100,
      avgLatencyMs: Math.round(s.avgLatency || 0),
      maxLatencyMs: Math.round(s.maxLatency || 0),
      p95LatencyMs: Math.round(s.p95Latency?.[0] || 0),
      errorRate: s.totalQueries > 0 ? Math.round((s.errors / s.totalQueries) * 10000) / 100 : 0,
      totalQueriesLastHour: s.totalQueries || 0,
    };
  }
}

export const searchAdminService = new SearchAdminService();
