import { SearchAnalytics } from '../models/SearchAnalytics.js';
import { logAuditEvent } from './auditService.js';

class EnterpriseSearchService {
  constructor() {
    this.backend = null;
    this.backendType = 'mongo';
    this.indexRegistry = new Map();
    this.synonyms = new Map();
    this.popularSearches = [];
    this.lastPopularUpdate = 0;
  }

  async initialize(options = {}) {
    this.backendType = options.backend || 'mongo';
    if (options.meilisearchUrl && options.meilisearchKey) {
      try {
        const MeiliSearch = (await import('meilisearch')).default;
        this.backend = new MeiliSearch({
          host: options.meilisearchUrl,
          apiKey: options.meilisearchKey,
        });
        this.backendType = 'meilisearch';
      } catch (err) {
        console.warn('[SearchService] Meilisearch unavailable:', err.message);
      }
    }
    if (options.elasticUrl) {
      try {
        const { Client } = await import('@elastic/elasticsearch');
        this.backend = new Client({ node: options.elasticUrl });
        this.backendType = 'elastic';
      } catch (err) {
        console.warn('[SearchService] Elasticsearch unavailable:', err.message);
      }
    }
    if (this.backendType === 'meilisearch' && options.synonyms) {
      for (const [word, syns] of Object.entries(options.synonyms)) {
        this.synonyms.set(word, syns);
      }
    }
  }

  async search(index, query, options = {}) {
    const t0 = Date.now();
    const {
      filters = {}, page = 1, limit = 20, sort, facets, locale,
      userId, ip, userAgent, sessionId,
    } = options;

    let results;
    let totalResults = 0;

    switch (this.backendType) {
      case 'meilisearch':
        results = await this._searchMeili(index, query, { filters, page, limit, sort, facets });
        totalResults = results.total || 0;
        break;
      case 'elastic':
        results = await this._searchElastic(index, query, { filters, page, limit, sort });
        totalResults = results.total || 0;
        break;
      default:
        results = await this._searchMongo(index, query, { filters, page, limit, sort });
        totalResults = results.total || 0;
    }

    const durationMs = Date.now() - t0;

    if (query && query.length > 2) {
      this._logSearchAnalytics({
        query, userId, ip, userAgent, locale, filters,
        resultsCount: results.data?.length || 0,
        totalResults, searchDurationMs: durationMs,
        hasResults: (results.data?.length || 0) > 0,
        sessionId,
      }).catch(() => {});
    }

    return { ...results, durationMs };
  }

  async _searchMongo(index, query, { filters = {}, page = 1, limit = 20, sort }) {
    return { data: [], total: 0, page, limit, pages: 0 };
  }

  async _searchMeili(index, query, { filters, page, limit, sort, facets }) {
    if (!this.backend) return { data: [], total: 0 };
    const searchParams = {
      limit, offset: (page - 1) * limit,
      filter: this._buildMeiliFilter(filters),
      facets: facets || undefined,
    };
    if (sort) searchParams.sort = [sort];
    const result = await this.backend.index(index).search(query, searchParams);
    return {
      data: result.hits || [],
      total: result.estimatedTotalHits || 0,
      page, limit,
      pages: Math.ceil((result.estimatedTotalHits || 0) / limit),
      facets: result.facetDistribution || {},
    };
  }

  async _searchElastic(index, query, { filters, page, limit, sort }) {
    if (!this.backend) return { data: [], total: 0 };
    const must = [];
    if (query) {
      must.push({
        multi_match: { query, fields: ['name^3', 'description', 'tags', 'category'], fuzziness: 'AUTO' },
      });
    }
    for (const [key, value] of Object.entries(filters)) {
      if (value) must.push({ term: { [key]: value } });
    }
    const result = await this.backend.search({
      index,
      from: (page - 1) * limit,
      size: limit,
      query: { bool: { must } },
      sort: sort ? [sort] : undefined,
    });
    return {
      data: result.hits?.hits?.map(h => ({ _id: h._id, ...h._source, _score: h._score })) || [],
      total: result.hits?.total?.value || 0,
      page, limit,
      pages: Math.ceil((result.hits?.total?.value || 0) / limit),
    };
  }

  _buildMeiliFilter(filters) {
    const parts = [];
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          parts.push(`${key} IN [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`);
        } else if (typeof value === 'object' && (value.gte || value.lte)) {
          if (value.gte) parts.push(`${key} >= ${value.gte}`);
          if (value.lte) parts.push(`${key} <= ${value.lte}`);
        } else {
          parts.push(`${key} = ${typeof value === 'string' ? `"${value}"` : value}`);
        }
      }
    }
    return parts.join(' AND ') || undefined;
  }

  async autocomplete(index, query, options = {}) {
    if (!query || query.length < 2) return [];
    switch (this.backendType) {
      case 'meilisearch':
        if (this.backend) {
          const result = await this.backend.index(index).search(query, { limit: options.limit || 10, attributesToRetrieve: ['name'] });
          return result.hits?.map(h => ({ text: h.name, _id: h._id })) || [];
        }
        return [];
      case 'elastic':
        if (this.backend) {
          const result = await this.backend.search({
            index,
            query: { match_phrase_prefix: { name: query } },
            size: options.limit || 10,
          });
          return result.hits?.hits?.map(h => ({ text: h._source.name, _id: h._id })) || [];
        }
        return [];
      default:
        return [];
    }
  }

  async getSuggestions(query, options = {}) {
    const popular = await this.getPopularSearches(options.limit || 5);
    const filtered = popular.filter(s => s.toLowerCase().includes(query.toLowerCase()));
    return filtered.slice(0, options.limit || 5);
  }

  async getPopularSearches(limit = 10) {
    if (Date.now() - this.lastPopularUpdate > 3600000) {
      try {
        const popular = await SearchAnalytics.aggregate([
          { $match: { hasResults: true, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
          { $group: { _id: '$normalizedQuery', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 50 },
        ]);
        this.popularSearches = popular.map(p => p._id).filter(Boolean);
        this.lastPopularUpdate = Date.now();
      } catch (e) {
        return this.popularSearches.slice(0, limit);
      }
    }
    return this.popularSearches.slice(0, limit);
  }

  async getSearchAnalytics(options = {}) {
    const { startDate, endDate, limit = 20 } = options;
    const match = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const [totalSearches, noResultSearches, topQueries, dailyStats] = await Promise.all([
      SearchAnalytics.countDocuments(match),
      SearchAnalytics.countDocuments({ ...match, hasResults: false }),
      SearchAnalytics.aggregate([
        { $match: match },
        { $group: { _id: '$query', count: { $sum: 1 }, avgDuration: { $avg: '$searchDurationMs' } } },
        { $sort: { count: -1 } },
        { $limit },
      ]),
      SearchAnalytics.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            avgDuration: { $avg: '$searchDurationMs' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
    ]);
    return {
      totalSearches,
      noResultSearches,
      noResultRate: totalSearches > 0 ? (noResultSearches / totalSearches) * 100 : 0,
      topQueries,
      dailyStats,
    };
  }

  async manageSynonyms(index, synonyms) {
    if (this.backendType === 'meilisearch' && this.backend) {
      await this.backend.index(index).updateSynonyms(synonyms);
    }
    for (const [word, syns] of Object.entries(synonyms)) {
      this.synonyms.set(word, syns);
    }
  }

  async indexDocument(index, document) {
    switch (this.backendType) {
      case 'meilisearch':
        if (this.backend) await this.backend.index(index).addDocuments([document]);
        break;
      case 'elastic':
        if (this.backend) await this.backend.index({ index, id: document._id, document, refresh: true });
        break;
      default:
        break;
    }
  }

  async removeDocument(index, id) {
    switch (this.backendType) {
      case 'meilisearch':
        if (this.backend) await this.backend.index(index).deleteDocument(id);
        break;
      case 'elastic':
        if (this.backend) await this.backend.delete({ index, id });
        break;
      default:
        break;
    }
  }

  async _logSearchAnalytics(data) {
    try {
      await SearchAnalytics.create({
        query: data.query,
        normalizedQuery: data.query.toLowerCase().trim(),
        userId: data.userId,
        ip: data.ip,
        userAgent: data.userAgent,
        locale: data.locale,
        filters: data.filters,
        resultsCount: data.resultsCount,
        totalResults: data.totalResults,
        searchDurationMs: data.searchDurationMs,
        hasResults: data.hasResults,
        isAutocomplete: data.isAutocomplete || false,
        sessionId: data.sessionId,
      });
    } catch (e) { /* non-critical */ }
  }
}

export const enterpriseSearchService = new EnterpriseSearchService();
