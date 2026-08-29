import mongoose from 'mongoose';
import { Organization } from '../models/Organization.js';
import { OrganizationRelationship } from '../models/OrganizationRelationship.js';
import { SharedWorkspace } from '../models/SharedWorkspace.js';
import { PartnerNetwork } from '../models/PartnerNetwork.js';
import { SharedProject } from '../models/SharedProject.js';
import { logAuditEvent } from './auditService.js';

class MultiOrganizationService {
  async getOrganizations(filters = {}) {
    const { search, type, size, status, page = 1, limit = 20 } = filters;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (size) filter.size = size;
    if (search) {
      filter.$or = [
        { 'name.en': { $regex: search, $options: 'i' } },
        { 'name.ar': { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Organization.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('parent', 'name slug').lean(),
      Organization.countDocuments(filter),
    ]);
    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getOrganization(id) {
    const org = await Organization.findById(id).populate('parent', 'name slug type').lean();
    if (!org) throw new Error('Organization not found');
    const [children, relationships, workspaces] = await Promise.all([
      Organization.find({ parent: id, status: 'active' }).select('name slug type size').lean(),
      OrganizationRelationship.find({ $or: [{ sourceOrg: id }, { targetOrg: id }], status: { $ne: 'terminated' } }).populate('sourceOrg', 'name slug').populate('targetOrg', 'name slug').lean(),
      SharedWorkspace.find({ organizations: id, status: 'active' }).select('name description').lean(),
    ]);
    return { ...org, children, relationships, workspaces };
  }

  async createOrganization(userId, data) {
    const existing = await Organization.findOne({ slug: data.slug });
    if (existing) throw new Error(`Organization with slug "${data.slug}" already exists`);
    if (data.parent) {
      const parent = await Organization.findById(data.parent);
      if (!parent) throw new Error('Parent organization not found');
    }
    const org = await Organization.create(data);
    await logAuditEvent({
      userId, action: 'org.create', category: 'organization',
      entityType: 'Organization', entityId: org._id,
      newValue: { name: org.name, slug: org.slug, type: org.type, size: org.size },
      description: `Organization "${org.name.en}" created`,
    });
    return org;
  }

  async updateOrganization(userId, id, data) {
    const old = await Organization.findById(id);
    if (!old) throw new Error('Organization not found');
    if (data.slug && data.slug !== old.slug) {
      const dup = await Organization.findOne({ slug: data.slug, _id: { $ne: id } });
      if (dup) throw new Error(`Slug "${data.slug}" already in use`);
    }
    if (data.parent && data.parent.toString() === id.toString()) {
      throw new Error('Organization cannot be its own parent');
    }
    const org = await Organization.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    await logAuditEvent({
      userId, action: 'org.update', category: 'organization',
      entityType: 'Organization', entityId: id,
      oldValue: { name: old.name, status: old.status, type: old.type },
      newValue: { name: org.name, status: org.status, type: org.type },
      description: `Organization "${org.name.en}" updated`,
    });
    return org;
  }

  async getOrganizationTree(id) {
    const org = await Organization.findById(id).lean();
    if (!org) throw new Error('Organization not found');
    const buildTree = async (parentId) => {
      const children = await Organization.find({ parent: parentId, status: 'active' }).select('name slug type size').lean();
      const childrenWithTree = await Promise.all(
        children.map(async (child) => ({
          ...child,
          children: await buildTree(child._id),
        })),
      );
      return childrenWithTree;
    };
    const children = await buildTree(id);
    const parents = [];
    let current = org;
    while (current.parent) {
      const parent = await Organization.findById(current.parent).lean();
      if (parent) {
        parents.unshift({ _id: parent._id, name: parent.name, slug: parent.slug });
        current = parent;
      } else break;
    }
    return { ...org, parents, children };
  }

  async createRelationship(userId, data) {
    const sourceOrg = await Organization.findById(data.sourceOrg);
    if (!sourceOrg) throw new Error('Source organization not found');
    const targetOrg = await Organization.findById(data.targetOrg);
    if (!targetOrg) throw new Error('Target organization not found');
    const existing = await OrganizationRelationship.findOne({ sourceOrg: data.sourceOrg, targetOrg: data.targetOrg });
    if (existing) throw new Error('Relationship already exists between these organizations');
    const relationship = await OrganizationRelationship.create({
      ...data,
      establishedAt: new Date(),
      status: 'pending',
    });
    await logAuditEvent({
      userId, action: 'org.relationship.create', category: 'organization',
      entityType: 'OrganizationRelationship', entityId: relationship._id,
      newValue: { sourceOrg: data.sourceOrg, targetOrg: data.targetOrg, type: data.type },
      description: `Relationship created between "${sourceOrg.name.en}" and "${targetOrg.name.en}"`,
    });
    return relationship;
  }

  async getRelationships(orgId) {
    const org = await Organization.findById(orgId).lean();
    if (!org) throw new Error('Organization not found');
    const relationships = await OrganizationRelationship.find({
      $or: [{ sourceOrg: orgId }, { targetOrg: orgId }],
    }).populate('sourceOrg', 'name slug type').populate('targetOrg', 'name slug type').sort({ createdAt: -1 }).lean();
    return relationships;
  }

  async updateRelationship(userId, id, data) {
    const relationship = await OrganizationRelationship.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!relationship) throw new Error('Relationship not found');
    await logAuditEvent({
      userId, action: 'org.relationship.update', category: 'organization',
      entityType: 'OrganizationRelationship', entityId: id,
      newValue: { status: relationship.status, type: relationship.type },
      description: `Relationship ${id} updated`,
    });
    return relationship;
  }

  async terminateRelationship(userId, id) {
    const relationship = await OrganizationRelationship.findById(id);
    if (!relationship) throw new Error('Relationship not found');
    relationship.status = 'terminated';
    await relationship.save();
    await logAuditEvent({
      userId, action: 'org.relationship.terminate', category: 'organization',
      entityType: 'OrganizationRelationship', entityId: id,
      oldValue: { status: relationship._original?.status || 'active' },
      newValue: { status: 'terminated' },
      description: `Relationship ${id} terminated`,
    });
    return relationship;
  }

  async getWorkspaces(orgId) {
    const workspaces = await SharedWorkspace.find({ organizations: orgId, status: 'active' }).populate('organizations', 'name slug').populate('members.user', 'name email').sort({ createdAt: -1 }).lean();
    return workspaces;
  }

  async createWorkspace(userId, data) {
    if (!data.organizations || data.organizations.length === 0) throw new Error('At least one organization is required');
    const orgCount = await Organization.countDocuments({ _id: { $in: data.organizations } });
    if (orgCount !== data.organizations.length) throw new Error('One or more organizations not found');
    const members = data.members || [];
    if (members.length === 0) {
      members.push({ user: userId, role: 'admin' });
    }
    const workspace = await SharedWorkspace.create({
      name: data.name,
      description: data.description,
      organizations: data.organizations,
      members,
      settings: data.settings || {},
    });
    await logAuditEvent({
      userId, action: 'org.workspace.create', category: 'organization',
      entityType: 'SharedWorkspace', entityId: workspace._id,
      newValue: { name: workspace.name, orgCount: data.organizations.length, memberCount: members.length },
      description: `Workspace "${workspace.name}" created`,
    });
    return workspace;
  }

  async updateWorkspace(userId, id, data) {
    const workspace = await SharedWorkspace.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!workspace) throw new Error('Workspace not found');
    await logAuditEvent({
      userId, action: 'org.workspace.update', category: 'organization',
      entityType: 'SharedWorkspace', entityId: id,
      newValue: { name: workspace.name },
      description: `Workspace "${workspace.name}" updated`,
    });
    return workspace;
  }

  async deleteWorkspace(userId, id) {
    const workspace = await SharedWorkspace.findById(id);
    if (!workspace) throw new Error('Workspace not found');
    workspace.status = 'archived';
    await workspace.save();
    await SharedProject.updateMany({ workspace: id }, { $set: { status: 'archived' } });
    await logAuditEvent({
      userId, action: 'org.workspace.delete', category: 'organization',
      entityType: 'SharedWorkspace', entityId: id,
      oldValue: { status: 'active' },
      newValue: { status: 'archived' },
      description: `Workspace "${workspace.name}" archived`,
    });
    return { message: 'Workspace archived', id };
  }

  async addWorkspaceMember(userId, workspaceId, data) {
    const workspace = await SharedWorkspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    if (workspace.status !== 'active') throw new Error('Workspace is not active');
    const existingMember = workspace.members.find(m => m.user?.toString() === data.userId);
    if (existingMember) throw new Error('User is already a member of this workspace');
    workspace.members.push({ user: data.userId, role: data.role || 'viewer' });
    await workspace.save();
    await logAuditEvent({
      userId, action: 'org.workspace.member.add', category: 'organization',
      entityType: 'SharedWorkspace', entityId: workspaceId,
      newValue: { addedUserId: data.userId, role: data.role || 'viewer' },
      description: `Member ${data.userId} added to workspace "${workspace.name}"`,
    });
    return workspace;
  }

  async removeWorkspaceMember(userId, workspaceId, memberId) {
    const workspace = await SharedWorkspace.findById(workspaceId);
    if (!workspace) throw new Error('Workspace not found');
    const idx = workspace.members.findIndex(m => m.user?.toString() === memberId);
    if (idx === -1) throw new Error('Member not found in workspace');
    if (workspace.members[idx].role === 'admin') {
      const adminCount = workspace.members.filter(m => m.role === 'admin').length;
      if (adminCount <= 1) throw new Error('Cannot remove the last admin');
    }
    workspace.members.splice(idx, 1);
    await workspace.save();
    await logAuditEvent({
      userId, action: 'org.workspace.member.remove', category: 'organization',
      entityType: 'SharedWorkspace', entityId: workspaceId,
      newValue: { removedUserId: memberId },
      description: `Member ${memberId} removed from workspace "${workspace.name}"`,
    });
    return workspace;
  }

  async getPartnerNetwork(orgId) {
    let network = await PartnerNetwork.findOne({ organization: orgId }).populate('partners.organization', 'name slug type industry').lean();
    if (!network) {
      network = { organization: orgId, partners: [], networkSettings: {} };
    }
    return network;
  }

  async addPartner(userId, orgId, partnerId, type) {
    const org = await Organization.findById(orgId);
    if (!org) throw new Error('Organization not found');
    const partner = await Organization.findById(partnerId);
    if (!partner) throw new Error('Partner organization not found');
    if (orgId === partnerId) throw new Error('Organization cannot be a partner of itself');
    let network = await PartnerNetwork.findOne({ organization: orgId });
    if (!network) {
      network = await PartnerNetwork.create({ organization: orgId, partners: [] });
    }
    const existing = network.partners.find(p => p.organization?.toString() === partnerId);
    if (existing) throw new Error('Partner already in network');
    network.partners.push({ organization: partnerId, relationshipType: type || 'partner', status: 'pending' });
    await network.save();
    const reverseNetwork = await PartnerNetwork.findOne({ organization: partnerId });
    if (reverseNetwork) {
      const reverseExisting = reverseNetwork.partners.find(p => p.organization?.toString() === orgId);
      if (!reverseExisting) {
        reverseNetwork.partners.push({ organization: orgId, relationshipType: type || 'partner', status: 'pending' });
        await reverseNetwork.save();
      }
    } else {
      await PartnerNetwork.create({ organization: partnerId, partners: [{ organization: orgId, relationshipType: type || 'partner', status: 'pending' }] });
    }
    await logAuditEvent({
      userId, action: 'org.partner.add', category: 'organization',
      entityType: 'PartnerNetwork', entityId: network._id,
      newValue: { orgId, partnerId, type: type || 'partner' },
      description: `Partner "${partner.name.en}" added to network of "${org.name.en}"`,
    });
    return network;
  }

  async removePartner(userId, orgId, partnerId) {
    const network = await PartnerNetwork.findOne({ organization: orgId });
    if (!network) throw new Error('Partner network not found');
    const idx = network.partners.findIndex(p => p.organization?.toString() === partnerId);
    if (idx === -1) throw new Error('Partner not found in network');
    network.partners.splice(idx, 1);
    await network.save();
    const reverseNetwork = await PartnerNetwork.findOne({ organization: partnerId });
    if (reverseNetwork) {
      const revIdx = reverseNetwork.partners.findIndex(p => p.organization?.toString() === orgId);
      if (revIdx !== -1) {
        reverseNetwork.partners.splice(revIdx, 1);
        await reverseNetwork.save();
      }
    }
    await logAuditEvent({
      userId, action: 'org.partner.remove', category: 'organization',
      entityType: 'PartnerNetwork', entityId: network._id,
      newValue: { removedPartnerId: partnerId },
      description: `Partner ${partnerId} removed from network of org ${orgId}`,
    });
    return { message: 'Partner removed', orgId, partnerId };
  }

  async getSharedProjects(workspaceId) {
    const workspace = await SharedWorkspace.findById(workspaceId).lean();
    if (!workspace) throw new Error('Workspace not found');
    const projects = await SharedProject.find({ workspace: workspaceId, status: { $ne: 'archived' } }).populate('organizations', 'name slug').sort({ createdAt: -1 }).lean();
    return projects;
  }

  async createSharedProject(userId, data) {
    const workspace = await SharedWorkspace.findById(data.workspace);
    if (!workspace) throw new Error('Workspace not found');
    if (workspace.status !== 'active') throw new Error('Workspace is not active');
    if (!data.organizations || data.organizations.length === 0) throw new Error('At least one organization is required');
    const project = await SharedProject.create({
      workspace: data.workspace,
      name: data.name,
      description: data.description,
      organizations: data.organizations,
      items: data.items || [],
    });
    await logAuditEvent({
      userId, action: 'org.project.create', category: 'organization',
      entityType: 'SharedProject', entityId: project._id,
      newValue: { name: project.name, workspace: data.workspace, orgCount: data.organizations.length },
      description: `Shared project "${project.name}" created`,
    });
    return project;
  }

  async shareItem(userId, projectId, item) {
    const project = await SharedProject.findById(projectId);
    if (!project) throw new Error('Shared project not found');
    if (project.status !== 'active') throw new Error('Project is not active');
    if (!item.type || !item.itemId) throw new Error('Item type and itemId are required');
    project.items.push({ type: item.type, itemId: item.itemId, sharedBy: userId, sharedAt: new Date() });
    await project.save();
    await logAuditEvent({
      userId, action: 'org.project.share_item', category: 'organization',
      entityType: 'SharedProject', entityId: projectId,
      newValue: { itemType: item.type, itemId: item.itemId },
      description: `Item ${item.type}:${item.itemId} shared in project "${project.name}"`,
    });
    return project;
  }

  async getOrganizationsAnalytics() {
    const [totalOrgs, byType, bySize, byStatus, totalRelationships, totalWorkspaces, totalProjects] = await Promise.all([
      Organization.countDocuments(),
      Organization.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Organization.aggregate([{ $group: { _id: '$size', count: { $sum: 1 } } }]),
      Organization.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      OrganizationRelationship.countDocuments({ status: { $ne: 'terminated' } }),
      SharedWorkspace.countDocuments({ status: 'active' }),
      SharedProject.countDocuments({ status: 'active' }),
    ]);
    const typeBreakdown = {};
    for (const t of byType) typeBreakdown[t._id] = t.count;
    const sizeBreakdown = {};
    for (const s of bySize) sizeBreakdown[s._id] = s.count;
    const statusBreakdown = {};
    for (const s of byStatus) statusBreakdown[s._id] = s.count;
    return {
      totalOrganizations: totalOrgs,
      byType: typeBreakdown,
      bySize: sizeBreakdown,
      byStatus: statusBreakdown,
      totalActiveRelationships: totalRelationships,
      totalActiveWorkspaces: totalWorkspaces,
      totalActiveProjects: totalProjects,
    };
  }
}

export const multiOrganizationService = new MultiOrganizationService();
