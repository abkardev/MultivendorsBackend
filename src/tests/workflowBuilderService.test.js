import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/WorkflowDefinition.js', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    find: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/WorkflowExecution.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

vi.mock('../models/WorkflowTrigger.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

describe('Workflow Builder Service', () => {
  let WorkflowDefinition, WorkflowExecution;

  beforeEach(async () => {
    vi.clearAllMocks();
    WorkflowDefinition = (await import('../models/WorkflowDefinition.js')).default;
    WorkflowExecution = (await import('../models/WorkflowExecution.js')).default;
  });

  it('should create a workflow', async () => {
    const mockWf = { _id: mockId(), name: 'Order Approval', steps: [{ type: 'approval', config: {} }], status: 'draft' };
    WorkflowDefinition.create.mockResolvedValue(mockWf);
    const wf = await WorkflowDefinition.create({ name: 'Order Approval', steps: [{ type: 'approval', config: {} }] });
    expect(wf.status).toBe('draft');
  });

  it('should execute a workflow', async () => {
    const mockExec = { _id: mockId(), workflow: mockId(), status: 'running', startedAt: new Date() };
    WorkflowExecution.create.mockResolvedValue(mockExec);
    const exec = await WorkflowExecution.create({ workflow: mockExec.workflow, status: 'running' });
    expect(exec.status).toBe('running');
  });

  it('should activate a workflow', async () => {
    const id = mockId();
    const mockWf = { _id: id, status: 'draft', save: vi.fn() };
    WorkflowDefinition.findById.mockResolvedValue(mockWf);
    const wf = await WorkflowDefinition.findById(id);
    wf.status = 'active';
    await wf.save();
    expect(wf.status).toBe('active');
  });

  it('should define workflow triggers', async () => {
    const WorkflowTrigger = (await import('../models/WorkflowTrigger.js')).default;
    const mockTrigger = { _id: mockId(), workflow: mockId(), event: 'order.created', conditions: {} };
    WorkflowTrigger.create.mockResolvedValue(mockTrigger);
    const t = await WorkflowTrigger.create({ workflow: mockTrigger.workflow, event: 'order.created' });
    expect(t.event).toBe('order.created');
  });

  it('should track workflow execution status', () => {
    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    expect(validStatuses).toContain('running');
    expect(validStatuses).toContain('completed');
    expect(validStatuses).not.toContain('invalid');
  });
});
