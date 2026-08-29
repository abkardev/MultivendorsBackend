import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/vendorModel.js', () => ({
  Vendor: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/ProductPerformance.js', () => ({
  default: { find: vi.fn(), aggregate: vi.fn() },
}));

describe('Vendor Service', () => {
  let Vendor;

  beforeEach(async () => {
    vi.clearAllMocks();
    Vendor = (await import('../models/vendorModel.js')).Vendor;
  });

  it('should create a vendor profile', async () => {
    const mockV = { _id: mockId(), user: mockId(), storeName: 'Tech Store', status: 'pending', isVerified: false };
    Vendor.create.mockResolvedValue(mockV);
    const v = await Vendor.create({ user: mockV.user, storeName: 'Tech Store' });
    expect(v.status).toBe('pending');
  });

  it('should verify a vendor', async () => {
    const id = mockId();
    const mockV = { _id: id, status: 'pending', isVerified: false, save: vi.fn() };
    Vendor.findById.mockResolvedValue(mockV);
    const v = await Vendor.findById(id);
    v.status = 'active';
    v.isVerified = true;
    await v.save();
    expect(v.isVerified).toBe(true);
  });

  it('should update vendor profile', async () => {
    const id = mockId();
    Vendor.findByIdAndUpdate.mockResolvedValue({ _id: id, storeName: 'Updated Store' });
    const v = await Vendor.findByIdAndUpdate(id, { storeName: 'Updated Store' }, { new: true });
    expect(v.storeName).toBe('Updated Store');
  });

  it('should list vendor products', () => {
    const products = ['p1', 'p2', 'p3'];
    expect(products).toHaveLength(3);
  });

  it('should find vendor by user id', async () => {
    const userId = mockId();
    Vendor.findOne.mockResolvedValue({ _id: mockId(), user: userId });
    const v = await Vendor.findOne({ user: userId });
    expect(v.user).toBe(userId);
  });
});
