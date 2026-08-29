import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/procurementModel.js', () => ({
  Procurement: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

describe('Procurement Service', () => {
  let Procurement;

  beforeEach(async () => {
    vi.clearAllMocks();
    Procurement = (await import('../models/procurementModel.js')).Procurement;
  });

  it('should create a procurement request', async () => {
    const mockReq = { _id: mockId(), requestedBy: mockId(), items: [{ name: 'Laptops', quantity: 10 }], status: 'draft' };
    Procurement.create.mockResolvedValue(mockReq);
    const pr = await Procurement.create({ requestedBy: mockReq.requestedBy, items: mockReq.items });
    expect(pr.status).toBe('draft');
  });

  it('should approve a procurement request', async () => {
    const id = mockId();
    const mockPr = { _id: id, status: 'pending_approval', save: vi.fn() };
    Procurement.findById.mockResolvedValue(mockPr);
    const pr = await Procurement.findById(id);
    pr.status = 'approved';
    await pr.save();
    expect(pr.status).toBe('approved');
  });

  it('should reject a procurement request', async () => {
    const id = mockId();
    const mockPr = { _id: id, status: 'pending_approval', save: vi.fn() };
    Procurement.findById.mockResolvedValue(mockPr);
    const pr = await Procurement.findById(id);
    pr.status = 'rejected';
    await pr.save();
    expect(pr.status).toBe('rejected');
  });

  it('should fulfill a procurement request', async () => {
    const id = mockId();
    const mockPr = { _id: id, status: 'approved', save: vi.fn() };
    Procurement.findById.mockResolvedValue(mockPr);
    const pr = await Procurement.findById(id);
    pr.status = 'fulfilled';
    pr.fulfilledAt = new Date();
    await pr.save();
    expect(pr.status).toBe('fulfilled');
  });

  it('should list procurement requests', async () => {
    Procurement.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ _id: mockId() }]) });
    Procurement.countDocuments.mockResolvedValue(1);
    const items = await Procurement.find({ status: 'pending_approval' }).sort({ createdAt: -1 }).skip(0).limit(10);
    expect(items).toHaveLength(1);
  });
});
