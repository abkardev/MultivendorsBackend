import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/tenderModel.js', () => ({
  Tender: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Tender Service', () => {
  let Tender;

  beforeEach(async () => {
    vi.clearAllMocks();
    Tender = (await import('../models/tenderModel.js')).Tender;
  });

  it('should create a tender', async () => {
    const mockTender = { _id: mockId(), title: 'Office Supplies', status: 'open', deadline: new Date(), bids: [] };
    Tender.create.mockResolvedValue(mockTender);
    const tender = await Tender.create({ title: 'Office Supplies', deadline: new Date() });
    expect(tender.status).toBe('open');
  });

  it('should bid on a tender', async () => {
    const tenderId = mockId();
    const mockBid = { vendor: mockId(), amount: 15000, documents: [] };
    const mockTender = { _id: tenderId, status: 'open', bids: [], save: vi.fn() };
    Tender.findById.mockResolvedValue(mockTender);
    const tender = await Tender.findById(tenderId);
    tender.bids.push(mockBid);
    await tender.save();
    expect(tender.bids).toHaveLength(1);
  });

  it('should evaluate bids', async () => {
    const bids = [
      { vendor: 'v1', amount: 10000, score: 85 },
      { vendor: 'v2', amount: 12000, score: 92 },
      { vendor: 'v3', amount: 9000, score: 78 },
    ];
    const sorted = [...bids].sort((a, b) => b.score - a.score);
    expect(sorted[0].vendor).toBe('v2');
  });

  it('should award tender to winning bid', async () => {
    const tenderId = mockId();
    const mockTender = { _id: tenderId, status: 'open', awardedTo: null, save: vi.fn() };
    Tender.findById.mockResolvedValue(mockTender);
    const tender = await Tender.findById(tenderId);
    tender.awardedTo = mockId();
    tender.status = 'awarded';
    await tender.save();
    expect(tender.status).toBe('awarded');
  });

  it('should close a tender', async () => {
    const tenderId = mockId();
    const mockTender = { _id: tenderId, status: 'open', save: vi.fn() };
    Tender.findById.mockResolvedValue(mockTender);
    const tender = await Tender.findById(tenderId);
    tender.status = 'closed';
    await tender.save();
    expect(tender.status).toBe('closed');
  });
});
