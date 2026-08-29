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
import { Company } from '../models/Company.js';
import { Lead } from '../models/Lead.js';
import { logAuditEvent } from './auditService.js';

const entityNodeSchema = new mongoose.Schema({
  entityType: { type: String, required: true, index: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  label: { type: String, required: true },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  tags: [String],
  vector: { type: [Number], default: [] },
}, { timestamps: true });

entityNodeSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
entityNodeSchema.index({ label: 'text', 'properties.name.en': 'text' });

const relationshipSchema = new mongoose.Schema({
  sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'EntityNode', required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'EntityNode', required: true },
  type: { type: String, required: true, index: true },
  weight: { type: Number, default: 1, min: 0, max: 1 },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

relationshipSchema.index({ sourceId: 1, type: 1 });
relationshipSchema.index({ targetId: 1, type: 1 });
relationshipSchema.index({ sourceId: 1, targetId: 1, type: 1 }, { unique: true });

const EntityNode = mongoose.models.EntityNode || mongoose.model('EntityNode', entityNodeSchema);
const Relationship = mongoose.models.Relationship || mongoose.model('Relationship', relationshipSchema);

class KnowledgeGraphService {
  async syncEntity(type, entityId, data) {
    const existing = await EntityNode.findOne({ entityType: type, entityId });
    if (existing) {
      Object.assign(existing, { label: data.label || existing.label, properties: data.properties || existing.properties, tags: data.tags || existing.tags });
      await existing.save();
      return existing;
    }
    return EntityNode.create({ entityType: type, entityId, label: data.label, properties: data.properties || {}, tags: data.tags || [] });
  }

  async createRelationship(sourceId, targetId, type, weight = 1, properties = {}) {
    const existing = await Relationship.findOne({ sourceId, targetId, type });
    if (existing) {
      existing.weight = weight;
      existing.properties = { ...existing.properties, ...properties };
      return existing.save();
    }
    return Relationship.create({ sourceId, targetId, type, weight, properties });
  }

  async getEntity(entityId) {
    const entity = await EntityNode.findById(entityId).lean();
    if (!entity) throw new Error('Entity not found');
    const [outgoing, incoming] = await Promise.all([
      Relationship.find({ sourceId: entityId, isActive: true }).populate('targetId').lean(),
      Relationship.find({ targetId: entityId, isActive: true }).populate('sourceId').lean(),
    ]);
    return { ...entity, outgoingRelationships: outgoing, incomingRelationships: incoming };
  }

  async searchEntities(query, type) {
    const filter = { $or: [{ label: { $regex: query, $options: 'i' } }, { 'properties.name.en': { $regex: query, $options: 'i' } }] };
    if (type) filter.entityType = type;
    return EntityNode.find(filter).limit(50).lean();
  }

  async getRelationships(entityId, type) {
    const filter = { $or: [{ sourceId: entityId }, { targetId: entityId }], isActive: true };
    if (type) filter.type = type;
    return Relationship.find(filter).populate('sourceId targetId').lean();
  }

  async getImpactAnalysis(entityId, depth = 1) {
    if (depth > 3) depth = 3;
    const visited = new Set();
    const nodes = [];
    const edges = [];
    const queue = [{ id: entityId, level: 0 }];
    visited.add(entityId.toString());

    while (queue.length > 0) {
      const { id, level } = queue.shift();
      if (level > depth) continue;
      const entity = await EntityNode.findById(id).lean();
      if (entity) nodes.push(entity);
      const rels = await Relationship.find({ $or: [{ sourceId: id }, { targetId: id }], isActive: true }).lean();
      for (const rel of rels) {
        edges.push(rel);
        const neighborId = rel.sourceId.toString() === id.toString() ? rel.targetId : rel.sourceId;
        if (!visited.has(neighborId.toString()) && level < depth) {
          visited.add(neighborId.toString());
          queue.push({ id: neighborId, level: level + 1 });
        }
      }
    }
    return { nodes, edges, depth, totalNodes: nodes.length, totalEdges: edges.length };
  }

  async getDependencyGraph(entityId) {
    const entity = await EntityNode.findById(entityId).lean();
    if (!entity) throw new Error('Entity not found');
    const deps = await Relationship.find({ sourceId: entityId, type: { $in: ['depends_on', 'requires', 'references'] }, isActive: true }).populate('targetId').lean();
    const dependents = await Relationship.find({ targetId: entityId, type: { $in: ['depended_by', 'required_by', 'referenced_by'] }, isActive: true }).populate('sourceId').lean();
    return { entity, dependencies: deps, dependents };
  }

  async getRecommendationGraph(entityId) {
    const entity = await EntityNode.findById(entityId).lean();
    if (!entity) throw new Error('Entity not found');
    const rels = await Relationship.find({
      $or: [{ sourceId: entityId }, { targetId: entityId }],
      type: { $in: ['similar_to', 'recommends', 'complements', 'frequently_bought_with'] },
      isActive: true,
    }).populate('sourceId targetId').lean();
    const recommendedIds = new Set();
    const recommendations = [];
    for (const rel of rels) {
      const recId = rel.sourceId.toString() === entityId.toString() ? rel.targetId : rel.sourceId;
      if (!recommendedIds.has(recId._id.toString())) {
        recommendedIds.add(recId._id.toString());
        recommendations.push({ entity: recId, relationship: rel.type, weight: rel.weight });
      }
    }
    recommendations.sort((a, b) => b.weight - a.weight);
    return { entity, recommendations };
  }

  async discoverRelatedEntities(entityId, types) {
    const rels = await Relationship.find({ $or: [{ sourceId: entityId }, { targetId: entityId }], isActive: true }).populate('sourceId targetId').lean();
    const related = new Map();
    for (const rel of rels) {
      const relatedEntity = rel.sourceId._id.toString() === entityId.toString() ? rel.targetId : rel.sourceId;
      if (types && !types.includes(relatedEntity.entityType)) continue;
      const key = relatedEntity._id.toString();
      if (!related.has(key)) {
        related.set(key, { entity: relatedEntity, relationships: [], totalWeight: 0 });
      }
      related.get(key).relationships.push(rel.type);
      related.get(key).totalWeight += rel.weight || 0.5;
    }
    return Array.from(related.values()).sort((a, b) => b.totalWeight - a.totalWeight);
  }

  async getEntityExplorer(type) {
    const filter = type ? { entityType: type } : {};
    const entities = await EntityNode.find(filter).limit(100).lean();
    const entityIds = entities.map(e => e._id);
    const rels = await Relationship.find({ $or: [{ sourceId: { $in: entityIds } }, { targetId: { $in: entityIds } }], isActive: true }).lean();
    const typeCounts = {};
    for (const e of entities) {
      typeCounts[e.entityType] = (typeCounts[e.entityType] || 0) + 1;
    }
    return { entities, relationships: rels, typeBreakdown: typeCounts, total: entities.length };
  }

  async getRelationshipExplorer(type) {
    const filter = type ? { type } : {};
    const rels = await Relationship.find(filter).populate('sourceId targetId').limit(200).lean();
    const typeCounts = {};
    const typePairs = {};
    for (const r of rels) {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      const pair = `${r.sourceId?.entityType || 'unknown'}->${r.targetId?.entityType || 'unknown'}`;
      typePairs[pair] = (typePairs[pair] || 0) + 1;
    }
    return { relationships: rels, typeBreakdown: typeCounts, pairBreakdown: typePairs, total: rels.length };
  }

  async findPath(sourceId, targetId) {
    if (sourceId.toString() === targetId.toString()) return { path: [sourceId], length: 0 };
    const queue = [[sourceId]];
    const visited = new Set([sourceId.toString()]);
    while (queue.length > 0) {
      const path = queue.shift();
      const lastId = path[path.length - 1];
      const rels = await Relationship.find({ $or: [{ sourceId: lastId }, { targetId: lastId }], isActive: true }).lean();
      for (const rel of rels) {
        const neighborId = rel.sourceId.toString() === lastId.toString() ? rel.targetId : rel.sourceId;
        const neighborStr = neighborId.toString();
        if (!visited.has(neighborStr)) {
          visited.add(neighborStr);
          const newPath = [...path, neighborId];
          if (neighborStr === targetId.toString()) {
            const fullPath = await EntityNode.find({ _id: { $in: newPath } }).lean();
            const nodeMap = {};
            for (const n of fullPath) nodeMap[n._id.toString()] = n;
            return { path: newPath.map(id => nodeMap[id.toString()]), length: newPath.length - 1 };
          }
          queue.push(newPath);
        }
      }
    }
    return { path: [], length: -1, error: 'No path found between entities' };
  }

  async getGraphStats() {
    const [entityCounts, relationshipCounts] = await Promise.all([
      EntityNode.aggregate([{ $group: { _id: '$entityType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Relationship.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, avgWeight: { $avg: '$weight' } } }, { $sort: { count: -1 } }]),
    ]);
    const totalEntities = entityCounts.reduce((s, e) => s + e.count, 0);
    const totalRelationships = relationshipCounts.reduce((s, r) => s + r.count, 0);
    return { totalEntities, totalRelationships, entitiesByType: entityCounts, relationshipsByType: relationshipCounts };
  }

  async syncAllEntities() {
    const results = { users: 0, vendors: 0, products: 0, orders: 0, rfqs: 0, buyingRequests: 0, quotations: 0, reviews: 0, invoices: 0, companies: 0, leads: 0, relationships: 0 };
    const allUsers = await User.find({ isActive: true }).lean();
    for (const u of allUsers) {
      await this.syncEntity('user', u._id, { label: u.name || u.email, properties: { name: u.name, email: u.email, role: u.role }, tags: [u.role] });
      results.users++;
    }
    const allVendors = await Vendor.find({ isActive: true }).lean();
    for (const v of allVendors) {
      await this.syncEntity('vendor', v._id, { label: v.storeName?.en || v.storeName, properties: { name: v.storeName, industry: v.industry, isVerified: v.isVerified }, tags: ['vendor'] });
      if (v.user) {
        const userNode = await EntityNode.findOne({ entityType: 'user', entityId: v.user });
        const vendorNode = await EntityNode.findOne({ entityType: 'vendor', entityId: v._id });
        if (userNode && vendorNode) {
          await this.createRelationship(userNode._id, vendorNode._id, 'owns', 1);
          results.relationships++;
        }
      }
      results.vendors++;
    }
    const allProducts = await Product.find({}).lean();
    for (const p of allProducts) {
      await this.syncEntity('product', p._id, { label: p.name?.en || 'Product', properties: { name: p.name, vendor: p.vendor, category: p.category, priceBreaks: p.priceBreaks }, tags: ['product', p.category?.toString()] });
      if (p.vendor) {
        const vendorNode = await EntityNode.findOne({ entityType: 'vendor', entityId: p.vendor });
        const productNode = await EntityNode.findOne({ entityType: 'product', entityId: p._id });
        if (vendorNode && productNode) {
          await this.createRelationship(vendorNode._id, productNode._id, 'supplies', 1);
          results.relationships++;
        }
      }
      results.products++;
    }
    const allOrders = await EscrowOrder.find({}).lean();
    for (const o of allOrders) {
      await this.syncEntity('order', o._id, { label: `Order ${o.orderNumber}`, properties: { orderNumber: o.orderNumber, totalAmount: o.totalAmount, status: o.status, buyer: o.buyer, vendor: o.vendor }, tags: ['order', o.status] });
      if (o.buyer) {
        const buyerNode = await EntityNode.findOne({ entityType: 'user', entityId: o.buyer });
        const orderNode = await EntityNode.findOne({ entityType: 'order', entityId: o._id });
        if (buyerNode && orderNode) {
          await this.createRelationship(buyerNode._id, orderNode._id, 'placed', 1);
          results.relationships++;
        }
      }
      if (o.vendor) {
        const vendorNode = await EntityNode.findOne({ entityType: 'vendor', entityId: o.vendor });
        const orderNode = await EntityNode.findOne({ entityType: 'order', entityId: o._id });
        if (vendorNode && orderNode) {
          await this.createRelationship(vendorNode._id, orderNode._id, 'fulfills', 1);
          results.relationships++;
        }
      }
      results.orders++;
    }
    const allRfqs = await Announcement.find({ isActive: true }).lean();
    for (const r of allRfqs) {
      await this.syncEntity('rfq', r._id, { label: r.title?.en || 'RFQ', properties: { title: r.title, buyer: r.buyer, status: r.status, category: r.category }, tags: ['rfq', r.status] });
      if (r.buyer) {
        const buyerNode = await EntityNode.findOne({ entityType: 'user', entityId: r.buyer });
        const rfqNode = await EntityNode.findOne({ entityType: 'rfq', entityId: r._id });
        if (buyerNode && rfqNode) {
          await this.createRelationship(buyerNode._id, rfqNode._id, 'posted', 1);
          results.relationships++;
        }
      }
      results.rfqs++;
    }
    const allBuyingRequests = await BuyingRequest.find({}).lean();
    for (const br of allBuyingRequests) {
      await this.syncEntity('buying_request', br._id, { label: br.title?.en || 'Buying Request', properties: { title: br.title, buyer: br.buyer, status: br.status, budget: br.budget }, tags: ['buying_request', br.status] });
      results.buyingRequests++;
    }
    const allQuotations = await Quotation.find({}).lean();
    for (const q of allQuotations) {
      await this.syncEntity('quotation', q._id, { label: `Quote ${q.quoteNumber}`, properties: { quoteNumber: q.quoteNumber, buyer: q.buyer, vendor: q.vendor, totalAmount: q.totalAmount, status: q.status }, tags: ['quotation', q.status] });
      results.quotations++;
    }
    const allReviews = await Review.find({}).lean();
    for (const rv of allReviews) {
      await this.syncEntity('review', rv._id, { label: `Review by ${rv.user}`, properties: { user: rv.user, product: rv.product, rating: rv.rating, moderationStatus: rv.moderationStatus }, tags: ['review', `rating_${rv.rating}`] });
      if (rv.product) {
        const productNode = await EntityNode.findOne({ entityType: 'product', entityId: rv.product });
        const reviewNode = await EntityNode.findOne({ entityType: 'review', entityId: rv._id });
        if (productNode && reviewNode) {
          await this.createRelationship(productNode._id, reviewNode._id, 'has_review', rv.rating / 5);
          results.relationships++;
        }
      }
      results.reviews++;
    }
    const allInvoices = await Invoice.find({ isActive: true }).lean();
    for (const inv of allInvoices) {
      await this.syncEntity('invoice', inv._id, { label: `Invoice ${inv.number}`, properties: { number: inv.number, amount: inv.amount, status: inv.status, vendor: inv.vendor }, tags: ['invoice', inv.status] });
      results.invoices++;
    }
    const allCompanies = await Company.find({ isActive: true }).lean();
    for (const c of allCompanies) {
      await this.syncEntity('company', c._id, { label: c.name, properties: { name: c.name, type: c.type, status: c.status, country: c.country, industry: c.industry }, tags: ['company', c.type, c.status] });
      results.companies++;
    }
    const allLeads = await Lead.find({ isActive: true }).lean();
    for (const l of allLeads) {
      await this.syncEntity('lead', l._id, { label: l.company, properties: { company: l.company, vendor: l.vendor, stage: l.stage, score: l.score, estimatedValue: l.estimatedValue }, tags: ['lead', l.stage] });
      if (l.vendor) {
        const vendorNode = await EntityNode.findOne({ entityType: 'vendor', entityId: l.vendor });
        const leadNode = await EntityNode.findOne({ entityType: 'lead', entityId: l._id });
        if (vendorNode && leadNode) {
          await this.createRelationship(vendorNode._id, leadNode._id, 'has_lead', l.score / 100);
          results.relationships++;
        }
      }
      results.leads++;
    }

    await logAuditEvent({
      userId: null, action: 'sync_knowledge_graph', category: 'system', entityType: 'KnowledgeGraph',
      description: `Synced ${totalEntities(results)} entities and ${results.relationships} relationships`,
    });
    return results;
  }
}

function totalEntities(r) {
  return r.users + r.vendors + r.products + r.orders + r.rfqs + r.buyingRequests + r.quotations + r.reviews + r.invoices + r.companies + r.leads;
}

export const knowledgeGraphService = new KnowledgeGraphService();
