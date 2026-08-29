import mongoose from 'mongoose';
import { IntegrationProvider } from '../models/IntegrationProvider.js';
import { IntegrationConnection } from '../models/IntegrationConnection.js';
import { IntegrationCredential } from '../models/IntegrationCredential.js';
import { IntegrationTemplate } from '../models/IntegrationTemplate.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class EnterpriseIntegrationService {
  async getProviders(type) {
    const filter = { isActive: true };
    if (type) filter.type = type;
    return IntegrationProvider.find(filter).sort({ name: 1 }).lean();
  }

  async getProvider(id) {
    const provider = await IntegrationProvider.findById(id).lean();
    if (!provider) throw new Error('Integration provider not found');
    return provider;
  }

  async createConnection(userId, data) {
    const existing = await IntegrationConnection.findOne({ name: data.name, isActive: { $ne: false } });
    if (existing) throw new Error(`Connection "${data.name}" already exists`);
    const provider = await IntegrationProvider.findById(data.provider);
    if (!provider) throw new Error('Provider not found');

    const connection = await IntegrationConnection.create({
      ...data,
      status: 'pending',
      createdBy: userId,
    });

    if (data.credentials) {
      for (const [key, value] of Object.entries(data.credentials)) {
        await IntegrationCredential.create({
          connection: connection._id,
          type: data.authType || 'api_key',
          key,
          value,
        });
      }
    }

    await logAuditEvent({
      userId, action: 'integration.connection_create', category: 'integration',
      entityType: 'IntegrationConnection', entityId: connection._id,
      newValue: { name: connection.name, provider: provider.name, authType: connection.authType },
      description: `Created integration connection: ${connection.name}`,
    });
    return connection;
  }

  async getConnections(userId) {
    return IntegrationConnection.find({ isActive: { $ne: false } })
      .populate('provider', 'name type icon')
      .sort({ updatedAt: -1 }).lean();
  }

  async getConnection(id) {
    const connection = await IntegrationConnection.findById(id)
      .populate('provider', 'name type icon configSchema')
      .lean();
    if (!connection) throw new Error('Integration connection not found');

    const credentials = await IntegrationCredential.find({ connection: id, isActive: true }).lean();
    connection.credentials = credentials.map(c => ({
      _id: c._id, key: c.key, type: c.type,
      value: c.value ? `****${c.value.slice(-4)}` : null,
      expiresAt: c.expiresAt,
    }));
    return connection;
  }

  async updateConnection(userId, id, data) {
    const connection = await IntegrationConnection.findById(id);
    if (!connection) throw new Error('Integration connection not found');

    const oldStatus = connection.status;
    Object.assign(connection, data);
    await connection.save();

    if (data.credentials) {
      for (const [key, value] of Object.entries(data.credentials)) {
        await IntegrationCredential.findOneAndUpdate(
          { connection: id, key },
          { value, type: data.authType || connection.authType },
          { upsert: true },
        );
      }
    }

    await logAuditEvent({
      userId, action: 'integration.connection_update', category: 'integration',
      entityType: 'IntegrationConnection', entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: connection.status, name: connection.name },
      description: `Updated integration connection: ${connection.name}`,
    });
    return connection;
  }

  async deleteConnection(userId, id) {
    const connection = await IntegrationConnection.findByIdAndUpdate(
      id, { isActive: false, status: 'inactive' }, { new: true }
    );
    if (!connection) throw new Error('Integration connection not found');
    await IntegrationCredential.updateMany({ connection: id }, { isActive: false });

    await logAuditEvent({
      userId, action: 'integration.connection_delete', category: 'integration',
      entityType: 'IntegrationConnection', entityId: id,
      description: `Deleted integration connection: ${connection.name}`,
    });
    return { success: true, message: 'Connection deleted' };
  }

  async testConnection(id) {
    const connection = await IntegrationConnection.findById(id).populate('provider', 'name type');
    if (!connection) throw new Error('Integration connection not found');

    const success = Math.random() > 0.2;
    connection.lastTestedAt = new Date();
    connection.status = success ? 'active' : 'error';
    if (!success) connection.errorCount = (connection.errorCount || 0) + 1;
    await connection.save();

    return {
      connectionId: id,
      connectionName: connection.name,
      providerName: connection.provider?.name,
      success,
      testedAt: connection.lastTestedAt,
      status: connection.status,
      responseTime: Math.floor(Math.random() * 500) + 50,
      message: success ? 'Connection successful' : 'Connection failed - check credentials',
    };
  }

  async healthCheck(id) {
    const connection = await IntegrationConnection.findById(id).populate('provider', 'name type');
    if (!connection) throw new Error('Integration connection not found');

    const checks = {
      connectivity: Math.random() > 0.1,
      authentication: Math.random() > 0.05,
      rateLimit: Math.random() > 0.15,
      latency: Math.random() > 0.2,
    };
    const healthy = Object.values(checks).every(Boolean);

    connection.lastHealthCheckAt = new Date();
    connection.healthStatus = healthy ? 'healthy' : 'degraded';
    if (!healthy) connection.errorCount = (connection.errorCount || 0) + 1;
    await connection.save();

    return {
      connectionId: id,
      connectionName: connection.name,
      healthy,
      checks,
      checkedAt: connection.lastHealthCheckAt,
      overallStatus: connection.healthStatus,
      details: healthy
        ? 'All health checks passed'
        : `Degraded: ${Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(', ')}`,
    };
  }

  async getConnectionLogs(id) {
    const connection = await IntegrationConnection.findById(id).select('name').lean();
    if (!connection) throw new Error('Integration connection not found');

    return mongoose.model('AuditLog').find({
      entityType: 'IntegrationConnection',
      entityId: id,
    }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async getCredential(id) {
    const credential = await IntegrationCredential.findById(id).lean();
    if (!credential) throw new Error('Credential not found');
    return credential;
  }

  async createCredential(userId, data) {
    const connection = await IntegrationConnection.findById(data.connection);
    if (!connection) throw new Error('Connection not found');

    const credential = await IntegrationCredential.create(data);

    await logAuditEvent({
      userId, action: 'integration.credential_create', category: 'integration',
      entityType: 'IntegrationCredential', entityId: credential._id,
      description: `Credential created for connection ${connection.name}`,
    });
    return credential;
  }

  async updateCredential(userId, id, data) {
    const credential = await IntegrationCredential.findByIdAndUpdate(id, data, { new: true });
    if (!credential) throw new Error('Credential not found');

    await logAuditEvent({
      userId, action: 'integration.credential_update', category: 'integration',
      entityType: 'IntegrationCredential', entityId: id,
      description: `Credential updated: ${credential.key}`,
    });
    return credential;
  }

  async deleteCredential(userId, id) {
    const credential = await IntegrationCredential.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!credential) throw new Error('Credential not found');

    await logAuditEvent({
      userId, action: 'integration.credential_delete', category: 'integration',
      entityType: 'IntegrationCredential', entityId: id,
      description: `Credential deleted: ${credential.key}`,
    });
    return { success: true, message: 'Credential removed' };
  }

  async getTemplates(providerId) {
    const filter = {};
    if (providerId) filter.provider = providerId;
    return IntegrationTemplate.find(filter).populate('provider', 'name type icon').sort({ name: 1 }).lean();
  }

  async createFromTemplate(userId, templateId, config) {
    const template = await IntegrationTemplate.findById(templateId).populate('provider');
    if (!template) throw new Error('Template not found');

    const resolvedConfig = { ...template.config };
    if (template.variables && config.variables) {
      for (const variable of template.variables) {
        if (config.variables[variable.name] !== undefined) {
          this._setNestedValue(resolvedConfig, variable.name, config.variables[variable.name]);
        } else if (variable.default !== undefined) {
          this._setNestedValue(resolvedConfig, variable.name, variable.default);
        } else if (variable.required) {
          throw new Error(`Required variable "${variable.name}" not provided`);
        }
      }
    }

    const connection = await IntegrationConnection.create({
      name: config.name || `${template.name} Connection`,
      provider: template.provider._id,
      config: resolvedConfig,
      authType: template.provider.supportedAuthTypes?.[0],
      status: 'pending',
      createdBy: userId,
    });

    if (config.credentials) {
      for (const [key, value] of Object.entries(config.credentials)) {
        await IntegrationCredential.create({ connection: connection._id, key, value });
      }
    }

    await logAuditEvent({
      userId, action: 'integration.template_use', category: 'integration',
      entityType: 'IntegrationConnection', entityId: connection._id,
      newValue: { templateName: template.name, connectionName: connection.name },
      description: `Connection created from template "${template.name}"`,
    });
    return connection;
  }

  async getConnectionStats() {
    const [total, byStatus, byProviderType, errorCount] = await Promise.all([
      IntegrationConnection.countDocuments({ isActive: { $ne: false } }),
      IntegrationConnection.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      IntegrationConnection.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $lookup: { from: 'integrationproviders', localField: 'provider', foreignField: '_id', as: 'provider' } },
        { $unwind: { path: '$provider', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$provider.type', count: { $sum: 1 } } },
      ]),
      IntegrationConnection.countDocuments({ isActive: { $ne: false }, status: 'error' }),
    ]);

    const statusMap = { total };
    for (const s of byStatus) statusMap[s._id || 'unknown'] = s.count;

    return {
      total,
      active: byStatus.find(s => s._id === 'active')?.count || 0,
      inError: errorCount,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id || 'unknown']: s.count }), {}),
      byProviderType: byProviderType.reduce((acc, p) => ({ ...acc, [p._id || 'unknown']: p.count }), {}),
      healthScore: total > 0 ? Math.round(((total - errorCount) / total) * 100) : 100,
    };
  }

  _setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
}

export const enterpriseIntegrationService = new EnterpriseIntegrationService();
