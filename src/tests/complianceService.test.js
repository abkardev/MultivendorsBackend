import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/ComplianceVerification.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/DocumentVerificationFile.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('Compliance Service', () => {
  let ComplianceVerification;

  beforeEach(async () => {
    vi.clearAllMocks();
    ComplianceVerification = (await import('../models/ComplianceVerification.js')).default;
  });

  it('should create a verification request', async () => {
    const mockVerification = { _id: mockId(), vendor: mockId(), documentType: 'tax_certificate', status: 'pending' };
    ComplianceVerification.create.mockResolvedValue(mockVerification);
    const v = await ComplianceVerification.create({ vendor: mockVerification.vendor, documentType: 'tax_certificate' });
    expect(v.status).toBe('pending');
  });

  it('should approve verification', async () => {
    const id = mockId();
    const mockV = { _id: id, status: 'pending', save: vi.fn() };
    ComplianceVerification.findById.mockResolvedValue(mockV);
    const v = await ComplianceVerification.findById(id);
    v.status = 'approved';
    v.approvedAt = new Date();
    await v.save();
    expect(v.status).toBe('approved');
  });

  it('should reject verification', async () => {
    const id = mockId();
    const mockV = { _id: id, status: 'pending', save: vi.fn() };
    ComplianceVerification.findById.mockResolvedValue(mockV);
    const v = await ComplianceVerification.findById(id);
    v.status = 'rejected';
    v.rejectionReason = 'Invalid document';
    await v.save();
    expect(v.status).toBe('rejected');
  });

  it('should list pending verifications', async () => {
    ComplianceVerification.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), status: 'pending' }]) });
    const list = await ComplianceVerification.find({ status: 'pending' }).sort({ createdAt: -1 });
    expect(list).toHaveLength(1);
  });

  it('should count verifications by status', async () => {
    ComplianceVerification.countDocuments.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
    const pending = await ComplianceVerification.countDocuments({ status: 'pending' });
    const approved = await ComplianceVerification.countDocuments({ status: 'approved' });
    expect(pending).toBe(5);
    expect(approved).toBe(2);
  });
});
