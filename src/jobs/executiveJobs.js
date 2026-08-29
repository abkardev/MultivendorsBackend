import scheduler from '../services/scheduler.js';
import { logAuditEvent } from '../services/auditService.js';

export function registerExecutiveJobs() {
  scheduler.addJob('kpi-recalculation', '0 3 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_KPI_RECALCULATION', category: 'executive_intelligence' });
  });

  scheduler.addJob('budget-analysis', '0 5 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_BUDGET_ANALYSIS', category: 'executive_intelligence' });
  });

  scheduler.addJob('governance-audit', '0 7 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_GOVERNANCE_AUDIT', category: 'executive_intelligence' });
  });

  scheduler.addJob('forecast-generation', '0 9 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_FORECAST_GENERATION', category: 'executive_intelligence' });
  });

  logAuditEvent({ action: 'EXECUTIVE_JOBS_REGISTERED', category: 'executive_intelligence' });
}
