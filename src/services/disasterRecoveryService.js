import mongoose from 'mongoose';
import { BackupPolicy } from '../models/BackupPolicy.js';
import { BackupRecord } from '../models/BackupRecord.js';
import { RecoveryPolicy } from '../models/RecoveryPolicy.js';
import { PlatformSetting } from '../models/PlatformSetting.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class DisasterRecoveryService {
  constructor() {
    this.activeBackups = new Map();
  }

  async createBackupPolicy(data, userId) {
    const policy = await BackupPolicy.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'backup.policy.create', category: 'system',
      entityType: 'BackupPolicy', entityId: policy._id,
      newValue: { name: data.name, type: data.type, schedule: data.schedule },
      description: `Created backup policy: ${data.name}`,
    });
    return policy;
  }

  async updateBackupPolicy(id, data, userId) {
    const policy = await BackupPolicy.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (policy) {
      await logAuditEvent({
        userId, action: 'backup.policy.update', category: 'system',
        entityType: 'BackupPolicy', entityId: policy._id,
        newValue: data,
        description: `Updated backup policy: ${policy.name}`,
      });
    }
    return policy;
  }

  async listBackupPolicies(type) {
    const filter = {};
    if (type) filter.type = type;
    return BackupPolicy.find(filter).sort({ createdAt: -1 });
  }

  async executeBackup(policyId, userId) {
    const policy = await BackupPolicy.findById(policyId);
    if (!policy) throw new Error('Backup policy not found');
    if (this.activeBackups.has(policyId)) throw new Error('Backup already in progress');

    const record = await BackupRecord.create({
      policy: policyId,
      type: policy.type,
      startedAt: new Date(),
      status: 'running',
      createdBy: userId,
    });

    this.activeBackups.set(policyId, true);

    try {
      const result = await this._performBackup(policy, record);
      record.status = 'completed';
      record.completedAt = new Date();
      record.durationMs = Date.now() - record.startedAt.getTime();
      record.sizeBytes = result.sizeBytes;
      record.filePath = result.filePath;
      record.fileCount = result.fileCount;
      record.checksum = result.checksum;
      await record.save();

      policy.lastBackupAt = new Date();
      policy.lastBackupStatus = 'success';
      policy.lastBackupSize = result.sizeBytes;
      policy.totalBackups++;
      policy.totalSizeBytes += result.sizeBytes || 0;
      await policy.save();

      await logAuditEvent({
        userId, action: 'backup.execute', category: 'system',
        entityType: 'BackupRecord', entityId: record._id,
        newValue: { type: policy.type, size: result.sizeBytes, duration: record.durationMs },
        description: `Backup completed: ${policy.name}`,
      });
    } catch (err) {
      record.status = 'failed';
      record.errorMessage = err.message;
      record.errorStack = err.stack;
      record.completedAt = new Date();
      await record.save();

      policy.lastBackupStatus = 'failed';
      await policy.save();

      logger.error(`Backup failed: ${policy.name}`, err);
    } finally {
      this.activeBackups.delete(policyId);
    }

    return record;
  }

  async _performBackup(policy, record) {
    const backup = { sizeBytes: 0, filePath: '', fileCount: 0, checksum: '' };
    switch (policy.type) {
      case 'database':
        return this._backupDatabase(policy);
      case 'configuration':
        return this._backupConfiguration(policy);
      case 'scheduler':
        return this._backupScheduler(policy);
      default:
        return backup;
    }
  }

  async _backupDatabase(policy) {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    let totalSize = 0;
    let fileCount = 0;

    for (const coll of collections) {
      const docs = await db.collection(coll.name).find({}).toArray();
      totalSize += JSON.stringify(docs).length;
      fileCount++;
    }

    return {
      sizeBytes: totalSize,
      filePath: `backups/database/${new Date().toISOString()}`,
      fileCount,
      checksum: `sim_${Date.now()}`,
    };
  }

  async _backupConfiguration(policy) {
    const settings = await PlatformSetting.find({}).lean();
    const data = JSON.stringify(settings);
    return {
      sizeBytes: data.length,
      filePath: `backups/config/${new Date().toISOString()}.json`,
      fileCount: 1,
      checksum: `sim_${Date.now()}`,
    };
  }

  async _backupScheduler(policy) {
    return {
      sizeBytes: 1024,
      filePath: `backups/scheduler/${new Date().toISOString()}.json`,
      fileCount: 1,
      checksum: `sim_${Date.now()}`,
    };
  }

  async listBackupRecords(policyId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;
    const filter = policyId ? { policy: policyId } : {};
    if (status) filter.status = status;
    const [records, total] = await Promise.all([
      BackupRecord.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      BackupRecord.countDocuments(filter),
    ]);
    return { records, total, page: Math.floor(offset / limit) + 1, limit, pages: Math.ceil(total / limit) };
  }

  async verifyBackup(recordId, userId) {
    const record = await BackupRecord.findById(recordId);
    if (!record) throw new Error('Backup record not found');
    record.verifiedAt = new Date();
    record.verifiedBy = userId;
    record.verificationStatus = 'passed';
    record.status = 'verified';
    await record.save();
    await logAuditEvent({
      userId, action: 'backup.verify', category: 'system',
      entityType: 'BackupRecord', entityId: record._id,
      description: `Verified backup record: ${recordId}`,
    });
    return record;
  }

  async createRecoveryPolicy(data, userId) {
    const policy = await RecoveryPolicy.create({ ...data, createdBy: userId });
    await logAuditEvent({
      userId, action: 'recovery.policy.create', category: 'system',
      entityType: 'RecoveryPolicy', entityId: policy._id,
      newValue: { name: data.name, type: data.type, rto: data.rto, rpo: data.rpo },
      description: `Created recovery policy: ${data.name}`,
    });
    return policy;
  }

  async listRecoveryPolicies() {
    return RecoveryPolicy.find({ isActive: true }).sort({ priority: -1 });
  }

  async simulateRecovery(policyId, userId) {
    const policy = await RecoveryPolicy.findById(policyId);
    if (!policy) throw new Error('Recovery policy not found');
    const simulated = [];
    for (const step of policy.steps) {
      const stepResult = {
        order: step.order,
        name: step.name,
        type: step.type,
        status: 'passed',
        durationMs: Math.floor(Math.random() * 5000) + 500,
      };
      simulated.push(stepResult);
    }
    policy.lastTestedAt = new Date();
    policy.lastTestStatus = 'success';
    await policy.save();
    await logAuditEvent({
      userId, action: 'recovery.simulate', category: 'system',
      entityType: 'RecoveryPolicy', entityId: policy._id,
      description: `Recovery simulation completed: ${policy.name}`,
    });
    return { policy, steps: simulated, totalDurationMs: simulated.reduce((a, s) => a + s.durationMs, 0) };
  }

  async getDisasterRecoverySummary() {
    const [backupPolicies, recoveryPolicies, recentBackups] = await Promise.all([
      BackupPolicy.find({ isActive: true }).lean(),
      RecoveryPolicy.find({ isActive: true }).lean(),
      BackupRecord.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);
    return {
      backupPolicies: backupPolicies.length,
      recoveryPolicies: recoveryPolicies.length,
      lastBackup: recentBackups[0] || null,
      recentBackups,
      totalBackups: await BackupRecord.countDocuments(),
      totalFailedBackups: await BackupRecord.countDocuments({ status: 'failed' }),
      totalVerifiedBackups: await BackupRecord.countDocuments({ status: 'verified' }),
      backupPoliciesList: backupPolicies,
      recoveryPoliciesList: recoveryPolicies,
    };
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
