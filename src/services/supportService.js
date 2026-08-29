import { SupportDepartment } from '../models/SupportDepartment.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { TicketMessage } from '../models/TicketMessage.js';

class TicketAssignmentService {
  async assignRoundRobin(departmentId) {
    const dept = await SupportDepartment.findById(departmentId);
    if (!dept || !dept.agents.length) return null;
    const tickets = await SupportTicket.find({ department: departmentId, assignedTo: null, status: { $ne: 'closed' } }).sort({ createdAt: 1 }).limit(50);
    const assignments = dept.agents.map(a => ({
      agent: a.toString(), count: tickets.filter(t => t.assignedTo?.toString() === a.toString()).length,
    }));
    const sorted = assignments.sort((a, b) => a.count - b.count);
    return sorted[0]?.agent || null;
  }

  async assignLeastBusy(departmentId) {
    const dept = await SupportDepartment.findById(departmentId);
    if (!dept || !dept.agents.length) return null;
    const counts = await Promise.all(dept.agents.map(async (agentId) => {
      const count = await SupportTicket.countDocuments({ assignedTo: agentId, status: { $nin: ['resolved', 'closed'] } });
      return { agent: agentId.toString(), count };
    }));
    return counts.sort((a, b) => a.count - b.count)[0]?.agent || null;
  }

  async autoAssign(ticket) {
    if (ticket.assignedTo) return null;
    let deptId = ticket.department;
    if (!deptId) {
      const dept = await SupportDepartment.findOne({ isActive: true, autoAssign: true }).sort({ order: 1 });
      if (!dept) return null;
      deptId = dept._id;
    }
    const dept = await SupportDepartment.findById(deptId);
    if (!dept || !dept.autoAssign || !dept.agents.length) return null;
    const strategy = dept.assignmentStrategy || 'round_robin';
    const agentId = strategy === 'least_busy' ? await this.assignLeastBusy(dept._id) : await this.assignRoundRobin(dept._id);
    return agentId;
  }
}

export const ticketAssignmentService = new TicketAssignmentService();

/* Socket handler for support ticket chat */
let ticketSockets = {};
let io = null;

export const setupSupportSocket = (socketio) => {
  io = socketio;
  const namespace = io.of('/support');
  namespace.use((socket, next) => {
    const userId = socket.handshake.query.userId;
    if (!userId) return next(new Error('Authentication required'));
    socket.userId = userId;
    next();
  });
  namespace.on('connection', (socket) => {
    socket.on('join:ticket', (ticketId) => {
      socket.join(`ticket:${ticketId}`);
    });
    socket.on('leave:ticket', (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
    });
    socket.on('typing:start', (data) => {
      socket.to(`ticket:${data.ticketId}`).emit('typing:start', { ticketId: data.ticketId, userId: socket.userId });
    });
    socket.on('typing:stop', (data) => {
      socket.to(`ticket:${data.ticketId}`).emit('typing:stop', { ticketId: data.ticketId, userId: socket.userId });
    });
    socket.on('message:read', (data) => {
      socket.to(`ticket:${data.ticketId}`).emit('message:read', { ticketId: data.ticketId, messageId: data.messageId, userId: socket.userId });
    });
    socket.on('disconnect', () => {});
  });
};

export const emitTicketEvent = (ticketId, event, data) => {
  if (!io) return;
  io.of('/support').to(`ticket:${ticketId}`).emit(event, data);
};
