import mongoose from 'mongoose';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import User from '../models/userModel.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import { Announcement } from '../models/announcementModel.js';
import { BuyingRequest } from '../models/buyingRequestModel.js';
import { Quotation } from '../models/Quotation.js';
import Review from '../models/reviewModel.js';
import { Invoice } from '../models/Invoice.js';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { logAuditEvent } from './auditService.js';

const savedSearchSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  query: { type: String, required: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  name: { type: String },
  notifyOnNew: { type: Boolean, default: false },
  lastNotifiedAt: Date,
}, { timestamps: true });

savedSearchSchema.index({ userId: 1, createdAt: -1 });

const SavedSearch = mongoose.models.SavedSearch || mongoose.model('SavedSearch', savedSearchSchema);

const synonymSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true, lowercase: true },
  synonyms: [{ type: String }],
}, { timestamps: true });

const Synonym = mongoose.models.Synonym || mongoose.model('Synonym', synonymSchema);

class SemanticSearchService {
  constructor() {
    this.entityIndexes = {
      product: { model: Product, textFields: ['name.en', 'name.ar', 'description.en', 'description.ar', 'category'], sortField: 'ratingAverage', populate: 'vendor' },
      vendor: { model: Vendor, textFields: ['storeName.en', 'storeName.ar', 'storeDescription.en', 'storeDescription.ar', 'industry'], sortField: 'isVerified', populate: 'user' },
      user: { model: User, textFields: ['name', 'email', 'companyName'], sortField: 'createdAt' },
      order: { model: EscrowOrder, textFields: ['orderNumber', 'status'], sortField: 'createdAt', populate: 'buyer vendor' },
      rfq: { model: Announcement, textFields: ['title.en', 'title.ar', 'description.en', 'description.ar'], sortField: 'createdAt', populate: 'buyer' },
      buying_request: { model: BuyingRequest, textFields: ['title.en', 'title.ar', 'description.en', 'description.ar'], sortField: 'createdAt', populate: 'buyer' },
      quotation: { model: Quotation, textFields: ['quoteNumber', 'notes'], sortField: 'createdAt', populate: 'buyer vendor' },
      review: { model: Review, textFields: ['title', 'comment'], sortField: 'createdAt', populate: 'user product' },
      invoice: { model: Invoice, textFields: ['number', 'notes'], sortField: 'createdAt', populate: 'vendor buyer' },
      revenue: { model: MarketplaceRevenue, textFields: ['description', 'type'], sortField: 'createdAt', populate: 'vendor buyer' },
      company: { model: Company, textFields: ['name', 'legalName', 'registrationNumber', 'description'], sortField: 'createdAt' },
      lead: { model: Lead, textFields: ['company', 'contactName', 'email', 'notes'], sortField: 'score', populate: 'vendor' },
    };
  }

  async _expandSynonyms(query) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const expanded = new Set(words);
    const synDocs = await Synonym.find({ word: { $in: words } }).lean();
    for (const doc of synDocs) {
      for (const s of doc.synonyms) expanded.add(s);
    }
    return Array.from(expanded).join(' ');
  }

  _computeRankingScore(doc, query) {
    let score = 0;
    const q = query.toLowerCase();
    const textFields = ['name', 'title', 'description', 'storeName', 'comment', 'company', 'email', 'orderNumber', 'quoteNumber'];
    for (const field of textFields) {
      const val = typeof doc[field] === 'object' && doc[field] !== null ? doc[field].en || doc[field].ar || '' : String(doc[field] || '');
      if (val.toLowerCase().includes(q)) score += 10;
      const words = q.split(/\s+/);
      for (const w of words) {
        if (val.toLowerCase().includes(w)) score += 5;
        if (val.toLowerCase().startsWith(w)) score += 3;
      }
    }
    if (doc.ratingAverage) score += doc.ratingAverage * 2;
    if (doc.score) score += doc.score / 10;
    if (doc.helpfulCount) score += doc.helpfulCount;
    return score;
  }

  async search(query, types, filters = {}) {
    const t0 = Date.now();
    const expandedQuery = await this._expandSynonyms(query);
    const results = [];
    const typesToSearch = types && types.length > 0 ? types : Object.keys(this.entityIndexes);

    for (const type of typesToSearch) {
      const index = this.entityIndexes[type];
      if (!index) continue;
      try {
        const dbQuery = { $or: index.textFields.map(f => ({ [f]: { $regex: expandedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) };
        if (filters[type]) Object.assign(dbQuery, filters[type]);
        const docs = await index.model.find(dbQuery).populate(index.populate || []).sort({ [index.sortField]: -1 }).limit(50).lean();
        for (const doc of docs) {
          const score = this._computeRankingScore(doc, query);
          results.push({ type, entityId: doc._id, score, document: doc, matchedFields: index.textFields.filter(f => {
            const val = getNestedValue(doc, f);
            return val && String(val).toLowerCase().includes(query.toLowerCase());
          }) });
        }
      } catch (err) {
        console.error(`Search error for ${type}:`, err.message);
      }
    }

    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, 50);

    await logAuditEvent({
      userId: filters._userId, action: 'semantic_search', category: 'search', entityType: 'SemanticSearch',
      newValue: { query, types, resultCount: topResults.length, executionTime: Date.now() - t0 },
      description: `Search: "${query.substring(0, 100)}" - ${topResults.length} results`,
    });

    return { query, expandedQuery, results: topResults, totalResults: topResults.length, executionTimeMs: Date.now() - t0 };
  }

  async naturalLanguageSearch(query) {
    const q = query.toLowerCase();
    let types = [];
    if (/product|item|goods?/i.test(q)) types.push('product');
    if (/vendor|supplier|seller/i.test(q)) types.push('vendor');
    if (/order|purchase/i.test(q)) types.push('order');
    if (/rfq|announcement|tender/i.test(q)) types.push('rfq');
    if (/review|rating/i.test(q)) types.push('review');
    if (/invoice|bill/i.test(q)) types.push('invoice');
    if (/lead|customer/i.test(q)) types.push('lead');
    if (/company|business/i.test(q)) types.push('company');
    if (/user|buyer|customer/i.test(q)) types.push('user');
    if (/quote|quotation/i.test(q)) types.push('quotation');
    if (types.length === 0) types = Object.keys(this.entityIndexes);

    const quantityMatch = q.match(/(\d+)\s*(unit|piece|kg|ton|box|pallet)/i);
    const budgetMatch = q.match(/budget\s*(?:of\s*)?\$?(\d+)/i);

    const filters = {};
    if (quantityMatch) {
      for (const t of types) {
        if (t === 'product') filters[t] = { ...filters[t], moq: { $lte: parseInt(quantityMatch[1]) } };
      }
    }

    const cleanQuery = q.replace(/find|search|show|list|get|all|the|for|me|please|i\s+need|looking\s+for/i, '').trim();
    return this.search(cleanQuery, types, filters);
  }

  async getSuggestions(query) {
    if (!query || query.length < 2) return [];
    const suggestions = new Set();
    const prefix = query.toLowerCase();

    const products = await Product.find({ 'name.en': { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }).limit(5).select('name.en').lean();
    for (const p of products) { if (p.name?.en) suggestions.add(p.name.en); }

    const vendors = await Vendor.find({ 'storeName.en': { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }).limit(3).select('storeName.en').lean();
    for (const v of vendors) { if (v.storeName?.en) suggestions.add(v.storeName.en); }

    const companies = await Company.find({ name: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }).limit(3).select('name').lean();
    for (const c of companies) { suggestions.add(c.name); }

    const synDocs = await Synonym.find({ word: { $regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' } }).limit(5).lean();
    for (const s of synDocs) { suggestions.add(s.word); for (const syn of s.synonyms) suggestions.add(syn); }

    return Array.from(suggestions).slice(0, 10);
  }

  async getRelatedResults(query, resultId) {
    const allResults = await this.search(query, null, {});
    const result = allResults.results.find(r => r.entityId.toString() === resultId.toString());
    if (!result) return [];

    const sameType = allResults.results.filter(r => r.type === result.type && r.entityId.toString() !== resultId.toString()).slice(0, 5);
    const otherTypes = allResults.results.filter(r => r.type !== result.type).slice(0, 5);
    return { sameType, otherTypes };
  }

  async getSearchExplanation(query, resultId) {
    const allResults = await this.search(query, null, {});
    const result = allResults.results.find(r => r.entityId.toString() === resultId.toString());
    if (!result) return { explanation: 'Result not found', score: 0 };

    const reasons = [];
    const q = query.toLowerCase();
    const doc = result.document;

    for (const field of result.matchedFields || []) {
      const val = getNestedValue(doc, field);
      if (val) reasons.push(`Matched on "${field}": "${String(val).substring(0, 100)}"`);
    }

    if (doc.ratingAverage && doc.ratingAverage > 3) reasons.push(`Highly rated (${doc.ratingAverage}★)`);
    if (doc.score) reasons.push(`Lead score: ${doc.score}/100`);

    return { explanation: reasons.join('. '), score: result.score, matchedFields: result.matchedFields, rankingFactors: reasons };
  }

  async getAISummary(query, results) {
    if (!results || results.length === 0) return { summary: 'No results found.' };
    const typeCounts = {};
    for (const r of results) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    }
    const top = results.slice(0, 5);
    const topNames = top.map(r => {
      const d = r.document;
      return d.name?.en || d.title?.en || d.storeName?.en || d.company || d.orderNumber || d.quoteNumber || d.email || 'Unknown';
    });

    return {
      summary: `Found ${results.length} results across ${Object.keys(typeCounts).length} categories. ` +
        `Top types: ${Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, c]) => `${t} (${c})`).join(', ')}. ` +
        `Notable matches: ${topNames.join(', ')}.`,
      resultCount: results.length,
      typeBreakdown: typeCounts,
      topMatches: topNames,
    };
  }

  async manageSynonyms(word, synonyms) {
    const existing = await Synonym.findOne({ word: word.toLowerCase() });
    if (existing) {
      existing.synonyms = [...new Set([...existing.synonyms, ...synonyms.map(s => s.toLowerCase())])];
      await existing.save();
      return existing;
    }
    return Synonym.create({ word: word.toLowerCase(), synonyms: synonyms.map(s => s.toLowerCase()) });
  }

  async getSavedSearches(userId) {
    return SavedSearch.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async saveSearch(userId, query, filters = {}) {
    const existing = await SavedSearch.findOne({ userId, query });
    if (existing) {
      existing.filters = filters;
      return existing.save();
    }
    return SavedSearch.create({ userId, query, filters });
  }

  async deleteSavedSearch(id) {
    await SavedSearch.findByIdAndDelete(id);
    return { success: true };
  }

  async reindex(type) {
    const index = this.entityIndexes[type];
    if (!index) throw new Error(`Unknown entity type: ${type}`);
    const count = await index.model.countDocuments({});
    return { type, reindexed: count, completedAt: new Date().toISOString() };
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export const semanticSearchService = new SemanticSearchService();
