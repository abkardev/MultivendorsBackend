import scheduler from '../services/scheduler.js';
import { logAuditEvent } from '../services/auditService.js';

export function registerAutonomousJobs() {
  scheduler.addJob('procurement-plan-review', '0 10 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_PLAN_REVIEW', category: 'autonomous_procurement' });
  });

  scheduler.addJob('automation-execution', '0 */4 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_AUTOMATION_EXECUTION', category: 'autonomous_procurement' });
  });

  scheduler.addJob('risk-monitoring', '0 */2 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_RISK_MONITORING', category: 'autonomous_procurement' });
  });

  logAuditEvent({ action: 'AUTONOMOUS_PROCUREMENT_JOBS_REGISTERED', category: 'autonomous_procurement' });
}
