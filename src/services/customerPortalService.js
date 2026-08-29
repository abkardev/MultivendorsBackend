import mongoose from 'mongoose';
import { CustomerPortal } from '../models/CustomerPortal.js';
import { DownloadPackage } from '../models/DownloadPackage.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { EnterpriseLicense } from '../models/EnterpriseLicense.js';
import { logAuditEvent } from './auditService.js';

class CustomerPortalService {
  async createPortal(tenantId, data) {
    const existing = await CustomerPortal.findOne({ tenant: tenantId });
    if (existing) throw new Error('Portal already exists for this tenant');
    const portal = await CustomerPortal.create({ tenant: tenantId, ...data });
    await logAuditEvent({
      action: 'portal.create',
      category: 'portal',
      entityType: 'CustomerPortal',
      entityId: portal._id,
      newValue: { tenant: tenantId, domain: portal.domain },
      description: `Customer portal created for tenant ${tenantId}`,
    });
    return portal;
  }

  async updatePortal(id, data) {
    const old = await CustomerPortal.findById(id);
    if (!old) throw new Error('Portal not found');
    Object.assign(old, data);
    await old.save();
    await logAuditEvent({
      action: 'portal.update',
      category: 'portal',
      entityType: 'CustomerPortal',
      entityId: id,
      description: `Customer portal updated: ${old.domain}`,
    });
    return old;
  }

  async getPortal(tenantId) {
    const portal = await CustomerPortal.findOne({ tenant: tenantId }).lean();
    if (!portal) throw new Error('Portal not found for this tenant');
    return portal;
  }

  async listPortals(filter = {}) {
    const { page = 1, limit = 20, search, isActive, sort = '-createdAt' } = filter;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true' || isActive === true;
    if (search) {
      query.$or = [
        { domain: { $regex: search, $options: 'i' } },
        { 'branding.companyName': { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [portals, total] = await Promise.all([
      CustomerPortal.find(query).sort(sortObj).skip(skip).limit(Number(limit)).populate('tenant', 'name domain').lean(),
      CustomerPortal.countDocuments(query),
    ]);
    return { portals, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async addDownloadPackage(data) {
    const pkg = await DownloadPackage.create(data);
    await logAuditEvent({
      action: 'portal.download_package_add',
      category: 'portal',
      entityType: 'DownloadPackage',
      entityId: pkg._id,
      newValue: { name: pkg.name, version: pkg.version, type: pkg.type, platform: pkg.platform },
      description: `Download package added: ${pkg.name} v${pkg.version} (${pkg.platform})`,
    });
    return pkg;
  }

  async updateDownloadPackage(id, data) {
    const pkg = await DownloadPackage.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    if (!pkg) throw new Error('Download package not found');
    await logAuditEvent({
      action: 'portal.download_package_update',
      category: 'portal',
      entityType: 'DownloadPackage',
      entityId: id,
      description: `Download package updated: ${pkg.name}`,
    });
    return pkg;
  }

  async listDownloadPackages(filter = {}) {
    const { page = 1, limit = 20, type, platform, search, sort = '-createdAt' } = filter;
    const query = { isActive: true };
    if (type) query.type = type;
    if (platform) query.platform = platform;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { version: { $regex: search, $options: 'i' } },
      ];
    }
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [packages, total] = await Promise.all([
      DownloadPackage.find(query).sort(sortObj).skip(skip).limit(Number(limit)).lean(),
      DownloadPackage.countDocuments(query),
    ]);
    return { packages, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async getDownloadPackage(id) {
    const pkg = await DownloadPackage.findById(id).lean();
    if (!pkg) throw new Error('Download package not found');
    return { ...pkg, downloadUrl: pkg.fileUrl || `/api/portal/downloads/${pkg._id}/file` };
  }

  async recordDownload(id) {
    const pkg = await DownloadPackage.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } }, { new: true });
    if (!pkg) throw new Error('Download package not found');
    return pkg;
  }

  async createTicket(portalId, data) {
    const portal = await CustomerPortal.findById(portalId);
    if (!portal) throw new Error('Portal not found');
    const ticket = await SupportTicket.create({ portal: portalId, tenant: portal.tenant, ...data });
    await logAuditEvent({
      action: 'portal.ticket_create',
      category: 'portal',
      entityType: 'SupportTicket',
      entityId: ticket._id,
      newValue: { subject: ticket.subject, priority: ticket.priority },
      description: `Support ticket created: ${ticket.subject}`,
    });
    return ticket;
  }

  async updateTicket(id, data) {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) throw new Error('Ticket not found');
    Object.assign(ticket, data);
    await ticket.save();
    await logAuditEvent({
      action: 'portal.ticket_update',
      category: 'portal',
      entityType: 'SupportTicket',
      entityId: id,
      oldValue: { status: ticket.status, priority: ticket.priority },
      newValue: { status: ticket.status, priority: ticket.priority },
      description: `Support ticket updated: ${ticket.subject}`,
    });
    return ticket;
  }

  async getTicket(id) {
    const ticket = await SupportTicket.findById(id).populate('assignedTo', 'name email').lean();
    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  }

  async listTickets(portalId, filter = {}) {
    const { page = 1, limit = 20, status, priority, category, sort = '-createdAt' } = filter;
    const query = { portal: portalId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;
    const sortObj = {};
    if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1;
    else sortObj[sort] = 1;
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(query).sort(sortObj).skip(skip).limit(Number(limit))
        .populate('assignedTo', 'name email')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);
    return { tickets, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async addTicketMessage(ticketId, message) {
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'closed') throw new Error('Cannot add message to a closed ticket');
    ticket.messages.push({
      ...message,
      createdAt: new Date(),
    });
    if (ticket.status === 'open') ticket.status = 'in_progress';
    await ticket.save();
    return ticket;
  }

  async closeTicket(id, satisfaction) {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) throw new Error('Ticket not found');
    if (ticket.status === 'closed') throw new Error('Ticket is already closed');
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    if (satisfaction !== undefined) ticket.satisfaction = satisfaction;
    await ticket.save();
    await logAuditEvent({
      action: 'portal.ticket_close',
      category: 'portal',
      entityType: 'SupportTicket',
      entityId: id,
      oldValue: { status: ticket.status },
      newValue: { status: 'closed', satisfaction },
      description: `Support ticket closed: ${ticket.subject}`,
    });
    return ticket;
  }

  async getPortalAnalytics(portalId) {
    const portal = await CustomerPortal.findById(portalId).lean();
    if (!portal) throw new Error('Portal not found');
    const [totalTickets, openTickets, resolvedTickets, totalDownloads, recentTickets] = await Promise.all([
      SupportTicket.countDocuments({ portal: portalId }),
      SupportTicket.countDocuments({ portal: portalId, status: { $nin: ['closed', 'resolved'] } }),
      SupportTicket.countDocuments({ portal: portalId, status: { $in: ['closed', 'resolved'] } }),
      DownloadPackage.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
      SupportTicket.find({ portal: portalId }).sort({ createdAt: -1 }).limit(5)
        .select('subject status priority createdAt')
        .lean(),
    ]);
    const ticketStatuses = await SupportTicket.aggregate([
      { $match: { portal: new mongoose.Types.ObjectId(portalId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return {
      portalId,
      tickets: { total: totalTickets, open: openTickets, resolved: resolvedTickets, byStatus: ticketStatuses.reduce((acc, s) => { acc[s._id] = s.count; return acc; }, {}) },
      downloads: totalDownloads[0]?.total || 0,
      recentTickets,
    };
  }

  async getLicenseDownloads(licenseId) {
    const license = await EnterpriseLicense.findById(licenseId).lean();
    if (!license) throw new Error('License not found');
    const packages = await DownloadPackage.find({
      type: { $in: ['full', 'update', 'patch'] },
      isActive: true,
    }).sort({ version: -1 }).lean();
    return { licenseId, licenseKey: license.licenseKey, edition: license.edition, availableDownloads: packages };
  }
}

export const customerPortalService = new CustomerPortalService();
