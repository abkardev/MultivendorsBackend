import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/AiProvider.js', () => ({
  AiProvider: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/AiProviderConfig.js', () => ({
  AiProviderConfig: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/AiPromptTemplate.js', () => ({
  AiPromptTemplate: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/AiUsageLog.js', () => ({
  AiUsageLog: {
    create: vi.fn(),
    aggregate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('AI Integration Platform Service', () => {
  let AiProvider, AiProviderConfig, AiPromptTemplate, AiUsageLog;

  beforeEach(async () => {
    vi.clearAllMocks();
    AiProvider = (await import('../models/AiProvider.js')).AiProvider;
    AiProviderConfig = (await import('../models/AiProviderConfig.js')).AiProviderConfig;
    AiPromptTemplate = (await import('../models/AiPromptTemplate.js')).AiPromptTemplate;
    AiUsageLog = (await import('../models/AiUsageLog.js')).AiUsageLog;
  });

  it('should create an AI provider', async () => {
    const mockP = { _id: mockId(), name: 'OpenAI', provider: 'openai', models: ['gpt-4'], isActive: true };
    AiProvider.create.mockResolvedValue(mockP);
    const p = await AiProvider.create({ name: 'OpenAI', provider: 'openai', models: ['gpt-4'] });
    expect(p.isActive).toBe(true);
  });

  it('should list AI providers', async () => {
    AiProvider.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), name: 'OpenAI' }, { _id: mockId(), name: 'Anthropic' }]) });
    const providers = await AiProvider.find().sort({ priority: 1, name: 1 });
    expect(providers).toHaveLength(2);
  });

  it('should create provider config', async () => {
    const mockCfg = { _id: mockId(), provider: mockId(), key: 'model', value: 'gpt-4-turbo' };
    AiProviderConfig.create.mockResolvedValue(mockCfg);
    const cfg = await AiProviderConfig.create({ provider: mockCfg.provider, key: 'model', value: 'gpt-4-turbo' });
    expect(cfg.key).toBe('model');
  });

  it('should create prompt template', async () => {
    const mockPt = { _id: mockId(), name: 'product-description', template: 'Write a description for {{product}}', variables: ['product'] };
    AiPromptTemplate.create.mockResolvedValue(mockPt);
    const pt = await AiPromptTemplate.create({ name: 'product-description', template: 'Write a description for {{product}}' });
    expect(pt.name).toBe('product-description');
  });

  it('should render prompt template', () => {
    const template = 'Recommend products for {{user}} in category {{category}}';
    const vars = { user: 'Ahmed', category: 'electronics' };
    const rendered = template.replace(/{{(\w+)}}/g, (_, k) => vars[k] || '');
    expect(rendered).toBe('Recommend products for Ahmed in category electronics');
  });

  it('should track AI usage', async () => {
    AiUsageLog.create.mockResolvedValue({ _id: mockId(), provider: 'openai', model: 'gpt-4', tokens: 150, cost: 0.003 });
    const log = await AiUsageLog.create({ provider: 'openai', model: 'gpt-4', tokens: 150, cost: 0.003 });
    expect(log.tokens).toBe(150);
  });
});
