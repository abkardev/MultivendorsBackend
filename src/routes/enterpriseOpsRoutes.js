import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import * as ops from '../controllers/enterpriseOpsController.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));
router.use(featureFlag('enterprise_ops'));

// ─── Part 1: Marketplace Administration ───
router.get('/admin/dashboard', ops.getDashboard);
router.get('/admin/companies', ops.getCompanies);
router.post('/admin/companies', ops.createCompany);
router.get('/admin/companies/:id', ops.getCompany);
router.put('/admin/companies/:id', ops.updateCompany);
router.delete('/admin/companies/:id', ops.deleteCompany);
router.post('/admin/companies/:id/restore', ops.restoreCompany);
router.post('/admin/companies/bulk-action', ops.bulkActionCompanies);
router.get('/admin/stats', ops.getPlatformStats);

router.get('/admin/countries', ops.getCountries);
router.post('/admin/countries', ops.createCountry);
router.put('/admin/countries/:id', ops.updateCountry);
router.delete('/admin/countries/:id', ops.deleteCountry);

router.get('/admin/cities', ops.getCities);
router.post('/admin/cities', ops.createCity);
router.put('/admin/cities/:country/:cityId', ops.updateCity);
router.delete('/admin/cities/:country/:cityId', ops.deleteCity);

router.get('/admin/currencies', ops.getCurrencies);
router.post('/admin/currencies', ops.createCurrency);
router.put('/admin/currencies/:code', ops.updateCurrency);

router.get('/admin/languages', ops.getLanguages);
router.post('/admin/languages', ops.createLanguage);

router.get('/admin/industries', ops.getIndustries);
router.post('/admin/industries', ops.createIndustry);

router.get('/admin/tax-rules', ops.getTaxRules);
router.post('/admin/tax-rules', ops.createTaxRule);
router.put('/admin/tax-rules/:id', ops.updateTaxRule);
router.delete('/admin/tax-rules/:id', ops.deleteTaxRule);

router.get('/admin/incoterms', ops.getIncoterms);
router.post('/admin/incoterms', ops.createIncoterm);
router.put('/admin/incoterms/:id', ops.updateIncoterm);

router.get('/admin/departments', ops.getDepartments);
router.post('/admin/departments', ops.createDepartment);
router.put('/admin/departments/:id', ops.updateDepartment);
router.delete('/admin/departments/:id', ops.deleteDepartment);

router.get('/admin/teams', ops.getTeams);
router.post('/admin/teams', ops.createTeam);
router.put('/admin/teams/:id', ops.updateTeam);
router.delete('/admin/teams/:id', ops.deleteTeam);

router.get('/admin/settings', ops.getMarketplaceSettings);
router.put('/admin/settings/:key', ops.updateMarketplaceSetting);

router.get('/admin/announcements', ops.getAnnouncements);
router.post('/admin/announcements', ops.createAnnouncement);
router.put('/admin/announcements/:id', ops.updateAnnouncement);
router.delete('/admin/announcements/:id', ops.deleteAnnouncement);

router.post('/admin/maintenance-mode', ops.toggleMaintenanceMode);

router.get('/admin/search', ops.searchEntities);
router.get('/admin/export/:entityType', ops.exportCsv);
router.post('/admin/import', ops.importCsv);

// ─── Part 2: Financial Administration ───
router.get('/admin/financial/dashboard', ops.getFinancialDashboard);
router.get('/admin/financial/revenue', ops.getRevenue);
router.get('/admin/financial/revenue/by-period', ops.getRevenueByPeriod);
router.get('/admin/financial/revenue/forecast', ops.getRevenueForecast);

router.get('/admin/financial/settlements', ops.getSettlements);
router.get('/admin/financial/settlements/:id', ops.getSettlement);
router.post('/admin/financial/settlements/:id/approve', ops.approveSettlement);
router.post('/admin/financial/settlements/:id/process', ops.processSettlement);
router.get('/admin/financial/payout-queue', ops.getPayoutQueue);

router.get('/admin/financial/refunds', ops.getRefunds);
router.put('/admin/financial/refunds/:id/process', ops.processRefund);
router.post('/admin/financial/refunds', ops.createRefund);

router.get('/admin/financial/credit-notes', ops.getCreditNotes);
router.post('/admin/financial/credit-notes', ops.createCreditNote);
router.post('/admin/financial/credit-notes/:id/void', ops.voidCreditNote);

router.get('/admin/financial/debit-notes', ops.getDebitNotes);
router.post('/admin/financial/debit-notes', ops.createDebitNote);
router.post('/admin/financial/debit-notes/:id/void', ops.voidDebitNote);

router.get('/admin/financial/invoices', ops.getInvoices);
router.get('/admin/financial/invoices/:id', ops.getInvoice);
router.post('/admin/financial/invoices', ops.createInvoice);
router.post('/admin/financial/invoices/:id/send', ops.sendInvoice);

router.get('/admin/financial/tax-reports', ops.getTaxReports);
router.get('/admin/financial/cash-flow', ops.getCashFlow);
router.get('/admin/financial/outstanding-payments', ops.getOutstandingPayments);
router.get('/admin/financial/kpis', ops.getFinancialKpis);

// ─── Part 3: Subscription & Billing ───
router.get('/admin/subscriptions/plans', ops.getPlans);
router.get('/admin/subscriptions/plans/:id', ops.getPlan);
router.post('/admin/subscriptions/plans', ops.createPlan);
router.put('/admin/subscriptions/plans/:id', ops.updatePlan);
router.delete('/admin/subscriptions/plans/:id', ops.deletePlan);

router.get('/admin/subscriptions/coupons', ops.getCoupons);
router.post('/admin/subscriptions/coupons', ops.createCoupon);
router.get('/admin/subscriptions/coupons/validate', ops.validateCoupon);

router.get('/admin/subscriptions/usage-records', ops.getUsageRecords);
router.get('/admin/subscriptions/usage-analytics', ops.getUsageAnalytics);
router.get('/admin/subscriptions/billing-history', ops.getBillingHistory);
router.get('/admin/subscriptions/forecast', ops.getSubscriptionForecast);

router.post('/admin/subscriptions/upgrade', ops.upgradePlan);
router.post('/admin/subscriptions/downgrade', ops.downgradePlan);
router.post('/admin/subscriptions/cancel', ops.cancelSubscription);
router.post('/admin/subscriptions/suspend', ops.suspendSubscription);
router.post('/admin/subscriptions/auto-renew', ops.autoRenew);
router.get('/admin/subscriptions/stats', ops.getSubscriptionStats);

// ─── Part 4: Compliance & Verification ───
router.get('/admin/compliance/verification-requests', ops.getVerificationRequests);
router.get('/admin/compliance/verification-requests/:id', ops.getVerificationRequest);
router.post('/admin/compliance/verification-requests', ops.createVerificationRequest);
router.post('/admin/compliance/verification-requests/:id/assign', ops.assignVerification);
router.post('/admin/compliance/verification-requests/:id/approve', ops.approveVerification);
router.post('/admin/compliance/verification-requests/:id/reject', ops.rejectVerification);

router.get('/admin/compliance/rules', ops.getComplianceRules);
router.post('/admin/compliance/rules', ops.createComplianceRule);
router.put('/admin/compliance/rules/:id', ops.updateComplianceRule);
router.delete('/admin/compliance/rules/:id', ops.deleteComplianceRule);
router.get('/admin/compliance/check', ops.checkCompliance);

router.get('/admin/compliance/certificates', ops.getCertificates);
router.post('/admin/compliance/certificates', ops.createCertificate);
router.post('/admin/compliance/certificates/:id/verify', ops.verifyCertificate);

router.get('/admin/compliance/dashboard', ops.getComplianceDashboard);
router.get('/admin/compliance/verification-requests/:id/timeline', ops.getVerificationTimeline);

router.post('/admin/compliance/blacklist', ops.addToBlacklist);
router.delete('/admin/compliance/blacklist/:entityType/:entityId', ops.removeFromBlacklist);
router.get('/admin/compliance/verification-analytics', ops.getVerificationAnalytics);

// ─── Part 5: Fraud Detection ───
router.get('/admin/fraud/dashboard', ops.getFraudDashboard);
router.get('/admin/fraud/alerts', ops.getFraudAlerts);
router.get('/admin/fraud/alerts/:id', ops.getFraudAlert);
router.post('/admin/fraud/alerts/:id/investigate', ops.investigateAlert);
router.put('/admin/fraud/alerts/:id/resolve', ops.resolveAlert);

router.post('/admin/fraud/detect/duplicate-accounts/:userId', ops.detectDuplicateAccounts);
router.post('/admin/fraud/detect/duplicate-companies', ops.detectDuplicateCompanies);
router.post('/admin/fraud/detect/suspicious-order/:orderId', ops.analyzeSuspiciousOrder);
router.post('/admin/fraud/detect/suspicious-review/:reviewId', ops.analyzeSuspiciousReview);
router.post('/admin/fraud/detect/bot-activity', ops.detectBotActivity);

router.get('/admin/fraud/ip-reputation', ops.checkIpReputation);
router.post('/admin/fraud/ip/block', ops.blockIpAlert);
router.post('/admin/fraud/ip/unblock/:ip', ops.unblockIpAlert);

router.get('/admin/fraud/rules', ops.getFraudRules);
router.post('/admin/fraud/rules', ops.createFraudRule);
router.put('/admin/fraud/rules/:id', ops.updateFraudRule);
router.patch('/admin/fraud/rules/:id/toggle', ops.toggleFraudRule);
router.post('/admin/fraud/rules/:id/run', ops.runFraudRule);

router.get('/admin/fraud/risk-score/:userId', ops.getRiskScore);
router.get('/admin/fraud/device-fingerprint', ops.getDeviceFingerprint);
router.post('/admin/fraud/device/register', ops.registerDevice);
router.get('/admin/fraud/investigation-queue', ops.getInvestigationQueue);

// ─── Part 6: Content Moderation ───
router.get('/admin/moderation/dashboard', ops.getModerationDashboard);
router.get('/admin/moderation/queue', ops.getModerationQueue);
router.get('/admin/moderation/queue/:id', ops.getModerationQueueItem);

router.post('/admin/moderation/report', ops.reportContent);
router.post('/admin/moderation/queue/:id/assign', ops.assignModeration);
router.post('/admin/moderation/queue/:id/approve', ops.approveContent);
router.post('/admin/moderation/queue/:id/reject', ops.rejectContent);
router.post('/admin/moderation/queue/:id/escalate', ops.escalateContent);
router.post('/admin/moderation/bulk-moderate', ops.bulkModerate);

router.get('/admin/moderation/rules', ops.getModerationRules);
router.post('/admin/moderation/rules', ops.createModerationRule);
router.put('/admin/moderation/rules/:id', ops.updateModerationRule);
router.delete('/admin/moderation/rules/:id', ops.deleteModerationRule);

router.post('/admin/moderation/check', ops.checkModerationContent);
router.post('/admin/moderation/detect-duplicates', ops.detectContentDuplicates);

router.get('/admin/moderation/blocked-content', ops.getBlockedContent);
router.post('/admin/moderation/blocked-content', ops.addBlockedContent);
router.delete('/admin/moderation/blocked-content/:id', ops.removeBlockedContent);

router.post('/admin/moderation/ai-moderate', ops.aiModerateContent);

// ─── Part 7: Governance ───
router.get('/admin/governance/dashboard', ops.getGovernanceDashboard);
router.get('/admin/governance/policies', ops.getPolicies);
router.get('/admin/governance/policies/:id', ops.getPolicy);
router.post('/admin/governance/policies', ops.createPolicy);
router.put('/admin/governance/policies/:id', ops.updatePolicy);
router.post('/admin/governance/policies/:id/archive', ops.archivePolicy);
router.post('/admin/governance/policies/:id/approve', ops.approvePolicy);
router.get('/admin/governance/policies/:id/versions', ops.getPolicyVersions);

router.get('/admin/governance/approval-matrices', ops.getApprovalMatrices);
router.post('/admin/governance/approval-matrices', ops.createApprovalMatrix);
router.put('/admin/governance/approval-matrices/:id', ops.updateApprovalMatrix);
router.delete('/admin/governance/approval-matrices/:id', ops.deleteApprovalMatrix);

router.post('/admin/governance/check-approval', ops.checkApprovalRequired);
router.get('/admin/governance/audit', ops.getGovernanceAudit);
router.get('/admin/governance/sla-summary', ops.getSlaSummary);

// ─── Part 8: Marketplace Analytics ───
router.get('/admin/analytics/marketplace-overview', ops.getMarketplaceOverview);
router.get('/admin/analytics/gmv', ops.getGmv);
router.get('/admin/analytics/revenue', ops.getRevenueAnalytics);
router.get('/admin/analytics/orders', ops.getOrderAnalytics);
router.get('/admin/analytics/buyers', ops.getBuyerAnalytics);
router.get('/admin/analytics/suppliers', ops.getSupplierAnalytics);
router.get('/admin/analytics/conversion-funnel', ops.getConversionFunnel);
router.get('/admin/analytics/countries', ops.getCountryAnalytics);
router.get('/admin/analytics/industries', ops.getIndustryAnalytics);
router.get('/admin/analytics/categories', ops.getCategoryAnalytics);
router.get('/admin/analytics/subscriptions', ops.getSubscriptionAnalytics);
router.get('/admin/analytics/growth', ops.getGrowthMetrics);
router.get('/admin/analytics/retention', ops.getRetentionRate);
router.get('/admin/analytics/churn', ops.getChurnRate);
router.get('/admin/analytics/clv', ops.getCustomerLifetimeValue);
router.get('/admin/analytics/cac', ops.getCustomerAcquisitionCost);
router.get('/admin/analytics/search', ops.getSearchAnalyticsAdmin);
router.get('/admin/analytics/feature-adoption', ops.getFeatureAdoption);
router.get('/admin/analytics/trends', ops.getMarketplaceTrends);
router.get('/admin/analytics/forecasts', ops.getForecasts);
router.get('/admin/analytics/executive-report', ops.getExecutiveReport);

// ─── Part 9: AI Marketplace Manager ───
router.post('/admin/ai/query', ops.processAiMarketplaceQuery);

// ─── Part 10: Enterprise Notifications ───
router.post('/admin/notifications/send/email', ops.sendEmailNotification);
router.post('/admin/notifications/send/sms', ops.sendSmsNotification);
router.post('/admin/notifications/send/whatsapp', ops.sendWhatsAppNotification);
router.post('/admin/notifications/send/push', ops.sendPushNotification);
router.post('/admin/notifications/send/slack', ops.sendSlackNotification);
router.post('/admin/notifications/send/webhook', ops.sendWebhookNotification);
router.post('/admin/notifications/schedule', ops.scheduleNotificationDelivery);
router.post('/admin/notifications/send/digest', ops.sendDigestNotification);
router.post('/admin/notifications/campaigns', ops.createNotificationCampaign);
router.post('/admin/notifications/campaigns/:id/send', ops.sendNotificationCampaign);
router.get('/admin/notifications/analytics', ops.getNotificationAnalyticsAdmin);
router.get('/admin/notifications/queue', ops.getNotificationQueue);
router.post('/admin/notifications/queue/:id/retry', ops.retryFailedNotification);

// ─── Part 11: Search Administration ───
router.get('/admin/search/analytics', ops.getSearchAnalyticsAdminSM);
router.get('/admin/search/popular', ops.getPopularSearchesAdmin);
router.get('/admin/search/failed', ops.getFailedSearchesAdmin);
router.post('/admin/search/synonyms', ops.manageSynonyms);
router.post('/admin/search/stop-words', ops.manageStopWords);
router.get('/admin/search/ranking-rules', ops.getRankingRules);
router.post('/admin/search/boost-rules', ops.addBoostRule);
router.get('/admin/search/suggestions', ops.getSearchSuggestionsAdmin);
router.get('/admin/search/index-status', ops.getIndexStatus);
router.post('/admin/search/rebuild-index', ops.rebuildSearchIndex);
router.get('/admin/search/performance', ops.getSearchPerformance);

// ─── Part 12: Audit Center ───
router.get('/admin/audit/timeline', ops.getAuditTimeline);
router.get('/admin/audit/entity/:entityType/:entityId', ops.getEntityHistory);
router.get('/admin/audit/user/:id', ops.getUserHistory);
router.get('/admin/audit/action/:action', ops.getActionHistory);
router.get('/admin/audit/security-events', ops.getSecurityEvents);
router.get('/admin/audit/configuration-changes', ops.getConfigurationChanges);
router.get('/admin/audit/permission-changes', ops.getPermissionChanges);
router.post('/admin/audit/correlate', ops.correlateEvents);
router.get('/admin/audit/diff', ops.getAuditDiff);
router.get('/admin/audit/compliance-report', ops.getAuditComplianceReport);
router.get('/admin/audit/export-csv', ops.exportAuditCsv);

// ─── Part 13: Operations Center ───
router.get('/admin/ops/system-health', ops.getSystemHealth);
router.get('/admin/ops/live-metrics', ops.getLiveMetrics);
router.get('/admin/ops/queues', ops.getQueues);
router.get('/admin/ops/scheduler', ops.getSchedulerStatus);
router.get('/admin/ops/jobs', ops.getJobs);
router.get('/admin/ops/cache-stats', ops.getCacheStatsOps);
router.get('/admin/ops/memory', ops.getMemoryUsage);
router.get('/admin/ops/database', ops.getDatabaseStatus);
router.get('/admin/ops/api-status', ops.getApiStatus);
router.get('/admin/ops/notification-stats', ops.getOpsNotificationStats);
router.get('/admin/ops/errors', ops.getOpsErrors);
router.get('/admin/ops/kpis', ops.getOperationalKpis);
router.get('/admin/ops/realtime-activity', ops.getRealtimeActivity);

// ─── Part 14: Security Center ───
router.get('/admin/security/dashboard', ops.getSecurityDashboard);
router.get('/admin/security/threats', ops.getThreats);
router.get('/admin/security/alerts', ops.getSecurityAlerts);
router.get('/admin/security/blocked-ips', ops.getBlockedIpsOps);
router.post('/admin/security/ip/block', ops.blockIpOps);
router.post('/admin/security/ip/unblock/:ip', ops.unblockIpOps);
router.get('/admin/security/login-analytics', ops.getLoginAnalytics);
router.get('/admin/security/failed-logins', ops.getFailedLogins);
router.get('/admin/security/admin-actions', ops.getAdminActions);
router.get('/admin/security/password-policies', ops.getPasswordPolicies);
router.put('/admin/security/password-policies', ops.updatePasswordPolicy);
router.get('/admin/security/active-sessions', ops.getActiveSessions);
router.delete('/admin/security/sessions/:sessionId', ops.terminateUserSession);
router.get('/admin/security/audit', ops.getSecurityAuditOps);
router.get('/admin/security/incident-timeline', ops.getIncidentTimeline);

// ─── Part 15: Runtime Configuration ───
router.get('/admin/config/runtime-settings', ops.getRuntimeSettings);
router.get('/admin/config/runtime-settings/:key', ops.getRuntimeSetting);
router.put('/admin/config/runtime-settings/:key', ops.setRuntimeSetting);
router.delete('/admin/config/runtime-settings/:key', ops.deleteRuntimeSetting);
router.get('/admin/config/runtime-settings/:key/versions', ops.getRuntimeVersionHistory);
router.post('/admin/config/runtime-settings/:key/rollback/:version', ops.rollbackRuntimeSetting);
router.post('/admin/config/runtime-settings/:key/validate', ops.validateRuntimeSetting);
router.post('/admin/config/runtime-settings/import', ops.importRuntimeSettings);
router.get('/admin/config/runtime-settings/export', ops.exportRuntimeSettings);
router.get('/admin/config/environment-overrides/:environment', ops.getEnvironmentOverrides);
router.get('/admin/config/dependencies/:key', ops.checkDependencies);

// ─── Part 16: Tenant Management ───
router.get('/admin/tenants', ops.getTenants);
router.get('/admin/tenants/:slug', ops.getTenant);
router.post('/admin/tenants', ops.createTenant);
router.put('/admin/tenants/:slug', ops.updateTenant);
router.post('/admin/tenants/:slug/suspend', ops.suspendTenant);
router.post('/admin/tenants/:slug/activate', ops.activateTenant);
router.get('/admin/tenants/:slug/usage', ops.getTenantUsage);
router.get('/admin/tenants/:slug/quota', ops.checkTenantQuota);
router.get('/admin/tenants/:slug/branding', ops.getTenantBranding);
router.put('/admin/tenants/:slug/branding', ops.updateTenantBranding);
router.get('/admin/tenants/usage-stats', ops.getTenantUsageStats);

export default router;
