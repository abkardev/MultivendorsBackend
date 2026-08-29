import mongoose from 'mongoose';
import { EventRule } from '../models/EventRule.js';
import { EventLog } from '../models/EventLog.js';
import { Notification } from '../models/Notification.js';
import AgentTask from '../models/AgentTask.js';
import { logAuditEvent } from './auditService.js';

class EventDrivenAutomationService {
  async getEventRules() {
    return EventRule.find().sort({ createdAt: -1 }).lean();
  }

  async createEventRule(data) {
    const rule = await EventRule.create(data);
    await logAuditEvent({
      action: 'create_event_rule',
      category: 'automation',
      entityType: 'EventRule',
      entityId: rule._id,
      newValue: { name: rule.name, event: rule.event, action: rule.action },
      description: `Event rule created: ${rule.name}`,
    });
    return rule;
  }

  async updateEventRule(id, data) {
    const rule = await EventRule.findByIdAndUpdate(id, data, { new: true });
    if (!rule) throw new Error('Event rule not found');
    await logAuditEvent({
      action: 'update_event_rule',
      category: 'automation',
      entityType: 'EventRule',
      entityId: id,
      newValue: { name: rule.name, active: rule.active },
      description: `Event rule updated: ${rule.name}`,
    });
    return rule;
  }

  async deleteEventRule(id) {
    const rule = await EventRule.findByIdAndDelete(id);
    if (!rule) throw new Error('Event rule not found');
    await logAuditEvent({
      action: 'delete_event_rule',
      category: 'automation',
      entityType: 'EventRule',
      entityId: id,
      description: `Event rule deleted: ${rule.name}`,
    });
    return { message: 'Rule deleted' };
  }

  async toggleEventRule(id) {
    const rule = await EventRule.findById(id);
    if (!rule) throw new Error('Event rule not found');
    rule.active = !rule.active;
    await rule.save();
    await logAuditEvent({
      action: rule.active ? 'activate_event_rule' : 'deactivate_event_rule',
      category: 'automation',
      entityType: 'EventRule',
      entityId: id,
      description: `Event rule ${rule.active ? 'activated' : 'deactivated'}: ${rule.name}`,
    });
    return rule;
  }

  async fireEvent(event, entityType, entityId, payload = {}) {
    const rules = await EventRule.find({ event, active: true }).lean();
    if (!rules.length) return { fired: false, reason: 'No matching rules', results: [] };

    const results = [];
    for (const rule of rules) {
      try {
        const result = await this._executeAction(rule.action, rule.actionConfig || {}, { entityType, entityId, ...payload });
        await EventLog.create({
          ruleId: rule._id, event, entityType, entityId,
          action: rule.action, status: 'success', result,
          triggeredAt: new Date(),
        });
        results.push({ ruleId: rule._id, action: rule.action, status: 'success', result });
      } catch (err) {
        await EventLog.create({
          ruleId: rule._id, event, entityType, entityId,
          action: rule.action, status: 'failed', error: err.message,
          triggeredAt: new Date(),
        });
        results.push({ ruleId: rule._id, action: rule.action, status: 'failed', error: err.message });
      }
    }

    await logAuditEvent({
      action: 'fire_event',
      category: 'automation',
      entityType,
      entityId,
      newValue: { event, rulesMatched: rules.length, results },
      description: `Event "${event}" fired for ${entityType}#${entityId}`,
    });

    return { fired: true, rulesMatched: rules.length, results };
  }

  async _executeAction(action, config, context) {
    switch (action) {
      case 'notify':
        return this._actionNotify(config, context);
      case 'create_task':
        return this._actionCreateTask(config, context);
      case 'start_workflow':
        return this._actionStartWorkflow(config, context);
      case 'call_agent':
        return this._actionCallAgent(config, context);
      case 'assign_user':
        return this._actionAssignUser(config, context);
      case 'update_entity':
        return this._actionUpdateEntity(config, context);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async _actionNotify(config, { entityType, entityId, userId }) {
    if (!config.recipients && !userId) throw new Error('No recipients specified');
    const recipients = config.recipients || [userId];
    const notifications = await Notification.insertMany(
      recipients.map(r => ({
        recipient: r,
        type: 'event_automation',
        title: config.title || 'Automated Notification',
        message: config.message || `Event triggered for ${entityType}#${entityId}`,
        data: { entityType, entityId },
      }))
    );
    return { sent: notifications.length, recipients };
  }

  async _actionCreateTask(config, { entityType, entityId }) {
    const task = await AgentTask.create({
      title: config.title || `Task from ${entityType} event`,
      description: config.description || `Auto-generated task for ${entityType}#${entityId}`,
      priority: config.priority || 'medium',
      status: 'pending',
      metadata: { entityType, entityId },
    });
    return { taskId: task._id };
  }

  async _actionStartWorkflow(config) {
    const { workflowId } = config;
    if (!workflowId) throw new Error('workflowId required');
    return { workflowId, started: true };
  }

  async _actionCallAgent(config, { entityType, entityId }) {
    const session = await AgentTask.create({
      title: config.task || `Agent task for ${entityType}#${entityId}`,
      agent: config.agent || 'general',
      status: 'pending',
      metadata: { entityType, entityId, config },
    });
    return { sessionId: session._id, agent: config.agent };
  }

  async _actionAssignUser(config, { entityType, entityId }) {
    if (!config.assignee) throw new Error('Assignee required');
    return { assignedTo: config.assignee, entityType, entityId };
  }

  async _actionUpdateEntity(config) {
    if (!config.model || !config.entityId || !config.updates) {
      throw new Error('model, entityId, and updates required');
    }
    const Model = mongoose.model(config.model);
    const updated = await Model.findByIdAndUpdate(config.entityId, config.updates, { new: true });
    return { updated: !!updated, model: config.model };
  }

  async getEventLogs(query = {}) {
    const filter = {};
    if (query.event) filter.event = query.event;
    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;
    if (query.status) filter.status = query.status;
    if (query.ruleId) filter.ruleId = query.ruleId;
    if (query.startDate || query.endDate) {
      filter.triggeredAt = {};
      if (query.startDate) filter.triggeredAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.triggeredAt.$lte = new Date(query.endDate);
    }
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const [logs, total] = await Promise.all([
      EventLog.find(filter).sort({ triggeredAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      EventLog.countDocuments(filter),
    ]);
    return { logs, total, page, pages: Math.ceil(total / limit) };
  }

  async getEventLog(id) {
    const log = await EventLog.findById(id).populate('ruleId').lean();
    if (!log) throw new Error('Event log not found');
    return log;
  }

  async retryEvent(logId) {
    const log = await EventLog.findById(logId);
    if (!log) throw new Error('Event log not found');
    if (log.status !== 'failed') throw new Error('Can only retry failed events');
    const rule = await EventRule.findById(log.ruleId);
    if (!rule) throw new Error('Original rule not found');
    return this.fireEvent(rule.event, log.entityType, log.entityId, {});
  }

  async getEventStats() {
    const stats = await EventLog.aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
      }},
    ]);
    const byEvent = await EventLog.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byAction = await EventLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const activeRules = await EventRule.countDocuments({ active: true });
    const totalRules = await EventRule.countDocuments();
    return {
      stats: stats[0] || { total: 0, success: 0, failed: 0 },
      byEvent, byAction,
      activeRules, totalRules,
    };
  }
}

export const eventDrivenAutomationService = new EventDrivenAutomationService();
