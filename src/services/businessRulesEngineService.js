import mongoose from 'mongoose';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import User from '../models/userModel.js';
import { Order } from '../models/orderModel.js';
import EscrowOrder from '../models/Order.js';
import { Announcement } from '../models/announcementModel.js';
import Review from '../models/reviewModel.js';
import { ComplianceVerification } from '../models/ComplianceVerification.js';
import { ComplianceRule } from '../models/ComplianceRule.js';
import { ModerationQueue } from '../models/ModerationQueue.js';
import { MarketplaceRevenue } from '../models/MarketplaceRevenue.js';
import { Invoice } from '../models/Invoice.js';
import { logAuditEvent } from './auditService.js';

const ruleVersionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  conditions: { type: mongoose.Schema.Types.Mixed, required: true },
  actions: { type: mongoose.Schema.Types.Mixed, required: true },
  priority: { type: Number, default: 50 },
  metadata: { type: mongoose.Schema.Types.Mixed },
  version: { type: Number, required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changeLog: { type: String },
}, { timestamps: true });

const ruleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String },
  type: {
    type: String, required: true,
    enum: ['pricing', 'commission', 'compliance', 'moderation', 'discount', 'shipping', 'approval', 'validation', 'notification', 'custom'],
  },
  status: { type: String, enum: ['draft', 'active', 'inactive', 'archived', 'pending_approval'], default: 'draft' },
  conditions: { type: mongoose.Schema.Types.Mixed, required: true },
  actions: { type: mongoose.Schema.Types.Mixed, required: true },
  priority: { type: Number, default: 50, min: 1, max: 100 },
  version: { type: Number, default: 1 },
  versions: [ruleVersionSchema],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: { type: mongoose.Schema.Types.Mixed },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ruleSchema.index({ type: 1, status: 1 });
ruleSchema.index({ status: 1, priority: -1 });
ruleSchema.index({ isActive: 1, type: 1 });

const Rule = mongoose.models.BusinessRule || mongoose.model('BusinessRule', ruleSchema);

class BusinessRulesEngineService {
  async getRules(type, status) {
    const filter = { isActive: true };
    if (type) filter.type = type;
    if (status) filter.status = status;
    return Rule.find(filter).sort({ priority: -1, updatedAt: -1 }).lean();
  }

  async getRule(id) {
    const rule = await Rule.findById(id).lean();
    if (!rule) throw new Error('Rule not found');
    return rule;
  }

  async createRule(data, userId) {
    const versionData = { ...data, version: 1, updatedBy: userId, changeLog: 'Initial version' };
    const rule = await Rule.create({
      ...data,
      version: 1,
      versions: [versionData],
      createdBy: userId,
      updatedBy: userId,
    });
    await logAuditEvent({
      userId, action: 'create_rule', category: 'system', entityType: 'BusinessRule', entityId: rule._id,
      newValue: { name: data.name, type: data.type }, description: `Created business rule: ${data.name}`,
    });
    return rule;
  }

  async updateRule(id, data, userId) {
    const rule = await Rule.findById(id);
    if (!rule) throw new Error('Rule not found');
    const oldVersion = { ...rule.toObject() };
    const newVersion = rule.version + 1;
    const versionSnapshot = {
      name: rule.name, description: rule.description, type: rule.type, conditions: rule.conditions,
      actions: rule.actions, priority: rule.priority, metadata: rule.metadata,
      version: rule.version, updatedBy: userId, changeLog: `Updated to version ${newVersion}`,
    };
    rule.versions.push(versionSnapshot);
    Object.assign(rule, data, { version: newVersion, updatedBy: userId });
    await rule.save();
    await logAuditEvent({
      userId, action: 'update_rule', category: 'system', entityType: 'BusinessRule', entityId: rule._id,
      oldValue: { name: oldVersion.name, version: oldVersion.version },
      newValue: { name: rule.name, version: rule.version }, description: `Updated rule to v${rule.version}: ${rule.name}`,
    });
    return rule;
  }

  async deleteRule(id) {
    const rule = await Rule.findByIdAndUpdate(id, { isActive: false, status: 'archived' }, { new: true });
    if (!rule) throw new Error('Rule not found');
    return { success: true, rule };
  }

  async activateRule(id) {
    const rule = await Rule.findByIdAndUpdate(id, { status: 'active' }, { new: true });
    if (!rule) throw new Error('Rule not found');
    return rule;
  }

  async deactivateRule(id) {
    const rule = await Rule.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
    if (!rule) throw new Error('Rule not found');
    return rule;
  }

  async testRule(id, testData) {
    const rule = await Rule.findById(id);
    if (!rule) throw new Error('Rule not found');
    const result = this._evaluateConditions(rule.conditions, testData);
    const actions = result.passed ? this._simulateActions(rule.actions, testData) : [];
    return { ruleId: id, ruleName: rule.name, testData, conditionsMet: result.passed, failedConditions: result.failedConditions, triggeredActions: actions };
  }

  async simulateRule(id, simulationParams) {
    const rule = await Rule.findById(id);
    if (!rule) throw new Error('Rule not found');
    const { entityType, entityIds, iterations = 1 } = simulationParams;
    const simulationResults = [];

    for (let i = 0; i < iterations; i++) {
      const sampleData = await this._generateSampleData(entityType, entityIds);
      const evaluation = this._evaluateConditions(rule.conditions, sampleData);
      simulationResults.push({
        iteration: i + 1,
        sampleData,
        conditionsMet: evaluation.passed,
        failedConditions: evaluation.failedConditions,
        triggeredActions: evaluation.passed ? this._simulateActions(rule.actions, sampleData) : [],
      });
    }
    const passRate = simulationResults.filter(r => r.conditionsMet).length / simulationResults.length;
    return {
      ruleId: id, ruleName: rule.name, type: rule.type, iterations, passRate: Math.round(passRate * 100),
      results: simulationResults,
      summary: `Rule "${rule.name}" passed ${Math.round(passRate * 100)}% of ${iterations} simulations`,
    };
  }

  async approveRule(id, userId) {
    const rule = await Rule.findByIdAndUpdate(id, { status: 'active', approvedBy: userId, approvedAt: new Date() }, { new: true });
    if (!rule) throw new Error('Rule not found');
    await logAuditEvent({
      userId, action: 'approve_rule', category: 'system', entityType: 'BusinessRule', entityId: rule._id,
      description: `Approved rule: ${rule.name} (v${rule.version})`,
    });
    return rule;
  }

  async getRuleVersions(id) {
    const rule = await Rule.findById(id).select('versions name version').lean();
    if (!rule) throw new Error('Rule not found');
    return { ruleId: id, ruleName: rule.name, currentVersion: rule.version, versions: rule.versions || [] };
  }

  async rollbackRule(id, version) {
    const rule = await Rule.findById(id);
    if (!rule) throw new Error('Rule not found');
    const targetVersion = rule.versions.find(v => v.version === version);
    if (!targetVersion) throw new Error(`Version ${version} not found`);
    const rollbackSnapshot = {
      name: rule.name, description: rule.description, type: rule.type,
      conditions: rule.conditions, actions: rule.actions, priority: rule.priority,
      metadata: rule.metadata, version: rule.version, updatedBy: rule.updatedBy,
      changeLog: `Rollback from v${rule.version} to v${version}`,
    };
    rule.versions.push(rollbackSnapshot);
    Object.assign(rule, {
      name: targetVersion.name, description: targetVersion.description, conditions: targetVersion.conditions,
      actions: targetVersion.actions, priority: targetVersion.priority, metadata: targetVersion.metadata,
      version: rule.version + 1, updatedBy: targetVersion.updatedBy,
    });
    await rule.save();
    return rule;
  }

  async evaluateRule(ruleId, context) {
    const rule = await Rule.findById(ruleId);
    if (!rule) throw new Error('Rule not found');
    if (rule.status !== 'active') return { ruleId, ruleName: rule.name, passed: false, reason: 'Rule is not active', triggeredActions: [] };
    const evaluation = this._evaluateConditions(rule.conditions, context);
    const actions = evaluation.passed ? this._executeActions(rule.actions, context) : [];
    return {
      ruleId: rule._id, ruleName: rule.name, type: rule.type, version: rule.version,
      passed: evaluation.passed, failedConditions: evaluation.failedConditions,
      triggeredActions: actions, evaluatedAt: new Date().toISOString(),
    };
  }

  async evaluateAllRules(type, context) {
    const filter = { isActive: true, status: 'active' };
    if (type) filter.type = type;
    const rules = await Rule.find(filter).sort({ priority: -1 }).lean();
    const results = [];
    for (const rule of rules) {
      const evaluation = this._evaluateConditions(rule.conditions, context);
      if (evaluation.passed) {
        const actions = this._executeActions(rule.actions, context);
        results.push({ ruleId: rule._id, ruleName: rule.name, type: rule.type, priority: rule.priority, actions });
      }
    }
    return { evaluatedRules: rules.length, triggeredRules: results.length, results };
  }

  async validateRule(ruleData) {
    const errors = [];
    if (!ruleData.name || ruleData.name.trim().length === 0) errors.push('Rule name is required');
    if (!ruleData.type) errors.push('Rule type is required');
    if (!ruleData.conditions || Object.keys(ruleData.conditions).length === 0) errors.push('At least one condition is required');
    if (!ruleData.actions || Object.keys(ruleData.actions).length === 0) errors.push('At least one action is required');
    if (ruleData.priority !== undefined && (ruleData.priority < 1 || ruleData.priority > 100)) errors.push('Priority must be between 1 and 100');
    if (ruleData.conditions) {
      try {
        this._validateConditions(ruleData.conditions);
      } catch (err) {
        errors.push(`Invalid conditions: ${err.message}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async getDependencies(id) {
    const rule = await Rule.findById(id).lean();
    if (!rule) throw new Error('Rule not found');
    const sameType = await Rule.find({ type: rule.type, isActive: true, _id: { $ne: id } }).select('name type priority status').lean();
    const higherPriority = sameType.filter(r => r.priority > rule.priority);
    const lowerPriority = sameType.filter(r => r.priority < rule.priority);
    return { rule: { _id: rule._id, name: rule.name, type: rule.type, priority: rule.priority }, higherPriority, lowerPriority, sameType };
  }

  async getImpactAnalysis(id) {
    const rule = await Rule.findById(id).lean();
    if (!rule) throw new Error('Rule not found');
    const impactMap = {
      pricing: ['Product pricing', 'Order totals', 'Discount calculations'],
      commission: ['MarketplaceRevenue', 'Vendor payouts', 'Invoice amounts'],
      compliance: ['ComplianceVerification status', 'Vendor badges', 'Document requirements'],
      moderation: ['ModerationQueue decisions', 'Content flags', 'Review approvals'],
      discount: ['Order discounts', 'Cart totals', 'Promotion eligibility'],
      shipping: ['Shipping costs', 'Delivery estimates', 'Carrier selection'],
      approval: ['Procurement workflows', 'Approval matrices', 'Escalation paths'],
      validation: ['Data validation rules', 'Input constraints', 'Schema enforcement'],
      notification: ['Alert triggers', 'Notification delivery', 'Escalation alerts'],
      custom: ['Custom workflows', 'Integration triggers', 'External actions'],
    };
    const affected = impactMap[rule.type] || ['General system processes'];
    return {
      ruleId: rule._id, ruleName: rule.name, type: rule.type, status: rule.status, version: rule.version,
      affectedAreas: affected, riskLevel: rule.priority > 75 ? 'high' : rule.priority > 50 ? 'medium' : 'low',
    };
  }

  _evaluateConditions(conditions, context) {
    const failedConditions = [];
    let passed = true;
    const operator = conditions.operator || 'AND';
    const rules = conditions.rules || [conditions];

    for (const rule of rules) {
      const result = this._evaluateSingleCondition(rule, context);
      if (!result.passed) {
        failedConditions.push({ field: rule.field, operator: rule.operator, expected: rule.value, actual: result.actual });
        if (operator === 'AND') { passed = false; if (operator === 'AND') break; }
      } else if (operator === 'OR') {
        passed = true;
        break;
      }
    }
    return { passed, failedConditions };
  }

  _evaluateSingleCondition(condition, context) {
    const { field, operator, value } = condition;
    const actualValue = getNestedValue(context, field);

    switch (operator) {
      case 'eq': return { passed: actualValue === value, actual: actualValue };
      case 'ne': return { passed: actualValue !== value, actual: actualValue };
      case 'gt': return { passed: parseFloat(actualValue) > parseFloat(value), actual: actualValue };
      case 'gte': return { passed: parseFloat(actualValue) >= parseFloat(value), actual: actualValue };
      case 'lt': return { passed: parseFloat(actualValue) < parseFloat(value), actual: actualValue };
      case 'lte': return { passed: parseFloat(actualValue) <= parseFloat(value), actual: actualValue };
      case 'in': return { passed: Array.isArray(value) && value.includes(actualValue), actual: actualValue };
      case 'contains': return { passed: String(actualValue || '').toLowerCase().includes(String(value).toLowerCase()), actual: actualValue };
      case 'between': return { passed: parseFloat(actualValue) >= parseFloat(value[0]) && parseFloat(actualValue) <= parseFloat(value[1]), actual: actualValue };
      case 'regex': return { passed: new RegExp(value, 'i').test(String(actualValue || '')), actual: actualValue };
      case 'exists': return { passed: actualValue !== undefined && actualValue !== null, actual: actualValue };
      default: return { passed: true, actual: actualValue };
    }
  }

  _simulateActions(actions, context) {
    const results = [];
    const actionArray = Array.isArray(actions) ? actions : [actions];
    for (const action of actionArray) {
      results.push({ type: action.type || 'unknown', params: action.params || {}, simulated: true, wouldExecute: true });
    }
    return results;
  }

  _executeActions(actions, context) {
    const results = [];
    const actionArray = Array.isArray(actions) ? actions : [actions];
    for (const action of actionArray) {
      results.push({ type: action.type || 'unknown', params: action.params || {}, executed: true, executedAt: new Date().toISOString() });
    }
    return results;
  }

  _validateConditions(conditions) {
    const rules = conditions.rules || [conditions];
    const validOperators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'between', 'regex', 'exists'];
    for (const rule of rules) {
      if (!rule.field) throw new Error('Each condition must have a field');
      if (!rule.operator) throw new Error('Each condition must have an operator');
      if (!validOperators.includes(rule.operator)) throw new Error(`Invalid operator: ${rule.operator}. Must be one of: ${validOperators.join(', ')}`);
      if (rule.value === undefined && rule.operator !== 'exists') throw new Error('Each condition must have a value (except exists operator)');
    }
  }

  async _generateSampleData(entityType, entityIds) {
    if (entityIds && entityIds.length > 0) {
      const id = entityIds[0];
      switch (entityType) {
        case 'order': return EscrowOrder.findById(id).lean() || {};
        case 'product': return Product.findById(id).lean() || {};
        case 'vendor': return Vendor.findById(id).lean() || {};
        case 'user': return User.findById(id).lean() || {};
        case 'review': return Review.findById(id).lean() || {};
        default: return { _id: id, entityType };
      }
    }
    switch (entityType) {
      case 'order': return EscrowOrder.findOne().lean() || { totalAmount: 1000, status: 'pending', currency: 'USD' };
      case 'product': return Product.findOne().lean() || { moq: 10, ratingAverage: 4, priceBreaks: [{ price: 50 }] };
      case 'vendor': return Vendor.findOne().lean() || { isVerified: true, isActive: true };
      case 'user': return User.findOne().lean() || { role: 'buyer', isActive: true };
      case 'review': return Review.findOne().lean() || { rating: 4, moderationStatus: 'approved' };
      default: return { entityType: 'unknown', value: 100, status: 'active' };
    }
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export const businessRulesEngineService = new BusinessRulesEngineService();
