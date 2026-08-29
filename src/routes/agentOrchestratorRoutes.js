import { Router } from 'express';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  orchestrateWorkflow,
  executeNextStep,
  executeAllSteps,
  listSessions,
  getSession,
  cancelSession,
  listTemplates,
  getTemplate,
  getContext,
  requestApproval,
  respondApproval,
  listTasks,
  getTask,
  retryTask,
  getQueueMetrics,
  getSessionMetrics,
  getWorkflowDashboard,
} from '../controllers/agentOrchestratorController.js';

const router = Router();
router.use(protect);

router.post('/orchestrate', featureFlag('agent_orchestration'), orchestrateWorkflow);
router.post('/execute/:sessionId/next', featureFlag('agent_orchestration'), executeNextStep);
router.post('/execute/:sessionId/all', featureFlag('agent_orchestration'), executeAllSteps);

router.get('/sessions', featureFlag('agent_orchestration'), listSessions);
router.get('/sessions/:id', featureFlag('agent_orchestration'), getSession);
router.post('/sessions/:id/cancel', featureFlag('agent_orchestration'), cancelSession);

router.get('/templates', featureFlag('agent_orchestration'), listTemplates);
router.get('/templates/:name', featureFlag('agent_orchestration'), getTemplate);

router.get('/context', featureFlag('agent_orchestration'), getContext);

router.post('/approvals/request', featureFlag('agent_orchestration'), requestApproval);
router.post('/approvals/respond', featureFlag('agent_orchestration'), respondApproval);

router.get('/tasks', featureFlag('agent_orchestration'), listTasks);
router.get('/tasks/:id', featureFlag('agent_orchestration'), getTask);
router.post('/tasks/:id/retry', featureFlag('agent_orchestration'), retryTask);

router.get('/metrics/queue', featureFlag('agent_orchestration'), getQueueMetrics);
router.get('/metrics/sessions', featureFlag('agent_orchestration'), getSessionMetrics);

router.get('/dashboard', featureFlag('agent_orchestration'), getWorkflowDashboard);

export default router;
