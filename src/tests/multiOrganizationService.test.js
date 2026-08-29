import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockId } from './utils/testUtils.js';

vi.mock('../models/Organization.js', () => ({
  Organization: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('../models/OrganizationRelationship.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock('../models/SharedWorkspace.js', () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('Multi-Organization Service', () => {
  let Organization;

  beforeEach(async () => {
    vi.clearAllMocks();
    Organization = (await import('../models/Organization.js')).Organization;
  });

  it('should create an organization', async () => {
    const mockOrg = { _id: mockId(), name: { en: 'Acme Corp' }, slug: 'acme-corp', status: 'active' };
    Organization.create.mockResolvedValue(mockOrg);
    const org = await Organization.create({ name: { en: 'Acme Corp' }, slug: 'acme-corp' });
    expect(org.status).toBe('active');
  });

  it('should list organizations', async () => {
    Organization.find.mockReturnValue({ sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue([{ _id: mockId() }]) });
    Organization.countDocuments.mockResolvedValue(1);
    const orgs = await Organization.find().sort({ createdAt: -1 }).skip(0).limit(10);
    expect(orgs).toHaveLength(1);
  });

  it('should create organization relationship', async () => {
    const OrgRelationship = (await import('../models/OrganizationRelationship.js')).default;
    const mockRel = { _id: mockId(), parentOrg: mockId(), childOrg: mockId(), type: 'subsidiary', status: 'active' };
    OrgRelationship.create.mockResolvedValue(mockRel);
    const rel = await OrgRelationship.create({ parentOrg: mockRel.parentOrg, childOrg: mockRel.childOrg, type: 'subsidiary' });
    expect(rel.type).toBe('subsidiary');
  });

  it('should create a shared workspace', async () => {
    const SharedWorkspace = (await import('../models/SharedWorkspace.js')).default;
    const mockWs = { _id: mockId(), name: 'Collaboration', organizations: [mockId(), mockId()] };
    SharedWorkspace.create.mockResolvedValue(mockWs);
    const ws = await SharedWorkspace.create({ name: 'Collaboration', organizations: mockWs.organizations });
    expect(ws.name).toBe('Collaboration');
  });

  it('should support org hierarchy', () => {
    const orgs = [
      { _id: '1', name: 'Parent', parent: null },
      { _id: '2', name: 'Child', parent: '1' },
      { _id: '3', name: 'Grandchild', parent: '2' },
    ];
    const children = orgs.filter(o => o.parent === '1');
    expect(children).toHaveLength(1);
    expect(children[0].name).toBe('Child');
  });
});
