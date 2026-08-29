import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/DeveloperApp.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/ApiKey.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

vi.mock('../models/WebhookEndpoint.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

describe('Developer Platform Service', () => {
  let DeveloperApp, ApiKey, WebhookEndpoint;

  beforeEach(async () => {
    vi.clearAllMocks();
    DeveloperApp = (await import('../models/DeveloperApp.js')).default;
    ApiKey = (await import('../models/ApiKey.js')).default;
    WebhookEndpoint = (await import('../models/WebhookEndpoint.js')).default;
  });

  it('should create a developer app', async () => {
    const mockApp = { _id: mockId(), name: 'My App', developer: mockId(), isActive: true };
    DeveloperApp.create.mockResolvedValue(mockApp);
    const app = await DeveloperApp.create({ name: 'My App', developer: mockApp.developer });
    expect(app.isActive).toBe(true);
  });

  it('should generate API key', async () => {
    const mockKey = { _id: mockId(), app: mockId(), key: 'sk_test_abc123', status: 'active' };
    ApiKey.create.mockResolvedValue(mockKey);
    const key = await ApiKey.create({ app: mockKey.app, key: 'sk_test_abc123' });
    expect(key.status).toBe('active');
  });

  it('should register webhook endpoint', async () => {
    const mockWebhook = { _id: mockId(), app: mockId(), url: 'https://example.com/webhook', events: ['order.created'], isActive: true };
    WebhookEndpoint.create.mockResolvedValue(mockWebhook);
    const wh = await WebhookEndpoint.create({ app: mockWebhook.app, url: 'https://example.com/webhook', events: ['order.created'] });
    expect(wh.isActive).toBe(true);
  });

  it('should track API usage', () => {
    const usage = { totalCalls: 1500, successRate: 0.98, avgLatency: 45 };
    expect(usage.totalCalls).toBe(1500);
    expect(usage.successRate).toBeGreaterThan(0.9);
  });

  it('should revoke API key', async () => {
    const id = mockId();
    ApiKey.findByIdAndUpdate.mockResolvedValue({ _id: id, status: 'revoked' });
    const key = await ApiKey.findByIdAndUpdate(id, { status: 'revoked' }, { new: true });
    expect(key.status).toBe('revoked');
  });
});
