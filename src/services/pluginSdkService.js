import { PluginHook } from '../models/PluginHook.js';
import { PluginEvent } from '../models/PluginEvent.js';
import { PluginPermission } from '../models/PluginPermission.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class PluginSdkService {
  constructor() {
    this._hookDefinitions = [
      { name: 'app.before_request', type: 'filter', description: 'Before each request' },
      { name: 'app.after_response', type: 'filter', description: 'After each response' },
      { name: 'user.after_login', type: 'action', description: 'After user login' },
      { name: 'user.after_register', type: 'action', description: 'After user registration' },
      { name: 'order.before_create', type: 'filter', description: 'Before order creation' },
      { name: 'order.after_create', type: 'action', description: 'After order creation' },
      { name: 'order.after_status_change', type: 'action', description: 'Order status changed' },
      { name: 'payment.before_process', type: 'filter', description: 'Before payment processing' },
      { name: 'payment.after_process', type: 'action', description: 'After payment processing' },
      { name: 'shipment.after_create', type: 'action', description: 'After shipment creation' },
      { name: 'shipment.after_status_change', type: 'action', description: 'Shipment status changed' },
      { name: 'product.before_create', type: 'filter', description: 'Before product creation' },
      { name: 'product.after_create', type: 'action', description: 'After product creation' },
      { name: 'review.after_submit', type: 'action', description: 'After review submission' },
      { name: 'notification.before_send', type: 'filter', description: 'Before notification send' },
      { name: 'ai.before_query', type: 'filter', description: 'Before AI query' },
      { name: 'ai.after_response', type: 'action', description: 'After AI response' },
      { name: 'workflow.before_execute', type: 'filter', description: 'Before workflow execution' },
      { name: 'workflow.after_execute', type: 'action', description: 'After workflow execution' },
    ];
    this._eventDefinitions = [
      { name: 'plugin.installed', description: 'Plugin installed' },
      { name: 'plugin.uninstalled', description: 'Plugin uninstalled' },
      { name: 'plugin.enabled', description: 'Plugin enabled' },
      { name: 'plugin.disabled', description: 'Plugin disabled' },
      { name: 'plugin.updated', description: 'Plugin updated' },
      { name: 'user.created', description: 'User created' },
      { name: 'user.updated', description: 'User updated' },
      { name: 'user.deleted', description: 'User deleted' },
      { name: 'order.created', description: 'Order created' },
      { name: 'order.updated', description: 'Order updated' },
      { name: 'order.cancelled', description: 'Order cancelled' },
      { name: 'payment.completed', description: 'Payment completed' },
      { name: 'payment.failed', description: 'Payment failed' },
      { name: 'payment.refunded', description: 'Payment refunded' },
    ];
  }

  async registerPlugin(pluginId, manifest) {
    const { hooks = [], events = [], permissions = [] } = manifest;
    const results = { hooks: [], events: [], permissions: [] };
    for (const hook of hooks) {
      const created = await PluginHook.create({ pluginId, ...hook });
      results.hooks.push(created);
    }
    for (const event of events) {
      const created = await PluginEvent.create({ pluginId, ...event });
      results.events.push(created);
    }
    for (const perm of permissions) {
      const created = await PluginPermission.create({ pluginId, ...perm });
      results.permissions.push(created);
    }
    await logAuditEvent({
      action: 'pluginsdk.register', category: 'system',
      entityType: 'PluginHook', entityId: pluginId,
      newValue: { pluginId, hooks: hooks.length, events: events.length, permissions: permissions.length },
      description: `Plugin ${pluginId} registered with ${hooks.length} hooks, ${events.length} events, ${permissions.length} permissions`,
    });
    return { pluginId, ...results };
  }

  async unregisterPlugin(pluginId) {
    const [hooks, events, permissions] = await Promise.all([
      PluginHook.deleteMany({ pluginId }),
      PluginEvent.deleteMany({ pluginId }),
      PluginPermission.deleteMany({ pluginId }),
    ]);
    await logAuditEvent({
      action: 'pluginsdk.unregister', category: 'system',
      entityType: 'PluginHook', entityId: pluginId,
      oldValue: { pluginId, hooks: hooks.deletedCount, events: events.deletedCount, permissions: permissions.deletedCount },
      description: `Plugin ${pluginId} unregistered`,
    });
    return { pluginId, removedHooks: hooks.deletedCount, removedEvents: events.deletedCount, removedPermissions: permissions.deletedCount };
  }

  async getHooks(pluginId, hookType) {
    const filter = { pluginId };
    if (hookType) filter.hookType = hookType;
    return PluginHook.find(filter).sort({ priority: 1 }).lean();
  }

  async getEvents(pluginId) {
    return PluginEvent.find({ pluginId }).lean();
  }

  async registerHook(data) {
    const hook = await PluginHook.create(data);
    await logAuditEvent({
      action: 'pluginsdk.hook.register', category: 'system',
      entityType: 'PluginHook', entityId: hook._id,
      newValue: { pluginId: data.pluginId, hookName: data.hookName, hookType: data.hookType },
      description: `Hook "${data.hookName}" registered for plugin ${data.pluginId}`,
    });
    return hook;
  }

  async registerEvent(data) {
    const event = await PluginEvent.create(data);
    await logAuditEvent({
      action: 'pluginsdk.event.register', category: 'system',
      entityType: 'PluginEvent', entityId: event._id,
      newValue: { pluginId: data.pluginId, eventName: data.eventName },
      description: `Event "${data.eventName}" registered for plugin ${data.pluginId}`,
    });
    return event;
  }

  async registerPermission(data) {
    const permission = await PluginPermission.create(data);
    await logAuditEvent({
      action: 'pluginsdk.permission.register', category: 'system',
      entityType: 'PluginPermission', entityId: permission._id,
      newValue: { pluginId: data.pluginId, permission: data.permission },
      description: `Permission "${data.permission}" registered for plugin ${data.pluginId}`,
    });
    return permission;
  }

  async executeHooks(hookName, context) {
    const hooks = await PluginHook.find({ hookName, isActive: true }).sort({ priority: 1 }).lean();
    const results = [];
    for (const hook of hooks) {
      try {
        results.push({
          pluginId: hook.pluginId,
          hookName: hook.hookName,
          handler: hook.handler,
          status: 'simulated',
          context,
        });
      } catch (err) {
        results.push({
          pluginId: hook.pluginId,
          hookName: hook.hookName,
          status: 'error',
          error: err.message,
        });
      }
    }
    return { hookName, hooksExecuted: hooks.length, results };
  }

  async emitEvent(eventName, payload) {
    await logAuditEvent({
      action: 'pluginsdk.event.emit', category: 'system',
      entityType: 'PluginEvent', entityId: eventName,
      newValue: { eventName, payload: typeof payload === 'object' ? { ...payload } : payload },
      description: `Event "${eventName}" emitted`,
    });
    return { eventName, emittedAt: new Date(), payload };
  }

  async listPlugins() {
    const hooks = await PluginHook.distinct('pluginId');
    const events = await PluginEvent.distinct('pluginId');
    const permissions = await PluginPermission.distinct('pluginId');
    const allIds = new Set([...hooks, ...events, ...permissions]);
    return Array.from(allIds);
  }

  async getPluginManifest(pluginId) {
    const [hooks, events, permissions] = await Promise.all([
      PluginHook.find({ pluginId }).lean(),
      PluginEvent.find({ pluginId }).lean(),
      PluginPermission.find({ pluginId }).lean(),
    ]);
    return { pluginId, hooks, events, permissions };
  }

  async validatePlugin(pluginId) {
    const manifest = await this.getPluginManifest(pluginId);
    const errors = [];
    const warnings = [];
    if (manifest.hooks.length === 0) warnings.push('No hooks registered');
    if (manifest.events.length === 0) warnings.push('No events registered');
    if (manifest.permissions.length === 0) warnings.push('No permissions registered');
    const hookNames = manifest.hooks.map(h => h.hookName);
    const validHooks = this._hookDefinitions.map(h => h.name);
    for (const name of hookNames) {
      if (!validHooks.includes(name)) {
        warnings.push(`Unknown hook name "${name}"`);
      }
    }
    return {
      pluginId,
      valid: errors.length === 0,
      errors,
      warnings,
      stats: { hooks: manifest.hooks.length, events: manifest.events.length, permissions: manifest.permissions.length },
    };
  }

  async checkPermissions(pluginId, requiredPermissions) {
    const permissions = await PluginPermission.find({ pluginId }).lean();
    const granted = permissions.map(p => p.permission);
    const missing = requiredPermissions.filter(rp => !granted.includes(rp));
    return {
      pluginId,
      required: requiredPermissions,
      granted,
      missing,
      hasAll: missing.length === 0,
    };
  }

  getHookDefinitions() {
    return this._hookDefinitions;
  }

  getEventDefinitions() {
    return this._eventDefinitions;
  }
}

export const pluginSdkService = new PluginSdkService();
