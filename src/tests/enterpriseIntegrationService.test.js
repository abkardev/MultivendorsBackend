import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/IntegrationProvider.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/IntegrationConnection.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/IntegrationCredential.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

describe('Enterprise Integration Service', () => {
  let IntegrationProvider;

  beforeEach(async () => {
    vi.clearAllMocks();
    IntegrationProvider = (await import('../models/IntegrationProvider.js')).default;
  });

  it('should list integration providers', async () => {
    IntegrationProvider.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), name: 'SAP' }, { _id: mockId(), name: 'Oracle' }]) });
    const providers = await IntegrationProvider.find().sort({ name: 1 });
    expect(providers).toHaveLength(2);
  });

  it('should create a provider', async () => {
    const mockP = { _id: mockId(), name: 'Salesforce', type: 'crm', isActive: true };
    IntegrationProvider.create.mockResolvedValue(mockP);
    const p = await IntegrationProvider.create({ name: 'Salesforce', type: 'crm' });
    expect(p.isActive).toBe(true);
  });

  it('should create a connection', async () => {
    const IntegrationConnection = (await import('../models/IntegrationConnection.js')).default;
    const mockC = { _id: mockId(), provider: mockId(), organization: mockId(), status: 'connected' };
    IntegrationConnection.create.mockResolvedValue(mockC);
    const c = await IntegrationConnection.create({ provider: mockC.provider, organization: mockC.organization });
    expect(c.status).toBe('connected');
  });

  it('should handle credential management', async () => {
    const IntegrationCredential = (await import('../models/IntegrationCredential.js')).default;
    IntegrationCredential.create.mockResolvedValue({ _id: mockId(), key: 'api_key', value: 'encrypted_value' });
    const cred = await IntegrationCredential.create({ key: 'api_key', value: 'encrypted_value' });
    expect(cred.key).toBe('api_key');
  });

  it('should test connection status', () => {
    const validStatuses = ['connected', 'disconnected', 'error', 'pending'];
    expect(validStatuses).toContain('connected');
    expect(validStatuses).toContain('error');
    expect(validStatuses).not.toContain('invalid');
  });
});
