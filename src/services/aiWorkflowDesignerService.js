import { WorkflowDefinition } from '../models/WorkflowDefinition.js';
import { WorkflowExecution } from '../models/WorkflowExecution.js';
import User from '../models/userModel.js';
import AgentTask from '../models/AgentTask.js';
import { logAuditEvent } from './auditService.js';

class AiWorkflowDesignerService {
  constructor() {
    this.templates = this._initTemplates();
  }

  _initTemplates() {
    return {
      order_approval: {
        name: 'Order Approval Flow',
        category: 'approval',
        nodes: [
          { id: 'start', type: 'trigger', config: { event: 'order.created' } },
          { id: 'check_amount', type: 'condition', config: { field: 'totalAmount', operator: 'gt', value: 10000 } },
          { id: 'manager_approval', type: 'human_approval', config: { role: 'manager' } },
          { id: 'director_approval', type: 'human_approval', config: { role: 'director' } },
          { id: 'notify', type: 'notification', config: { template: 'order_approved' } },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'check_amount' },
          { from: 'check_amount', to: 'manager_approval', label: '> $10K' },
          { from: 'check_amount', to: 'notify', label: '<= $10K' },
          { from: 'manager_approval', to: 'director_approval', label: '> $50K' },
          { from: 'manager_approval', to: 'notify', label: '<= $50K' },
          { from: 'director_approval', to: 'notify' },
          { from: 'notify', to: 'end' },
        ],
      },
      vendor_onboarding: {
        name: 'Vendor Onboarding',
        category: 'onboarding',
        nodes: [
          { id: 'start', type: 'trigger', config: { event: 'vendor.registered' } },
          { id: 'verify_docs', type: 'ai_agent', config: { agent: 'compliance', task: 'verify_documents' } },
          { id: 'risk_assessment', type: 'ai_agent', config: { agent: 'risk', task: 'assess_vendor_risk' } },
          { id: 'admin_review', type: 'human_approval', config: { role: 'admin' } },
          { id: 'notify_vendor', type: 'notification', config: { template: 'onboarding_complete' } },
          { id: 'end', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'verify_docs' },
          { from: 'verify_docs', to: 'risk_assessment' },
          { from: 'risk_assessment', to: 'admin_review' },
          { from: 'admin_review', to: 'notify_vendor' },
          { from: 'notify_vendor', to: 'end' },
        ],
      },
    };
  }

  async getWorkflowDefinitions(type, status) {
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    return WorkflowDefinition.find(filter).sort({ updatedAt: -1 }).lean();
  }

  async getWorkflowDefinition(id) {
    const wf = await WorkflowDefinition.findById(id).lean();
    if (!wf) throw new Error('Workflow definition not found');
    return wf;
  }

  async createWorkflowDefinition(data, userId) {
    const wf = await WorkflowDefinition.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'create_workflow', category: 'automation',
      entityType: 'WorkflowDefinition', entityId: wf._id,
      newValue: { name: wf.name },
      description: `Workflow created: ${wf.name}`,
    });
    return wf;
  }

  async updateWorkflowDefinition(id, data) {
    const wf = await WorkflowDefinition.findByIdAndUpdate(id, data, { new: true });
    if (!wf) throw new Error('Workflow definition not found');
    return wf;
  }

  async deleteWorkflowDefinition(id) {
    const wf = await WorkflowDefinition.findByIdAndUpdate(id, { status: 'archived' }, { new: true });
    if (!wf) throw new Error('Workflow definition not found');
    return { message: 'Workflow archived', wf };
  }

  async activateWorkflow(id) {
    return WorkflowDefinition.findByIdAndUpdate(id, { status: 'active', activatedAt: new Date() }, { new: true });
  }

  async deactivateWorkflow(id) {
    return WorkflowDefinition.findByIdAndUpdate(id, { status: 'inactive' }, { new: true });
  }

  async executeWorkflow(id, input = {}, userId) {
    const wf = await WorkflowDefinition.findById(id);
    if (!wf) throw new Error('Workflow not found');
    if (wf.status !== 'active') throw new Error('Workflow is not active');

    const execution = await WorkflowExecution.create({
      workflowId: id, input, status: 'running', startedAt: new Date(),
      nodes: wf.nodes.map(n => ({ ...n, status: 'pending' })),
      currentNodeId: 'start',
    });

    try {
      await this._traverseNodes(wf, execution, input, userId);
      execution.status = 'completed';
      execution.completedAt = new Date();
      await execution.save();

      await logAuditEvent({
        userId, action: 'execute_workflow', category: 'automation',
        entityType: 'WorkflowExecution', entityId: execution._id,
        description: `Workflow executed: ${wf.name}`,
      });
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
      await execution.save();
    }

    return execution;
  }

  async _traverseNodes(wf, execution, context, userId) {
    const nodeMap = {};
    for (const n of wf.nodes) nodeMap[n.id] = n;

    const edgeMap = {};
    for (const e of wf.edges) {
      if (!edgeMap[e.from]) edgeMap[e.from] = [];
      edgeMap[e.from].push(e);
    }

    const visited = new Set();
    const queue = ['start'];
    const results = {};

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodeMap[nodeId];
      if (!node) continue;

      execution.currentNodeId = nodeId;
      await execution.save();

      const nodeResult = await this._processNode(node, context, userId);
      results[nodeId] = nodeResult;

      const nodeIdx = execution.nodes.findIndex(n => n.id === nodeId);
      if (nodeIdx >= 0) {
        execution.nodes[nodeIdx].status = 'completed';
        execution.nodes[nodeIdx].result = nodeResult;
        await execution.save();
      }

      if (node.type === 'end' || node.type === 'trigger') break;

      if (node.type === 'condition') {
        const passed = this._evaluateCondition(node.config, context, results);
        const matchingEdge = (edgeMap[nodeId] || []).find(e => {
          if (e.label === 'default' && !edgeMap[nodeId].some(oe => oe.label !== 'default' && oe.label === 'true')) return true;
          return passed ? e.label === 'true' || !e.label : e.label === 'false';
        });
        if (matchingEdge) queue.push(matchingEdge.to);
        continue;
      }

      const edges = edgeMap[nodeId] || [];
      const nextNodes = edges.map(e => e.to).filter(n => !visited.has(n));
      queue.push(...nextNodes);
    }

    return results;
  }

  async _processNode(node, context, userId) {
    switch (node.type) {
      case 'trigger':
      case 'start':
        return { processed: true, nodeType: 'trigger' };

      case 'condition':
        return { evaluated: true, result: this._evaluateCondition(node.config, context, {}) };

      case 'ai_agent': {
        const task = await AgentTask.create({
          title: `Workflow: ${node.config?.task || 'AI processing'}`,
          agent: node.config?.agent || 'general',
          status: 'pending',
          priority: 'medium',
          metadata: { nodeId: node.id, config: node.config, context },
        });
        return { agentTaskId: task._id, agent: node.config?.agent };
      }

      case 'human_approval': {
        const task = await AgentTask.create({
          title: `Approval required: ${node.config?.role || 'unknown'} review`,
          status: 'pending',
          priority: 'high',
          metadata: { nodeId: node.id, config: node.config, context, requiresApproval: true },
        });
        return { approvalTaskId: task._id, role: node.config?.role };
      }

      case 'delay': {
        const ms = node.config?.duration || 60000;
        await new Promise(r => setTimeout(r, ms));
        return { delayed: true, duration: ms };
      }

      case 'notification': {
        return { notified: true, template: node.config?.template };
      }

      case 'decision':
        return { decision: true, evaluated: true };

      case 'end':
        return { completed: true };

      default:
        return { processed: true, type: node.type };
    }
  }

  _evaluateCondition(config, context, results) {
    if (!config) return true;
    const { field, operator, value } = config;
    let actual = context[field];
    if (actual === undefined) actual = this._resolveNested(context, field);
    if (actual === undefined) return false;
    switch (operator) {
      case 'eq': return actual === value;
      case 'gt': return actual > value;
      case 'gte': return actual >= value;
      case 'lt': return actual < value;
      case 'lte': return actual <= value;
      case 'ne': return actual !== value;
      case 'in': return Array.isArray(value) && value.includes(actual);
      case 'contains': return String(actual).includes(String(value));
      default: return false;
    }
  }

  _resolveNested(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  async getWorkflowExecutions(workflowId) {
    return WorkflowExecution.find({ workflowId }).sort({ startedAt: -1 }).lean();
  }

  async getWorkflowExecution(executionId) {
    const exec = await WorkflowExecution.findById(executionId).populate('workflowId').lean();
    if (!exec) throw new Error('Execution not found');
    return exec;
  }

  async getWorkflowTemplates(category) {
    const templates = Object.values(this.templates);
    if (category) return templates.filter(t => t.category === category);
    return templates;
  }

  async validateWorkflow(nodes, edges) {
    const errors = [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const edgeFrom = new Set(edges.map(e => e.from));
    const edgeTo = new Set(edges.map(e => e.to));

    if (!nodes.some(n => n.type === 'start' || n.type === 'trigger')) {
      errors.push('Workflow must have a start/trigger node');
    }
    if (!nodes.some(n => n.type === 'end')) {
      errors.push('Workflow must have an end node');
    }
    for (const e of edges) {
      if (!nodeIds.has(e.from)) errors.push(`Edge references unknown node: ${e.from}`);
      if (!nodeIds.has(e.to)) errors.push(`Edge references unknown node: ${e.to}`);
    }
    for (const n of nodes) {
      if (!edgeTo.has(n.id) && n.type !== 'start' && n.type !== 'trigger') {
        errors.push(`Node ${n.id} (${n.type}) has no incoming edges`);
      }
      if (!edgeFrom.has(n.id) && n.type !== 'end') {
        errors.push(`Node ${n.id} (${n.type}) has no outgoing edges`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async getWorkflowAnalytics() {
    const stats = await WorkflowExecution.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        avgDurationMs: { $avg: { $subtract: ['$completedAt', '$startedAt'] } },
      }},
    ]);
    const byWorkflow = await WorkflowExecution.aggregate([
      { $group: { _id: '$workflowId', count: { $sum: 1 }, failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    const activeCount = await WorkflowDefinition.countDocuments({ status: 'active' });
    const totalDefs = await WorkflowDefinition.countDocuments();
    const s = stats[0] || { total: 0, completed: 0, failed: 0, running: 0, avgDurationMs: 0 };
    return {
      totalExecutions: s.total,
      completed: s.completed,
      failed: s.failed,
      running: s.running,
      successRate: s.total > 0 ? Math.round((s.completed / s.total) * 10000) / 100 : 0,
      avgExecutionTimeMs: Math.round(s.avgDurationMs || 0),
      activeWorkflows: activeCount,
      totalDefinitions: totalDefs,
      byWorkflow,
    };
  }
}

export const aiWorkflowDesignerService = new AiWorkflowDesignerService();
