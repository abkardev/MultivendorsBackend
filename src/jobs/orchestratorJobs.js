import scheduler from '../services/scheduler.js';
import { logAuditEvent } from '../services/auditService.js';
import AgentTask from '../models/AgentTask.js';
import procurementAgentOrchestrator from '../services/procurementAgentOrchestrator.js';

export function registerOrchestratorJobs() {
  scheduler.addJob('queue-worker', '*/5 * * * *', async () => {
    const queuedTasks = await AgentTask.find({ status: 'queued' }).sort({ priority: -1, createdAt: 1 }).limit(5).lean();
    for (const task of queuedTasks) {
      try {
        await procurementAgentOrchestrator.executeNext(task.session);
      } catch (err) {
        logAuditEvent({ action: 'QUEUE_WORKER_ERROR', category: 'agent_orchestration', details: { taskId: task._id, error: err.message } });
      }
    }
    logAuditEvent({ action: 'QUEUE_WORKER_RAN', category: 'agent_orchestration', details: { processed: queuedTasks.length } });
  });

  scheduler.addJob('queue-cleanup', '0 * * * *', async () => {
    const stale = await AgentTask.updateMany(
      { status: 'running', startedAt: { $lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
      { status: 'failed', error: 'Timeout: task exceeded 2 hour limit' }
    );
    logAuditEvent({ action: 'QUEUE_CLEANUP', category: 'agent_orchestration', details: { staleTasksCleaned: stale.modifiedCount } });
  });

  logAuditEvent({ action: 'ORCHESTRATOR_JOBS_REGISTERED', category: 'agent_orchestration' });
}
