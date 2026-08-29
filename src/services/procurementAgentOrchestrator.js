import AgentSession from '../models/AgentSession.js';
import AgentTask from '../models/AgentTask.js';
import contextEngine from './contextEngine.js';
import workflowEngine from './workflowEngine.js';
import { logAuditEvent } from './auditService.js';

class ProcurementAgentOrchestrator {
  async orchestrate(userId, businessObjective, templateName = 'simple_purchase') {
    const context = await contextEngine.collectContext(userId, null);
    const result = await workflowEngine.createWorkflow(userId, templateName, businessObjective, context);
    logAuditEvent({ userId, action: 'orchestrate_procurement', category: 'agent_orchestration', entityType: 'AgentSession', entityId: result.session._id, details: { objective: businessObjective, template: templateName } });
    return result;
  }

  async executeNext(sessionId) {
    const task = await workflowEngine.executeNextTask(sessionId);
    return task;
  }

  async executeAll(sessionId) {
    const results = [];
    let task = await workflowEngine.executeNextTask(sessionId);
    while (task) {
      results.push({ agent: task.agent, action: task.action, status: task.status });
      task = await workflowEngine.executeNextTask(sessionId);
    }
    // Mark session as completed when all tasks done
    const pending = await AgentTask.countDocuments({ session: sessionId, status: { $in: ['queued', 'running'] } });
    if (pending === 0) {
      await AgentSession.findByIdAndUpdate(sessionId, { status: 'completed' });
    }
    return results;
  }

  async getSession(sessionId, userId) {
    const session = await AgentSession.findOne({ _id: sessionId, user: userId }).lean();
    if (!session) return null;
    const tasks = await AgentTask.find({ session: sessionId }).sort({ createdAt: 1 }).lean();
    return { ...session, tasks };
  }

  async listSessions(userId, status) {
    const query = { user: userId };
    if (status) query.status = status;
    return AgentSession.find(query).sort('-updatedAt').lean();
  }

  async cancelSession(sessionId, userId) {
    await AgentSession.updateOne({ _id: sessionId, user: userId }, { status: 'cancelled' });
    await AgentTask.updateMany({ session: sessionId, status: { $in: ['queued', 'running'] } }, { status: 'cancelled' });
    logAuditEvent({ userId, action: 'cancel_session', category: 'agent_orchestration', entityType: 'AgentSession', entityId: sessionId });
  }

  async getQueueMetrics() {
    const [queued, running, completed, failed] = await Promise.all([
      AgentTask.countDocuments({ status: 'queued' }),
      AgentTask.countDocuments({ status: 'running' }),
      AgentTask.countDocuments({ status: 'completed' }),
      AgentTask.countDocuments({ status: 'failed' }),
    ]);
    return { queued, running, completed, failed, total: queued + running + completed + failed };
  }

  async getSessionMetrics() {
    const [active, completed, failed, total] = await Promise.all([
      AgentSession.countDocuments({ status: 'active' }),
      AgentSession.countDocuments({ status: 'completed' }),
      AgentSession.countDocuments({ status: 'failed' }),
      AgentSession.countDocuments(),
    ]);
    return { active, completed, failed, total };
  }

  async requestApproval(sessionId, step, userId) {
    await AgentSession.findByIdAndUpdate(sessionId, {
      $push: { approvals: { step, status: 'pending', requestedAt: new Date() } },
    });
    logAuditEvent({ userId, action: 'request_approval', category: 'agent_orchestration', entityType: 'AgentSession', entityId: sessionId, details: { step } });
    return { status: 'pending', step };
  }

  async respondApproval(sessionId, approvalId, approved, comment, userId) {
    const session = await AgentSession.findOne({ _id: sessionId });
    if (!session) return null;
    const approval = session.approvals.id(approvalId);
    if (!approval) return null;
    approval.status = approved ? 'approved' : 'rejected';
    approval.respondedAt = new Date();
    approval.comment = comment;
    await session.save();
    logAuditEvent({ userId, action: 'respond_approval', category: 'agent_orchestration', entityType: 'AgentSession', entityId: sessionId, details: { step: approval.step, status: approval.status } });
    return approval;
  }
}

export default new ProcurementAgentOrchestrator();
