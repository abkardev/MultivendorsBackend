import expressAsyncHandler from 'express-async-handler';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../services/auditService.js';
import procurementAgentOrchestrator from '../services/procurementAgentOrchestrator.js';
import workflowEngine from '../services/workflowEngine.js';
import contextEngine from '../services/contextEngine.js';
import AgentSession from '../models/AgentSession.js';
import AgentTask from '../models/AgentTask.js';

const auditMeta = { category: 'agent_orchestration', source: 'agent_orchestration' };

export const orchestrateWorkflow = expressAsyncHandler(async (req, res) => {
  const { objective, template } = req.body;
  if (!objective) throw new AppError('business objective is required', 400);
  const result = await procurementAgentOrchestrator.orchestrate(req.user._id, objective, template || 'simple_purchase');
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'orchestrate_workflow', entityType: 'AgentSession', entityId: result.session._id });
  res.status(201).json({ success: true, data: result });
});

export const executeNextStep = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const task = await procurementAgentOrchestrator.executeNext(sessionId);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'execute_workflow_step', entityType: 'AgentSession', entityId: sessionId });
  res.json({ success: true, data: task });
});

export const executeAllSteps = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const results = await procurementAgentOrchestrator.executeAll(sessionId);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'execute_all_workflow_steps', entityType: 'AgentSession', entityId: sessionId });
  res.json({ success: true, data: { steps: results, total: results.length } });
});

export const listSessions = expressAsyncHandler(async (req, res) => {
  const { status } = req.query;
  const sessions = await procurementAgentOrchestrator.listSessions(req.user._id, status);
  res.json({ success: true, data: sessions });
});

export const getSession = expressAsyncHandler(async (req, res) => {
  const session = await procurementAgentOrchestrator.getSession(req.params.id, req.user._id);
  if (!session) throw new AppError('Session not found', 404);
  res.json({ success: true, data: session });
});

export const cancelSession = expressAsyncHandler(async (req, res) => {
  await procurementAgentOrchestrator.cancelSession(req.params.id, req.user._id);
  res.json({ success: true, message: 'Session cancelled' });
});

export const listTemplates = expressAsyncHandler(async (req, res) => {
  const templates = workflowEngine.getTemplates();
  res.json({ success: true, data: templates });
});

export const getTemplate = expressAsyncHandler(async (req, res) => {
  const template = workflowEngine.getTemplate(req.params.name);
  if (!template) throw new AppError('Template not found', 404);
  res.json({ success: true, data: template });
});

export const getContext = expressAsyncHandler(async (req, res) => {
  const { sessionId } = req.query;
  const context = await contextEngine.collectContext(req.user._id, sessionId);
  res.json({ success: true, data: context });
});

export const requestApproval = expressAsyncHandler(async (req, res) => {
  const { sessionId, step } = req.body;
  if (!sessionId || !step) throw new AppError('sessionId and step are required', 400);
  const result = await procurementAgentOrchestrator.requestApproval(sessionId, step, req.user._id);
  res.json({ success: true, data: result });
});

export const respondApproval = expressAsyncHandler(async (req, res) => {
  const { sessionId, approvalId, approved, comment } = req.body;
  if (!sessionId || !approvalId || approved === undefined) throw new AppError('sessionId, approvalId, and approved are required', 400);
  const result = await procurementAgentOrchestrator.respondApproval(sessionId, approvalId, approved, comment, req.user._id);
  if (!result) throw new AppError('Approval not found', 404);
  res.json({ success: true, data: result });
});

export const listTasks = expressAsyncHandler(async (req, res) => {
  const { status, sessionId } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;
  if (sessionId) query.session = sessionId;
  const tasks = await AgentTask.find(query).sort('-createdAt').limit(50).lean();
  res.json({ success: true, data: tasks });
});

export const getTask = expressAsyncHandler(async (req, res) => {
  const task = await AgentTask.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!task) throw new AppError('Task not found', 404);
  res.json({ success: true, data: task });
});

export const retryTask = expressAsyncHandler(async (req, res) => {
  const task = await AgentTask.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) throw new AppError('Task not found', 404);
  task.status = 'queued';
  task.retries = 0;
  task.error = null;
  await task.save();
  res.json({ success: true, data: task });
});

export const getQueueMetrics = expressAsyncHandler(async (req, res) => {
  const metrics = await procurementAgentOrchestrator.getQueueMetrics();
  res.json({ success: true, data: metrics });
});

export const getSessionMetrics = expressAsyncHandler(async (req, res) => {
  const metrics = await procurementAgentOrchestrator.getSessionMetrics();
  res.json({ success: true, data: metrics });
});

export const getWorkflowDashboard = expressAsyncHandler(async (req, res) => {
  const [sessions, tasks, sessionMetrics, queueMetrics] = await Promise.all([
    procurementAgentOrchestrator.listSessions(req.user._id),
    AgentTask.find({ user: req.user._id }).sort('-createdAt').limit(10).lean(),
    procurementAgentOrchestrator.getSessionMetrics(),
    procurementAgentOrchestrator.getQueueMetrics(),
  ]);
  
  const analytics = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter(s => s.status === 'active').length,
    avgExecutionTime: tasks.reduce((s, t) => s + (t.executionTime || 0), 0) / Math.max(1, tasks.length),
    successRate: queueMetrics.total > 0 ? Math.round((queueMetrics.completed / queueMetrics.total) * 100) : 0,
    recentSessions: sessions.slice(0, 5),
  };
  
  res.json({ success: true, data: { sessions, tasks, sessionMetrics, queueMetrics, analytics } });
});
