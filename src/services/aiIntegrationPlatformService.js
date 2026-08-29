import crypto from 'crypto';
import { AiProvider } from '../models/AiProvider.js';
import { AiProviderConfig } from '../models/AiProviderConfig.js';
import { AiPromptTemplate } from '../models/AiPromptTemplate.js';
import { AiUsageLog } from '../models/AiUsageLog.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class AiIntegrationPlatformService {
  async getProviders() {
    return AiProvider.find().sort({ priority: 1, name: 1 }).lean();
  }

  async createProvider(userId, data) {
    const provider = await AiProvider.create(data);
    await logAuditEvent({
      userId, action: 'create', category: 'ai',
      entityType: 'ai_provider', entityId: provider._id,
      newValue: { name: provider.name, provider: provider.provider },
      description: `Created AI provider: ${provider.name}`,
    });
    return provider;
  }

  async updateProvider(userId, id, data) {
    const provider = await AiProvider.findById(id);
    if (!provider) throw new Error('Provider not found');
    const oldValue = { name: provider.name, isActive: provider.isActive, priority: provider.priority };
    Object.assign(provider, data);
    await provider.save();
    await logAuditEvent({
      userId, action: 'update', category: 'ai',
      entityType: 'ai_provider', entityId: id,
      oldValue, newValue: data,
      description: `Updated AI provider: ${provider.name}`,
    });
    return provider;
  }

  async deleteProvider(userId, id) {
    const provider = await AiProvider.findById(id);
    if (!provider) throw new Error('Provider not found');
    provider.isActive = false;
    await provider.save();
    await logAuditEvent({
      userId, action: 'delete', category: 'ai',
      entityType: 'ai_provider', entityId: id,
      description: `Deactivated AI provider: ${provider.name}`,
    });
    return { success: true };
  }

  async setDefaultProvider(userId, id) {
    const provider = await AiProvider.findById(id);
    if (!provider) throw new Error('Provider not found');
    await AiProviderConfig.updateMany({}, { $set: { isDefault: false } });
    await AiProviderConfig.updateMany({ provider: id }, { $set: { isDefault: true } });
    await logAuditEvent({
      userId, action: 'set_default', category: 'ai',
      entityType: 'ai_provider', entityId: id,
      description: `Set default provider: ${provider.name}`,
    });
    return { success: true };
  }

  async testProviderConnection(id) {
    const provider = await AiProvider.findById(id);
    if (!provider) throw new Error('Provider not found');
    const latency = Math.floor(Math.random() * 200) + 50;
    const success = Math.random() > 0.1;
    await AiUsageLog.create({
      provider: id,
      model: provider.models?.[0]?.name || 'unknown',
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      cost: 0.001,
      duration: latency,
      status: success ? 'success' : 'error',
      errorMessage: success ? undefined : 'Simulated connection failure',
      prompt: 'Connection test',
      response: success ? 'OK' : 'Failed',
      timestamp: new Date(),
    });
    return {
      success,
      latency: `${latency}ms`,
      provider: provider.name,
      model: provider.models?.[0]?.name || 'unknown',
      timestamp: new Date().toISOString(),
    };
  }

  async getProviderConfigs(providerId) {
    return AiProviderConfig.find({ provider: providerId })
      .select('-key')
      .lean();
  }

  async createProviderConfig(userId, data) {
    const encryptedKey = this._encrypt(data.key);
    const config = await AiProviderConfig.create({
      ...data,
      key: encryptedKey,
      isDefault: data.isDefault || false,
    });
    if (config.isDefault) {
      await AiProviderConfig.updateMany(
        { _id: { $ne: config._id }, provider: data.provider },
        { $set: { isDefault: false } },
      );
    }
    await logAuditEvent({
      userId, action: 'create', category: 'ai',
      entityType: 'ai_provider_config', entityId: config._id,
      description: 'Created provider configuration',
    });
    const result = config.toObject();
    delete result.key;
    return result;
  }

  async updateProviderConfig(userId, id, data) {
    const config = await AiProviderConfig.findById(id);
    if (!config) throw new Error('Configuration not found');
    if (data.key) {
      data.key = this._encrypt(data.key);
    }
    Object.assign(config, data);
    await config.save();
    if (config.isDefault) {
      await AiProviderConfig.updateMany(
        { _id: { $ne: config._id }, provider: config.provider },
        { $set: { isDefault: false } },
      );
    }
    await logAuditEvent({
      userId, action: 'update', category: 'ai',
      entityType: 'ai_provider_config', entityId: id,
      description: 'Updated provider configuration',
    });
    const result = config.toObject();
    delete result.key;
    return result;
  }

  async deleteProviderConfig(userId, id) {
    const config = await AiProviderConfig.findById(id);
    if (!config) throw new Error('Configuration not found');
    await AiProviderConfig.deleteOne({ _id: id });
    await logAuditEvent({
      userId, action: 'delete', category: 'ai',
      entityType: 'ai_provider_config', entityId: id,
      description: 'Deleted provider configuration',
    });
    return { success: true };
  }

  async getPromptTemplates(category) {
    const query = category ? { category, status: { $ne: 'archived' } } : { status: { $ne: 'archived' } };
    return AiPromptTemplate.find(query)
      .populate('provider', 'name provider')
      .sort({ category: 1, name: 1 })
      .lean();
  }

  async createPromptTemplate(userId, data) {
    const template = await AiPromptTemplate.create({
      ...data,
      version: 1,
      status: data.status || 'draft',
    });
    await logAuditEvent({
      userId, action: 'create', category: 'ai',
      entityType: 'ai_prompt_template', entityId: template._id,
      newValue: { name: template.name, category: template.category },
      description: `Created prompt template: ${template.name}`,
    });
    return template;
  }

  async updatePromptTemplate(userId, id, data) {
    const template = await AiPromptTemplate.findById(id);
    if (!template) throw new Error('Prompt template not found');
    template.version += 1;
    Object.assign(template, data);
    await template.save();
    await logAuditEvent({
      userId, action: 'update', category: 'ai',
      entityType: 'ai_prompt_template', entityId: id,
      description: `Updated prompt template: ${template.name}`,
    });
    return template;
  }

  async executePrompt(templateId, variables, userId) {
    const template = await AiPromptTemplate.findById(templateId).populate('provider');
    if (!template) throw new Error('Prompt template not found');
    const renderedPrompt = template.userPromptTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
    const startTime = Date.now();
    const promptTokens = Math.ceil(renderedPrompt.length / 4);
    const completionTokens = Math.floor(Math.random() * 200) + 50;
    const totalTokens = promptTokens + completionTokens;
    const costPerToken = template.provider?.models?.find(m => m.name === template.model)?.costPerToken || 0.00002;
    const cost = +(totalTokens * costPerToken).toFixed(6);
    const latency = Date.now() - startTime;
    const response = `[Simulated response for "${template.name}"] Processed ${totalTokens} tokens in ${latency}ms`;
    await AiUsageLog.create({
      provider: template.provider?._id,
      model: template.model,
      promptTokens, completionTokens, totalTokens, cost,
      duration: latency, user: userId, sessionId: generateCorrelationId(),
      prompt: renderedPrompt, response, status: 'success',
    });
    await logAuditEvent({
      userId, action: 'execute_prompt', category: 'ai',
      entityType: 'ai_prompt_template', entityId: templateId,
      description: `Executed prompt: ${template.name}`,
    });
    return {
      response,
      usage: { promptTokens, completionTokens, totalTokens, cost, latency },
      model: template.model,
      provider: template.provider?.name || 'unknown',
    };
  }

  async switchProvider(userId, fromId, toId) {
    const [from, to] = await Promise.all([
      AiProvider.findById(fromId),
      AiProvider.findById(toId),
    ]);
    if (!from) throw new Error('Source provider not found');
    if (!to) throw new Error('Target provider not found');
    from.isActive = false;
    from.isFallback = true;
    to.priority = from.priority;
    to.isActive = true;
    await Promise.all([from.save(), to.save()]);
    await logAuditEvent({
      userId, action: 'switch_provider', category: 'ai',
      entityType: 'ai_provider',
      entityId: toId,
      oldValue: { from: from.name },
      newValue: { to: to.name },
      description: `Switched AI provider from ${from.name} to ${to.name}`,
    });
    return { success: true, from: from.name, to: to.name };
  }

  async getAiUsageLogs(filters = {}) {
    const { page = 1, limit = 50, provider, model, status, userId, startDate, endDate } = filters;
    const query = {};
    if (provider) query.provider = provider;
    if (model) query.model = model;
    if (status) query.status = status;
    if (userId) query.user = userId;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AiUsageLog.find(query)
        .populate('provider', 'name provider')
        .populate('user', 'name email')
        .sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      AiUsageLog.countDocuments(query),
    ]);
    return { logs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAiAnalytics() {
    const [byProvider, byModel, totals, errors] = await Promise.all([
      AiUsageLog.aggregate([
        { $group: { _id: '$provider', count: { $sum: 1 }, totalTokens: { $sum: '$totalTokens' }, totalCost: { $sum: '$cost' } } },
        { $sort: { totalCost: -1 } },
      ]),
      AiUsageLog.aggregate([
        { $group: { _id: '$model', count: { $sum: 1 }, totalTokens: { $sum: '$totalTokens' }, totalCost: { $sum: '$cost' } } },
        { $sort: { totalTokens: -1 } },
      ]),
      AiUsageLog.aggregate([
        { $group: { _id: null, totalCalls: { $sum: 1 }, totalTokens: { $sum: '$totalTokens' }, totalCost: { $sum: '$cost' }, avgLatency: { $avg: '$duration' } } },
      ]),
      AiUsageLog.countDocuments({ status: 'error' }),
    ]);
    const overall = totals[0] || { totalCalls: 0, totalTokens: 0, totalCost: 0, avgLatency: 0 };
    return {
      overall: {
        totalCalls: overall.totalCalls,
        totalTokens: overall.totalTokens,
        totalCost: +overall.totalCost.toFixed(4),
        avgLatency: Math.round(overall.avgLatency),
        errorRate: overall.totalCalls > 0 ? +((errors / overall.totalCalls) * 100).toFixed(2) : 0,
      },
      byProvider,
      byModel,
    };
  }

  async executeWithFallback(templateId, variables) {
    const template = await AiPromptTemplate.findById(templateId).populate('provider');
    if (!template) throw new Error('Prompt template not found');
    const primaryConfig = await AiProviderConfig.findOne({
      provider: template.provider?._id, isDefault: true,
    });
    const fallbackProviders = await AiProvider.find({
      isActive: true, isFallback: true,
    }).sort({ priority: 1 });
    const results = { attempts: [], success: false };
    if (primaryConfig) {
      try {
        const result = await this.executePrompt(templateId, variables, variables._userId);
        results.attempts.push({ provider: template.provider?.name, status: 'success' });
        results.success = true;
        results.data = result;
        return results;
      } catch (err) {
        results.attempts.push({ provider: template.provider?.name, status: 'failed', error: err.message });
      }
    }
    for (const fb of fallbackProviders) {
      try {
        const fbConfig = await AiProviderConfig.findOne({ provider: fb._id });
        if (!fbConfig) continue;
        const result = await this.executePrompt(templateId, variables, variables._userId);
        results.attempts.push({ provider: fb.name, status: 'success' });
        results.success = true;
        results.data = result;
        return results;
      } catch (err) {
        results.attempts.push({ provider: fb.name, status: 'failed', error: err.message });
      }
    }
    await AiUsageLog.create({
      provider: template.provider?._id,
      model: template.model,
      promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0,
      status: 'error',
      errorMessage: 'All providers failed',
      prompt: template.userPromptTemplate,
      timestamp: new Date(),
    });
    results.error = 'All AI providers failed to execute the prompt';
    return results;
  }

  _encrypt(text) {
    const algorithm = 'aes-256-ctr';
    const secretKey = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update('default-key').digest('hex').substring(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }
}

export const aiIntegrationPlatformService = new AiIntegrationPlatformService();
