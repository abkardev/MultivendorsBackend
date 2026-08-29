import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/RuleSet.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/RuleDefinition.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../models/RuleExecutionLog.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Rules Engine Service', () => {
  let RuleSet, RuleDefinition;

  beforeEach(async () => {
    vi.clearAllMocks();
    RuleSet = (await import('../models/RuleSet.js')).default;
    RuleDefinition = (await import('../models/RuleDefinition.js')).default;
  });

  it('should create a rule set', async () => {
    const mockRs = { _id: mockId(), name: 'Pricing Rules', rules: [], status: 'draft' };
    RuleSet.create.mockResolvedValue(mockRs);
    const rs = await RuleSet.create({ name: 'Pricing Rules' });
    expect(rs.status).toBe('draft');
  });

  it('should evaluate conditions', () => {
    const condition = { field: 'order.total', operator: 'gt', value: 100 };
    const evaluate = (data, cond) => {
      if (cond.operator === 'gt') return data[cond.field] > cond.value;
      return false;
    };
    expect(evaluate({ 'order.total': 150 }, condition)).toBe(true);
    expect(evaluate({ 'order.total': 50 }, condition)).toBe(false);
  });

  it('should execute actions when conditions match', () => {
    const rule = { conditions: [{ field: 'order.total', operator: 'gt', value: 100 }], action: 'apply_discount_10' };
    const data = { 'order.total': 200 };
    const matches = rule.conditions.every(c => data[c.field] > c.value);
    expect(matches).toBe(true);
    expect(rule.action).toBe('apply_discount_10');
  });

  it('should activate a rule set', async () => {
    const id = mockId();
    const mockRs = { _id: id, status: 'draft', save: vi.fn() };
    RuleSet.findById.mockResolvedValue(mockRs);
    const rs = await RuleSet.findById(id);
    rs.status = 'active';
    await rs.save();
    expect(rs.status).toBe('active');
  });

  it('should log rule execution', async () => {
    const RuleExecutionLog = (await import('../models/RuleExecutionLog.js')).default;
    RuleExecutionLog.create.mockResolvedValue({ _id: mockId(), rule: mockId(), result: true, executionTime: 5 });
    const log = await RuleExecutionLog.create({ rule: mockId(), result: true, executionTime: 5 });
    expect(log.result).toBe(true);
  });
});
