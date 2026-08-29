import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import * as cc from '../controllers/enterpriseCommercialController.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));
router.use(featureFlag('enterprise_commercial'));

// ============================================================
// Part 1 - White-Label SaaS Platform
// ============================================================

router.post('/commercial/white-label/brands', cc.createBrand);
router.get('/commercial/white-label/brands', cc.listBrands);
router.get('/commercial/white-label/brands/:id', cc.getBrand);
router.put('/commercial/white-label/brands/:id', cc.updateBrand);
router.delete('/commercial/white-label/brands/:id', cc.deleteBrand);
router.post('/commercial/white-label/brands/:id/default', cc.setDefaultBrand);
router.post('/commercial/white-label/brands/:id/duplicate', cc.duplicateBrand);
router.get('/commercial/white-label/brands/domain/:domain', cc.getBrandByDomain);
router.post('/commercial/white-label/brands/:id/verify-domain', cc.verifyDomain);
router.post('/commercial/white-label/brands/:id/assets', cc.uploadAsset);
router.get('/commercial/white-label/brands/:id/assets', cc.listAssets);
router.delete('/commercial/white-label/assets/:id', cc.deleteAsset);
router.post('/commercial/white-label/themes', cc.createTheme);
router.put('/commercial/white-label/themes/:id', cc.updateTheme);
router.get('/commercial/white-label/brands/:id/themes', cc.listThemes);
router.post('/commercial/white-label/themes/:id/default', cc.setDefaultTheme);
router.get('/commercial/white-label/apply/:domain', cc.applyBranding);
router.get('/commercial/white-label/brands/:id/css', cc.getBrandingCSS);
router.post('/commercial/white-label/brands/:id/validate', cc.validateBrand);
router.get('/commercial/white-label/tenants/:tenantId/settings', cc.getTenantSettings);
router.put('/commercial/white-label/tenants/:tenantId/settings', cc.updateTenantSettings);

// ============================================================
// Part 2 - Licensing & Entitlement
// ============================================================

router.post('/commercial/licensing/licenses', cc.createLicense);
router.get('/commercial/licensing/licenses', cc.listLicenses);
router.get('/commercial/licensing/licenses/:id', cc.getLicense);
router.post('/commercial/licensing/licenses/activate', cc.activateLicense);
router.post('/commercial/licensing/licenses/offline-activate', cc.offlineActivation);
router.post('/commercial/licensing/licenses/validate', cc.validateLicense);
router.post('/commercial/licensing/activations/:id/deactivate', cc.deactivateLicense);
router.post('/commercial/licensing/licenses/:id/revoke', cc.revokeLicense);
router.post('/commercial/licensing/licenses/:id/seats', cc.addSeat);
router.delete('/commercial/licensing/seats/:id', cc.removeSeat);
router.get('/commercial/licensing/licenses/:id/seats', cc.listSeats);
router.post('/commercial/licensing/licenses/:id/usage', cc.recordUsage);
router.get('/commercial/licensing/licenses/:id/usage', cc.getUsage);
router.get('/commercial/licensing/licenses/:id/entitlement/:feature', cc.checkFeatureEntitlement);
router.post('/commercial/licensing/licenses/:id/renew', cc.renewLicense);
router.post('/commercial/licensing/licenses/:id/transfer', cc.transferLicense);
router.get('/commercial/licensing/licenses/:id/summary', cc.getLicenseSummary);
router.post('/commercial/licensing/expire', cc.expireLicenses);
router.post('/commercial/licensing/validate-all', cc.validateAllLicenses);
router.post('/commercial/licensing/generate-code', cc.generateActivationCode);

// ============================================================
// Part 3 - Installer
// ============================================================

router.post('/commercial/installer/installations', cc.startInstallation);
router.post('/commercial/installer/installations/:installationId/step', cc.runStep);
router.post('/commercial/installer/installations/:installationId/run-all', cc.runAllSteps);
router.get('/commercial/installer/installations/:installationId/validate-env', cc.validateEnvironment);
router.post('/commercial/installer/configure/database', cc.configureDatabase);
router.post('/commercial/installer/configure/redis', cc.configureRedis);
router.post('/commercial/installer/configure/smtp', cc.configureSMTP);
router.post('/commercial/installer/configure/storage', cc.configureStorage);
router.post('/commercial/installer/configure/ai', cc.configureAI);
router.post('/commercial/installer/admin', cc.createInitialAdmin);
router.post('/commercial/installer/sample-data', cc.installSampleData);
router.post('/commercial/installer/installations/:installationId/verify', cc.verifyInstallation);
router.post('/commercial/installer/installations/:installationId/rollback', cc.rollbackInstallation);
router.get('/commercial/installer/installations/:installationId', cc.getInstallationStatus);
router.get('/commercial/installer/installations', cc.listInstallations);

// ============================================================
// Part 4 - Upgrade
// ============================================================

router.get('/commercial/upgrade/version', cc.detectCurrentVersion);
router.post('/commercial/upgrade/plan', cc.planUpgrade);
router.post('/commercial/upgrade/migrations', cc.createMigration);
router.post('/commercial/upgrade/migrations/:id/run', cc.runMigration);
router.post('/commercial/upgrade/migrations/:id/rollback', cc.rollbackMigration);
router.post('/commercial/upgrade/packages/:id/run', cc.runUpgrade);
router.post('/commercial/upgrade/packages/:id/rollback', cc.rollbackUpgrade);
router.post('/commercial/upgrade/packages/:id/validate', cc.validateUpgrade);
router.post('/commercial/upgrade/dry-run', cc.dryRunUpgrade);
router.get('/commercial/upgrade/versions', cc.getVersionHistory);
router.get('/commercial/upgrade/path', cc.getUpgradePath);
router.get('/commercial/upgrade/compatibility', cc.checkCompatibility);
router.get('/commercial/upgrade/release-notes', cc.generateReleaseNotes);
router.post('/commercial/upgrade/record', cc.recordUpgrade);
router.get('/commercial/upgrade/migrations', cc.listMigrations);
router.get('/commercial/upgrade/migrations/:id', cc.getMigration);

// ============================================================
// Part 5 - Plugin SDK
// ============================================================

router.post('/commercial/plugin-sdk/plugins/register', cc.registerPlugin);
router.post('/commercial/plugin-sdk/plugins/unregister', cc.unregisterPlugin);
router.get('/commercial/plugin-sdk/plugins/:pluginId/hooks', cc.getHooks);
router.get('/commercial/plugin-sdk/plugins/:pluginId/events', cc.getEvents);
router.post('/commercial/plugin-sdk/hooks', cc.registerHook);
router.post('/commercial/plugin-sdk/events', cc.registerEvent);
router.post('/commercial/plugin-sdk/permissions', cc.registerPermission);
router.post('/commercial/plugin-sdk/hooks/execute', cc.executeHooks);
router.post('/commercial/plugin-sdk/events/emit', cc.emitEvent);
router.get('/commercial/plugin-sdk/plugins', cc.listPlugins);
router.get('/commercial/plugin-sdk/plugins/:pluginId/manifest', cc.getPluginManifest);
router.post('/commercial/plugin-sdk/plugins/:pluginId/validate', cc.validatePlugin);
router.get('/commercial/plugin-sdk/plugins/:pluginId/permissions/check', cc.checkPermissions);
router.get('/commercial/plugin-sdk/hook-definitions', cc.getHookDefinitions);
router.get('/commercial/plugin-sdk/event-definitions', cc.getEventDefinitions);

// ============================================================
// Part 6 - Theme Engine
// ============================================================

router.post('/commercial/theme-engine/themes', cc.createTheme_);
router.put('/commercial/theme-engine/themes/:id', cc.updateTheme_);
router.get('/commercial/theme-engine/themes/:id', cc.getTheme);
router.get('/commercial/theme-engine/themes', cc.listThemes_);
router.delete('/commercial/theme-engine/themes/:id', cc.deleteTheme);
router.post('/commercial/theme-engine/themes/:id/duplicate', cc.duplicateTheme);
router.get('/commercial/theme-engine/themes/:id/export', cc.exportTheme);
router.post('/commercial/theme-engine/themes/import', cc.importTheme);
router.post('/commercial/theme-engine/themes/:id/layouts', cc.createLayout);
router.put('/commercial/theme-engine/layouts/:id', cc.updateLayout);
router.get('/commercial/theme-engine/themes/:id/layouts', cc.listLayouts);
router.post('/commercial/theme-engine/themes/:id/components', cc.createComponent);
router.put('/commercial/theme-engine/components/:id', cc.updateComponent);
router.get('/commercial/theme-engine/themes/:id/components', cc.listComponents);
router.get('/commercial/theme-engine/themes/:id/css', cc.generateThemeCSS);
router.get('/commercial/theme-engine/themes/:id/preview', cc.previewTheme);
router.post('/commercial/theme-engine/themes/:id/activate', cc.setActiveTheme);
router.get('/commercial/theme-engine/active', cc.getActiveTheme);
router.post('/commercial/theme-engine/themes/:id/compile', cc.compileTheme);

// ============================================================
// Part 7 - Edition Management
// ============================================================

router.post('/commercial/editions', cc.createEdition);
router.put('/commercial/editions/:id', cc.updateEdition);
router.get('/commercial/editions/:id', cc.getEdition);
router.get('/commercial/editions', cc.listEditions);
router.delete('/commercial/editions/:id', cc.deleteEdition);
router.get('/commercial/editions/type/:type', cc.getEditionsByType);
router.get('/commercial/editions/tenant/:tenantId', cc.getEditionForTenant);
router.get('/commercial/editions/:id/features/:featureCode/access', cc.checkFeatureAccess);
router.post('/commercial/editions/:id/features', cc.createFeature);
router.put('/commercial/editions/features/:id', cc.updateFeature);
router.post('/commercial/editions/:id/packages', cc.createPackage);
router.put('/commercial/editions/packages/:id', cc.updatePackage);
router.get('/commercial/editions/:id/packages', cc.getPackages);
router.get('/commercial/editions/:id/features/:featureCode/limits', cc.getFeatureLimits);
router.post('/commercial/editions/compare', cc.compareEditions);
router.get('/commercial/editions/comparison', cc.getEditionComparison);
router.post('/commercial/editions/:id/validate', cc.validateEditionFeatures);

// ============================================================
// Part 8 - Customer Success
// ============================================================

router.post('/commercial/customer-success/health/calculate', cc.calculateHealthScore);
router.get('/commercial/customer-success/health/:tenantId', cc.getHealth);
router.get('/commercial/customer-success/health', cc.listHealth);
router.post('/commercial/customer-success/plans', cc.createSuccessPlan);
router.put('/commercial/customer-success/plans/:id', cc.updateSuccessPlan);
router.get('/commercial/customer-success/plans/:id', cc.getSuccessPlan);
router.get('/commercial/customer-success/plans', cc.listSuccessPlans);
router.post('/commercial/customer-success/plans/:id/milestones', cc.recordMilestone);
router.get('/commercial/customer-success/journey/:tenantId', cc.getCustomerJourney);
router.put('/commercial/customer-success/journey/:tenantId/stage', cc.updateJourneyStage);
router.post('/commercial/customer-success/journey/:tenantId/touchpoints', cc.recordTouchpoint);
router.post('/commercial/customer-success/health/:id/recommendations', cc.generateRecommendations);
router.get('/commercial/customer-success/health/:id/renewal-probability', cc.calculateRenewalProbability);
router.get('/commercial/customer-success/health/:id/churn-risk', cc.calculateChurnRisk);
router.get('/commercial/customer-success/at-risk', cc.getAtRiskTenants);
router.get('/commercial/customer-success/expansion-opportunities', cc.getExpansionOpportunities);
router.post('/commercial/customer-success/health/recalculate-all', cc.recalculateAllHealth);

// ============================================================
// Part 9 - Enterprise Billing
// ============================================================

router.post('/commercial/billing/accounts', cc.createAccount);
router.get('/commercial/billing/accounts/:id', cc.getAccount);
router.put('/commercial/billing/accounts/:id', cc.updateAccount);
router.get('/commercial/billing/accounts', cc.listAccounts);
router.post('/commercial/billing/accounts/:id/invoices/generate', cc.generateInvoice);
router.get('/commercial/billing/invoices/:id', cc.getInvoice);
router.get('/commercial/billing/accounts/:id/invoices', cc.listInvoices);
router.put('/commercial/billing/invoices/:id/status', cc.updateInvoiceStatus);
router.post('/commercial/billing/usage', cc.recordUsage_);
router.get('/commercial/billing/usage', cc.listUsage);
router.post('/commercial/billing/accounts/:id/adjustments', cc.createAdjustment);
router.post('/commercial/billing/adjustments/:id/apply', cc.applyAdjustment);
router.post('/commercial/billing/calculate', cc.calculateTotals);
router.get('/commercial/billing/accounts/:id/summary', cc.getBillingSummary);
router.get('/commercial/billing/outstanding', cc.getOutstandingBalance);
router.post('/commercial/billing/invoices/monthly', cc.generateMonthlyInvoices);
router.post('/commercial/billing/usage/aggregate', cc.aggregateUsage);
router.get('/commercial/billing/analytics', cc.getBillingAnalytics);

// ============================================================
// Part 10 - Extension Store / Marketplace
// ============================================================

router.post('/commercial/extensions/register', cc.registerExtension);
router.put('/commercial/extensions/:id', cc.updateExtension);
router.get('/commercial/extensions/:id', cc.getExtension);
router.get('/commercial/extensions', cc.listExtensions);
router.post('/commercial/extensions/:id/approve', cc.approveExtension);
router.post('/commercial/extensions/:id/reject', cc.rejectExtension);
router.post('/commercial/extensions/:id/publish', cc.publishExtension);
router.post('/commercial/extensions/:id/archive', cc.archiveExtension);
router.post('/commercial/extensions/categories', cc.createCategory);
router.put('/commercial/extensions/categories/:id', cc.updateCategory);
router.get('/commercial/extensions/categories', cc.listCategories);
router.post('/commercial/extensions/:id/install', cc.installExtension);
router.post('/commercial/extensions/installations/:id/uninstall', cc.uninstallExtension);
router.post('/commercial/extensions/installations/:id/upgrade', cc.upgradeExtension);
router.post('/commercial/extensions/installations/:id/enable', cc.enableExtension);
router.post('/commercial/extensions/installations/:id/disable', cc.disableExtension);
router.post('/commercial/extensions/:id/reviews', cc.addReview);
router.get('/commercial/extensions/:id/reviews', cc.getReviews);
router.get('/commercial/extensions/:id/compatibility', cc.checkCompatibility_);
router.get('/commercial/extensions/search', cc.searchExtensions);
router.get('/commercial/extensions/:id/usage', cc.getExtensionUsage);
router.get('/commercial/extensions/popular', cc.getPopularExtensions);
router.post('/commercial/extensions/validate-compatibility', cc.validateExtensionCompatibility);

// ============================================================
// Part 11 - Enterprise CLI
// ============================================================

router.get('/commercial/cli/commands', cc.getCommandDefinitions);
router.get('/commercial/cli/commands/:name', cc.getCommand);
router.get('/commercial/cli/docs', cc.generateCommandDocs);
router.get('/commercial/cli/commands/install', cc.getInstallCommand);
router.get('/commercial/cli/commands/upgrade', cc.getUpgradeCommand);
router.get('/commercial/cli/commands/migrate', cc.getMigrateCommand);
router.get('/commercial/cli/commands/backup', cc.getBackupCommand);
router.get('/commercial/cli/commands/restore', cc.getRestoreCommand);
router.get('/commercial/cli/commands/diagnostics', cc.getDiagnosticsCommand);
router.get('/commercial/cli/commands/optimize', cc.getOptimizeCommand);
router.get('/commercial/cli/commands/verify', cc.getVerifyCommand);
router.get('/commercial/cli/commands/license', cc.getLicenseCommand);
router.get('/commercial/cli/commands/tenant', cc.getTenantCommand);
router.post('/commercial/cli/validate', cc.validateCommand);
router.get('/commercial/cli/help/:name', cc.getHelpText);

// ============================================================
// Part 12 - Release Management
// ============================================================

router.post('/commercial/releases', cc.createRelease);
router.put('/commercial/releases/:id', cc.updateRelease);
router.get('/commercial/releases/:id', cc.getRelease);
router.get('/commercial/releases', cc.listReleases);
router.post('/commercial/releases/:id/publish', cc.publishRelease);
router.post('/commercial/releases/:id/deprecate', cc.deprecateRelease);
router.post('/commercial/releases/:id/archive', cc.archiveRelease);
router.post('/commercial/releases/:id/notes', cc.createReleaseNote);
router.put('/commercial/releases/notes/:id', cc.updateReleaseNote);
router.get('/commercial/releases/:id/notes', cc.getReleaseNotes);
router.get('/commercial/releases/compatibility', cc.checkCompatibility__);
router.get('/commercial/releases/compatibility/:id', cc.getCompatibilityReport);
router.get('/commercial/releases/upgrade-assistant', cc.getUpgradeAssistant);
router.get('/commercial/releases/changelog', cc.getChangelog);
router.get('/commercial/releases/latest', cc.getLatestVersion);
router.get('/commercial/releases/timeline', cc.getVersionTimeline);
router.get('/commercial/releases/migration-guide', cc.generateMigrationGuide);
router.get('/commercial/releases/compare', cc.compareVersions);

// ============================================================
// Part 13 - Customer Portal
// ============================================================

router.post('/commercial/customer-portal/portals', cc.createPortal);
router.put('/commercial/customer-portal/portals/:id', cc.updatePortal);
router.get('/commercial/customer-portal/portals/:tenantId', cc.getPortal);
router.get('/commercial/customer-portal/portals', cc.listPortals);
router.post('/commercial/customer-portal/downloads', cc.addDownloadPackage);
router.put('/commercial/customer-portal/downloads/:id', cc.updateDownloadPackage);
router.get('/commercial/customer-portal/downloads', cc.listDownloadPackages);
router.get('/commercial/customer-portal/downloads/:id', cc.getDownloadPackage);
router.post('/commercial/customer-portal/downloads/:id/record', cc.recordDownload);
router.post('/commercial/customer-portal/portals/:portalId/tickets', cc.createTicket);
router.put('/commercial/customer-portal/tickets/:id', cc.updateTicket);
router.get('/commercial/customer-portal/tickets/:id', cc.getTicket);
router.get('/commercial/customer-portal/portals/:portalId/tickets', cc.listTickets);
router.post('/commercial/customer-portal/tickets/:id/messages', cc.addTicketMessage);
router.post('/commercial/customer-portal/tickets/:id/close', cc.closeTicket);
router.get('/commercial/customer-portal/portals/:portalId/analytics', cc.getPortalAnalytics);
router.get('/commercial/customer-portal/licenses/:licenseId/downloads', cc.getLicenseDownloads);

// ============================================================
// Part 14 - Enterprise Support Center
// ============================================================

router.post('/commercial/support/sessions', cc.createSession);
router.get('/commercial/support/sessions/:id', cc.getSession);
router.post('/commercial/support/sessions/:id/end', cc.endSession);
router.get('/commercial/support/sessions', cc.listSessions);
router.post('/commercial/support/sessions/:id/diagnostics', cc.generateDiagnosticBundle);
router.get('/commercial/support/diagnostics/:id', cc.getDiagnosticBundle);
router.get('/commercial/support/sessions/:id/diagnostics', cc.listDiagnosticBundles);
router.post('/commercial/support/snapshots', cc.generateSystemSnapshot);
router.get('/commercial/support/health/:tenantId', cc.generateHealthReport);
router.get('/commercial/support/sessions/:id/package', cc.generateSupportPackage);
router.post('/commercial/support/sessions/:id/tokens', cc.createAccessToken);
router.post('/commercial/support/tokens/validate', cc.validateAccessToken);
router.post('/commercial/support/tokens/:id/revoke', cc.revokeAccessToken);
router.get('/commercial/support/sessions/:id/logs', cc.getSessionLogs);
router.get('/commercial/support/verify-access/:sessionId', cc.verifySupportAccess);
router.post('/commercial/support/cleanup-sessions', cc.cleanupExpiredSessions);

// ============================================================
// Part 15 - Certification
// ============================================================

router.get('/commercial/certification/checklists/:type', cc.getChecklist);
router.put('/commercial/certification/checklists/:type', cc.updateChecklist);
router.get('/commercial/certification/checklists', cc.listChecklists);
router.post('/commercial/certification/run', cc.runCertification);
router.get('/commercial/certification/reports/:id', cc.getCertification);
router.get('/commercial/certification/reports', cc.listCertifications);
router.post('/commercial/certification/reports/:id/recalculate', cc.recalculateCertification);
router.post('/commercial/certification/production-readiness', cc.runProductionReadiness);
router.post('/commercial/certification/security-readiness', cc.runSecurityReadiness);
router.post('/commercial/certification/performance-readiness', cc.runPerformanceReadiness);
router.post('/commercial/certification/deployment-readiness', cc.runDeploymentReadiness);
router.post('/commercial/certification/compliance-readiness', cc.runComplianceReadiness);
router.post('/commercial/certification/marketplace-readiness', cc.runMarketplaceReadiness);
router.post('/commercial/certification/calculate-score', cc.calculateScore);
router.post('/commercial/certification/generate-recommendations', cc.generateRecommendations_);
router.get('/commercial/certification/latest/:tenantId', cc.getLatestCertifications);
router.post('/commercial/certification/cleanup', cc.cleanupOldReports);

// ============================================================
// Part 16 - Demo / Commercial Packaging
// ============================================================

router.post('/commercial/demo/environments', cc.createDemoEnvironment);
router.get('/commercial/demo/environments/:id', cc.getDemoEnvironment);
router.get('/commercial/demo/environments', cc.listDemoEnvironments);
router.delete('/commercial/demo/environments/:id', cc.deleteDemoEnvironment);
router.post('/commercial/demo/environments/:id/extend', cc.extendDemoEnvironment);
router.post('/commercial/demo/datasets', cc.createDataset);
router.get('/commercial/demo/datasets/:id', cc.getDataset);
router.get('/commercial/demo/datasets', cc.listDatasets);
router.post('/commercial/demo/datasets/:datasetId/companies', cc.createSampleCompany);
router.post('/commercial/demo/datasets/generate/manufacturing', cc.generateManufacturingDataset);
router.post('/commercial/demo/datasets/generate/retail', cc.generateRetailDataset);
router.post('/commercial/demo/datasets/generate/general', cc.generateGeneralDataset);
router.post('/commercial/demo/environments/:envId/populate', cc.populateDemoEnvironment);
router.get('/commercial/demo/analytics', cc.getDemoAnalytics);
router.post('/commercial/demo/cleanup', cc.cleanupExpiredEnvironments);
router.get('/commercial/demo/environments/:id/status', cc.getDemoStatus);
router.post('/commercial/packaging/mark-all-demo', cc.markAllAsDemo);

export default router;
