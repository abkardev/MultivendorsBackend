import mongoose from 'mongoose';
import { WorkflowDefinition } from '../models/WorkflowDefinition.js';
import { WorkflowExecution } from '../models/WorkflowExecution.js';
import { WorkflowTrigger } from '../models/WorkflowTrigger.js';
import { logAuditEvent } from './auditService.js';

const BUILT_IN_TEMPLATES = [
  {
    name: 'Approval Workflow',
    description: 'Multi-step approval chain with conditional routing',
    category: 'approval',
    nodes: [
      { id: 'start', type: 'trigger', label: 'Start', position: { x: 0, y: 0 } },
      { id: 'submit', type: 'action', label: 'Submit Request', config: { action: 'submit' } },
      { id: 'review', type: 'approval', label: 'Manager Review', config: { approver: 'manager' } },
      { id: 'approve', type: 'condition', label: 'Approved?', config: { field: 'status', operator: 'eq', value: 'approved' } },
      { id: 'notify', type: 'action', label: 'Send Notification', config: { action: 'notify' } },
      { id: 'end', type: 'end', label: 'Complete', position: { x: 600, y: 0 } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'submit' }, { id: 'e2', source: 'submit', target: 'review' },
      { id: 'e3', source: 'review', target: 'approve' }, { id: 'e4', source: 'approve', target: 'notify', label: 'Yes' },
      { id: 'e5', source: 'approve', target: 'end', label: 'No' }, { id: 'e6', source: 'notify', target: 'end' },
    ],
  },
  {
    name: 'Data Sync Pipeline',
    description: 'Extract, transform and load data between systems',
    category: 'data',
    nodes: [
      { id: 'start', type: 'trigger', label: 'Scheduled Trigger' },
      { id: 'extract', type: 'action', label: 'Extract Data', config: { action: 'extract', source: 'api' } },
      { id: 'transform', type: 'action', label: 'Transform', config: { action: 'transform', mapping: {} } },
      { id: 'validate', type: 'condition', label: 'Valid?', config: { field: 'valid', operator: 'eq', value: true } },
      { id: 'load', type: 'action', label: 'Load Data', config: { action: 'load', destination: 'db' } },
      { id: 'error', type: 'action', label: 'Log Error', config: { action: 'log' } },
      { id: 'end', type: 'end', label: 'Complete' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'extract' }, { id: 'e2', source: 'extract', target: 'transform' },
      { id: 'e3', source: 'transform', target: 'validate' }, { id: 'e4', source: 'validate', target: 'load', label: 'Yes' },
      { id: 'e5', source: 'validate', target: 'error', label: 'No' }, { id: 'e6', source: 'load', target: 'end' },
      { id: 'e7', source: 'error', target: 'end' },
    ],
  },
  {
    name: 'Order Processing',
    description: 'Automated order validation, fulfillment and notification',
    category: 'commerce',
    nodes: [
      { id: 'start', type: 'trigger', label: 'New Order' },
      { id: 'validate', type: 'action', label: 'Validate Order', config: { action: 'validate' } },
      { id: 'check', type: 'condition', label: 'Valid Order?', config: { field: 'valid', operator: 'eq', value: true } },
      { id: 'process', type: 'action', label: 'Process Payment', config: { action: 'payment' } },
      { id: 'fulfill', type: 'action', label: 'Fulfill Order', config: { action: 'fulfill' } },
      { id: 'reject', type: 'action', label: 'Reject Order', config: { action: 'reject' } },
      { id: 'notify', type: 'action', label: 'Notify Customer', config: { action: 'notify' } },
      { id: 'end', type: 'end', label: 'Complete' },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'validate' }, { id: 'e2', source: 'validate', target: 'check' },
      { id: 'e3', source: 'check', target: 'process', label: 'Yes' }, { id: 'e4', source: 'check', target: 'reject', label: 'No' },
      { id: 'e5', source: 'process', target: 'fulfill' }, { id: 'e6', source: 'fulfill', target: 'notify' },
      { id: 'e7', source: 'reject', target: 'notify' }, { id: 'e8', source: 'notify', target: 'end' },
    ],
  },
];

class WorkflowBuilderService {
  async getWorkflows(filters = {}) {
    const query = {};
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.tag) query.tags = filters.tag;
    if (filters.search) query.name = { $regex: filters.search, $options: 'i' };
    if (filters.userId) query.createdBy = filters.userId;

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));

    const [workflows, total] = await Promise.all([
      WorkflowDefinition.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WorkflowDefinition.countDocuments(query),
    ]);

    return { workflows, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getWorkflow(id) {
    const workflow = await WorkflowDefinition.findById(id).lean();
    if (!workflow) throw new Error('Workflow not found');
    return workflow;
  }

  async createWorkflow(userId, data) {
    const workflow = await WorkflowDefinition.create({
      ...data,
      status: 'draft',
      version: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await logAuditEvent({
      userId, action: 'workflow.create', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: workflow._id,
      newValue: { name: workflow.name, category: workflow.category },
      description: `Workflow created: ${workflow.name}`,
    });
    return workflow;
  }

  async updateWorkflow(userId, id, data) {
    const workflow = await WorkflowDefinition.findById(id);
    if (!workflow) throw new Error('Workflow not found');

    const oldVersion = workflow.version;
    Object.assign(workflow, data, { version: oldVersion + 1, updatedBy: userId });
    await workflow.save();

    await logAuditEvent({
      userId, action: 'workflow.update', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: id,
      oldValue: { version: oldVersion },
      newValue: { version: workflow.version, name: workflow.name },
      description: `Workflow updated to v${workflow.version}: ${workflow.name}`,
    });
    return workflow;
  }

  async deleteWorkflow(userId, id) {
    const workflow = await WorkflowDefinition.findByIdAndUpdate(
      id, { status: 'archived', updatedBy: userId }, { new: true }
    );
    if (!workflow) throw new Error('Workflow not found');
    await WorkflowTrigger.updateMany({ workflow: id }, { isActive: false });

    await logAuditEvent({
      userId, action: 'workflow.archive', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: id,
      description: `Workflow archived: ${workflow.name}`,
    });
    return { success: true, message: 'Workflow archived' };
  }

  async activateWorkflow(userId, id) {
    const workflow = await WorkflowDefinition.findById(id);
    if (!workflow) throw new Error('Workflow not found');

    const validation = this.validateWorkflow({ nodes: workflow.nodes, edges: workflow.edges });
    if (!validation.valid) throw new Error(`Cannot activate: ${validation.errors.join(', ')}`);

    workflow.status = 'active';
    workflow.updatedBy = userId;
    await workflow.save();

    await logAuditEvent({
      userId, action: 'workflow.activate', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: id,
      description: `Workflow activated: ${workflow.name}`,
    });
    return workflow;
  }

  async deactivateWorkflow(userId, id) {
    const workflow = await WorkflowDefinition.findByIdAndUpdate(
      id, { status: 'paused', updatedBy: userId }, { new: true }
    );
    if (!workflow) throw new Error('Workflow not found');

    await logAuditEvent({
      userId, action: 'workflow.deactivate', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: id,
      description: `Workflow paused: ${workflow.name}`,
    });
    return workflow;
  }

  async duplicateWorkflow(userId, id) {
    const original = await WorkflowDefinition.findById(id);
    if (!original) throw new Error('Workflow not found');

    const duplicate = await WorkflowDefinition.create({
      name: `${original.name} (Copy)`,
      description: original.description,
      category: original.category,
      tags: original.tags,
      nodes: JSON.parse(JSON.stringify(original.nodes)),
      edges: JSON.parse(JSON.stringify(original.edges)),
      triggers: original.triggers ? JSON.parse(JSON.stringify(original.triggers)) : [],
      variables: original.variables ? JSON.parse(JSON.stringify(original.variables)) : [],
      settings: original.settings ? JSON.parse(JSON.stringify(original.settings)) : {},
      status: 'draft',
      version: 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await logAuditEvent({
      userId, action: 'workflow.duplicate', category: 'workflow',
      entityType: 'WorkflowDefinition', entityId: duplicate._id,
      newValue: { originalId: id, originalName: original.name, duplicateName: duplicate.name },
      description: `Workflow duplicated from "${original.name}" to "${duplicate.name}"`,
    });
    return duplicate;
  }

  async executeWorkflow(userId, id, input = {}) {
    const workflow = await WorkflowDefinition.findById(id);
    if (!workflow) throw new Error('Workflow not found');

    const execution = await WorkflowExecution.create({
      workflow: id,
      status: 'running',
      input,
      startedAt: new Date(),
      executionPath: [],
      trigger: { type: 'manual', triggeredBy: userId },
    });

    const nodeMap = {};
    const adjacency = {};
    for (const node of workflow.nodes || []) {
      nodeMap[node.id] = node;
      adjacency[node.id] = [];
    }
    for (const edge of workflow.edges || []) {
      if (adjacency[edge.source]) adjacency[edge.source].push(edge.target);
    }

    const startNode = workflow.nodes?.find(n => n.type === 'trigger');
    if (!startNode) {
      execution.status = 'failed';
      execution.error = { message: 'No trigger node found' };
      execution.completedAt = new Date();
      execution.duration = 0;
      await execution.save();
      return execution;
    }

    const visited = new Set();
    const path = [];
    const queue = [startNode.id];

    try {
      while (queue.length > 0) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodeMap[nodeId];
        const stepStart = Date.now();
        const stepResult = await this._simulateNode(node, input, execution);
        const stepDuration = Date.now() - stepStart;

        path.push({
          nodeId,
          status: stepResult.status,
          startedAt: new Date(Date.now() - stepDuration),
          completedAt: new Date(),
          result: stepResult.output,
          error: stepResult.error,
        });

        if (stepResult.status === 'failed') {
          execution.status = 'failed';
          execution.error = { message: `Node "${node?.label || nodeId}" failed`, nodeId, detail: stepResult.error };
          break;
        }

        for (const nextId of adjacency[nodeId] || []) {
          if (!visited.has(nextId)) queue.push(nextId);
        }
      }

      if (execution.status !== 'failed') {
        execution.status = 'completed';
      }
    } catch (err) {
      execution.status = 'failed';
      execution.error = { message: err.message };
    }

    execution.executionPath = path;
    execution.completedAt = new Date();
    execution.duration = execution.completedAt - execution.startedAt;
    execution.output = { path, summary: `${path.filter(p => p.status === 'completed').length} of ${path.length} steps completed` };
    await execution.save();

    await logAuditEvent({
      userId, action: 'workflow.execute', category: 'workflow',
      entityType: 'WorkflowExecution', entityId: execution._id,
      newValue: { workflowId: id, workflowName: workflow.name, status: execution.status, duration: execution.duration },
      description: `Workflow "${workflow.name}" ${execution.status} in ${execution.duration}ms`,
    });
    return execution;
  }

  async getExecutions(workflowId) {
    const filter = {};
    if (workflowId) filter.workflow = workflowId;
    return WorkflowExecution.find(filter).sort({ startedAt: -1 }).limit(100)
      .populate('workflow', 'name category').lean();
  }

  async getExecution(id) {
    const execution = await WorkflowExecution.findById(id)
      .populate('workflow', 'name category nodes edges').lean();
    if (!execution) throw new Error('Execution not found');
    return execution;
  }

  async cancelExecution(userId, id) {
    const execution = await WorkflowExecution.findById(id);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'running') throw new Error('Only running executions can be cancelled');

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.duration = execution.completedAt - execution.startedAt;
    await execution.save();

    await logAuditEvent({
      userId, action: 'workflow.cancel', category: 'workflow',
      entityType: 'WorkflowExecution', entityId: id,
      description: `Workflow execution cancelled`,
    });
    return execution;
  }

  async retryExecution(userId, id) {
    const execution = await WorkflowExecution.findById(id);
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'failed') throw new Error('Only failed executions can be retried');

    execution.retryCount += 1;
    execution.status = 'running';
    execution.error = undefined;
    execution.startedAt = new Date();
    await execution.save();

    this.executeWorkflow(userId, execution.workflow, execution.input).catch(() => {});
    return execution;
  }

  async getTriggers(workflowId) {
    const workflow = await WorkflowDefinition.findById(workflowId);
    if (!workflow) throw new Error('Workflow not found');
    return WorkflowTrigger.find({ workflow: workflowId, isActive: true }).sort({ createdAt: -1 }).lean();
  }

  async createTrigger(userId, data) {
    const workflow = await WorkflowDefinition.findById(data.workflow);
    if (!workflow) throw new Error('Workflow not found');

    const trigger = await WorkflowTrigger.create({ ...data, isActive: true });

    await logAuditEvent({
      userId, action: 'workflow.trigger_create', category: 'workflow',
      entityType: 'WorkflowTrigger', entityId: trigger._id,
      newValue: { workflowId: data.workflow, type: trigger.type, eventType: trigger.eventType },
      description: `Trigger created: ${trigger.type} for workflow ${workflow.name}`,
    });
    return trigger;
  }

  async updateTrigger(userId, id, data) {
    const trigger = await WorkflowTrigger.findByIdAndUpdate(id, data, { new: true });
    if (!trigger) throw new Error('Trigger not found');

    await logAuditEvent({
      userId, action: 'workflow.trigger_update', category: 'workflow',
      entityType: 'WorkflowTrigger', entityId: id,
      description: `Trigger updated: ${trigger.type}`,
    });
    return trigger;
  }

  async deleteTrigger(userId, id) {
    const trigger = await WorkflowTrigger.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!trigger) throw new Error('Trigger not found');

    await logAuditEvent({
      userId, action: 'workflow.trigger_delete', category: 'workflow',
      entityType: 'WorkflowTrigger', entityId: id,
      description: `Trigger deleted: ${trigger.type}`,
    });
    return { success: true, message: 'Trigger removed' };
  }

  getWorkflowTemplates() {
    return BUILT_IN_TEMPLATES;
  }

  validateWorkflow(data) {
    const errors = [];
    const { nodes, edges } = data;

    if (!nodes || nodes.length < 2) errors.push('Workflow must have at least 2 nodes');
    if (!edges || edges.length < 1) errors.push('Workflow must have at least 1 connection');

    const nodeIds = new Set((nodes || []).map(n => n.id));
    for (const edge of edges || []) {
      if (!nodeIds.has(edge.source)) errors.push(`Edge references missing source node: ${edge.source}`);
      if (!nodeIds.has(edge.target)) errors.push(`Edge references missing target node: ${edge.target}`);
    }

    const hasTrigger = (nodes || []).some(n => n.type === 'trigger');
    if (!hasTrigger) errors.push('Workflow must have a trigger node');

    const hasEnd = (nodes || []).some(n => n.type === 'end');
    if (!hasEnd) errors.push('Workflow must have an end node');

    const cycleDetected = this._detectCycles(nodes || [], edges || []);
    if (cycleDetected) errors.push('Workflow contains a cycle');

    const startNodes = new Set((edges || []).map(e => e.source));
    const endNodes = new Set((edges || []).map(e => e.target));
    const orphans = (nodes || []).filter(n => !startNodes.has(n.id) && !endNodes.has(n.id) && n.type !== 'trigger' && n.type !== 'end');
    if (orphans.length > 0) errors.push(`Unreachable nodes: ${orphans.map(n => n.label || n.id).join(', ')}`);

    return { valid: errors.length === 0, errors };
  }

  async getWorkflowAnalytics() {
    const [totalRuns, statusBreakdown, durationStats, recentFailures] = await Promise.all([
      WorkflowExecution.countDocuments(),
      WorkflowExecution.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      WorkflowExecution.aggregate([
        { $match: { status: { $in: ['completed', 'failed'] }, duration: { $exists: true } } },
        { $group: { _id: null, avgDuration: { $avg: '$duration' }, maxDuration: { $max: '$duration' }, minDuration: { $min: '$duration' } } },
      ]),
      WorkflowExecution.countDocuments({ status: 'failed', startedAt: { $gte: new Date(Date.now() - 86400000) } }),
    ]);

    const breakdown = { total: totalRuns };
    for (const s of statusBreakdown) breakdown[s._id] = s.count;
    const completed = breakdown.completed || 0;
    const failed = breakdown.failed || 0;
    const total = completed + failed;
    const ds = durationStats[0] || { avgDuration: 0, maxDuration: 0, minDuration: 0 };

    return {
      totalExecutions: totalRuns,
      completed,
      failed,
      cancelled: breakdown.cancelled || 0,
      running: breakdown.running || 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      avgDurationMs: Math.round(ds.avgDuration),
      maxDurationMs: Math.round(ds.maxDuration),
      minDurationMs: Math.round(ds.minDuration),
      failuresToday: recentFailures,
    };
  }

  async _simulateNode(node, input, execution) {
    const delay = Math.floor(Math.random() * 200) + 50;
    await new Promise(resolve => setTimeout(resolve, Math.min(delay, 50)));

    switch (node.type) {
      case 'trigger':
        return { status: 'completed', output: { triggered: true, input } };
      case 'action':
        return { status: Math.random() > 0.05 ? 'completed' : 'failed', output: { action: node.config?.action, processed: true }, error: Math.random() > 0.05 ? undefined : 'Action execution failed' };
      case 'approval':
        return { status: 'completed', output: { approved: true, approver: node.config?.approver } };
      case 'condition': {
        const met = Math.random() > 0.3;
        return { status: 'completed', output: { condition: node.config?.field, met, evaluatedValue: met } };
      }
      case 'end':
        return { status: 'completed', output: { finished: true } };
      default:
        return { status: 'completed', output: { type: node.type, processed: true } };
    }
  }

  _detectCycles(nodes, edges) {
    const adj = {};
    for (const node of nodes) adj[node.id] = [];
    for (const edge of edges) {
      if (adj[edge.source]) adj[edge.source].push(edge.target);
    }

    const visited = new Set();
    const recStack = new Set();

    const dfs = (nodeId) => {
      visited.add(nodeId);
      recStack.add(nodeId);
      for (const neighbor of adj[nodeId] || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }
    return false;
  }
}

export const workflowBuilderService = new WorkflowBuilderService();
