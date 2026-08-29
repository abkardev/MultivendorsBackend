import scheduler from '../services/scheduler.js';
import commerceIntelligenceService from '../services/commerceIntelligenceService.js';
import { logAuditEvent } from '../services/auditService.js';

export function registerCommerceIntelligenceJobs() {
  scheduler.addJob('market-analysis', '0 2 * * *', async () => {
    const marketData = await commerceIntelligenceService.getMarketIntelligence();
    logAuditEvent({ action: 'SCHEDULED_MARKET_ANALYSIS', details: { trends: marketData.trends }, category: 'commerce_intelligence' });
  });

  scheduler.addJob('price-analysis', '0 4 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_PRICE_ANALYSIS', category: 'commerce_intelligence' });
  });

  scheduler.addJob('opportunity-detection', '0 */6 * * *', async () => {
    logAuditEvent({ action: 'SCHEDULED_OPPORTUNITY_DETECTION', category: 'commerce_intelligence' });
  });

  scheduler.addJob('trend-analysis', '0 6 * * *', async () => {
    const trends = await commerceIntelligenceService.getMarketIntelligence();
    logAuditEvent({ action: 'SCHEDULED_TREND_ANALYSIS', details: { growth: trends.trends }, category: 'commerce_intelligence' });
  });

  scheduler.addJob('predictive-stats', '0 8 * * *', async () => {
    const predictions = await commerceIntelligenceService.getPredictiveAnalytics();
    logAuditEvent({ action: 'SCHEDULED_PREDICTIVE_STATS', details: { forecasts: Object.keys(predictions) }, category: 'commerce_intelligence' });
  });

  logAuditEvent({ action: 'COMMERCE_INTELLIGENCE_JOBS_REGISTERED', category: 'commerce_intelligence' });
}
