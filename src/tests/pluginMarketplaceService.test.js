import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/PluginDefinition.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/PluginInstallation.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/PluginMarketplaceListing.js', () => ({
  default: { create: vi.fn(), find: vi.fn(), findOne: vi.fn(), countDocuments: vi.fn() },
}));

describe('Plugin Marketplace Service', () => {
  let pluginMarketplaceService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('../services/pluginMarketplaceService.js');
    pluginMarketplaceService = mod.pluginMarketplaceService;
  });

  it('should get plugins with pagination', async () => {
    const PluginDefinition = (await import('../models/PluginDefinition.js')).default;
    PluginDefinition.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: mockId(), name: 'Test Plugin' }]) });
    PluginDefinition.countDocuments.mockResolvedValue(1);
    const result = await pluginMarketplaceService.getPlugins({ page: 1, limit: 20 });
    expect(result.plugins).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('should create a plugin', async () => {
    const PluginDefinition = (await import('../models/PluginDefinition.js')).default;
    PluginDefinition.findOne.mockResolvedValue(null);
    PluginDefinition.create.mockResolvedValue({ _id: mockId(), name: 'My Plugin', slug: 'my-plugin', version: '1.0.0', status: 'pending' });
    const plugin = await pluginMarketplaceService.createPlugin('user1', { name: 'My Plugin', version: '1.0.0' });
    expect(plugin.status).toBe('pending');
  });

  it('should approve a pending plugin', async () => {
    const PluginDefinition = (await import('../models/PluginDefinition.js')).default;
    const mockPlugin = { _id: mockId(), name: 'Plugin', status: 'pending', save: vi.fn().mockResolvedValue(true) };
    PluginDefinition.findById.mockResolvedValue(mockPlugin);
    const plugin = await pluginMarketplaceService.approvePlugin('admin1', mockPlugin._id);
    expect(plugin.status).toBe('approved');
  });

  it('should reject a pending plugin', async () => {
    const PluginDefinition = (await import('../models/PluginDefinition.js')).default;
    const mockPlugin = { _id: mockId(), name: 'Plugin', status: 'pending', metadata: {}, save: vi.fn().mockResolvedValue(true) };
    PluginDefinition.findById.mockResolvedValue(mockPlugin);
    const plugin = await pluginMarketplaceService.rejectPlugin('admin1', mockPlugin._id, 'Does not meet guidelines');
    expect(plugin.status).toBe('rejected');
  });

  it('should install a plugin for an organization', async () => {
    const PluginDefinition = (await import('../models/PluginDefinition.js')).default;
    const PluginInstallation = (await import('../models/PluginInstallation.js')).default;
    PluginDefinition.findById.mockResolvedValue({ _id: 'p1', name: 'Plugin', status: 'approved', version: '1.0.0', downloads: 0 });
    PluginInstallation.findOne.mockResolvedValue(null);
    PluginDefinition.findByIdAndUpdate.mockReturnValue({ exec: vi.fn().mockResolvedValue(true) });
    PluginInstallation.create.mockResolvedValue({ _id: mockId(), plugin: 'p1', organization: 'org1', status: 'enabled' });
    const inst = await pluginMarketplaceService.installPlugin('user1', 'p1', 'org1');
    expect(inst.status).toBe('enabled');
  });

  it('should disable an installed plugin', async () => {
    const PluginInstallation = (await import('../models/PluginInstallation.js')).default;
    const mockInst = { _id: 'inst1', status: 'enabled', save: vi.fn().mockResolvedValue(true) };
    PluginInstallation.findById.mockResolvedValue(mockInst);
    const inst = await pluginMarketplaceService.disablePlugin('user1', 'inst1');
    expect(inst.status).toBe('disabled');
  });

  it('should uninstall a plugin', async () => {
    const PluginInstallation = (await import('../models/PluginInstallation.js')).default;
    const mockInst = { _id: 'inst1', status: 'enabled', save: vi.fn().mockResolvedValue(true) };
    PluginInstallation.findById.mockResolvedValue(mockInst);
    const inst = await pluginMarketplaceService.uninstallPlugin('user1', 'inst1');
    expect(inst.status).toBe('uninstalled');
  });
});
