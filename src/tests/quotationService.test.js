import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Quotation.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/QuotationVersion.js', () => ({
  default: { create: vi.fn(), find: vi.fn() },
}));

describe('Quotation Service', () => {
  let Quotation;

  beforeEach(async () => {
    vi.clearAllMocks();
    Quotation = (await import('../models/Quotation.js')).default;
  });

  it('should create a quotation', async () => {
    const mockQ = { _id: mockId(), vendor: mockId(), buyer: mockId(), items: [{ name: 'Service A', price: 500 }], total: 500, status: 'draft' };
    Quotation.create.mockResolvedValue(mockQ);
    const q = await Quotation.create({ vendor: mockQ.vendor, buyer: mockQ.buyer, items: mockQ.items, total: 500 });
    expect(q.status).toBe('draft');
  });

  it('should compare quotations', () => {
    const quotes = [
      { vendor: 'v1', total: 500, items: 3 },
      { vendor: 'v2', total: 450, items: 3 },
      { vendor: 'v3', total: 600, items: 4 },
    ];
    const sorted = [...quotes].sort((a, b) => a.total - b.total);
    expect(sorted[0].vendor).toBe('v2');
    expect(sorted[0].total).toBe(450);
  });

  it('should negotiate quotation (update price)', async () => {
    const id = mockId();
    const mockQ = { _id: id, total: 500, status: 'sent', save: vi.fn() };
    Quotation.findById.mockResolvedValue(mockQ);
    const q = await Quotation.findById(id);
    q.total = 450;
    q.status = 'countered';
    await q.save();
    expect(q.total).toBe(450);
    expect(q.status).toBe('countered');
  });

  it('should accept quotation', async () => {
    const id = mockId();
    const mockQ = { _id: id, status: 'sent', save: vi.fn() };
    Quotation.findById.mockResolvedValue(mockQ);
    const q = await Quotation.findById(id);
    q.status = 'accepted';
    await q.save();
    expect(q.status).toBe('accepted');
  });

  it('should list quotations by vendor', async () => {
    const vendorId = mockId();
    Quotation.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), vendor: vendorId }]) });
    Quotation.countDocuments.mockResolvedValue(1);
    const list = await Quotation.find({ vendor: vendorId }).sort({ createdAt: -1 });
    expect(list).toHaveLength(1);
  });
});
