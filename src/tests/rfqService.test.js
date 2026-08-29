import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/rfqTemplateModel.js', () => ({
  RFQ: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('RFQ Service', () => {
  let RFQ;

  beforeEach(async () => {
    vi.clearAllMocks();
    RFQ = (await import('../models/rfqTemplateModel.js')).RFQ;
  });

  it('should create an RFQ', async () => {
    const mockRfq = { _id: mockId(), buyer: mockId(), title: 'Need 100 units', status: 'open', responses: [] };
    RFQ.create.mockResolvedValue(mockRfq);
    const rfq = await RFQ.create({ buyer: mockRfq.buyer, title: 'Need 100 units' });
    expect(rfq.status).toBe('open');
  });

  it('should submit a response to RFQ', async () => {
    const rfqId = mockId();
    const mockResponse = { vendor: mockId(), price: 5000, deliveryDays: 14 };
    const mockRfq = { _id: rfqId, status: 'open', responses: [], save: vi.fn() };
    RFQ.findById.mockResolvedValue(mockRfq);
    const rfq = await RFQ.findById(rfqId);
    rfq.responses.push(mockResponse);
    await rfq.save();
    expect(rfq.responses).toHaveLength(1);
  });

  it('should award RFQ to vendor', async () => {
    const rfqId = mockId();
    const mockRfq = { _id: rfqId, status: 'open', awardedTo: null, save: vi.fn() };
    RFQ.findById.mockResolvedValue(mockRfq);
    const rfq = await RFQ.findById(rfqId);
    rfq.awardedTo = mockId();
    rfq.status = 'awarded';
    await rfq.save();
    expect(rfq.status).toBe('awarded');
  });

  it('should close an RFQ', async () => {
    const rfqId = mockId();
    const mockRfq = { _id: rfqId, status: 'open', save: vi.fn() };
    RFQ.findById.mockResolvedValue(mockRfq);
    const rfq = await RFQ.findById(rfqId);
    rfq.status = 'closed';
    await rfq.save();
    expect(rfq.status).toBe('closed');
  });

  it('should list open RFQs', async () => {
    RFQ.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), status: 'open' }]) });
    RFQ.countDocuments.mockResolvedValue(1);
    const rfqs = await RFQ.find({ status: 'open' }).sort({ createdAt: -1 });
    expect(rfqs).toHaveLength(1);
  });
});
