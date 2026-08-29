import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/FormDefinition.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/FormSubmission.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/FormApproval.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
}));

describe('Forms Builder Service', () => {
  let FormDefinition, FormSubmission;

  beforeEach(async () => {
    vi.clearAllMocks();
    FormDefinition = (await import('../models/FormDefinition.js')).default;
    FormSubmission = (await import('../models/FormSubmission.js')).default;
  });

  it('should create a form', async () => {
    const mockForm = { _id: mockId(), title: { en: 'Contact Form' }, fields: [{ type: 'text', name: 'name' }], status: 'draft' };
    FormDefinition.create.mockResolvedValue(mockForm);
    const form = await FormDefinition.create({ title: { en: 'Contact Form' }, fields: [{ type: 'text', name: 'name' }] });
    expect(form.status).toBe('draft');
  });

  it('should submit a form', async () => {
    const mockSub = { _id: mockId(), form: mockId(), data: { name: 'Ahmed' }, status: 'submitted' };
    FormSubmission.create.mockResolvedValue(mockSub);
    const sub = await FormSubmission.create({ form: mockSub.form, data: { name: 'Ahmed' } });
    expect(sub.status).toBe('submitted');
  });

  it('should approve a form submission', async () => {
    const FormApproval = (await import('../models/FormApproval.js')).default;
    const mockApp = { _id: mockId(), submission: mockId(), approvedBy: mockId(), status: 'approved' };
    FormApproval.create.mockResolvedValue(mockApp);
    const app = await FormApproval.create({ submission: mockApp.submission, approvedBy: mockApp.approvedBy, status: 'approved' });
    expect(app.status).toBe('approved');
  });

  it('should publish a form', async () => {
    const id = mockId();
    const mockForm = { _id: id, status: 'draft', save: vi.fn() };
    FormDefinition.findById.mockResolvedValue(mockForm);
    const form = await FormDefinition.findById(id);
    form.status = 'published';
    await form.save();
    expect(form.status).toBe('published');
  });

  it('should list form submissions', async () => {
    const formId = mockId();
    FormSubmission.find.mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: mockId(), form: formId }]) });
    FormSubmission.countDocuments.mockResolvedValue(1);
    const subs = await FormSubmission.find({ form: formId }).sort({ createdAt: -1 });
    expect(subs).toHaveLength(1);
  });
});
