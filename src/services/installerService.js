import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { InstallationRecord } from '../models/InstallationRecord.js';
import { InstallationStep } from '../models/InstallationStep.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class InstallerService {
  async startInstallation(data) {
    const installationId = `INST-${uuidv4().slice(0, 8).toUpperCase()}`;
    const steps = [
      { name: 'environment_check', description: 'Validating environment', order: 1, status: 'pending' },
      { name: 'database_config', description: 'Configuring database', order: 2, status: 'pending' },
      { name: 'redis_config', description: 'Configuring Redis', order: 3, status: 'pending' },
      { name: 'smtp_config', description: 'Configuring SMTP', order: 4, status: 'pending' },
      { name: 'storage_config', description: 'Configuring storage', order: 5, status: 'pending' },
      { name: 'ai_config', description: 'Configuring AI provider', order: 6, status: 'pending' },
      { name: 'admin_creation', description: 'Creating admin user', order: 7, status: 'pending' },
      { name: 'sample_data', description: 'Installing sample data', order: 8, status: 'pending' },
      { name: 'verification', description: 'Verifying installation', order: 9, status: 'pending' },
    ];
    const record = await InstallationRecord.create({
      installationId,
      status: 'pending',
      version: data.version,
      edition: data.edition,
      features: data.features || [],
      totalSteps: steps.length,
      environment: data.environment || {},
      configuration: data.configuration || {},
      adminUser: data.adminUser || {},
    });
    const stepDocs = steps.map(s => ({ ...s, installation: record._id }));
    await InstallationStep.insertMany(stepDocs);
    await logAuditEvent({
      action: 'installer.start', category: 'system',
      entityType: 'InstallationRecord', entityId: record._id,
      newValue: { installationId, version: data.version },
      description: `Installation ${installationId} started`,
    });
    return record;
  }

  async runStep(installationId) {
    const record = await InstallationRecord.findOne({ installationId });
    if (!record) throw new Error('Installation not found');
    const step = await InstallationStep.findOne({ installation: record._id, order: record.currentStep + 1 });
    if (!step) throw new Error('No more steps to run');
    step.status = 'in_progress';
    step.startedAt = new Date();
    await step.save();
    record.status = 'in_progress';
    record.currentStep = step.order;
    await record.save();
    try {
      const stepName = step.name;
      let result = {};
      switch (stepName) {
        case 'environment_check':
          result = await this.validateEnvironment(record._id);
          break;
        case 'database_config':
          result = await this.configureDatabase(record.configuration?.mongodbUri);
          break;
        case 'redis_config':
          result = await this.configureRedis(record.configuration?.redisUrl);
          break;
        case 'smtp_config':
          result = await this.configureSMTP({
            host: record.configuration?.smtpHost,
            port: record.configuration?.smtpPort,
          });
          break;
        case 'storage_config':
          result = await this.configureStorage({ provider: record.configuration?.storageProvider });
          break;
        case 'ai_config':
          result = await this.configureAI({ provider: record.configuration?.aiProvider, apiKey: record.configuration?.aiApiKey });
          break;
        case 'admin_creation':
          result = await this.createInitialAdmin(record.adminUser);
          break;
        case 'sample_data':
          result = await this.installSampleData(record._id, record.features);
          break;
        case 'verification':
          result = await this.verifyInstallation(record._id);
          break;
        default:
          result = { status: 'completed', message: `${stepName} executed` };
      }
      step.status = 'completed';
      step.completedAt = new Date();
      step.duration = step.completedAt - step.startedAt;
      step.result = result;
      await step.save();
      if (step.order >= record.totalSteps) {
        record.status = 'completed';
        record.completedAt = new Date();
      }
      await record.save();
      return step;
    } catch (err) {
      step.status = 'failed';
      step.error = err.message;
      step.completedAt = new Date();
      step.duration = step.completedAt - (step.startedAt || step.completedAt);
      await step.save();
      record.status = 'failed';
      record.failedAt = new Date();
      record.errorMessage = err.message;
      await record.save();
      throw err;
    }
  }

  async runAllSteps(installationId) {
    const record = await InstallationRecord.findOne({ installationId });
    if (!record) throw new Error('Installation not found');
    record.status = 'in_progress';
    await record.save();
    const results = [];
    while (record.currentStep < record.totalSteps) {
      const step = await this.runStep(installationId);
      results.push(step);
    }
    return results;
  }

  async validateEnvironment(installationId) {
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    const checks = {
      node: { version: nodeVersion, required: '>=18.0.0', passed: this._satisfies(nodeVersion, '>=18.0.0') },
      platform: { value: platform, required: 'any', passed: true },
      arch: { value: arch, required: 'any', passed: true },
    };
    await InstallationRecord.findByIdAndUpdate(installationId, {
      $set: {
        'environment.nodeVersion': nodeVersion,
        'environment.platform': platform,
        'environment.arch': arch,
        'environment.os': require('os').type(),
      },
    });
    return { checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async configureDatabase(config) {
    if (!config) throw new Error('Database configuration required');
    const checks = {
      uri: { value: config, passed: /^mongodb(s)?:\/\//.test(config), message: 'Invalid MongoDB URI format' },
    };
    try {
      const conn = mongoose.connection;
      checks.connection = { value: conn.readyState === 1 ? 'connected' : 'disconnected', passed: conn.readyState === 1, message: 'MongoDB connection state' };
    } catch {
      checks.connection = { value: 'error', passed: false, message: 'Could not verify MongoDB connection' };
    }
    return { config: { ...config, password: config.password ? '***' : undefined }, checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async configureRedis(config) {
    if (!config) throw new Error('Redis configuration required');
    const checks = {
      url: { value: config, passed: /^redis(s)?:\/\//.test(config), message: 'Invalid Redis URL format' },
    };
    return { config: { ...config, password: config.password ? '***' : undefined }, checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async configureSMTP(config) {
    if (!config) throw new Error('SMTP configuration required');
    const checks = {
      host: { value: config.host, passed: !!config.host, message: 'SMTP host required' },
      port: { value: config.port, passed: !!config.port, message: 'SMTP port required' },
    };
    return { config, checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async configureStorage(config) {
    if (!config?.provider) throw new Error('Storage provider required');
    const validProviders = ['local', 's3', 'r2', 'gcs', 'azure'];
    const checks = {
      provider: { value: config.provider, passed: validProviders.includes(config.provider), message: `Must be one of: ${validProviders.join(', ')}` },
    };
    return { config, checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async configureAI(config) {
    if (!config?.provider) throw new Error('AI provider required');
    const validProviders = ['openai', 'anthropic', 'gemini', 'azure', 'local'];
    const checks = {
      provider: { value: config.provider, passed: validProviders.includes(config.provider), message: `Must be one of: ${validProviders.join(', ')}` },
      apiKey: { value: config.apiKey ? '***' : undefined, passed: !!config.apiKey, message: 'API key required' },
    };
    return { config: { ...config, apiKey: config.apiKey ? '***' : undefined }, checks, allPassed: Object.values(checks).every(c => c.passed) };
  }

  async createInitialAdmin(adminData) {
    if (!adminData?.email || !adminData?.password) throw new Error('Admin email and password required');
    const User = mongoose.model('User');
    const existing = await User.findOne({ email: adminData.email });
    if (existing) return { status: 'skipped', message: 'Admin user already exists', user: existing._id };
    const user = await User.create({
      name: adminData.name || 'Admin',
      email: adminData.email,
      password: adminData.password,
      role: 'super_admin',
      isActive: true,
    });
    return { status: 'completed', message: 'Admin user created', user: user._id };
  }

  async installSampleData(installationId, features) {
    await InstallationRecord.findByIdAndUpdate(installationId, {
      $set: { features: features || [] },
    });
    return { status: 'completed', message: 'Sample data feature flags set', features: features || [] };
  }

  async verifyInstallation(installationId) {
    const record = await InstallationRecord.findById(installationId).lean();
    if (!record) throw new Error('Installation not found');
    const steps = await InstallationStep.find({ installation: installationId }).lean();
    const allCompleted = steps.every(s => s.status === 'completed');
    const failedSteps = steps.filter(s => s.status === 'failed');
    return {
      installationId: record.installationId,
      status: allCompleted ? 'completed' : 'incomplete',
      totalSteps: steps.length,
      completedSteps: steps.filter(s => s.status === 'completed').length,
      failedSteps: failedSteps.length,
      errors: failedSteps.map(s => ({ name: s.name, error: s.error })),
      allPassed: allCompleted,
    };
  }

  async rollbackInstallation(installationId) {
    const record = await InstallationRecord.findOne({ installationId });
    if (!record) throw new Error('Installation not found');
    const steps = await InstallationStep.find({ installation: record._id, status: 'completed' }).sort({ order: -1 });
    for (const step of steps) {
      step.status = 'pending';
      step.startedAt = null;
      step.completedAt = null;
      step.duration = null;
      step.error = null;
      step.result = null;
      await step.save();
    }
    record.status = 'rolled_back';
    record.currentStep = 0;
    record.completedAt = null;
    record.failedAt = null;
    record.errorMessage = null;
    await record.save();
    await logAuditEvent({
      action: 'installer.rollback', category: 'system',
      entityType: 'InstallationRecord', entityId: record._id,
      description: `Installation ${installationId} rolled back`,
    });
    return record;
  }

  async getInstallationStatus(installationId) {
    const record = await InstallationRecord.findOne({ installationId }).lean();
    if (!record) throw new Error('Installation not found');
    const steps = await InstallationStep.find({ installation: record._id }).sort({ order: 1 }).lean();
    return { ...record, steps };
  }

  async listInstallations(filter = {}) {
    const { page = 1, limit = 20, status } = filter;
    const query = {};
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      InstallationRecord.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      InstallationRecord.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  _satisfies(version, range) {
    const v = parseFloat(version.replace(/^v/, '').split('.')[0]);
    const r = parseFloat(range.replace(/[>=<]/g, ''));
    if (range.startsWith('>=')) return v >= r;
    if (range.startsWith('>')) return v > r;
    if (range.startsWith('<=')) return v <= r;
    if (range.startsWith('<')) return v < r;
    return v === r;
  }
}

export const installerService = new InstallerService();
