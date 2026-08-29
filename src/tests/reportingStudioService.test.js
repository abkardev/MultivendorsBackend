import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/ReportDefinition.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/ReportExecution.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/ReportDashboard.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Reporting Studio Service', () => {
  let reportingStudioService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/reportingStudioService.js');
    reportingStudioService = mod.reportingStudioService;
  });

  it('should create a report', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    ReportDefinition.create.mockResolvedValue({ _id: mockId(), name: 'Sales Report', type: 'tabular', status: 'draft', version: 1 });
    const report = await reportingStudioService.createReport('user1', { name: 'Sales Report', type: 'tabular' });
    expect(report.status).toBe('draft');
  });

  it('should get reports with pagination', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    ReportDefinition.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: mockId() }]) });
    ReportDefinition.countDocuments.mockResolvedValue(1);
    const result = await reportingStudioService.getReports({ page: 1, limit: 20 });
    expect(result.reports).toHaveLength(1);
  });

  it('should generate a report', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    const ReportExecution = (await import('../models/ReportExecution.js')).default;
    ReportDefinition.findById.mockResolvedValue({ _id: 'r1', name: 'Test Report', status: 'published', parameters: [] });
    ReportExecution.create.mockResolvedValue({ _id: 'exec1', report: 'r1', status: 'pending', save: vi.fn() });
    ReportExecution.findByIdAndUpdate = vi.fn();
    const exec = await reportingStudioService.generateReport('user1', 'r1', {});
    expect(exec.status).toBe('completed');
  });

  it('should schedule a report', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    const mockReport = { _id: 'r1', name: 'Scheduled Report', status: 'draft', schedules: [], save: vi.fn() };
    ReportDefinition.findById.mockResolvedValue(mockReport);
    const result = await reportingStudioService.scheduleReport('user1', 'r1', '0 8 * * 1', ['admin@test.com'], 'pdf');
    expect(result.scheduleIndex).toBe(0);
  });

  it('should create a dashboard', async () => {
    const ReportDashboard = (await import('../models/ReportDashboard.js')).default;
    ReportDashboard.create.mockResolvedValue({ _id: mockId(), name: 'Executive Dashboard', status: 'active' });
    const dash = await reportingStudioService.createDashboard('user1', { name: 'Executive Dashboard' });
    expect(dash.status).toBe('active');
  });

  it('should duplicate a report', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    const original = { _id: 'r1', name: 'Original', type: 'tabular', status: 'published', version: 3, schedules: [], toObject: vi.fn().mockReturnValue({ _id: 'r1', name: 'Original', type: 'tabular', status: 'published', version: 3, schedules: [], createdAt: new Date(), updatedAt: new Date() }) };
    ReportDefinition.findById.mockResolvedValue(original);
    ReportDefinition.create.mockResolvedValue({ _id: mockId(), name: 'Original (Copy)', status: 'draft', version: 1 });
    const copy = await reportingStudioService.duplicateReport('user1', 'r1');
    expect(copy.status).toBe('draft');
  });

  it('should get report analytics', async () => {
    const ReportDefinition = (await import('../models/ReportDefinition.js')).default;
    ReportDefinition.countDocuments.mockResolvedValue(20);
    ReportDefinition.countDocuments.mockResolvedValueOnce(20).mockResolvedValueOnce(15);
    const ReportExecution = (await import('../models/ReportExecution.js')).default;
    ReportExecution.countDocuments.mockResolvedValue(100);
    ReportExecution.aggregate.mockResolvedValue([]);
    ReportDefinition.aggregate.mockResolvedValue([]);
    const analytics = await reportingStudioService.getReportAnalytics();
    expect(analytics.totalReports).toBe(20);
    expect(analytics.totalExecutions).toBe(100);
  });
});
