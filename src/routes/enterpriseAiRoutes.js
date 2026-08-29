import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import * as ai from '../controllers/enterpriseAiController.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));
router.use(featureFlag('enterprise_ai'));

// ============================================================
// Part 1: AI Copilots
// ============================================================

router.post('/ai/copilot/sessions', ai.createCopilotSession);
router.get('/ai/copilot/sessions', ai.getCopilotSessions);
router.get('/ai/copilot/sessions/:id', ai.getCopilotSession);
router.post('/ai/copilot/sessions/:id/messages', ai.sendCopilotMessage);
router.get('/ai/copilot/sessions/:id/conversation', ai.getCopilotConversation);
router.delete('/ai/copilot/sessions/:id', ai.clearCopilotSession);
router.post('/ai/copilot/sessions/:id/actions', ai.executeCopilotAction);
router.get('/ai/copilot/insights', ai.getCopilotInsights);

// ============================================================
// Part 2: Knowledge Graph
// ============================================================

router.post('/ai/knowledge-graph/entities/sync', ai.syncKnowledgeEntity);
router.post('/ai/knowledge-graph/relationships', ai.createKnowledgeRelationship);
router.get('/ai/knowledge-graph/entities/:id', ai.getKnowledgeEntity);
router.get('/ai/knowledge-graph/search', ai.searchKnowledgeEntities);
router.get('/ai/knowledge-graph/entities/:id/relationships', ai.getEntityRelationships);
router.get('/ai/knowledge-graph/entities/:id/impact', ai.getImpactAnalysis);
router.get('/ai/knowledge-graph/entities/:id/dependencies', ai.getDependencyGraph);
router.get('/ai/knowledge-graph/recommendations', ai.getRecommendationGraph);
router.get('/ai/knowledge-graph/entities/:id/related', ai.discoverRelatedEntities);
router.get('/ai/knowledge-graph/explorer/entities', ai.getEntityExplorer);
router.get('/ai/knowledge-graph/explorer/relationships', ai.getRelationshipExplorer);
router.get('/ai/knowledge-graph/path', ai.findEntityPath);
router.get('/ai/knowledge-graph/stats', ai.getGraphStats);
router.post('/ai/knowledge-graph/sync-all', ai.syncAllEntities);

// ============================================================
// Part 3: Semantic Search
// ============================================================

router.post('/ai/search/semantic', ai.semanticSearch);
router.post('/ai/search/natural-language', ai.naturalLanguageSearch);
router.get('/ai/search/suggestions', ai.getSearchSuggestions);
router.get('/ai/search/related', ai.getRelatedSearchResults);
router.get('/ai/search/explanation', ai.getSearchExplanation);
router.get('/ai/search/ai-summary', ai.getSearchAISummary);
router.post('/ai/search/synonyms', ai.manageSearchSynonyms);
router.get('/ai/search/saved', ai.getSavedSearches);
router.post('/ai/search/saved', ai.saveSearch);
router.delete('/ai/search/saved/:id', ai.deleteSavedSearch);
router.post('/ai/search/reindex', ai.reindexSearch);

// ============================================================
// Part 4: Business Rules Engine
// ============================================================

router.get('/ai/business-rules', ai.getBusinessRules);
router.get('/ai/business-rules/:id', ai.getBusinessRule);
router.post('/ai/business-rules', ai.createBusinessRule);
router.put('/ai/business-rules/:id', ai.updateBusinessRule);
router.delete('/ai/business-rules/:id', ai.deleteBusinessRule);
router.post('/ai/business-rules/:id/activate', ai.activateBusinessRule);
router.post('/ai/business-rules/:id/deactivate', ai.deactivateBusinessRule);
router.post('/ai/business-rules/:id/test', ai.testBusinessRule);
router.post('/ai/business-rules/:id/simulate', ai.simulateBusinessRule);
router.post('/ai/business-rules/:id/approve', ai.approveBusinessRule);
router.get('/ai/business-rules/:id/versions', ai.getBusinessRuleVersions);
router.post('/ai/business-rules/:id/rollback', ai.rollbackBusinessRule);
router.post('/ai/business-rules/evaluate', ai.evaluateBusinessRule);
router.post('/ai/business-rules/evaluate-all', ai.evaluateAllBusinessRules);
router.post('/ai/business-rules/validate', ai.validateBusinessRule);
router.get('/ai/business-rules/:id/dependencies', ai.getBusinessRuleDependencies);
router.get('/ai/business-rules/:id/impact', ai.getBusinessRuleImpact);

// ============================================================
// Part 5: Event-Driven Automation
// ============================================================

router.get('/ai/events/rules', ai.getEventRules);
router.post('/ai/events/rules', ai.createEventRule);
router.put('/ai/events/rules/:id', ai.updateEventRule);
router.delete('/ai/events/rules/:id', ai.deleteEventRule);
router.post('/ai/events/rules/:id/toggle', ai.toggleEventRule);
router.post('/ai/events/fire', ai.fireEvent);
router.get('/ai/events/logs', ai.getEventLogs);
router.get('/ai/events/logs/:id', ai.getEventLog);
router.post('/ai/events/logs/:id/retry', ai.retryEvent);
router.get('/ai/events/stats', ai.getEventStats);

// ============================================================
// Part 6: AI Workflow Designer
// ============================================================

router.get('/ai/workflows/definitions', ai.getWorkflowDefinitions);
router.get('/ai/workflows/definitions/:id', ai.getWorkflowDefinition);
router.post('/ai/workflows/definitions', ai.createWorkflowDefinition);
router.put('/ai/workflows/definitions/:id', ai.updateWorkflowDefinition);
router.delete('/ai/workflows/definitions/:id', ai.deleteWorkflowDefinition);
router.post('/ai/workflows/definitions/:id/activate', ai.activateWorkflow);
router.post('/ai/workflows/definitions/:id/deactivate', ai.deactivateWorkflow);
router.post('/ai/workflows/definitions/:id/execute', ai.executeWorkflow);
router.get('/ai/workflows/executions', ai.getWorkflowExecutions);
router.get('/ai/workflows/executions/:id', ai.getWorkflowExecution);
router.get('/ai/workflows/templates', ai.getWorkflowTemplates);
router.post('/ai/workflows/validate', ai.validateWorkflow);
router.get('/ai/workflows/analytics', ai.getWorkflowAnalytics);

// ============================================================
// Part 7: Hyper Automation
// ============================================================

router.get('/ai/hyper-automation/dashboard', ai.getHyperAutomationDashboard);
router.get('/ai/hyper-automation/workflows/running', ai.getRunningWorkflows);
router.get('/ai/hyper-automation/workflows/failed', ai.getFailedWorkflows);
router.post('/ai/hyper-automation/workflows/:id/retry', ai.retryFailedWorkflow);
router.post('/ai/hyper-automation/workflows/:id/cancel', ai.cancelRunningWorkflow);
router.get('/ai/hyper-automation/queue', ai.getAutomationQueue);
router.get('/ai/hyper-automation/performance', ai.getAutomationPerformance);
router.get('/ai/hyper-automation/ai-suggestions', ai.getAutomationAiSuggestions);
router.get('/ai/hyper-automation/roi', ai.getAutomationROI);

// ============================================================
// Part 8: Explainable AI
// ============================================================

router.post('/ai/explain/decision', ai.explainDecision);
router.get('/ai/explain/audit/:id', ai.getAiAuditRecord);
router.post('/ai/explain/compare', ai.compareAiAlternatives);
router.get('/ai/explain/templates/:type', ai.getExplanationTemplate);

// ============================================================
// Part 9: Predictive Intelligence
// ============================================================

router.get('/ai/predictions/:id', ai.getPrediction);
router.post('/ai/predictions/generate', ai.generatePrediction);
router.get('/ai/predictions', ai.getAllPredictions);
router.get('/ai/predictions/:id/accuracy', ai.getPredictionAccuracy);
router.post('/ai/predictions/:id/retrain', ai.retrainPredictionModel);
router.get('/ai/forecasts/demand', ai.getDemandForecast);
router.get('/ai/forecasts/supply', ai.getSupplyForecast);
router.get('/ai/forecasts/revenue', ai.getRevenueForecast);
router.get('/ai/forecasts/churn', ai.getChurnPrediction);

// ============================================================
// Part 10: Digital Twin
// ============================================================

router.get('/ai/digital-twin/snapshot', ai.getTwinSnapshot);
router.get('/ai/digital-twin/history', ai.getTwinHistory);
router.post('/ai/digital-twin/simulate', ai.simulateScenario);
router.get('/ai/digital-twin/capacity-plan', ai.getCapacityPlan);
router.get('/ai/digital-twin/growth-forecast', ai.getGrowthForecast);
router.get('/ai/digital-twin/marketplace-health', ai.getMarketplaceHealth);

// ============================================================
// Part 11: Recommendation Engine V3
// ============================================================

router.get('/ai/recommendations/v3', ai.getRecommendationsV3);
router.get('/ai/recommendations/v3/products', ai.getProductRecommendationsV3);
router.get('/ai/recommendations/v3/suppliers', ai.getSupplierRecommendationsV3);
router.get('/ai/recommendations/v3/categories', ai.getCategoryRecommendationsV3);
router.get('/ai/recommendations/v3/pricing', ai.getPricingRecommendationV3);
router.get('/ai/recommendations/v3/discounts', ai.getDiscountRecommendationV3);
router.get('/ai/recommendations/v3/subscriptions', ai.getSubscriptionRecommendationsV3);
router.get('/ai/recommendations/v3/workflows', ai.getWorkflowRecommendationsV3);
router.get('/ai/recommendations/v3/approvals', ai.getApprovalRecommendationsV3);
router.get('/ai/recommendations/v3/knowledge', ai.getKnowledgeRecommendationsV3);
router.get('/ai/recommendations/v3/reports', ai.getReportRecommendationsV3);
router.get('/ai/recommendations/v3/playbooks', ai.getPlaybookRecommendationsV3);

// ============================================================
// Part 12: Anomaly Detection
// ============================================================

router.get('/ai/anomalies', ai.getAnomalies);
router.get('/ai/anomalies/:id', ai.getAnomaly);
router.post('/ai/anomalies/detect', ai.detectAnomalies);
router.post('/ai/anomalies/:id/investigate', ai.investigateAnomaly);
router.post('/ai/anomalies/:id/resolve', ai.resolveAnomaly);
router.post('/ai/anomalies/:id/ignore', ai.ignoreAnomaly);
router.get('/ai/anomalies/stats/summary', ai.getAnomalyStats);
router.post('/ai/anomalies/run-all', ai.runAllDetections);
router.get('/ai/anomalies/trends', ai.getAnomalyTrends);

// ============================================================
// Part 13: Reporting Studio
// ============================================================

router.get('/ai/reports/templates', ai.getReportTemplates);
router.get('/ai/reports/templates/:id', ai.getReportTemplate);
router.post('/ai/reports/templates', ai.createReportTemplate);
router.put('/ai/reports/templates/:id', ai.updateReportTemplate);
router.delete('/ai/reports/templates/:id', ai.deleteReportTemplate);
router.post('/ai/reports/generate', ai.generateReport);
router.post('/ai/reports/schedule', ai.scheduleReport);
router.delete('/ai/reports/schedule/:id', ai.unscheduleReport);
router.get('/ai/reports/schedules', ai.getScheduledReports);
router.get('/ai/reports/export/:id', ai.exportReport);
router.get('/ai/reports/history', ai.getReportHistory);
router.post('/ai/reports/templates/:id/duplicate', ai.duplicateReportTemplate);

// ============================================================
// Part 14: Integration Hub
// ============================================================

router.get('/ai/integrations/endpoints', ai.getIntegrationEndpoints);
router.get('/ai/integrations/endpoints/:id', ai.getIntegrationEndpoint);
router.post('/ai/integrations/endpoints', ai.createIntegrationEndpoint);
router.put('/ai/integrations/endpoints/:id', ai.updateIntegrationEndpoint);
router.delete('/ai/integrations/endpoints/:id', ai.deleteIntegrationEndpoint);
router.post('/ai/integrations/endpoints/:id/test', ai.testIntegrationEndpoint);
router.get('/ai/integrations/imports', ai.getImportJobs);
router.get('/ai/integrations/exports', ai.getExportJobs);
router.post('/ai/integrations/imports', ai.createImportJob);
router.post('/ai/integrations/exports', ai.createExportJob);
router.get('/ai/integrations/dead-letter-queue', ai.getDeadLetterQueue);
router.post('/ai/integrations/dead-letter-queue/:id/retry', ai.retryDeadLetter);
router.get('/ai/integrations/stats', ai.getIntegrationStats);
router.get('/ai/integrations/webhook-logs', ai.getWebhookLogs);

// ============================================================
// Part 15: Low-Code Automation
// ============================================================

router.get('/ai/low-code/components', ai.getAutomationComponents);
router.get('/ai/low-code/templates', ai.getLowCodeTemplates);
router.get('/ai/low-code/templates/:id', ai.getLowCodeTemplate);
router.post('/ai/low-code/templates/:id/create', ai.createFromAutomationTemplate);
router.post('/ai/low-code/validate', ai.validateAutomation);
router.post('/ai/low-code/test', ai.testAutomation);
router.post('/ai/low-code/publish', ai.publishAutomation);
router.get('/ai/low-code/execution-logs', ai.getAutomationExecutionLogs);
router.post('/ai/low-code/rollback', ai.rollbackAutomation);
router.get('/ai/low-code/catalog', ai.getComponentCatalog);

// ============================================================
// Part 16: Usage Intelligence
// ============================================================

router.post('/ai/usage/track', ai.trackUsageEvent);
router.get('/ai/usage/feature-adoption', ai.getFeatureAdoption);
router.get('/ai/usage/modules', ai.getModuleUsageStats);
router.get('/ai/usage/ai', ai.getAiUsageStats);
router.get('/ai/usage/automation', ai.getAutomationUsageStats);
router.get('/ai/usage/workflows', ai.getWorkflowUsageStats);
router.get('/ai/usage/search', ai.getSearchUsageStats);
router.get('/ai/usage/notifications', ai.getNotificationUsageStats);
router.get('/ai/usage/dashboard', ai.getDashboardUsageStats);
router.get('/ai/usage/api', ai.getApiUsageStats);
router.get('/ai/usage/active-users', ai.getActiveUsersStats);
router.get('/ai/usage/user-journey', ai.getUserJourney);
router.get('/ai/usage/activation-funnel', ai.getActivationFunnel);
router.get('/ai/usage/retention-cohort', ai.getRetentionCohort);
router.get('/ai/usage/power-users', ai.getPowerUsers);
router.get('/ai/usage/license-utilization', ai.getLicenseUtilization);
router.get('/ai/usage/heatmap', ai.getHeatmapData);
router.get('/ai/usage/feature-funnels', ai.getFeatureFunnels);

export default router;
