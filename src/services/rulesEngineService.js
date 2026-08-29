import mongoose from 'mongoose';
import { RuleDefinition } from '../models/RuleDefinition.js';
import { RuleSet } from '../models/RuleSet.js';
import { RuleExecutionLog } from '../models/RuleExecutionLog.js';
import { logAuditEvent } from './auditService.js';

class RulesEngineService {
  async getRules(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.search) query.name = { $regex: filters.search, $options: 'i' };

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 25));

    const [rules, total] = await Promise.all([
      RuleDefinition.find(query).sort({ priority: -1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      RuleDefinition.countDocuments(query),
    ]);
    return { rules, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getRule(id) {
    const rule = await RuleDefinition.findById(id).lean();
    if (!rule) throw new Error('Rule not found');
    return rule;
  }

  async createRule(userId, data) {
    const rule = await RuleDefinition.create({
      ...data,
      status: 'draft',
      version: 1,
      createdBy: userId,
    });

    await logAuditEvent({
      userId, action: 'rules.rule_create', category: 'rules_engine',
      entityType: 'RuleDefinition', entityId: rule._id,
      newValue: { name: rule.name, category: rule.category },
      description: `Rule created: ${rule.name}`,
    });
    return rule;
  }

  async updateRule(userId, id, data) {
    const rule = await RuleDefinition.findById(id);
    if (!rule) throw new Error('Rule not found');

    const oldVersion = rule.version;
    Object.assign(rule, data, { version: oldVersion + 1 });
    await rule.save();

    await logAuditEvent({
      userId, action: 'rules.rule_update', category: 'rules_engine',
      entityType: 'RuleDefinition', entityId: id,
      oldValue: { version: oldVersion, status: rule.status },
      newValue: { version: rule.version, name: rule.name },
      description: `Rule updated to v${rule.version}: ${rule.name}`,
    });
    return rule;
  }

  async deleteRule(userId, id) {
    const rule = await RuleDefinition.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
    if (!rule) throw new Error('Rule not found');

    await logAuditEvent({
      userId, action: 'rules.rule_archive', category: 'rules_engine',
      entityType: 'RuleDefinition', entityId: id,
      description: `Rule archived: ${rule.name}`,
    });
    return { success: true, message: 'Rule archived' };
  }

  async activateRule(userId, id) {
    const rule = await RuleDefinition.findByIdAndUpdate(id, { status: 'active' }, { new: true });
    if (!rule) throw new Error('Rule not found');

    await logAuditEvent({
      userId, action: 'rules.rule_activate', category: 'rules_engine',
      entityType: 'RuleDefinition', entityId: id,
      description: `Rule activated: ${rule.name}`,
    });
    return rule;
  }

  async deactivateRule(userId, id) {
    const rule = await RuleDefinition.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
    if (!rule) throw new Error('Rule not found');

    await logAuditEvent({
      userId, action: 'rules.rule_deactivate', category: 'rules_engine',
      entityType: 'RuleDefinition', entityId: id,
      description: `Rule deactivated: ${rule.name}`,
    });
    return rule;
  }

  async testRule(id, context = {}) {
    const rule = await RuleDefinition.findById(id);
    if (!rule) throw new Error('Rule not found');

    const result = this._evaluateConditions(rule.conditions, context);
    const actions = result.matched ? this._prepareActions(rule.actions, context) : [];

    return {
      ruleId: rule._id,
      ruleName: rule.name,
      category: rule.category,
      version: rule.version,
      context,
      matched: result.matched,
      matchDetails: result.details,
      triggeredActions: actions,
      evaluatedAt: new Date(),
    };
  }

  async simulateRule(id, context) {
    const rule = await RuleDefinition.findById(id);
    if (!rule) throw new Error('Rule not found');

    const evaluation = this._evaluateConditions(rule.conditions, context);
    const actions = evaluation.matched ? this._prepareActions(rule.actions, context) : [];

    const variables = {};
    for (const v of rule.variables || []) {
      variables[v.name] = this._resolveExpression(v.expression, context) ?? v.default;
    }

    return {
      ruleId: rule._id,
      ruleName: rule.name,
      category: rule.category,
      inputContext: context,
      resolvedVariables: variables,
      conditionsMatched: evaluation.matched,
      conditionResults: evaluation.details,
      resultingActions: actions,
      sideEffects: actions.map(a => ({
        type: a.type,
        simulated: true,
        description: `Would execute ${a.type} with ${JSON.stringify(a.params)}`,
      })),
    };
  }

  async evaluateRule(id, context) {
    const rule = await RuleDefinition.findById(id);
    if (!rule) throw new Error('Rule not found');
    if (rule.status !== 'active') {
      return { matched: false, reason: 'Rule is not active', ruleId: id, ruleName: rule.name };
    }

    const startTime = Date.now();
    const result = this._evaluateConditions(rule.conditions, context);
    const actions = result.matched ? this._prepareActions(rule.actions, context) : [];
    const duration = Date.now() - startTime;

    let logStatus = 'success';
    let error = undefined;
    try {
      if (result.matched) {
        for (const action of actions) {
          await this._executeAction(action, context);
        }
      }
    } catch (err) {
      logStatus = 'error';
      error = err.message;
    }

    await RuleExecutionLog.create({
      rule: id,
      triggerEntity: context.entityType,
      triggerId: context.entityId,
      context,
      conditionsMatched: result.matched,
      actionsExecuted: actions,
      result,
      executionTime: duration,
      status: logStatus,
      error,
      executedAt: new Date(),
    });

    return {
      ruleId: rule._id,
      ruleName: rule.name,
      category: rule.category,
      version: rule.version,
      matched: result.matched,
      matchDetails: result.details,
      actionsExecuted: actions,
      executionTimeMs: duration,
      status: logStatus,
    };
  }

  async evaluateRules(category, context) {
    const rules = await RuleDefinition.find({ category, status: 'active' }).sort({ priority: -1 }).lean();
    if (!rules.length) return { evaluated: 0, matched: 0, results: [] };

    const results = [];
    for (const rule of rules) {
      const startTime = Date.now();
      const result = this._evaluateConditions(rule.conditions, context);
      const duration = Date.now() - startTime;

      if (result.matched) {
        const actions = this._prepareActions(rule.actions, context);
        results.push({
          ruleId: rule._id, ruleName: rule.name, priority: rule.priority,
          actions, executionTimeMs: duration,
        });
      }

      await RuleExecutionLog.create({
        rule: rule._id,
        triggerEntity: context.entityType,
        triggerId: context.entityId,
        context,
        conditionsMatched: result.matched,
        actionsExecuted: result.matched ? this._prepareActions(rule.actions, context) : [],
        executionTime: duration,
        status: 'success',
        executedAt: new Date(),
      });
    }

    return { evaluated: rules.length, matched: results.length, results };
  }

  async getRuleVersions(id) {
    const rule = await RuleDefinition.findById(id).select('name version createdAt updatedAt').lean();
    if (!rule) throw new Error('Rule not found');

    const versions = [];
    for (let v = 1; v <= rule.version; v++) {
      versions.push({ version: v, createdAt: rule.createdAt, updatedAt: rule.updatedAt });
    }

    return { ruleId: id, ruleName: rule.name, currentVersion: rule.version, versions };
  }

  async createRuleSet(userId, data) {
    const existing = await RuleSet.findOne({ name: data.name });
    if (existing) throw new Error(`Rule set "${data.name}" already exists`);

    const ruleSet = await RuleSet.create({ ...data, status: 'draft' });

    await logAuditEvent({
      userId, action: 'rules.ruleset_create', category: 'rules_engine',
      entityType: 'RuleSet', entityId: ruleSet._id,
      newValue: { name: ruleSet.name, evaluationStrategy: ruleSet.evaluationStrategy },
      description: `Rule set created: ${ruleSet.name}`,
    });
    return ruleSet;
  }

  async getRuleSets() {
    return RuleSet.find().sort({ updatedAt: -1 }).lean();
  }

  async getRuleSet(id) {
    const ruleSet = await RuleSet.findById(id).populate('rules.rule').lean();
    if (!ruleSet) throw new Error('Rule set not found');

    const resolved = (ruleSet.rules || [])
      .filter(r => r.rule)
      .sort((a, b) => a.order - b.order)
      .map(r => ({
        order: r.order,
        enabled: r.enabled,
        rule: r.rule,
      }));

    return { ...ruleSet, resolvedRules: resolved };
  }

  async updateRuleSet(userId, id, data) {
    const ruleSet = await RuleSet.findByIdAndUpdate(id, data, { new: true });
    if (!ruleSet) throw new Error('Rule set not found');

    await logAuditEvent({
      userId, action: 'rules.ruleset_update', category: 'rules_engine',
      entityType: 'RuleSet', entityId: id,
      description: `Rule set updated: ${ruleSet.name}`,
    });
    return ruleSet;
  }

  async deleteRuleSet(userId, id) {
    const ruleSet = await RuleSet.findByIdAndDelete(id);
    if (!ruleSet) throw new Error('Rule set not found');

    await logAuditEvent({
      userId, action: 'rules.ruleset_delete', category: 'rules_engine',
      entityType: 'RuleSet', entityId: id,
      description: `Rule set deleted: ${ruleSet.name}`,
    });
    return { success: true, message: 'Rule set deleted' };
  }

  async evaluateRuleSet(id, context) {
    const ruleSet = await RuleSet.findById(id).populate('rules.rule');
    if (!ruleSet) throw new Error('Rule set not found');
    if (ruleSet.status !== 'active') throw new Error('Rule set is not active');

    const startTime = Date.now();
    const enabledRules = (ruleSet.rules || [])
      .filter(r => r.enabled && r.rule && r.rule.status === 'active')
      .sort((a, b) => a.order - b.order);

    const results = [];
    let matched = false;

    for (const entry of enabledRules) {
      const ruleStart = Date.now();
      const evaluation = this._evaluateConditions(entry.rule.conditions, context);
      const ruleDuration = Date.now() - ruleStart;

      const actions = evaluation.matched ? this._prepareActions(entry.rule.actions, context) : [];
      const result = {
        ruleId: entry.rule._id,
        ruleName: entry.rule.name,
        order: entry.order,
        matched: evaluation.matched,
        matchDetails: evaluation.details,
        actions,
        executionTimeMs: ruleDuration,
      };
      results.push(result);

      await RuleExecutionLog.create({
        rule: entry.rule._id,
        ruleSet: id,
        triggerEntity: context.entityType,
        triggerId: context.entityId,
        context,
        conditionsMatched: evaluation.matched,
        actionsExecuted: actions,
        executionTime: ruleDuration,
        status: 'success',
        executedAt: new Date(),
      });

      if (evaluation.matched) {
        matched = true;
        if (ruleSet.evaluationStrategy === 'first_match') break;
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      ruleSetId: id,
      ruleSetName: ruleSet.name,
      evaluationStrategy: ruleSet.evaluationStrategy,
      rulesEvaluated: enabledRules.length,
      rulesMatched: results.filter(r => r.matched).length,
      matched,
      results,
      totalExecutionTimeMs: totalDuration,
      evaluatedAt: new Date(),
    };
  }

  async getExecutionLogs(ruleId, filters = {}) {
    const match = {};
    if (ruleId) match.rule = new mongoose.Types.ObjectId(ruleId);
    if (filters.status) match.status = filters.status;
    if (filters.startDate) match.executedAt = { $gte: new Date(filters.startDate) };
    if (filters.endDate) match.executedAt = { ...match.executedAt, $lte: new Date(filters.endDate) };
    if (filters.triggerEntity) match.triggerEntity = filters.triggerEntity;
    if (filters.triggerId) match.triggerId = filters.triggerId;

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 25));

    const [logs, total] = await Promise.all([
      RuleExecutionLog.find(match)
        .sort({ executedAt: -1 })
        .skip((page - 1) * limit).limit(limit)
        .populate('rule', 'name category')
        .populate('ruleSet', 'name')
        .lean(),
      RuleExecutionLog.countDocuments(match),
    ]);

    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getRulesAnalytics() {
    const [totalRules, statusBreakdown, totalExecutions, executionStats, categoryBreakdown] = await Promise.all([
      RuleDefinition.countDocuments(),
      RuleDefinition.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      RuleExecutionLog.countDocuments(),
      RuleExecutionLog.aggregate([
        { $group: {
          _id: null,
          total: { $sum: 1 },
          matched: { $sum: { $cond: [{ $eq: ['$conditionsMatched', true] }, 1, 0] } },
          errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          avgExecutionTime: { $avg: '$executionTime' },
        } },
      ]),
      RuleDefinition.aggregate([
        { $group: { _id: '$category', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
      ]),
    ]);

    const es = executionStats[0] || { total: 0, matched: 0, errors: 0, avgExecutionTime: 0 };
    const active = statusBreakdown.find(s => s._id === 'active')?.count || 0;

    return {
      totalRules,
      activeRules: active,
      byStatus: statusBreakdown.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      totalExecutions: es.total,
      matchedExecutions: es.matched,
      failedExecutions: es.errors,
      passRate: es.total > 0 ? Math.round(((es.total - es.errors) / es.total) * 100) : 100,
      avgExecutionTimeMs: Math.round(es.avgExecutionTime),
      byCategory: categoryBreakdown.reduce((acc, c) => ({ ...acc, [c._id]: { total: c.total, active: c.active } }), {}),
    };
  }

  _evaluateConditions(conditions, context) {
    if (!conditions || conditions.length === 0) return { matched: true, details: [] };

    const details = conditions.map(condition => {
      const actualValue = this._getNestedValue(context, condition.field);
      const matched = this._evaluateSingleCondition(condition, actualValue);
      return {
        field: condition.field,
        operator: condition.operator,
        expected: condition.value,
        actual: actualValue,
        matched,
      };
    });

    const logic = conditions[0]?.logic || 'and';
    const matched = logic === 'and'
      ? details.every(d => d.matched)
      : details.some(d => d.matched);

    return { matched, details };
  }

  _evaluateSingleCondition(condition, actualValue) {
    const { operator, value } = condition;
    if (actualValue === undefined || actualValue === null) return false;

    switch (operator) {
      case 'equals': case 'eq': return actualValue === value;
      case 'not_equals': case 'ne': return actualValue !== value;
      case 'greater_than': case 'gt': return Number(actualValue) > Number(value);
      case 'greater_than_equal': case 'gte': return Number(actualValue) >= Number(value);
      case 'less_than': case 'lt': return Number(actualValue) < Number(value);
      case 'less_than_equal': case 'lte': return Number(actualValue) <= Number(value);
      case 'contains': return String(actualValue).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains': return !String(actualValue).toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with': return String(actualValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'ends_with': return String(actualValue).toLowerCase().endsWith(String(value).toLowerCase());
      case 'in': return Array.isArray(value) && value.includes(actualValue);
      case 'not_in': return Array.isArray(value) && !value.includes(actualValue);
      case 'between': return Array.isArray(value) && Number(actualValue) >= Number(value[0]) && Number(actualValue) <= Number(value[1]);
      case 'regex': return new RegExp(value, 'i').test(String(actualValue));
      case 'exists': return actualValue !== undefined && actualValue !== null;
      case 'empty': return !actualValue || (Array.isArray(actualValue) && actualValue.length === 0) || (typeof actualValue === 'object' && Object.keys(actualValue).length === 0);
      case 'not_empty': return !!actualValue && (!Array.isArray(actualValue) || actualValue.length > 0);
      default: return true;
    }
  }

  _prepareActions(actions, context) {
    if (!actions) return [];
    return actions.map(action => ({
      type: action.type,
      params: this._resolveParams(action.params || {}, context),
      order: action.order || 0,
    })).sort((a, b) => a.order - b.order);
  }

  _resolveParams(params, context) {
    if (!params || typeof params !== 'object') return params;
    const resolved = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        resolved[key] = this._getNestedValue(context, path) ?? value;
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  _resolveExpression(expression, context) {
    if (!expression) return undefined;
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
      return this._getNestedValue(context, expression.slice(2, -2).trim());
    }
    return expression;
  }

  async _executeAction(action, context) {
    switch (action.type) {
      case 'set_field':
        return { executed: true, type: 'set_field', field: action.params.field, value: action.params.value };
      case 'send_notification':
        return { executed: true, type: 'send_notification', recipient: action.params.recipient };
      case 'trigger_workflow':
        return { executed: true, type: 'trigger_workflow', workflowId: action.params.workflowId };
      case 'block':
        return { executed: true, type: 'block', reason: action.params.reason };
      case 'flag':
        return { executed: true, type: 'flag', severity: action.params.severity || 'medium' };
      case 'log':
        return { executed: true, type: 'log', message: action.params.message };
      case 'custom':
        return { executed: true, type: 'custom', handler: action.params.handler, payload: action.params.payload };
      default:
        return { executed: true, type: action.type || 'unknown', params: action.params };
    }
  }

  _getNestedValue(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => {
      if (acc === undefined || acc === null) return undefined;
      if (Array.isArray(acc)) {
        const idx = parseInt(part);
        return isNaN(idx) ? undefined : acc[idx];
      }
      return acc[part];
    }, obj);
  }
}

export const rulesEngineService = new RulesEngineService();
