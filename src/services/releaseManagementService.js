import mongoose from 'mongoose';
import { Release } from '../models/Release.js';
import { ReleaseNote } from '../models/ReleaseNote.js';
import { CompatibilityReport } from '../models/CompatibilityReport.js';
import { logAuditEvent } from './auditService.js';

class ReleaseManagementService {
  async createRelease(data) {
    const existing = await Release.findOne({ version: data.version });
    if (existing) throw new Error(`Release version "${data.version}" already exists`);
    const release = await Release.create(data);
    await logAuditEvent({
      action: 'release.create',
      category: 'release',
      entityType: 'Release',
      entityId: release._id,
      newValue: { version: release.version, name: release.name, type: release.type, status: release.status },
      description: `Release created: ${release.version} (${release.type})`,
    });
    return release;
  }

  async updateRelease(id, data) {
    const old = await Release.findById(id);
    if (!old) throw new Error('Release not found');
    const restricted = ['version'];
    for (const f of restricted) delete data[f];
    Object.assign(old, data);
    await old.save();
    await logAuditEvent({
      action: 'release.update',
      category: 'release',
      entityType: 'Release',
      entityId: id,
      oldValue: { version: old.version, status: old.status },
      newValue: { version: old.version, status: old.status },
      description: `Release updated: ${old.version}`,
    });
    return old;
  }

  async getRelease(id) {
    const release = await Release.findById(id).lean();
    if (!release) throw new Error('Release not found');
    const notes = await ReleaseNote.find({ release: id }).sort({ locale: 1 }).lean();
    return { ...release, notes };
  }

  async listReleases(filter = {}) {
    const { page = 1, limit = 20, status, type, search, sort = '-createdAt' } = filter;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { version: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { changelog: { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [releases, total] = await Promise.all([
      Release.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      Release.countDocuments(query),
    ]);
    return { releases, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async publishRelease(id) {
    const release = await Release.findById(id);
    if (!release) throw new Error('Release not found');
    if (release.status === 'stable') throw new Error('Release is already stable');
    const oldStatus = release.status;
    release.status = 'stable';
    release.releaseDate = new Date();
    await release.save();
    await logAuditEvent({
      action: 'release.publish',
      category: 'release',
      entityType: 'Release',
      entityId: id,
      oldValue: { status: oldStatus },
      newValue: { status: 'stable', releaseDate: release.releaseDate },
      description: `Release published: ${release.version} is now stable`,
    });
    return release;
  }

  async deprecateRelease(id) {
    const release = await Release.findById(id);
    if (!release) throw new Error('Release not found');
    release.status = 'deprecated';
    await release.save();
    await logAuditEvent({
      action: 'release.deprecate',
      category: 'release',
      entityType: 'Release',
      entityId: id,
      oldValue: { status: release.status },
      newValue: { status: 'deprecated' },
      description: `Release deprecated: ${release.version}`,
    });
    return release;
  }

  async archiveRelease(id) {
    const release = await Release.findById(id);
    if (!release) throw new Error('Release not found');
    release.status = 'eol';
    await release.save();
    await logAuditEvent({
      action: 'release.archive',
      category: 'release',
      entityType: 'Release',
      entityId: id,
      oldValue: { status: release.status },
      newValue: { status: 'eol' },
      description: `Release archived (EOL): ${release.version}`,
    });
    return release;
  }

  async createReleaseNote(releaseId, data) {
    const release = await Release.findById(releaseId);
    if (!release) throw new Error('Release not found');
    const existing = await ReleaseNote.findOne({ release: releaseId, locale: data.locale || 'en' });
    if (existing) throw new Error(`Release note for locale "${data.locale || 'en'}" already exists`);
    const note = await ReleaseNote.create({ release: releaseId, ...data });
    return note;
  }

  async updateReleaseNote(id, data) {
    const note = await ReleaseNote.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!note) throw new Error('Release note not found');
    return note;
  }

  async getReleaseNotes(releaseId, locale) {
    const query = { release: releaseId };
    if (locale) query.locale = locale;
    return ReleaseNote.find(query).sort({ locale: 1 }).lean();
  }

  async checkCompatibility(sourceVersion, targetVersion) {
    const existing = await CompatibilityReport.findOne({ sourceVersion, targetVersion }).lean();
    if (existing) return existing;
    const source = await Release.findOne({ version: sourceVersion }).lean();
    const target = await Release.findOne({ version: targetVersion }).lean();
    if (!source || !target) throw new Error('Source or target release not found');
    const modules = [];
    const issues = [];
    if (target.breakingChanges) {
      for (const bc of target.breakingChanges) {
        issues.push({
          module: (bc.affectedModules || []).join(', ') || 'general',
          severity: 'breaking',
          type: 'breaking_change',
          message: bc.title,
          resolution: bc.migrationUrl || 'See upgrade instructions',
          automated: false,
        });
        modules.push({
          name: (bc.affectedModules || ['general'])[0],
          sourceVersion,
          targetVersion,
          compatible: false,
          issues: [bc.title],
          resolution: bc.migrationUrl || 'Manual intervention required',
        });
      }
    }
    const sourceParts = source.version.split('.').map(Number);
    const targetParts = target.version.split('.').map(Number);
    const majorDiff = (targetParts[0] || 0) - (sourceParts[0] || 0);
    const summary = { total: modules.length || 1, compatible: modules.filter(m => m.compatible).length, incompatible: modules.filter(m => !m.compatible).length, warnings: issues.filter(i => i.severity === 'warning').length, blockers: issues.filter(i => i.severity === 'breaking').length };
    const report = await CompatibilityReport.create({
      sourceVersion,
      targetVersion,
      status: issues.length === 0 ? 'compatible' : majorDiff > 0 ? 'requires_upgrade' : 'incompatible',
      modules,
      issues,
      summary,
    });
    return report;
  }

  async getCompatibilityReport(id) {
    const report = await CompatibilityReport.findById(id).lean();
    if (!report) throw new Error('Compatibility report not found');
    return report;
  }

  async getUpgradeAssistant(fromVersion, toVersion) {
    const report = await this.checkCompatibility(fromVersion, toVersion);
    const releases = await Release.find({
      version: { $gte: fromVersion, $lte: toVersion },
      status: { $in: ['stable', 'release_candidate'] },
    }).sort({ releaseDate: 1 }).lean();
    const steps = [];
    for (const r of releases) {
      steps.push({
        version: r.version,
        type: r.type,
        isSecurity: r.isSecurityRelease,
        isCritical: r.isCritical,
        breakingChanges: r.breakingChanges || [],
        deprecations: r.deprecations || [],
        upgradeInstructions: r.upgradeInstructions,
      });
    }
    return {
      from: fromVersion,
      to: toVersion,
      compatibility: report,
      upgradePath: steps,
      totalSteps: steps.length,
      hasBreakingChanges: steps.some(s => s.breakingChanges.length > 0),
    };
  }

  async getChangelog(fromVersion, toVersion) {
    const releases = await Release.find({
      version: { $gte: fromVersion, $lte: toVersion },
      status: { $in: ['stable', 'release_candidate', 'beta'] },
    })
      .select('version name type releaseDate changelog highlights breakingChanges deprecations isSecurityRelease isCritical')
      .sort({ releaseDate: 1 })
      .lean();
    const entries = releases.map(r => ({
      version: r.version,
      name: r.name,
      type: r.type,
      date: r.releaseDate,
      changelog: r.changelog,
      highlights: r.highlights,
      breakingChanges: r.breakingChanges,
      deprecations: r.deprecations,
      isSecurity: r.isSecurityRelease,
      isCritical: r.isCritical,
    }));
    return { from: fromVersion, to: toVersion, totalReleases: entries.length, entries };
  }

  async getLatestVersion() {
    const release = await Release.findOne({ status: 'stable' })
      .sort({ releaseDate: -1 })
      .select('version name releaseDate type changelog highlights isSecurityRelease')
      .lean();
    return release || null;
  }

  async getVersionTimeline() {
    const releases = await Release.find()
      .select('version name type status releaseDate isSecurityRelease isCritical')
      .sort({ releaseDate: -1 })
      .lean();
    const grouped = { major: [], minor: [], patch: [], hotfix: [], security: [] };
    for (const r of releases) {
      if (grouped[r.type]) grouped[r.type].push(r);
    }
    return { total: releases.length, timeline: releases, grouped };
  }

  async generateMigrationGuide(from, to) {
    const report = await this.checkCompatibility(from, to);
    const releases = await Release.find({
      version: { $gte: from, $lte: to },
      status: { $in: ['stable', 'release_candidate'] },
    }).sort({ releaseDate: 1 }).lean();
    let content = `# Migration Guide: ${from} → ${to}\n\n`;
    content += `## Overview\n\nThis guide covers upgrading from version ${from} to ${to}.\n\n`;
    content += `## Compatibility Status\n\n- **Status:** ${report.status}\n`;
    content += `- **Compatible Modules:** ${report.summary?.compatible || 0}/${report.summary?.total || 0}\n`;
    content += `- **Breaking Changes:** ${report.summary?.blockers || 0}\n`;
    content += `- **Warnings:** ${report.summary?.warnings || 0}\n\n`;
    content += '## Upgrade Path\n\n';
    for (const r of releases) {
      content += `### ${r.version} (${r.type})\n\n`;
      if (r.breakingChanges && r.breakingChanges.length > 0) {
        content += '#### Breaking Changes\n\n';
        for (const bc of r.breakingChanges) {
          content += `- **${bc.title}** - ${bc.description}\n`;
          if (bc.migrationUrl) content += `  - [Migration Guide](${bc.migrationUrl})\n`;
        }
        content += '\n';
      }
      if (r.upgradeInstructions) content += `${r.upgradeInstructions}\n\n`;
    }
    content += '## Recommendations\n\n';
    if (report.issues && report.issues.length > 0) {
      for (const issue of report.issues) {
        content += `- ${issue.severity.toUpperCase()}: ${issue.message} — ${issue.resolution}\n`;
      }
    } else {
      content += '- No issues detected. The upgrade should be straightforward.\n';
    }
    return { from, to, content, compatibility: report, releasesCount: releases.length };
  }

  async compareVersions(v1, v2) {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return { result: `${v1} > ${v2}`, diff: 'greater', value: 1 };
      if (n1 < n2) return { result: `${v1} < ${v2}`, diff: 'less', value: -1 };
    }
    return { result: `${v1} = ${v2}`, diff: 'equal', value: 0, major: p1[0] === p2[0], minor: p1[1] === p2[1], patch: p1[2] === p2[2] };
  }
}

export const releaseManagementService = new ReleaseManagementService();
