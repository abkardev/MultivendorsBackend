import { DatabaseIndex } from '../models/DatabaseIndex.js';
import { QueryExecution } from '../models/QueryExecution.js';
import { CollectionStatistic } from '../models/CollectionStatistic.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class DatabaseOptimizationService {
  async analyzeIndex(indexId) {
    const index = await DatabaseIndex.findById(indexId).lean();
    if (!index) throw new Error('Index not found');
    const efficiency = index.usage?.reads > 0 ? 'used' : 'unused';
    const cardinalityScore = index.cardinality > 1000 ? 'high' : index.cardinality > 100 ? 'medium' : 'low';
    const recommendations = [];
    if (efficiency === 'unused' && (index.usage?.lastUsed || 0) < Date.now() - 30 * 86400000) {
      recommendations.push('Index appears unused - consider dropping');
    }
    if (index.fields && index.fields.length > 5) {
      recommendations.push('Index has many fields - consider compound index optimization');
    }
    return { ...index, analysis: { efficiency, cardinalityScore, recommendations } };
  }

  async detectMissingIndexes(collection) {
    const queryExecs = await QueryExecution.find({ collection }).sort({ duration: -1 }).limit(100).lean();
    const patterns = {};
    for (const q of queryExecs) {
      if (!q.indexUsed && q.duration > 100) {
        const key = q.query?.substring(0, 100) || 'unknown';
        if (!patterns[key]) {
          patterns[key] = { count: 0, totalDuration: 0, fields: new Set() };
        }
        patterns[key].count++;
        patterns[key].totalDuration += q.duration;
      }
    }
    const missing = Object.entries(patterns).map(([pattern, data]) => ({
      collection, pattern: pattern.substring(0, 100),
      occurrences: data.count,
      totalDuration: data.totalDuration,
      avgDuration: data.totalDuration / data.count,
      suggestedIndex: `Consider indexing fields used in ${pattern.substring(0, 50)}...`,
    })).sort((a, b) => b.avgDuration - a.avgDuration);
    return missing;
  }

  async detectDuplicateIndexes(collection) {
    const indexes = await DatabaseIndex.find({ collection }).lean();
    const duplicates = [];
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const fieldsA = indexes[i].fields?.map(f => f.name).sort().join(',') || '';
        const fieldsB = indexes[j].fields?.map(f => f.name).sort().join(',') || '';
        if (fieldsA && fieldsA === fieldsB) {
          duplicates.push({
            index1: { id: indexes[i]._id, name: indexes[i].name },
            index2: { id: indexes[j]._id, name: indexes[j].name },
            fields: fieldsA,
            recommendation: `Merge or drop duplicate index ${indexes[j].name}`,
          });
        }
      }
    }
    return { collection, duplicates, count: duplicates.length };
  }

  async getIndexRecommendations(collection) {
    const missing = await this.detectMissingIndexes(collection);
    const duplicate = await this.detectDuplicateIndexes(collection);
    const indexes = await DatabaseIndex.find({ collection }).lean();
    const unused = indexes.filter(i => {
      const lastUsed = i.usage?.lastUsed ? new Date(i.usage.lastUsed).getTime() : 0;
      return lastUsed < Date.now() - 30 * 86400000;
    });
    return {
      collection,
      recommendations: {
        missingIndexes: missing,
        duplicateIndexes: duplicate.duplicates,
        unusedIndexes: unused.map(i => ({ id: i._id, name: i.name, lastUsed: i.usage?.lastUsed })),
      },
      totalRecommendations: missing.length + duplicate.duplicates.length + unused.length,
    };
  }

  async createIndex(data) {
    const index = await DatabaseIndex.create(data);
    await logAuditEvent({
      action: 'database.index.create', category: 'system',
      entityType: 'DatabaseIndex', entityId: index._id,
      description: `Created index ${data.name} on ${data.collection}`,
      status: 'success',
    });
    return index;
  }

  async updateIndex(id, data) {
    const index = await DatabaseIndex.findByIdAndUpdate(id, data, { new: true });
    await logAuditEvent({
      action: 'database.index.update', category: 'system',
      entityType: 'DatabaseIndex', entityId: id,
      description: `Updated index ${index?.name || id} on ${index?.collection || 'unknown'}`,
      status: 'success',
    });
    return index;
  }

  async listIndexes(collection) {
    return DatabaseIndex.find({ collection }).sort({ name: 1 }).lean();
  }

  async recordQueryExecution(data) {
    const execData = { ...data };
    if (data.documentsExamined !== undefined && data.documentsReturned !== undefined && data.documentsReturned > 0) {
      execData.examinedReturnedRatio = data.documentsExamined / data.documentsReturned;
    }
    const execution = await QueryExecution.create(execData);
    return execution;
  }

  async analyzeQuery(queryExecId) {
    const exec = await QueryExecution.findById(queryExecId).lean();
    if (!exec) throw new Error('Query execution not found');
    const efficiency = exec.examinedReturnedRatio < 10 ? 'efficient' : exec.examinedReturnedRatio < 100 ? 'moderate' : 'inefficient';
    const recommendations = [];
    if (exec.sortInMemory) {
      recommendations.push('Query uses in-memory sort - add index on sort field');
    }
    if (exec.noTableScan === false) {
      recommendations.push('Query performs collection scan - add appropriate index');
    }
    if (efficiency === 'inefficient') {
      recommendations.push(`High examined/returned ratio (${exec.examinedReturnedRatio?.toFixed(2)}) - optimize query`);
    }
    return { ...exec, analysis: { efficiency, recommendations, score: recommendations.length === 0 ? 100 : Math.max(0, 100 - recommendations.length * 30) } };
  }

  async getSlowestQueries(limit, period) {
    const start = new Date(Date.now() - (period || 7) * 86400000);
    const execs = await QueryExecution.find({ timestamp: { $gte: start } })
      .sort({ duration: -1 }).limit(limit || 20).lean();
    return execs;
  }

  async getCollectionStatistics(name) {
    return CollectionStatistic.findOne({ name }).lean();
  }

  async updateCollectionStats(data) {
    const stats = await CollectionStatistic.findOneAndUpdate(
      { name: data.name },
      { $set: data },
      { upsert: true, new: true }
    );
    return stats;
  }

  async forecastCollectionGrowth(collectionName, days) {
    const stats = await CollectionStatistic.findOne({ name: collectionName }).lean();
    if (!stats) throw new Error('Collection statistics not found');
    const dailyRate = stats.growth?.dailyRate || 0;
    const currentSize = stats.size?.totalSize || 0;
    const currentDocs = stats.size?.documents || 0;
    return {
      collection: collectionName,
      currentSize,
      currentDocuments: currentDocs,
      dailyGrowthRate: dailyRate,
      projectedSize: currentSize + dailyRate * days,
      projectedDocuments: currentDocs + (currentDocs * (dailyRate / (currentSize || 1)) * days),
      estimatedSizeInDays: days,
    };
  }

  async getStorageRecommendations() {
    const collections = await CollectionStatistic.find({}).lean();
    const recommendations = [];
    for (const c of collections) {
      if (c.size?.indexSize && c.size?.totalSize && (c.size.indexSize / c.size.totalSize) > 0.5) {
        recommendations.push({
          collection: c.name, type: 'index_size',
          severity: 'warning',
          message: `Index size (${(c.size.indexSize / 1024 / 1024).toFixed(2)}MB) exceeds 50% of total data`,
        });
      }
      if (c.growth?.monthlyRate && c.growth.monthlyRate > 0.2) {
        recommendations.push({
          collection: c.name, type: 'growth',
          severity: 'info',
          message: `Collection growing at ${(c.growth.monthlyRate * 100).toFixed(1)}% monthly - plan for scaling`,
        });
      }
    }
    return { recommendations, count: recommendations.length };
  }

  async getQueryCostEstimate(queryPattern) {
    const matched = await QueryExecution.find({
      query: { $regex: queryPattern, $options: 'i' },
    }).lean();
    const avgDuration = matched.reduce((s, q) => s + (q.duration || 0), 0) / (matched.length || 1);
    const avgDocsExamined = matched.reduce((s, q) => s + (q.documentsExamined || 0), 0) / (matched.length || 1);
    return {
      pattern: queryPattern,
      matchCount: matched.length,
      estimatedCost: {
        avgDurationMs: Math.round(avgDuration),
        avgDocumentsExamined: Math.round(avgDocsExamined),
        ioCost: avgDocsExamined > 1000 ? 'high' : avgDocsExamined > 100 ? 'medium' : 'low',
        cpuCost: avgDuration > 500 ? 'high' : avgDuration > 100 ? 'medium' : 'low',
      },
    };
  }

  async generateOptimizationReport() {
    const [indexes, queryExecs, collections] = await Promise.all([
      DatabaseIndex.find({}).lean(),
      QueryExecution.find({}).sort({ duration: -1 }).limit(50).lean(),
      CollectionStatistic.find({}).lean(),
    ]);
    const unusedIndexes = indexes.filter(i => {
      const lastUsed = i.usage?.lastUsed ? new Date(i.usage.lastUsed).getTime() : 0;
      return lastUsed < Date.now() - 30 * 86400000;
    });
    const slowQueries = queryExecs.filter(q => q.duration > 500);
    const recommendations = [];
    if (unusedIndexes.length > 0) recommendations.push({ type: 'index', count: unusedIndexes.length, action: 'Review and drop unused indexes' });
    if (slowQueries.length > 0) recommendations.push({ type: 'query', count: slowQueries.length, action: 'Optimize slow queries' });
    return {
      generatedAt: new Date(),
      summary: {
        totalIndexes: indexes.length,
        unusedIndexes: unusedIndexes.length,
        totalCollections: collections.length,
        slowQueries: slowQueries.length,
      },
      recommendations,
    };
  }
}

export const databaseOptimizationService = new DatabaseOptimizationService();
