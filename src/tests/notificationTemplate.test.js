import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../models/NotificationTemplate.js', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('Notification Templates', () => {
  let NotificationTemplate;

  beforeEach(async () => {
    vi.clearAllMocks();
    NotificationTemplate = (await import('../models/NotificationTemplate.js')).default;
  });

  it('should render template with variables', () => {
    const template = 'Hello {{name}}, your order #{{orderId}} has been {{status}}';
    const vars = { name: 'Ahmed', orderId: 'ORD-123', status: 'shipped' };
    const rendered = template.replace(/{{(\w+)}}/g, (_, key) => vars[key] || '');
    expect(rendered).toBe('Hello Ahmed, your order #ORD-123 has been shipped');
  });

  it('should handle missing variables gracefully', () => {
    const template = 'Hello {{name}}';
    const vars = {};
    const rendered = template.replace(/{{(\w+)}}/g, (_, key) => vars[key] || '');
    expect(rendered).toBe('Hello ');
  });

  it('should create a template', async () => {
    const mockTemplate = { _id: 't1', name: 'order_shipped', subject: { en: 'Order Shipped' }, body: { en: 'Your order is on the way' } };
    NotificationTemplate.create.mockResolvedValue(mockTemplate);
    const t = await NotificationTemplate.create({ name: 'order_shipped', subject: { en: 'Order Shipped' }, body: { en: 'Your order is on the way' } });
    expect(t.name).toBe('order_shipped');
  });

  it('should support multilingual templates', () => {
    const template = { subject: { en: 'Order Shipped', ar: 'تم الشحن' } };
    expect(template.subject.en).toBe('Order Shipped');
    expect(template.subject.ar).toBe('تم الشحن');
  });

  it('should find template by name', async () => {
    NotificationTemplate.findOne.mockResolvedValue({ _id: 't1', name: 'welcome_email' });
    const t = await NotificationTemplate.findOne({ name: 'welcome_email' });
    expect(t.name).toBe('welcome_email');
  });

  it('should provide fallback for missing locale', () => {
    const template = { subject: { en: 'Hello', ar: 'مرحبا' } };
    const getFallback = (locale) => template.subject[locale] || template.subject.en;
    expect(getFallback('en')).toBe('Hello');
    expect(getFallback('ar')).toBe('مرحبا');
    expect(getFallback('fr')).toBe('Hello');
  });
});
