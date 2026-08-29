import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import * as ep from '../controllers/enterprisePlatformController.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));
router.use(featureFlag('enterprise_platform'));

// ============================================================
// Part 1 - Enterprise Integration Hub
// ============================================================

router.get('/platform/integration/providers', ep.getIntegrationProviders);
router.get('/platform/integration/providers/:id', ep.getIntegrationProvider);
router.post('/platform/integration/connections', ep.createIntegrationConnection);
router.get('/platform/integration/connections', ep.getIntegrationConnections);
router.get('/platform/integration/connections/:id', ep.getIntegrationConnection);
router.put('/platform/integration/connections/:id', ep.updateIntegrationConnection);
router.delete('/platform/integration/connections/:id', ep.deleteIntegrationConnection);
router.post('/platform/integration/connections/:id/test', ep.testIntegrationConnection);
router.post('/platform/integration/connections/:id/health', ep.healthCheckIntegrationConnection);
router.get('/platform/integration/connections/:id/logs', ep.getIntegrationConnectionLogs);
router.get('/platform/integration/credentials', ep.getIntegrationCredential);
router.post('/platform/integration/credentials', ep.createIntegrationCredential);
router.put('/platform/integration/credentials/:id', ep.updateIntegrationCredential);
router.delete('/platform/integration/credentials/:id', ep.deleteIntegrationCredential);
router.get('/platform/integration/templates', ep.getIntegrationTemplates);
router.post('/platform/integration/templates/:id/create', ep.createIntegrationFromTemplate);
router.get('/platform/integration/stats', ep.getIntegrationConnectionStats);

// ============================================================
// Part 2 - Developer Platform
// ============================================================

router.post('/platform/developer/apps', ep.createDeveloperApp);
router.get('/platform/developer/apps', ep.getDeveloperApps);
router.get('/platform/developer/apps/:id', ep.getDeveloperApp);
router.put('/platform/developer/apps/:id', ep.updateDeveloperApp);
router.delete('/platform/developer/apps/:id', ep.deleteDeveloperApp);
router.post('/platform/developer/apps/:id/regenerate-secret', ep.regenerateAppSecret);
router.post('/platform/developer/api-keys', ep.createApiKey);
router.get('/platform/developer/api-keys', ep.getDeveloperApiKeys);
router.delete('/platform/developer/api-keys/:id', ep.revokeApiKey);
router.get('/platform/developer/webhooks', ep.getWebhookEndpoints);
router.post('/platform/developer/webhooks', ep.createWebhookEndpoint);
router.put('/platform/developer/webhooks/:id', ep.updateWebhookEndpoint);
router.delete('/platform/developer/webhooks/:id', ep.deleteWebhookEndpoint);
router.get('/platform/developer/api-usage', ep.getApiUsageLogs);
router.get('/platform/developer/dashboard', ep.getDeveloperDashboard);

// ============================================================
// Part 3 - Workflow Builder
// ============================================================

router.get('/platform/workflows', ep.getWorkflowDefinitions);
router.get('/platform/workflows/:id', ep.getWorkflowDefinition);
router.post('/platform/workflows', ep.createWorkflowDefinition);
router.put('/platform/workflows/:id', ep.updateWorkflowDefinition);
router.delete('/platform/workflows/:id', ep.deleteWorkflowDefinition);
router.post('/platform/workflows/:id/activate', ep.activateWorkflowDefinition);
router.post('/platform/workflows/:id/deactivate', ep.deactivateWorkflowDefinition);
router.post('/platform/workflows/:id/duplicate', ep.duplicateWorkflowDefinition);
router.post('/platform/workflows/:id/execute', ep.executeWorkflowDefinition);
router.get('/platform/workflows/:id/executions', ep.getWorkflowExecutions);
router.get('/platform/workflows/executions/:executionId', ep.getWorkflowExecution);
router.post('/platform/workflows/executions/:executionId/cancel', ep.cancelWorkflowExecution);
router.post('/platform/workflows/executions/:executionId/retry', ep.retryWorkflowExecution);
router.get('/platform/workflows/triggers', ep.getWorkflowTriggers);
router.post('/platform/workflows/triggers', ep.createWorkflowTrigger);
router.put('/platform/workflows/triggers/:id', ep.updateWorkflowTrigger);
router.delete('/platform/workflows/triggers/:id', ep.deleteWorkflowTrigger);
router.get('/platform/workflows/templates', ep.getWorkflowTemplates);
router.post('/platform/workflows/:id/validate', ep.validateWorkflowDefinition);
router.get('/platform/workflows/analytics', ep.getWorkflowAnalytics);

// ============================================================
// Part 4 - Rules Engine
// ============================================================

router.get('/platform/rules', ep.getBusinessRules);
router.get('/platform/rules/:id', ep.getBusinessRule);
router.post('/platform/rules', ep.createBusinessRule);
router.put('/platform/rules/:id', ep.updateBusinessRule);
router.delete('/platform/rules/:id', ep.deleteBusinessRule);
router.post('/platform/rules/:id/activate', ep.activateBusinessRule);
router.post('/platform/rules/:id/deactivate', ep.deactivateBusinessRule);
router.post('/platform/rules/:id/test', ep.testBusinessRule);
router.post('/platform/rules/:id/simulate', ep.simulateBusinessRule);
router.post('/platform/rules/:id/evaluate', ep.evaluateBusinessRule);
router.post('/platform/rules/evaluate', ep.evaluateBusinessRules);
router.get('/platform/rules/:id/versions', ep.getBusinessRuleVersions);
router.post('/platform/rulesets', ep.createRuleSet);
router.get('/platform/rulesets', ep.getRuleSets);
router.get('/platform/rulesets/:id', ep.getRuleSet);
router.put('/platform/rulesets/:id', ep.updateRuleSet);
router.delete('/platform/rulesets/:id', ep.deleteRuleSet);
router.post('/platform/rulesets/:id/evaluate', ep.evaluateRuleSet);
router.get('/platform/rules/logs', ep.getRuleExecutionLogs);
router.get('/platform/rules/analytics', ep.getRulesAnalytics);

// ============================================================
// Part 5 - Forms Builder
// ============================================================

router.get('/platform/forms', ep.getFormDefinitions);
router.get('/platform/forms/:id', ep.getFormDefinition);
router.post('/platform/forms', ep.createFormDefinition);
router.put('/platform/forms/:id', ep.updateFormDefinition);
router.delete('/platform/forms/:id', ep.deleteFormDefinition);
router.post('/platform/forms/:id/publish', ep.publishFormDefinition);
router.post('/platform/forms/:id/duplicate', ep.duplicateFormDefinition);
router.get('/platform/forms/:id/submissions', ep.getFormSubmissions);
router.get('/platform/forms/submissions/:submissionId', ep.getFormSubmission);
router.post('/platform/forms/:id/submissions', ep.createFormSubmission);
router.put('/platform/forms/submissions/:submissionId', ep.updateFormSubmission);
router.post('/platform/forms/submissions/:submissionId/approve', ep.approveFormSubmission);
router.post('/platform/forms/submissions/:submissionId/reject', ep.rejectFormSubmission);
router.get('/platform/forms/analytics', ep.getFormAnalytics);
router.post('/platform/forms/validate', ep.validateFormData);

// ============================================================
// Part 6 - Enterprise Documents
// ============================================================

router.get('/platform/documents/folders', ep.getDocumentFolders);
router.post('/platform/documents/folders', ep.createDocumentFolder);
router.put('/platform/documents/folders/:id', ep.updateDocumentFolder);
router.delete('/platform/documents/folders/:id', ep.deleteDocumentFolder);
router.get('/platform/documents', ep.getEnterpriseDocuments);
router.get('/platform/documents/:id', ep.getEnterpriseDocument);
router.post('/platform/documents', ep.createEnterpriseDocument);
router.put('/platform/documents/:id', ep.updateEnterpriseDocument);
router.delete('/platform/documents/:id', ep.deleteEnterpriseDocument);
router.get('/platform/documents/:id/versions', ep.getDocumentVersions);
router.post('/platform/documents/:id/versions', ep.createDocumentVersion);
router.get('/platform/documents/templates', ep.getDocumentTemplates);
router.post('/platform/documents/templates', ep.createDocumentTemplate);
router.post('/platform/documents/templates/:id/generate', ep.generateDocumentFromTemplate);
router.get('/platform/documents/:id/comments', ep.getDocumentComments);
router.post('/platform/documents/:id/comments', ep.addDocumentComment);
router.put('/platform/documents/comments/:commentId/resolve', ep.resolveDocumentComment);
router.post('/platform/documents/:id/approve', ep.approveEnterpriseDocument);
router.get('/platform/documents/analytics', ep.getDocumentsAnalytics);

// ============================================================
// Part 7 - Global Marketplace
// ============================================================

router.get('/platform/marketplace/countries', ep.getCountries);
router.get('/platform/marketplace/countries/:id', ep.getCountry);
router.post('/platform/marketplace/countries', ep.createCountry);
router.put('/platform/marketplace/countries/:id', ep.updateCountry);
router.delete('/platform/marketplace/countries/:id', ep.deleteCountry);
router.get('/platform/marketplace/regions', ep.getRegions);
router.post('/platform/marketplace/regions', ep.createRegion);
router.put('/platform/marketplace/regions/:id', ep.updateRegion);
router.delete('/platform/marketplace/regions/:id', ep.deleteRegion);
router.get('/platform/marketplace/currencies', ep.getCurrencies);
router.post('/platform/marketplace/currencies', ep.createCurrency);
router.put('/platform/marketplace/currencies/:id', ep.updateCurrency);
router.get('/platform/marketplace/tax-regions', ep.getTaxRegions);
router.post('/platform/marketplace/tax-regions', ep.createTaxRegion);
router.put('/platform/marketplace/tax-regions/:id', ep.updateTaxRegion);
router.get('/platform/marketplace/localization', ep.getLocalizationSettings);
router.put('/platform/marketplace/localization', ep.upsertLocalizationSettings);
router.get('/platform/marketplace/business-hours', ep.getBusinessHours);
router.get('/platform/marketplace/holidays', ep.getHolidays);
router.post('/platform/marketplace/holidays/calendar', ep.createHolidayCalendar);
router.post('/platform/marketplace/holidays', ep.addHoliday);
router.get('/platform/marketplace/regions/list', ep.getMarketplaceRegions);

// ============================================================
// Part 8 - Multi Organization
// ============================================================

router.get('/platform/organizations', ep.getOrganizations);
router.get('/platform/organizations/:id', ep.getOrganization);
router.post('/platform/organizations', ep.createOrganization);
router.put('/platform/organizations/:id', ep.updateOrganization);
router.get('/platform/organizations/:id/tree', ep.getOrganizationTree);
router.post('/platform/organizations/relationships', ep.createOrgRelationship);
router.get('/platform/organizations/relationships', ep.getOrgRelationships);
router.put('/platform/organizations/relationships/:id', ep.updateOrgRelationship);
router.delete('/platform/organizations/relationships/:id', ep.terminateOrgRelationship);
router.get('/platform/workspaces', ep.getWorkspaces);
router.post('/platform/workspaces', ep.createWorkspace);
router.put('/platform/workspaces/:id', ep.updateWorkspace);
router.delete('/platform/workspaces/:id', ep.deleteWorkspace);
router.post('/platform/workspaces/:id/members', ep.addWorkspaceMember);
router.delete('/platform/workspaces/:id/members/:userId', ep.removeWorkspaceMember);
router.get('/platform/partners', ep.getPartnerNetwork);
router.post('/platform/partners', ep.addPartner);
router.delete('/platform/partners/:id', ep.removePartner);
router.get('/platform/projects/shared', ep.getSharedProjects);
router.post('/platform/projects/shared', ep.createSharedProject);
router.post('/platform/projects/shared/:id/items', ep.shareProjectItem);
router.get('/platform/organizations/analytics', ep.getOrganizationsAnalytics);

// ============================================================
// Part 9 - Communication Center
// ============================================================

router.get('/platform/communication/channels', ep.getMessageChannels);
router.post('/platform/communication/channels', ep.createMessageChannel);
router.get('/platform/communication/channels/:id', ep.getMessageChannel);
router.put('/platform/communication/channels/:id', ep.updateMessageChannel);
router.delete('/platform/communication/channels/:id', ep.deleteMessageChannel);
router.post('/platform/communication/channels/:id/members', ep.addChannelMember);
router.delete('/platform/communication/channels/:id/members/:userId', ep.removeChannelMember);
router.get('/platform/communication/threads', ep.getMessageThreads);
router.post('/platform/communication/threads', ep.createMessageThread);
router.get('/platform/communication/messages', ep.getMessages);
router.post('/platform/communication/messages', ep.sendMessage);
router.put('/platform/communication/messages/:id', ep.editMessage);
router.delete('/platform/communication/messages/:id', ep.deleteMessage);
router.post('/platform/communication/messages/:id/reactions', ep.addMessageReaction);
router.delete('/platform/communication/messages/:id/reactions/:reaction', ep.removeMessageReaction);
router.post('/platform/communication/messages/:id/pin', ep.pinMessage);
router.post('/platform/communication/messages/:id/unpin', ep.unpinMessage);
router.get('/platform/communication/activity', ep.getActivityFeed);
router.post('/platform/communication/activity', ep.createActivityEvent);
router.post('/platform/communication/channels/:id/read', ep.markChannelRead);
router.get('/platform/communication/unread', ep.getUnreadCount);
router.get('/platform/communication/search', ep.searchMessages);

// ============================================================
// Part 10 - Knowledge Platform
// ============================================================

router.get('/platform/knowledge/articles', ep.getKnowledgeArticles);
router.get('/platform/knowledge/articles/:id', ep.getKnowledgeArticle);
router.post('/platform/knowledge/articles', ep.createKnowledgeArticle);
router.put('/platform/knowledge/articles/:id', ep.updateKnowledgeArticle);
router.delete('/platform/knowledge/articles/:id', ep.deleteKnowledgeArticle);
router.post('/platform/knowledge/articles/:id/helpful', ep.markArticleHelpful);
router.get('/platform/knowledge/categories', ep.getKnowledgeCategories);
router.post('/platform/knowledge/categories', ep.createKnowledgeCategory);
router.put('/platform/knowledge/categories/:id', ep.updateKnowledgeCategory);
router.get('/platform/knowledge/videos', ep.getKnowledgeVideos);
router.post('/platform/knowledge/videos', ep.createKnowledgeVideo);
router.get('/platform/knowledge/training/modules', ep.getTrainingModules);
router.post('/platform/knowledge/training/modules', ep.createTrainingModule);
router.put('/platform/knowledge/training/modules/:id', ep.updateTrainingModule);
router.get('/platform/knowledge/training/paths', ep.getLearningPaths);
router.post('/platform/knowledge/training/paths', ep.createLearningPath);
router.post('/platform/knowledge/training/enroll', ep.enrollInTraining);
router.put('/platform/knowledge/training/progress', ep.updateTrainingProgress);
router.get('/platform/knowledge/certifications', ep.getCertifications);
router.post('/platform/knowledge/certifications', ep.createCertification);
router.post('/platform/knowledge/certifications/:id/issue', ep.issueCertificate);
router.get('/platform/knowledge/enrollments', ep.getUserEnrollments);
router.get('/platform/knowledge/analytics', ep.getKnowledgeAnalytics);
router.get('/platform/knowledge/search', ep.searchKnowledge);

// ============================================================
// Part 11 - AI Integration Platform
// ============================================================

router.get('/platform/ai/providers', ep.getAiProviders);
router.post('/platform/ai/providers', ep.createAiProvider);
router.put('/platform/ai/providers/:id', ep.updateAiProvider);
router.delete('/platform/ai/providers/:id', ep.deleteAiProvider);
router.post('/platform/ai/providers/:id/default', ep.setDefaultAiProvider);
router.post('/platform/ai/providers/:id/test', ep.testAiProviderConnection);
router.get('/platform/ai/configs', ep.getAiProviderConfigs);
router.post('/platform/ai/configs', ep.createAiProviderConfig);
router.put('/platform/ai/configs/:id', ep.updateAiProviderConfig);
router.delete('/platform/ai/configs/:id', ep.deleteAiProviderConfig);
router.get('/platform/ai/prompts', ep.getAiPromptTemplates);
router.post('/platform/ai/prompts', ep.createAiPromptTemplate);
router.put('/platform/ai/prompts/:id', ep.updateAiPromptTemplate);
router.post('/platform/ai/prompts/:id/execute', ep.executeAiPrompt);
router.post('/platform/ai/switch-provider', ep.switchAiProvider);
router.get('/platform/ai/usage', ep.getAiUsageLogs);
router.get('/platform/ai/analytics', ep.getAiAnalytics);

// ============================================================
// Part 12 - Event Bus
// ============================================================

router.post('/platform/events/publish', ep.publishEvent);
router.post('/platform/events/subscribe', ep.subscribeToEvent);
router.get('/platform/events/subscriptions', ep.getEventSubscriptions);
router.put('/platform/events/subscriptions/:id', ep.updateEventSubscription);
router.delete('/platform/events/subscriptions/:id', ep.unsubscribeFromEvent);
router.get('/platform/events', ep.getEvents);
router.get('/platform/events/:id', ep.getEvent);
router.post('/platform/events/:id/replay', ep.replayEvent);
router.get('/platform/events/dead-letter', ep.getDeadLetterQueue);
router.post('/platform/events/dead-letter/:id/retry', ep.retryDeadLetterMessage);
router.get('/platform/events/stats', ep.getEventBusStats);

// ============================================================
// Part 13 - Plugin Marketplace
// ============================================================

router.get('/platform/plugins', ep.getPlugins);
router.get('/platform/plugins/:id', ep.getPlugin);
router.post('/platform/plugins', ep.createPlugin);
router.put('/platform/plugins/:id', ep.updatePlugin);
router.post('/platform/plugins/:id/approve', ep.approvePlugin);
router.post('/platform/plugins/:id/reject', ep.rejectPlugin);
router.get('/platform/plugins/:id/installations', ep.getPluginInstallations);
router.post('/platform/plugins/:id/install', ep.installPlugin);
router.post('/platform/plugins/:id/enable', ep.enablePlugin);
router.post('/platform/plugins/:id/disable', ep.disablePlugin);
router.post('/platform/plugins/:id/uninstall', ep.uninstallPlugin);
router.get('/platform/plugins/:id/updates', ep.getPluginUpdates);
router.post('/platform/plugins/:id/versions', ep.updatePluginVersion);
router.get('/platform/plugins/:id/dependencies', ep.getPluginDependencies);
router.get('/platform/marketplace/listings', ep.getMarketplaceListings);
router.post('/platform/marketplace/listings', ep.createMarketplaceListing);
router.get('/platform/plugins/analytics', ep.getPluginAnalytics);

// ============================================================
// Part 14 - Reporting Studio
// ============================================================

router.get('/platform/reports', ep.getReportDefinitions);
router.get('/platform/reports/:id', ep.getReportDefinition);
router.post('/platform/reports', ep.createReportDefinition);
router.put('/platform/reports/:id', ep.updateReportDefinition);
router.delete('/platform/reports/:id', ep.deleteReportDefinition);
router.post('/platform/reports/:id/duplicate', ep.duplicateReportDefinition);
router.post('/platform/reports/:id/generate', ep.generateEnterpriseReport);
router.get('/platform/reports/:id/executions', ep.getReportExecutions);
router.post('/platform/reports/:id/schedule', ep.scheduleReport);
router.delete('/platform/reports/:id/schedule', ep.unscheduleReport);
router.get('/platform/reports/:id/export', ep.exportEnterpriseReport);
router.get('/platform/dashboards', ep.getDashboards);
router.post('/platform/dashboards', ep.createDashboard);
router.put('/platform/dashboards/:id', ep.updateDashboard);
router.delete('/platform/dashboards/:id', ep.deleteDashboard);
router.get('/platform/dashboards/:id', ep.getDashboardById);
router.post('/platform/dashboards/:id/share', ep.shareDashboard);
router.get('/platform/reports/analytics', ep.getReportAnalytics);

// ============================================================
// Part 15 - Mobile Support
// ============================================================

router.post('/platform/mobile/sync/sessions', ep.createSyncSession);
router.get('/platform/mobile/sync/sessions', ep.getSyncSessions);
router.delete('/platform/mobile/sync/sessions/:id', ep.revokeSyncSession);
router.post('/platform/mobile/push/register', ep.registerPushToken);
router.post('/platform/mobile/push/unregister', ep.unregisterPushToken);
router.get('/platform/mobile/push/tokens', ep.getPushTokens);
router.get('/platform/mobile/sync/changes', ep.getChangesSince);
router.post('/platform/mobile/sync/apply', ep.applyOfflineChanges);
router.post('/platform/mobile/sync/resolve', ep.resolveSyncConflict);
router.get('/platform/mobile/sync/conflicts', ep.getSyncConflicts);
router.get('/platform/mobile/sync/analytics', ep.getSyncAnalytics);
router.post('/platform/mobile/push/send', ep.sendPushNotification);

// ============================================================
// Part 16 - SaaS Foundation
// ============================================================

router.get('/platform/saas/tenants', ep.getTenants);
router.get('/platform/saas/tenants/:id', ep.getTenant);
router.post('/platform/saas/tenants', ep.createTenant);
router.put('/platform/saas/tenants/:id', ep.updateTenant);
router.post('/platform/saas/tenants/:id/suspend', ep.suspendTenant);
router.post('/platform/saas/tenants/:id/activate', ep.activateTenant);
router.get('/platform/saas/features', ep.getFeaturePackages);
router.post('/platform/saas/features', ep.createFeaturePackage);
router.put('/platform/saas/features/:id', ep.updateFeaturePackage);
router.post('/platform/saas/tenants/:id/assign-features', ep.assignFeaturePackage);
router.get('/platform/saas/tenants/:id/quota', ep.getUsageQuota);
router.post('/platform/saas/usage/track', ep.trackUsage);
router.post('/platform/saas/usage/check', ep.checkQuota);
router.get('/platform/saas/whitelabel', ep.getWhiteLabelConfig);
router.put('/platform/saas/whitelabel', ep.upsertWhiteLabelConfig);
router.get('/platform/saas/tenants/by-domain/:domain', ep.getTenantByDomain);
router.get('/platform/saas/tenants/analytics', ep.getTenantAnalytics);
router.get('/platform/saas/overview', ep.getPlatformOverview);

export default router;
