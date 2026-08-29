import mongoose from 'mongoose';
import { SellerAutomationRule } from '../models/SellerAutomationRule.js';
import AgentTask from '../models/AgentTask.js';
import AgentSession from '../models/AgentSession.js';
import AuditLog from '../models/AuditLog.js';
import { logAuditEvent } from './auditService.js';

const automationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['procurement', 'sales', 'inventory', 'customer', 'compliance', 'notification', 'data', 'custom'], default: 'custom' },
  config: {
    trigger: {
      type: { type: String, enum: ['event', 'schedule', 'webhook', 'condition', 'manual'], required: true },
      event: String,
      cron: String,
      conditions: [{ field: String, operator: String, value: mongoose.Schema.Types.Mixed }],
    },
    components: [{
      id: String,
      type: { type: String, enum: ['condition', 'action', 'loop', 'delay', 'function', 'transform', 'notification'], required: true },
      config: { type: mongoose.Schema.Types.Mixed },
      position: Number,
      dependsOn: [String],
    }],
    variables: [{ name: String, value: mongoose.Schema.Types.Mixed, type: { type: String, enum: ['string', 'number', 'boolean', 'array', 'object', 'date'] } }],
    errorHandling: { type: String, enum: ['stop', 'skip', 'retry', 'notify'], default: 'stop' },
    maxRetries: { type: Number, default: 3 },
  },
  status: { type: String, enum: ['draft', 'validating', 'published', 'running', 'paused', 'error', 'archived'], default: 'draft' },
  version: { type: Number, default: 1 },
  previousVersions: [{ config: mongoose.Schema.Types.Mixed, version: Number, archivedAt: Date }],
  executionStats: {
    totalExecutions: { type: Number, default: 0 },
    successfulExecutions: { type: Number, default: 0 },
    failedExecutions: { type: Number, default: 0 },
    avgExecutionTime: { type: Number, default: 0 },
    lastExecutedAt: Date,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Automation = mongoose.models.Automation || mongoose.model('Automation', automationSchema);

const automationExecutionSchema = new mongoose.Schema({
  automation: { type: mongoose.Schema.Types.ObjectId, ref: 'Automation', required: true },
  version: Number,
  status: { type: String, enum: ['running', 'completed', 'failed', 'cancelled'], default: 'running' },
  trigger: String,
  input: { type: mongoose.Schema.Types.Mixed },
  output: { type: mongoose.Schema.Types.Mixed },
  steps: [{
    componentId: String,
    componentType: String,
    status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'] },
    input: mongoose.Schema.Types.Mixed,
    output: mongoose.Schema.Types.Mixed,
    error: String,
    durationMs: Number,
    startedAt: Date,
    completedAt: Date,
  }],
  error: String,
  durationMs: Number,
  startedAt: Date,
  completedAt: Date,
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const AutomationExecution = mongoose.models.AutomationExecution || mongoose.model('AutomationExecution', automationExecutionSchema);

const componentCatalog = [
  { id: 'trigger_event', type: 'trigger', category: 'event', name: 'Event Trigger', description: 'Trigger automation when a marketplace event occurs', configSchema: { event: { type: 'string', required: true, options: ['order.created', 'order.shipped', 'order.delivered', 'payment.received', 'rfq.created', 'dispute.opened'] } } },
  { id: 'trigger_schedule', type: 'trigger', category: 'schedule', name: 'Schedule Trigger', description: 'Trigger automation on a cron schedule', configSchema: { cron: { type: 'string', required: true, example: '0 9 * * 1' } } },
  { id: 'trigger_webhook', type: 'trigger', category: 'webhook', name: 'Webhook Trigger', description: 'Trigger automation via incoming webhook', configSchema: { secret: { type: 'string' } } },
  { id: 'condition_if', type: 'condition', category: 'logic', name: 'If Condition', description: 'Branch execution based on a condition', configSchema: { field: { type: 'string' }, operator: { type: 'string', options: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'empty'] }, value: { type: 'any' } } },
  { id: 'condition_switch', type: 'condition', category: 'logic', name: 'Switch', description: 'Multi-branch condition matching', configSchema: { field: { type: 'string' }, cases: { type: 'array', items: { type: 'object' } } } },
  { id: 'action_send_notification', type: 'action', category: 'notification', name: 'Send Notification', description: 'Send in-app or email notification', configSchema: { title: { type: 'string' }, body: { type: 'string' }, recipients: { type: 'array', items: { type: 'string' } }, channel: { type: 'string', options: ['in_app', 'email', 'whatsapp'] } } },
  { id: 'action_create_task', type: 'action', category: 'task', name: 'Create Task', description: 'Create an AI agent task', configSchema: { agent: { type: 'string' }, action: { type: 'string' }, input: { type: 'object' } } },
  { id: 'action_update_record', type: 'action', category: 'data', name: 'Update Record', description: 'Update a database record', configSchema: { model: { type: 'string' }, query: { type: 'object' }, update: { type: 'object' } } },
  { id: 'action_api_call', type: 'action', category: 'integration', name: 'API Call', description: 'Make an HTTP request to an external API', configSchema: { url: { type: 'string' }, method: { type: 'string', options: ['GET', 'POST', 'PUT', 'DELETE'] }, headers: { type: 'object' }, body: { type: 'any' } } },
  { id: 'action_export_data', type: 'action', category: 'data', name: 'Export Data', description: 'Export data to CSV, Excel, or JSON', configSchema: { format: { type: 'string', options: ['csv', 'json', 'xlsx'] }, query: { type: 'object' } } },
  { id: 'loop_for_each', type: 'loop', category: 'logic', name: 'For Each', description: 'Iterate over a collection', configSchema: { collection: { type: 'string' }, variable: { type: 'string' } } },
  { id: 'delay_timer', type: 'delay', category: 'time', name: 'Delay', description: 'Wait for a specified duration', configSchema: { duration: { type: 'number', unit: 'seconds' } } },
  { id: 'function_transform', type: 'function', category: 'transform', name: 'Transform Data', description: 'Transform data using a template or expression', configSchema: { template: { type: 'string' }, mapping: { type: 'object' } } },
  { id: 'variable_set', type: 'variable', category: 'data', name: 'Set Variable', description: 'Set a workflow variable', configSchema: { name: { type: 'string' }, value: { type: 'any' } } },
];

const automationTemplates = [
  { id: 'order_confirmation', name: 'Order Confirmation Flow', category: 'sales', description: 'Send order confirmation and tracking updates to buyer', components: ['trigger_event', 'condition_if', 'action_send_notification'], estimatedSetup: '5 min' },
  { id: 'inventory_alert', name: 'Low Inventory Alert', category: 'inventory', description: 'Alert when product stock falls below threshold', components: ['trigger_schedule', 'condition_if', 'action_send_notification'], estimatedSetup: '10 min' },
  { id: 'rfq_followup', name: 'RFQ Follow-up Sequence', category: 'procurement', description: 'Automated follow-up for unanswered RFQs', components: ['trigger_schedule', 'condition_if', 'action_send_notification', 'delay_timer', 'action_send_notification'], estimatedSetup: '15 min' },
  { id: 'customer_welcome', name: 'Customer Welcome Series', category: 'customer', description: 'Welcome email sequence for new customers', components: ['trigger_event', 'delay_timer', 'action_send_notification', 'delay_timer', 'action_send_notification'], estimatedSetup: '10 min' },
  { id: 'dispute_escalation', name: 'Dispute Escalation', category: 'compliance', description: 'Escalate unresolved disputes to management', components: ['trigger_event', 'condition_if', 'delay_timer', 'condition_if', 'action_send_notification'], estimatedSetup: '10 min' },
  { id: 'data_sync', name: 'Daily Data Sync', category: 'data', description: 'Sync marketplace data to external system daily', components: ['trigger_schedule', 'action_api_call', 'action_update_record'], estimatedSetup: '20 min' },
];

class LowCodeAutomationService {
  getAutomationComponents() {
    return {
      triggers: componentCatalog.filter(c => c.type === 'trigger'),
      conditions: componentCatalog.filter(c => c.type === 'condition'),
      actions: componentCatalog.filter(c => c.type === 'action'),
      loops: componentCatalog.filter(c => c.type === 'loop'),
      delays: componentCatalog.filter(c => c.type === 'delay'),
      functions: componentCatalog.filter(c => c.type === 'function'),
      variables: componentCatalog.filter(c => c.type === 'variable'),
    };
  }

  getTemplates() {
    return automationTemplates;
  }

  getTemplate(id) {
    const template = automationTemplates.find(t => t.id === id);
    if (!template) throw new Error('Automation template not found');
    return { ...template, components: template.components.map(cid => componentCatalog.find(c => c.id === cid)).filter(Boolean) };
  }

  async createFromTemplate(templateId, data) {
    const template = automationTemplates.find(t => t.id === templateId);
    if (!template) throw new Error('Template not found');
    const components = template.components.map((cid, i) => {
      const comp = componentCatalog.find(c => c.id === cid);
      return comp ? { id: comp.id, type: comp.type, config: {}, position: i, dependsOn: i > 0 ? [template.components[i - 1]] : [] } : null;
    }).filter(Boolean);
    const automation = await Automation.create({
      name: data.name || template.name, description: template.description, category: template.category,
      config: {
        trigger: { type: 'manual' },
        components,
        variables: [],
        errorHandling: 'stop',
        maxRetries: 3,
      },
      status: 'draft', createdBy: data.userId,
    });
    await logAuditEvent({
      userId: data.userId, action: 'automation.create_from_template', category: 'system',
      entityType: 'Automation', entityId: automation._id,
      newValue: { name: automation.name, template: templateId },
      description: `Created automation from template: ${template.name}`,
    });
    return automation;
  }

  async validateAutomation(config) {
    const errors = [];
    const warnings = [];
    if (!config.trigger || !config.trigger.type) errors.push('Trigger type is required');
    if (!config.components || config.components.length === 0) errors.push('At least one component is required');
    config.components?.forEach((comp, i) => {
      if (!comp.type) errors.push(`Component at position ${i} has no type`);
      const catalogItem = componentCatalog.find(c => c.id === comp.id);
      if (catalogItem && comp.type !== catalogItem.type) warnings.push(`Component "${comp.id}" type mismatch`);
    });
    const hasNotification = config.components?.some(c => c.type === 'notification' || c.id === 'action_send_notification');
    const hasAction = config.components?.some(c => c.type === 'action');
    if (hasNotification && !hasAction) warnings.push('Notification component found but no action defined');
    return { valid: errors.length === 0, errors, warnings };
  }

  async testAutomation(config, testData) {
    const validation = await this.validateAutomation(config);
    if (!validation.valid) throw new Error(`Invalid automation config: ${validation.errors.join(', ')}`);
    const execution = {
      status: 'running',
      steps: [],
      input: testData,
      output: null,
      startedAt: new Date(),
    };
    const stepResults = [];
    for (const component of config.components || []) {
      const stepStart = Date.now();
      const step = { componentId: component.id, componentType: component.type, status: 'running', input: null, output: null, startedAt: new Date() };
      try {
        switch (component.type) {
          case 'condition': {
            const data = testData || {};
            const field = component.config?.field || 'value';
            step.output = { result: data[field] !== undefined };
            break;
          }
          case 'action': {
            if (component.id === 'action_send_notification') {
              step.output = { sent: true, recipients: component.config?.recipients || ['test@example.com'] };
            } else if (component.id === 'action_api_call') {
              step.output = { statusCode: 200, responseBody: { simulated: true }, durationMs: 45 };
            } else {
              step.output = { simulated: true, action: component.id };
            }
            break;
          }
          case 'delay': {
            const duration = component.config?.duration || 0;
            step.output = { waited: duration };
            break;
          }
          default: step.output = { simulated: true };
        }
        step.status = 'completed';
        step.durationMs = Date.now() - stepStart;
      } catch (err) {
        step.status = 'failed';
        step.error = err.message;
        step.durationMs = Date.now() - stepStart;
        execution.status = 'failed';
      }
      step.completedAt = new Date();
      stepResults.push(step);
    }
    if (execution.status !== 'failed') execution.status = 'completed';
    execution.steps = stepResults;
    execution.durationMs = Date.now() - execution.startedAt.getTime();
    execution.completedAt = new Date();
    return execution;
  }

  async publishAutomation(automationId) {
    const automation = await Automation.findById(automationId);
    if (!automation) throw new Error('Automation not found');
    const validation = await this.validateAutomation(automation.config);
    if (!validation.valid) throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
    automation.status = 'published';
    automation.version += 1;
    await automation.save();
    return automation;
  }

  async getExecutionLogs(automationId) {
    return AutomationExecution.find({ automation: automationId }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async rollbackAutomation(automationId, version) {
    const automation = await Automation.findById(automationId);
    if (!automation) throw new Error('Automation not found');
    const previous = automation.previousVersions.find(v => v.version === version);
    if (!previous) throw new Error(`Version ${version} not found`);
    automation.previousVersions.push({ config: automation.config, version: automation.version, archivedAt: new Date() });
    automation.config = previous.config;
    automation.version += 1;
    automation.status = 'draft';
    await automation.save();
    return automation;
  }

  getComponentCatalog() {
    return componentCatalog;
  }
}

export const lowCodeAutomationService = new LowCodeAutomationService();
