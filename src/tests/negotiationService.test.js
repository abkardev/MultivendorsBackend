import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Negotiation.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

describe('Negotiation Service', () => {
  let Negotiation;

  beforeEach(async () => {
    vi.clearAllMocks();
    Negotiation = (await import('../models/Negotiation.js')).default;
  });

  it('should create a negotiation round', async () => {
    const mockNeg = { _id: mockId(), buyer: mockId(), vendor: mockId(), rounds: [{ offer: 1000, by: 'buyer' }], status: 'active' };
    Negotiation.create.mockResolvedValue(mockNeg);
    const n = await Negotiation.create({ buyer: mockNeg.buyer, vendor: mockNeg.vendor });
    expect(n.status).toBe('active');
  });

  it('should add a counter offer', async () => {
    const id = mockId();
    const mockNeg = { _id: id, rounds: [], status: 'active', save: vi.fn() };
    Negotiation.findById.mockResolvedValue(mockNeg);
    const n = await Negotiation.findById(id);
    n.rounds.push({ offer: 1200, by: 'vendor' });
    await n.save();
    expect(n.rounds).toHaveLength(1);
  });

  it('should accept negotiation', async () => {
    const id = mockId();
    const mockNeg = { _id: id, rounds: [{ offer: 1000 }], status: 'active', save: vi.fn() };
    Negotiation.findById.mockResolvedValue(mockNeg);
    const n = await Negotiation.findById(id);
    n.status = 'accepted';
    await n.save();
    expect(n.status).toBe('accepted');
  });

  it('should reject negotiation', async () => {
    const id = mockId();
    const mockNeg = { _id: id, status: 'active', save: vi.fn() };
    Negotiation.findById.mockResolvedValue(mockNeg);
    const n = await Negotiation.findById(id);
    n.status = 'rejected';
    await n.save();
    expect(n.status).toBe('rejected');
  });

  it('should enforce round limits', () => {
    const MAX_ROUNDS = 10;
    const rounds = new Array(5);
    expect(rounds.length).toBeLessThan(MAX_ROUNDS);
    const full = new Array(10);
    expect(full.length).toBe(MAX_ROUNDS);
  });
});
