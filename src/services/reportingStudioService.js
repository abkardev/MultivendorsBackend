import mongoose from 'mongoose';
import ReportDefinition from '../models/ReportDefinition.js';
import ReportExecution from '../models/ReportExecution.js';
import ReportDashboard from '../models/ReportDashboard.js';
import { logAuditEvent, generateCorrelationId } from './auditService.js';

class ReportingStudioService {
  async getReports(filters = {}) {
    const { category, status, type, search, createdBy, page = 1, limit = 20 } = filters;
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (type) query.type = type;
    if (createdBy) query.createdBy = createdBy;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      ReportDefinition.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip).limit(Number(limit))
        .populate('createdBy', 'name email')
        .lean(),
      ReportDefinition.countDocuments(query),
    ]);
    return { reports, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getReport(id) {
    const report = await ReportDefinition.findById(id)
      .populate('createdBy', 'name email')
      .lean();
    if (!report) throw new Error('Report not found');
    const lastExecution = await ReportExecution.findOne({ report: id })
      .sort({ createdAt: -1 })
      .lean();
    const executionCount = await ReportExecution.countDocuments({ report: id });
    const scheduleInfo = (report.schedules || []).filter(s => s.enabled);
    return { ...report, lastExecution, executionCount, activeSchedules: scheduleInfo };
  }

  async createReport(userId, data) {
    const report = await ReportDefinition.create({ ...data, createdBy: userId, status: 'draft', version: 1 });
    await logAuditEvent({
      userId, action: 'report.create', category: 'reporting',
      entityType: 'ReportDefinition', entityId: report._id,
      newValue: { name: report.name, type: report.type, category: report.category },
      description: `Report created: ${report.name}`,
    });
    return report;
  }

  async updateReport(userId, id, data) {
    const old = await ReportDefinition.findById(id);
    if (!old) throw new Error('Report not found');
    if (old.status === 'archived') throw new Error('Cannot update an archived report');
    const protectedFields = ['createdBy', 'version', 'status'];
    for (const field of protectedFields) delete data[field];
    data.version = (old.version || 0) + 1;
    const report = await ReportDefinition.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'report.update', category: 'reporting',
      entityType: 'ReportDefinition', entityId: id,
      oldValue: { name: old.name, version: old.version },
      newValue: { name: report.name, version: report.version },
      description: `Report updated: ${report.name} (v${report.version})`,
    });
    return report;
  }

  async deleteReport(userId, id) {
    const report = await ReportDefinition.findById(id);
    if (!report) throw new Error('Report not found');
    if (report.status === 'archived') throw new Error('Report is already archived');
    report.status = 'archived';
    await report.save();
    const schedules = report.schedules || [];
    for (const s of schedules) s.enabled = false;
    await report.save();
    await logAuditEvent({
      userId, action: 'report.archive', category: 'reporting',
      entityType: 'ReportDefinition', entityId: id,
      oldValue: { status: report.status }, newValue: { status: 'archived' },
      description: `Report archived: ${report.name}`,
    });
    return report;
  }

  async duplicateReport(userId, id) {
    const original = await ReportDefinition.findById(id);
    if (!original) throw new Error('Report not found');
    const data = original.toObject();
    delete data._id;
    delete data.createdAt;
    delete data.updatedAt;
    data.name = `${original.name} (Copy)`;
    data.status = 'draft';
    data.version = 1;
    data.createdBy = userId;
    data.schedules = [];
    const copy = await ReportDefinition.create(data);
    await logAuditEvent({
      userId, action: 'report.duplicate', category: 'reporting',
      entityType: 'ReportDefinition', entityId: copy._id,
      newValue: { name: copy.name, originalId: id },
      description: `Report duplicated from "${original.name}" to "${copy.name}"`,
    });
    return copy;
  }

  async generateReport(userId, id, params = {}) {
    const report = await ReportDefinition.findById(id);
    if (!report) throw new Error('Report not found');
    if (report.status === 'archived') throw new Error('Cannot generate an archived report');
    const execution = await ReportExecution.create({
      report: id, parameters: params, status: 'pending',
      triggeredBy: userId, triggerType: 'manual',
    });
    execution.status = 'running';
    execution.startedAt = new Date();
    await execution.save();
    try {
      const resolvedParams = this._mergeParameters(report.parameters || [], params);
      const simulatedDuration = Math.floor(Math.random() * 2000) + 500;
      await new Promise(r => setTimeout(r, 50));
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = simulatedDuration;
      execution.size = Math.floor(Math.random() * 102400) + 1024;
      execution.output = {
        json: `/reports/output/${execution._id}/data.json`,
        csv: `/reports/output/${execution._id}/data.csv`,
      };
      await execution.save();
      await logAuditEvent({
        userId, action: 'report.generate', category: 'reporting',
        entityType: 'ReportExecution', entityId: execution._id,
        newValue: { reportId: id, reportName: report.name, duration: simulatedDuration, status: 'completed' },
        description: `Report generated: ${report.name}`,
      });
    } catch (err) {
      execution.status = 'failed';
      execution.error = err.message;
      execution.completedAt = new Date();
      await execution.save();
      await logAuditEvent({
        userId, action: 'report.generate', category: 'reporting',
        entityType: 'ReportExecution', entityId: execution._id,
        newValue: { reportId: id, error: err.message },
        description: `Report generation failed: ${report.name}`,
        status: 'failure',
      });
    }
    return execution;
  }

  _mergeParameters(definitions, provided) {
    const merged = {};
    for (const param of definitions || []) {
      merged[param.name] = provided[param.name] !== undefined ? provided[param.name] : param.defaultValue;
    }
    return { ...merged, ...provided };
  }

  async getReportExecutions(reportId) {
    const report = await ReportDefinition.findById(reportId).select('name').lean();
    if (!report) throw new Error('Report not found');
    const executions = await ReportExecution.find({ report: reportId })
      .sort({ createdAt: -1 })
      .populate('triggeredBy', 'name email')
      .lean();
    return { reportName: report.name, executions, total: executions.length };
  }

  async scheduleReport(userId, id, cron, recipients, format) {
    const report = await ReportDefinition.findById(id);
    if (!report) throw new Error('Report not found');
    if (report.status === 'archived') throw new Error('Cannot schedule an archived report');
    const scheduleEntry = { cron, recipients: recipients || [], format: format || 'pdf', enabled: true };
    report.schedules = report.schedules || [];
    report.schedules.push(scheduleEntry);
    await report.save();
    if (report.status === 'draft') {
      report.status = 'published';
      await report.save();
    }
    const scheduleIndex = report.schedules.length - 1;
    await logAuditEvent({
      userId, action: 'report.schedule', category: 'reporting',
      entityType: 'ReportDefinition', entityId: id,
      newValue: { cron, format, recipients: recipients?.length || 0 },
      description: `Report scheduled: ${report.name} (${cron})`,
    });
    return { report, scheduleIndex };
  }

  async unscheduleReport(userId, id) {
    const report = await ReportDefinition.findById(id);
    if (!report) throw new Error('Report not found');
    report.schedules = (report.schedules || []).map(s => ({ ...s, enabled: false }));
    await report.save();
    await logAuditEvent({
      userId, action: 'report.unschedule', category: 'reporting',
      entityType: 'ReportDefinition', entityId: id,
      description: `All schedules removed for report: ${report.name}`,
    });
    return report;
  }

  async exportReport(executionId, format) {
    const execution = await ReportExecution.findById(executionId).populate('report', 'name').lean();
    if (!execution) throw new Error('Execution not found');
    if (execution.status !== 'completed') throw new Error('Report execution is not completed');
    const supportedFormats = ['pdf', 'excel', 'csv', 'json'];
    if (!supportedFormats.includes(format)) throw new Error(`Unsupported format: ${format}`);
    const fileUrls = {
      pdf: execution.output?.pdf || `/reports/export/${executionId}.pdf`,
      excel: execution.output?.excel || `/reports/export/${executionId}.xlsx`,
      csv: execution.output?.csv || `/reports/export/${executionId}.csv`,
      json: execution.output?.json || `/reports/export/${executionId}.json`,
    };
    if (!execution.output) execution.output = {};
    execution.output[format] = fileUrls[format];
    await ReportExecution.findByIdAndUpdate(executionId, { $set: { [`output.${format}`]: fileUrls[format] } });
    return {
      executionId, format, reportName: execution.report?.name,
      url: fileUrls[format],
      generatedAt: execution.completedAt,
      size: execution.size,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    };
  }

  async getDashboards() {
    const dashboards = await ReportDashboard.find({ status: 'active' })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'name email')
      .lean();
    return dashboards;
  }

  async createDashboard(userId, data) {
    const dashboard = await ReportDashboard.create({ ...data, createdBy: userId, status: 'active' });
    await logAuditEvent({
      userId, action: 'dashboard.create', category: 'reporting',
      entityType: 'ReportDashboard', entityId: dashboard._id,
      newValue: { name: dashboard.name },
      description: `Dashboard created: ${dashboard.name}`,
    });
    return dashboard;
  }

  async updateDashboard(userId, id, data) {
    const old = await ReportDashboard.findById(id);
    if (!old) throw new Error('Dashboard not found');
    if (old.status === 'archived') throw new Error('Cannot update an archived dashboard');
    delete data.createdBy;
    const dashboard = await ReportDashboard.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'dashboard.update', category: 'reporting',
      entityType: 'ReportDashboard', entityId: id,
      oldValue: { name: old.name },
      newValue: { name: dashboard.name, reportsCount: dashboard.reports?.length },
      description: `Dashboard updated: ${dashboard.name}`,
    });
    return dashboard;
  }

  async deleteDashboard(userId, id) {
    const dashboard = await ReportDashboard.findById(id);
    if (!dashboard) throw new Error('Dashboard not found');
    if (dashboard.status === 'archived') throw new Error('Dashboard is already archived');
    dashboard.status = 'archived';
    await dashboard.save();
    await logAuditEvent({
      userId, action: 'dashboard.archive', category: 'reporting',
      entityType: 'ReportDashboard', entityId: id,
      description: `Dashboard archived: ${dashboard.name}`,
    });
    return dashboard;
  }

  async getDashboard(id) {
    const dashboard = await ReportDashboard.findById(id)
      .populate('createdBy', 'name email')
      .populate('sharedWith', 'name email')
      .lean();
    if (!dashboard) throw new Error('Dashboard not found');
    const reportIds = (dashboard.reports || []).map(r => r.report).filter(Boolean);
    const reports = await ReportDefinition.find({ _id: { $in: reportIds } })
      .select('name type category status version')
      .lean();
    const reportMap = {};
    for (const r of reports) reportMap[r._id.toString()] = r;
    const resolvedReports = (dashboard.reports || []).map(entry => ({
      ...entry,
      reportDetails: entry.report ? reportMap[entry.report.toString()] || null : null,
    }));
    return { ...dashboard, resolvedReports };
  }

  async shareDashboard(userId, id, userIds) {
    const dashboard = await ReportDashboard.findById(id);
    if (!dashboard) throw new Error('Dashboard not found');
    if (dashboard.createdBy.toString() !== userId.toString()) {
      throw new Error('Only the dashboard owner can share it');
    }
    const existing = new Set((dashboard.sharedWith || []).map(u => u.toString()));
    const newUserIds = userIds.filter(u => !existing.has(u.toString()));
    const uniqueIds = [...new Set([...userIds])];
    dashboard.sharedWith = uniqueIds;
    dashboard.isShared = uniqueIds.length > 0;
    await dashboard.save();
    await logAuditEvent({
      userId, action: 'dashboard.share', category: 'reporting',
      entityType: 'ReportDashboard', entityId: id,
      newValue: { sharedWith: uniqueIds.length, isShared: dashboard.isShared },
      description: `Dashboard shared with ${uniqueIds.length} user(s): ${dashboard.name}`,
    });
    return dashboard;
  }

  async getReportAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const [
      totalReports, publishedReports, totalExecutions, formatBreakdown,
      typeBreakdown, recentExecutions, scheduleCount
    ] = await Promise.all([
      ReportDefinition.countDocuments(),
      ReportDefinition.countDocuments({ status: 'published' }),
      ReportExecution.countDocuments(),
      ReportExecution.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$format', count: { $sum: 1 } } },
      ]),
      ReportDefinition.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      ReportExecution.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      ReportDefinition.aggregate([
        { $unwind: '$schedules' },
        { $match: { 'schedules.enabled': true } },
        { $count: 'count' },
      ]),
    ]);
    const statusBreakdown = await ReportExecution.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const executionByDay = await ReportExecution.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return {
      totalReports,
      publishedReports,
      draftReports: await ReportDefinition.countDocuments({ status: 'draft' }),
      archivedReports: await ReportDefinition.countDocuments({ status: 'archived' }),
      totalExecutions,
      recentExecutionsLast30d: recentExecutions,
      activeSchedules: scheduleCount[0]?.count || 0,
      byFormat: formatBreakdown.reduce((acc, f) => { acc[f._id || 'unknown'] = f.count; return acc; }, {}),
      byType: typeBreakdown.reduce((acc, t) => { acc[t._id] = t.count; return acc; }, {}),
      byStatus: statusBreakdown.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}),
      executionTrend: executionByDay.map(e => ({ date: e._id, executions: e.count })),
    };
  }
}

export const reportingStudioService = new ReportingStudioService();
