import { describe, it, expect, vi, beforeEach } from 'vitest';

const flags = [
  { key: 'new-dashboard', enabled: true, forceEnabled: false, forceDisabled: false, percentage: 100, scope: null, scopeValue: null, allowList: [], denyList: [] },
  { key: 'ai-recommendations', enabled: false, forceEnabled: false, forceDisabled: false, percentage: 0, scope: null, scopeValue: null, allowList: [], denyList: [] },
  { key: 'half-rollout', enabled: true, forceEnabled: false, forceDisabled: false, percentage: 50, scope: null, scopeValue: null, allowList: ['user-allow'], denyList: [] },
];

vi.mock('../models/FeatureFlag.js', () => ({
  default: { find: vi.fn(), findOneAndUpdate: vi.fn() },
}));

describe('Feature Flag Service', () => {
  let featureFlagService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const FeatureFlag = (await import('../models/FeatureFlag.js')).default;
    FeatureFlag.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([...flags]) });
    featureFlagService = await import('../services/featureFlagService.js');
  });

  it('should return true for enabled feature', async () => {
    const result = await featureFlagService.isFeatureEnabled('new-dashboard');
    expect(result).toBe(true);
  });

  it('should return false for disabled feature', async () => {
    const result = await featureFlagService.isFeatureEnabled('ai-recommendations');
    expect(result).toBe(false);
  });

  it('should return true for unknown feature (default enabled)', async () => {
    const result = await featureFlagService.isFeatureEnabled('non-existent-feature');
    expect(result).toBe(true);
  });

  it('should respect allow list', async () => {
    const result = await featureFlagService.isFeatureEnabled('half-rollout', { userId: 'user-allow' });
    expect(result).toBe(true);
  });

  it('should return feature flag middleware', () => {
    const middleware = featureFlagService.featureFlag('new-dashboard');
    expect(typeof middleware).toBe('function');
  });
});
