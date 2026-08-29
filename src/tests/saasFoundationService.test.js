import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Tenant.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/FeaturePackage.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/UsageQuota.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/WhiteLabelConfig.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('SaaS Foundation Service', () => {
  let saasFoundationService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/saasFoundationService.js');
    saasFoundationService = mod.saasFoundationService;
  });

  it('should create a tenant', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    Tenant.findOne.mockResolvedValue(null);
    Tenant.create.mockImplementation((data) => Promise.resolve({ _id: mockId(), ...data, status: 'active' }));
    const tenant = await saasFoundationService.createTenant('user1', { name: 'Acme Corp', domain: 'acme.example.com' });
    expect(tenant.status).toBe('active');
  });

  it('should list tenants with pagination', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    Tenant.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: mockId(), name: 'Tenant 1' }]) });
    Tenant.countDocuments.mockResolvedValue(1);
    const result = await saasFoundationService.getTenants({ page: 1, limit: 20 });
    expect(result.tenants).toHaveLength(1);
  });

  it('should suspend a tenant', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    const mockTenant = { _id: 't1', name: 'Tenant', status: 'active', save: vi.fn().mockResolvedValue(true) };
    Tenant.findById.mockResolvedValue(mockTenant);
    const tenant = await saasFoundationService.suspendTenant('admin1', 't1');
    expect(tenant.status).toBe('suspended');
  });

  it('should activate a tenant', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    const mockTenant = { _id: 't1', name: 'Tenant', status: 'suspended', save: vi.fn().mockResolvedValue(true) };
    Tenant.findById.mockResolvedValue(mockTenant);
    const tenant = await saasFoundationService.activateTenant('admin1', 't1');
    expect(tenant.status).toBe('active');
  });

  it('should create a feature package', async () => {
    const FeaturePackage = (await import('../models/FeaturePackage.js')).default;
    FeaturePackage.findOne.mockResolvedValue(null);
    FeaturePackage.create.mockResolvedValue({ _id: 'p1', code: 'premium', name: 'Premium', price: 99 });
    const pkg = await saasFoundationService.createFeaturePackage('admin1', { code: 'premium', name: 'Premium', price: 99 });
    expect(pkg.code).toBe('premium');
  });

  it('should track usage quota', async () => {
    const UsageQuota = (await import('../models/UsageQuota.js')).default;
    UsageQuota.findOneAndUpdate.mockResolvedValue({ _id: 'q1', tenant: 't1', period: '2026-06', limits: { apiCalls: 10000 }, usage: { apiCalls: 150 }, exceeded: [] });
    const result = await saasFoundationService.trackUsage('t1', 'apiCalls', 1);
    expect(result.feature).toBe('apiCalls');
  });

  it('should check quota', async () => {
    const UsageQuota = (await import('../models/UsageQuota.js')).default;
    UsageQuota.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'q1', tenant: 't1', period: '2026-06', limits: { apiCalls: 10000 }, usage: { apiCalls: 500 }, exceeded: [] }) });
    const result = await saasFoundationService.checkQuota('t1', 'apiCalls');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9500);
  });

  it('should assign package to tenant', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    const FeaturePackage = (await import('../models/FeaturePackage.js')).default;
    const UsageQuota = (await import('../models/UsageQuota.js')).default;
    Tenant.findById.mockResolvedValue({ _id: 't1', name: 'Tenant', features: [], settings: {}, save: vi.fn().mockResolvedValue(true) });
    FeaturePackage.findById.mockResolvedValue({ _id: 'p1', code: 'premium', name: 'Premium', limits: { apiCalls: 50000, users: 50 } });
    UsageQuota.findOneAndUpdate.mockResolvedValue({});
    const result = await saasFoundationService.assignPackage('admin1', 't1', 'p1');
    expect(result).toBeDefined();
  });

  it('should get platform overview', async () => {
    const Tenant = (await import('../models/Tenant.js')).default;
    Tenant.countDocuments.mockResolvedValue(25);
    const FeaturePackage = (await import('../models/FeaturePackage.js')).default;
    FeaturePackage.countDocuments.mockResolvedValue(4);
    const WhiteLabelConfig = (await import('../models/WhiteLabelConfig.js')).default;
    WhiteLabelConfig.countDocuments.mockResolvedValue(3);
    const UsageQuota = (await import('../models/UsageQuota.js')).default;
    UsageQuota.aggregate.mockResolvedValue([{ totalApi: 50000, totalStorage: 1073741824, totalAi: 100000 }]);
    UsageQuota.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    Tenant.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    FeaturePackage.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([]) });
    FeaturePackage.aggregate.mockResolvedValue([]);
    Tenant.countDocuments.mockResolvedValueOnce(25).mockResolvedValueOnce(10);
    const overview = await saasFoundationService.getPlatformOverview();
    expect(overview.tenants.total).toBe(25);
  });
});
