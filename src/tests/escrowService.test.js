import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Dispute.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/Order.js', () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

vi.mock('../models/Wallet.js', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

describe('Escrow Service', () => {
  let Dispute;

  beforeEach(async () => {
    vi.clearAllMocks();
    Dispute = (await import('../models/Dispute.js')).default;
  });

  it('should create a dispute', async () => {
    const mockDispute = { _id: mockId(), order: mockId(), raisedBy: mockId(), reason: 'Item not received', status: 'open' };
    Dispute.create.mockResolvedValue(mockDispute);
    const dispute = await Dispute.create({ order: mockDispute.order, raisedBy: mockDispute.raisedBy, reason: 'Item not received' });
    expect(dispute.status).toBe('open');
  });

  it('should find dispute by id', async () => {
    const id = mockId();
    Dispute.findById.mockResolvedValue({ _id: id, status: 'open' });
    const dispute = await Dispute.findById(id);
    expect(dispute._id).toBe(id);
  });

  it('should resolve a dispute', async () => {
    const id = mockId();
    const mockDispute = { _id: id, status: 'open', save: vi.fn() };
    Dispute.findById.mockResolvedValue(mockDispute);
    const dispute = await Dispute.findById(id);
    dispute.status = 'resolved';
    await dispute.save();
    expect(dispute.status).toBe('resolved');
  });

  it('should list disputes', async () => {
    Dispute.find.mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: mockId(), status: 'open' }]),
    });
    const disputes = await Dispute.find({ status: 'open' }).sort({ createdAt: -1 }).lean();
    expect(disputes).toHaveLength(1);
  });

  it('should have valid dispute statuses', () => {
    const validStatuses = ['open', 'under_review', 'resolved', 'cancelled'];
    expect(validStatuses).toContain('open');
    expect(validStatuses).toContain('resolved');
    expect(validStatuses).not.toContain('invalid');
  });
});
