import mongoose from 'mongoose';
import { PlatformVersion } from '../models/PlatformVersion.js';
import { MigrationHistory } from '../models/MigrationHistory.js';
import { UpgradePackage } from '../models/UpgradePackage.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class UpgradeService {
  async detectCurrentVersion() {
    const latestStable = await PlatformVersion.findOne({ status: 'stable' }).sort({ releaseDate: -1 }).lean();
    const installed = await MigrationHistory.findOne().sort({ createdAt: -1 }).lean();
    const version = latestStable?.version || '0.0.0';
    const installedVersion = installed?.version || version;
    return {
      installed: installedVersion,
      latest: version,
      buildNumber: latestStable?.buildNumber || null,
      releaseDate: latestStable?.releaseDate || null,
      upToDate: installedVersion === version,
    };
  }

  async planUpgrade(fromVersion, toVersion) {
    const from = await PlatformVersion.findOne({ version: fromVersion }).lean();
    const to = await PlatformVersion.findOne({ version: toVersion }).lean();
    if (!from || !to) throw new Error('Version not found');
    const upgradePaths = await PlatformVersion.find({
      version: { $gte: fromVersion, $lte: toVersion },
      status: { $in: ['stable', 'release_candidate'] },
    }).sort({ releaseDate: 1 }).lean();
    const steps = [];
    for (const pv of upgradePaths) {
      if (pv.breakingChanges && pv.breakingChanges.length > 0) {
        for (const bc of pv.breakingChanges) {
          steps.push({
            name: `Breaking: ${bc.title}`,
            type: 'migration',
            order: steps.length + 1,
            status: 'pending',
            script: bc.migrationGuide || '',
            rollbackScript: '',
          });
        }
      }
      if (pv.deprecations && pv.deprecations.length > 0) {
        for (const dep of pv.deprecations) {
          steps.push({
            name: `Deprecation: ${dep.module}`,
            type: 'deprecation',
            order: steps.length + 1,
            status: 'pending',
            script: dep.alternative || '',
            rollbackScript: '',
          });
        }
      }
      steps.push({
        name: `Upgrade to ${pv.version}`,
        type: 'upgrade',
        order: steps.length + 1,
        status: 'pending',
        script: '',
        rollbackScript: '',
      });
    }
    const pkg = await UpgradePackage.create({
      name: `Upgrade ${fromVersion} → ${toVersion}`,
      fromVersion,
      toVersion,
      status: 'pending',
      steps: steps.map((s, i) => ({ ...s, order: i + 1 })),
    });
    await logAuditEvent({
      action: 'upgrade.plan', category: 'system',
      entityType: 'UpgradePackage', entityId: pkg._id,
      newValue: { fromVersion, toVersion, steps: steps.length },
      description: `Upgrade plan created: ${fromVersion} → ${toVersion} (${steps.length} steps)`,
    });
    return pkg;
  }

  async createMigration(name, type, script) {
    const migration = await MigrationHistory.create({ name, type, script, status: 'pending' });
    await logAuditEvent({
      action: 'upgrade.migration.create', category: 'system',
      entityType: 'MigrationHistory', entityId: migration._id,
      newValue: { name, type },
      description: `Migration "${name}" created`,
    });
    return migration;
  }

  async runMigration(migrationId) {
    const migration = await MigrationHistory.findById(migrationId);
    if (!migration) throw new Error('Migration not found');
    migration.status = 'running';
    migration.startedAt = new Date();
    await migration.save();
    try {
      migration.status = 'completed';
      migration.completedAt = new Date();
      migration.duration = migration.completedAt - migration.startedAt;
      await migration.save();
      await logAuditEvent({
        action: 'upgrade.migration.run', category: 'system',
        entityType: 'MigrationHistory', entityId: migrationId,
        description: `Migration "${migration.name}" completed in ${migration.duration}ms`,
      });
      return migration;
    } catch (err) {
      migration.status = 'failed';
      migration.error = err.message;
      migration.completedAt = new Date();
      await migration.save();
      throw err;
    }
  }

  async rollbackMigration(migrationId) {
    const migration = await MigrationHistory.findById(migrationId);
    if (!migration) throw new Error('Migration not found');
    migration.status = 'rolled_back';
    migration.completedAt = new Date();
    await migration.save();
    await logAuditEvent({
      action: 'upgrade.migration.rollback', category: 'system',
      entityType: 'MigrationHistory', entityId: migrationId,
      description: `Migration "${migration.name}" rolled back`,
    });
    return migration;
  }

  async runUpgrade(packageId) {
    const pkg = await UpgradePackage.findById(packageId);
    if (!pkg) throw new Error('Upgrade package not found');
    pkg.status = 'installing';
    await pkg.save();
    const results = [];
    for (const step of pkg.steps) {
      if (step.status === 'completed') continue;
      step.status = 'in_progress';
      await pkg.save();
      try {
        step.status = 'completed';
        results.push({ name: step.name, status: 'completed' });
      } catch (err) {
        step.status = 'failed';
        step.error = err.message;
        pkg.status = 'failed';
        await pkg.save();
        results.push({ name: step.name, status: 'failed', error: err.message });
        return { pkg, results };
      }
    }
    pkg.status = 'completed';
    await pkg.save();
    await logAuditEvent({
      action: 'upgrade.run', category: 'system',
      entityType: 'UpgradePackage', entityId: packageId,
      newValue: { fromVersion: pkg.fromVersion, toVersion: pkg.toVersion, steps: pkg.steps.length },
      description: `Upgrade ${pkg.fromVersion} → ${pkg.toVersion} completed`,
    });
    return { pkg, results };
  }

  async rollbackUpgrade(packageId) {
    const pkg = await UpgradePackage.findById(packageId);
    if (!pkg) throw new Error('Upgrade package not found');
    for (const step of pkg.steps) {
      step.status = 'pending';
    }
    pkg.status = 'rolled_back';
    await pkg.save();
    await logAuditEvent({
      action: 'upgrade.rollback', category: 'system',
      entityType: 'UpgradePackage', entityId: packageId,
      description: `Upgrade ${pkg.fromVersion} → ${pkg.toVersion} rolled back`,
    });
    return pkg;
  }

  async validateUpgrade(packageId) {
    const pkg = await UpgradePackage.findById(packageId).lean();
    if (!pkg) throw new Error('Upgrade package not found');
    const issues = [];
    const from = await PlatformVersion.findOne({ version: pkg.fromVersion }).lean();
    const to = await PlatformVersion.findOne({ version: pkg.toVersion }).lean();
    if (!from) issues.push({ module: 'source', severity: 'error', message: `Source version ${pkg.fromVersion} not found in platform` });
    if (!to) issues.push({ module: 'target', severity: 'error', message: `Target version ${pkg.toVersion} not found in platform` });
    if (from && to) {
      if (from.status === 'deprecated' || from.status === 'eol') {
        issues.push({ module: 'source', severity: 'warning', message: `Source version ${pkg.fromVersion} is ${from.status}` });
      }
      const paths = await this.getUpgradePath(pkg.fromVersion, pkg.toVersion);
      if (!paths || paths.length === 0) {
        issues.push({ module: 'path', severity: 'error', message: `No valid upgrade path from ${pkg.fromVersion} to ${pkg.toVersion}` });
      }
    }
    pkg.compatibilityIssues = issues;
    await UpgradePackage.findByIdAndUpdate(packageId, { $set: { compatibilityIssues: issues } });
    return { valid: issues.filter(i => i.severity === 'error').length === 0, issues, warnings: issues.filter(i => i.severity === 'warning').length };
  }

  async dryRunUpgrade(from, to) {
    const pkg = await this.planUpgrade(from, to);
    const stepResults = pkg.steps.map(s => ({
      name: s.name,
      type: s.type,
      order: s.order,
      status: 'simulated',
      simulatedAt: new Date(),
    }));
    pkg.dryRunResults = { steps: stepResults, total: stepResults.length, simulatedAt: new Date() };
    await pkg.save();
    return {
      fromVersion: from,
      toVersion: to,
      totalSteps: stepResults.length,
      steps: stepResults,
      status: 'dry_run_complete',
    };
  }

  async getVersionHistory(filter = {}) {
    const { page = 1, limit = 20, status, edition } = filter;
    const query = {};
    if (status) query.status = status;
    if (edition) query.edition = edition;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      PlatformVersion.find(query).sort({ releaseDate: -1 }).skip(skip).limit(Number(limit)).lean(),
      PlatformVersion.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getUpgradePath(from, to) {
    const versions = await PlatformVersion.find({
      version: { $gte: from, $lte: to },
      status: { $in: ['stable', 'release_candidate'] },
    }).sort({ releaseDate: 1 }).lean();
    if (versions.length < 2) return [];
    const paths = [];
    for (let i = 0; i < versions.length - 1; i++) {
      paths.push({
        from: versions[i].version,
        to: versions[i + 1].version,
        automated: true,
        steps: versions[i].upgradePaths?.find(p => p.from === versions[i].version && p.to === versions[i + 1].version)?.steps || [],
      });
    }
    return paths;
  }

  async checkCompatibility(from, to) {
    const fromVer = await PlatformVersion.findOne({ version: from }).lean();
    const toVer = await PlatformVersion.findOne({ version: to }).lean();
    if (!fromVer || !toVer) return { compatible: false, issues: [{ module: 'version', severity: 'error', message: 'Version not found' }] };
    const issues = [];
    for (const bc of toVer.breakingChanges || []) {
      issues.push({
        module: bc.affectedModules?.join(', ') || 'unknown',
        severity: 'error',
        message: bc.title,
        resolution: bc.migrationGuide,
      });
    }
    if (toVer.minVersion && this._compareVersions(from, toVer.minVersion) < 0) {
      issues.push({ module: 'compatibility', severity: 'error', message: `Minimum required version is ${toVer.minVersion}` });
    }
    if (toVer.maxVersion && this._compareVersions(from, toVer.maxVersion) > 0) {
      issues.push({ module: 'compatibility', severity: 'error', message: `Maximum supported version is ${toVer.maxVersion}` });
    }
    return { compatible: issues.filter(i => i.severity === 'error').length === 0, issues };
  }

  async generateReleaseNotes(from, to) {
    const versions = await PlatformVersion.find({
      version: { $gte: from, $lte: to },
      status: { $in: ['stable', 'release_candidate'] },
    }).sort({ releaseDate: 1 }).lean();
    const notes = versions.map(v => ({
      version: v.version,
      releaseDate: v.releaseDate,
      releaseNotes: v.releaseNotes,
      changelog: v.changelog,
      breakingChanges: v.breakingChanges || [],
      deprecations: v.deprecations || [],
    }));
    return {
      fromVersion: from,
      toVersion: to,
      totalVersions: notes.length,
      versions: notes,
      aggregatedNotes: notes.filter(n => n.releaseNotes).map(n => `[${n.version}] ${n.releaseNotes}`).join('\n'),
    };
  }

  async recordUpgrade(data) {
    const record = await MigrationHistory.create({
      version: data.toVersion,
      name: `Upgrade to ${data.toVersion}`,
      type: 'data',
      status: 'completed',
      executedBy: data.executedBy,
      metadata: data.metadata,
    });
    await logAuditEvent({
      action: 'upgrade.record', category: 'system',
      entityType: 'MigrationHistory', entityId: record._id,
      newValue: { version: data.toVersion },
      description: `Upgrade to ${data.toVersion} recorded`,
    });
    return record;
  }

  async listMigrations(filter = {}) {
    const { page = 1, limit = 20, status, type, version } = filter;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (version) query.version = version;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      MigrationHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      MigrationHistory.countDocuments(query),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getMigration(id) {
    const migration = await MigrationHistory.findById(id).lean();
    if (!migration) throw new Error('Migration not found');
    return migration;
  }

  _compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va !== vb) return va - vb;
    }
    return 0;
  }
}

export const upgradeService = new UpgradeService();
