import { SupportTicket } from '../models/SupportTicket.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { SupportDepartment } from '../models/SupportDepartment.js';
import { InternalNote } from '../models/InternalNote.js';
import { CannedResponse } from '../models/CannedResponse.js';
import { SupportRating } from '../models/SupportRating.js';
import { TicketActivityLog } from '../models/TicketActivityLog.js';
import { ticketAssignmentService, emitTicketEvent } from '../services/supportService.js';

const generateTicketNumber = async () => {
  const count = await SupportTicket.countDocuments();
  return `TKT-${String(count + 1).padStart(6, '0')}`;
};

const logActivity = async ({ ticket, actor, action, from, to, description }) => {
  try {
    return TicketActivityLog.create({ ticket, actor, action, from, to, description });
  } catch {}
};

/* ─── User endpoints ─── */

export const createTicket = async (req, res) => {
  try {
    const { subject, category, department, priority, message, linkedOrder, linkedProduct, linkedRfq, linkedTender } = req.body;
    const ticketNumber = await generateTicketNumber();
    const ticket = await SupportTicket.create({
      ticketNumber, user: req.user._id, vendor: req.user.vendorId,
      subject, category, department: department || null, priority: priority || 'medium',
    });
    if (linkedOrder) ticket.linkedOrder = linkedOrder;
    if (linkedProduct) ticket.linkedProduct = linkedProduct;
    if (linkedRfq) ticket.linkedRfq = linkedRfq;
    if (linkedTender) ticket.linkedTender = linkedTender;
    await ticket.save();
    if (message) {
      await TicketMessage.create({ ticket: ticket._id, user: req.user._id, body: message, isSystemMessage: false });
    }
    await logActivity({ ticket: ticket._id, actor: req.user._id, action: 'created', description: 'Ticket created' });
    try {
      const agentId = await ticketAssignmentService.autoAssign(ticket);
      if (agentId) {
        ticket.assignedTo = agentId;
        ticket.assignedBy = req.user._id;
        ticket.assignedAt = new Date();
        await ticket.save();
        await logActivity({ ticket: ticket._id, actor: agentId, action: 'assigned', to: agentId.toString(), description: 'Auto-assigned' });
      }
    } catch {}
    emitTicketEvent(ticket._id, 'ticket:created', { ticketId: ticket._id });
    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.$text = { $search: req.query.search };
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).populate('assignedTo', 'name').lean(),
      SupportTicket.countDocuments(filter),
    ]);
    res.json({ success: true, data: tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id).populate('assignedTo', 'name email').populate('department', 'name nameAr').lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'support') {
      const isAgent = await SupportDepartment.findOne({ agents: req.user._id, isActive: true });
      if (!isAgent) return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const messages = await TicketMessage.find({ ticket: ticket._id, isInternal: false }).sort({ createdAt: 1 }).populate('user', 'name role').lean();
    const activity = await TicketActivityLog.find({ ticket: ticket._id }).sort({ createdAt: -1 }).limit(50).populate('actor', 'name').lean();
    res.json({ success: true, data: { ...ticket, messages, activity } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status === 'closed') return res.status(400).json({ success: false, message: 'Ticket is closed' });
    if (ticket.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const msg = await TicketMessage.create({ ticket: ticket._id, user: req.user._id, body: req.body.message, attachments: req.body.attachments || [] });
    const isCustomer = ticket.user?.toString() === req.user._id.toString();
    if (isCustomer && ticket.status !== 'closed') {
      ticket.status = 'waiting_support';
      await ticket.save();
    } else if (!isCustomer && ['open', 'waiting_support'].includes(ticket.status)) {
      ticket.status = 'waiting_customer';
      if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
      await ticket.save();
    }
    await logActivity({ ticket: ticket._id, actor: req.user._id, action: 'message_sent', description: req.body.message.slice(0, 100) });
    emitTicketEvent(ticket._id, 'ticket:message', { ticketId: ticket._id, message: msg });
    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const closeTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.user?.toString() !== req.user._id.toString() && req.user.role !== 'admin' && req.user.role !== 'support') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const prevStatus = ticket.status;
    ticket.status = 'closed';
    ticket.closedAt = new Date();
    ticket.closedBy = req.user._id;
    await ticket.save();
    await logActivity({ ticket: ticket._id, actor: req.user._id, action: 'closed', from: prevStatus, to: 'closed' });
    emitTicketEvent(ticket._id, 'ticket:closed', { ticketId: ticket._id });
    res.json({ success: true, message: 'Ticket closed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reopenTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (ticket.status !== 'closed' && ticket.status !== 'resolved') return res.status(400).json({ success: false, message: 'Ticket is not closed' });
    const prevStatus = ticket.status;
    ticket.status = 'reopened';
    ticket.reopenedCount = (ticket.reopenedCount || 0) + 1;
    await ticket.save();
    await logActivity({ ticket: ticket._id, actor: req.user._id, action: 'reopened', from: prevStatus, to: 'reopened' });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitRating = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket || ticket.status !== 'closed') return res.status(400).json({ success: false, message: 'Ticket must be closed before rating' });
    if (ticket.user?.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Only the ticket owner can rate' });
    const existing = await SupportRating.findOne({ ticket: req.params.id });
    if (existing) return res.status(400).json({ success: false, message: 'Already rated' });
    const rating = await SupportRating.create({ ticket: req.params.id, user: req.user._id, ...req.body });
    await logActivity({ ticket: req.params.id, actor: req.user._id, action: 'rating_submitted', description: `Rating: ${req.body.rating}/5` });
    res.json({ success: true, data: rating });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Admin / Agent endpoints ─── */

export const getAllTickets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
    if (req.query.user) filter.user = req.query.user;
    if (req.query.search) filter.$text = { $search: req.query.search };
    if (req.query.assignedToMe === 'true' && req.user.role !== 'admin') {
      filter.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter).sort({ priority: -1, updatedAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'name email companyName')
        .populate('assignedTo', 'name')
        .populate('department', 'name nameAr')
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);
    const unreadCounts = await Promise.all(tickets.map(async (t) => {
      const unread = await TicketMessage.countDocuments({ ticket: t._id, 'readBy.user': { $ne: req.user._id }, isInternal: false });
      return { ticketId: t._id, unread };
    }));
    const unreadMap = Object.fromEntries(unreadCounts.map(u => [u.ticketId.toString(), u.unread]));
    const enriched = tickets.map(t => ({ ...t, unreadCount: unreadMap[t._id.toString()] || 0 }));
    res.json({ success: true, data: enriched, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTicketDetail = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email companyName companyNameAr phone')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name')
      .populate('department', 'name nameAr')
      .populate('closedBy', 'name')
      .populate('linkedOrder linkedProduct linkedRfq linkedTender linkedInvoice linkedPayment')
      .lean();
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const messages = await TicketMessage.find({ ticket: ticket._id }).sort({ createdAt: 1 }).populate('user', 'name role').lean();
    const internalNotes = await InternalNote.find({ ticket: ticket._id }).sort({ createdAt: -1 }).populate('author', 'name').lean();
    const activity = await TicketActivityLog.find({ ticket: ticket._id }).sort({ createdAt: -1 }).limit(100).populate('actor', 'name').lean();
    const rating = await SupportRating.findOne({ ticket: ticket._id }).lean();
    res.json({ success: true, data: { ...ticket, messages, internalNotes, activity, rating } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const allowed = ['priority', 'status', 'category', 'department', 'tags'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        const from = ticket[f]?.toString();
        ticket[f] = req.body[f];
        if (from !== req.body[f]?.toString()) {
          await logActivity({ ticket: ticket._id, actor: req.user._id, action: f === 'priority' ? 'priority_changed' : 'status_changed', from, to: req.body[f]?.toString(), description: `${f} changed` });
        }
      }
    }
    await ticket.save();
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const prevAgent = ticket.assignedTo?.toString();
    ticket.assignedTo = req.body.assignedTo;
    ticket.assignedBy = req.user._id;
    ticket.assignedAt = new Date();
    await ticket.save();
    const action = prevAgent ? 'reassigned' : 'assigned';
    await logActivity({ ticket: ticket._id, actor: req.user._id, action, from: prevAgent, to: req.body.assignedTo, description: `Assigned to ${req.body.assignedTo}` });
    emitTicketEvent(ticket._id, 'ticket:assigned', { ticketId: ticket._id, assignedTo: req.body.assignedTo });
    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addInternalNote = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    const note = await InternalNote.create({ ticket: ticket._id, author: req.user._id, body: req.body.body, attachments: req.body.attachments || [] });
    await logActivity({ ticket: ticket._id, actor: req.user._id, action: 'note_added', description: 'Internal note added' });
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const mergeTickets = async (req, res) => {
  try {
    const { targetId, sourceIds } = req.body;
    const target = await SupportTicket.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'Target ticket not found' });
    for (const sid of sourceIds) {
      const src = await SupportTicket.findById(sid);
      if (!src) continue;
      await TicketMessage.updateMany({ ticket: sid }, { ticket: targetId });
      await InternalNote.updateMany({ ticket: sid }, { ticket: targetId });
      await TicketActivityLog.updateMany({ ticket: sid }, { ticket: targetId });
      src.mergedInto = targetId;
      src.status = 'closed';
      await src.save();
      target.mergedTickets.push(sid);
    }
    await target.save();
    await logActivity({ ticket: targetId, actor: req.user._id, action: 'merged', description: `Merged ${sourceIds.length} tickets` });
    res.json({ success: true, data: target });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Departments ─── */

export const getDepartments = async (req, res) => {
  try {
    const depts = await SupportDepartment.find().sort({ order: 1 }).populate('agents', 'name email').populate('lead', 'name').lean();
    res.json({ success: true, data: depts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const dept = await SupportDepartment.create(req.body);
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const dept = await SupportDepartment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Canned Responses ─── */

export const getCannedResponses = async (req, res) => {
  try {
    const responses = await CannedResponse.find({ isActive: true }).sort({ category: 1, title: 1 }).lean();
    res.json({ success: true, data: responses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createCannedResponse = async (req, res) => {
  try {
    const response = await CannedResponse.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCannedResponse = async (req, res) => {
  try {
    const r = await CannedResponse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!r) return res.status(404).json({ success: false, message: 'Canned response not found' });
    res.json({ success: true, data: r });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCannedResponse = async (req, res) => {
  try {
    await CannedResponse.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── User Dashboard Stats ─── */

export const getMyDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const [open, waiting, resolved, closed, unread] = await Promise.all([
      SupportTicket.countDocuments({ user: userId, status: { $in: ['open', 'waiting_customer', 'in_progress'] } }),
      SupportTicket.countDocuments({ user: userId, status: 'waiting_support' }),
      SupportTicket.countDocuments({ user: userId, status: 'resolved' }),
      SupportTicket.countDocuments({ user: userId, status: 'closed' }),
      TicketMessage.countDocuments({
        ticket: { $in: (await SupportTicket.find({ user: userId }).distinct('_id')) },
        'readBy.user': { $ne: userId },
        user: { $ne: userId },
        isInternal: false,
      }),
    ]);
    res.json({ success: true, data: { open, waitingForSupport: waiting, resolved, closed, unreadMessages: unread } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Agent Dashboard Stats ─── */

export const getAgentDashboardStats = async (req, res) => {
  try {
    const agentId = req.user._id;
    const [assigned, waiting, open, overdue, resolved] = await Promise.all([
      SupportTicket.countDocuments({ assignedTo: agentId, status: { $nin: ['resolved', 'closed'] } }),
      SupportTicket.countDocuments({ assignedTo: agentId, status: 'waiting_customer' }),
      SupportTicket.countDocuments({ assignedTo: agentId, status: { $in: ['open', 'waiting_support', 'in_progress'] } }),
      SupportTicket.countDocuments({ assignedTo: agentId, status: { $nin: ['resolved', 'closed'] }, updatedAt: { $lt: new Date(Date.now() - 48 * 3600000) } }),
      SupportTicket.countDocuments({ assignedTo: agentId, status: { $in: ['resolved', 'closed'] } }),
    ]);
    res.json({ success: true, data: { assignedTickets: assigned, waitingForCustomer: waiting, openTickets: open, overdueTickets: overdue, resolvedTickets: resolved } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* ─── Analytics ─── */

export const getAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const since = new Date(Date.now() - days * 86400000);
    const [totalTickets, openTickets, resolvedTickets, avgResponse, avgResolution, ratings, byCategory, byPriority, byDepartment, monthlyTrend] = await Promise.all([
      SupportTicket.countDocuments({ createdAt: { $gte: since } }),
      SupportTicket.countDocuments({ status: { $nin: ['resolved', 'closed'] } }),
      SupportTicket.countDocuments({ status: { $in: ['resolved', 'closed'] }, createdAt: { $gte: since } }),
      (async () => {
        const responded = await SupportTicket.find({ firstResponseAt: { $ne: null }, createdAt: { $gte: since } }).lean();
        if (!responded.length) return 0;
        const total = responded.reduce((s, t) => s + (t.firstResponseAt - t.createdAt), 0);
        return Math.round(total / responded.length / 60000);
      })(),
      (async () => {
        const resolved = await SupportTicket.find({ resolvedAt: { $ne: null }, createdAt: { $gte: since } }).lean();
        if (!resolved.length) return 0;
        const total = resolved.reduce((s, t) => s + (t.resolvedAt - t.createdAt), 0);
        return Math.round(total / resolved.length / 60000);
      })(),
      SupportRating.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);
    const avgRating = ratings.length ? Math.round(ratings[0].avg * 10) / 10 : 0;
    const ratingCount = ratings.length ? ratings[0].count : 0;
    res.json({ success: true, data: {
      totalTickets, openTickets, resolvedTickets, avgResponseTimeMinutes: avgResponse,
      avgResolutionTimeMinutes: avgResolution, avgRating, ratingCount,
      byCategory, byPriority, byDepartment, monthlyTrend,
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
