import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import * as ei from '../controllers/enterpriseIntelligenceController.js';

const router = Router();
router.use(protect);
router.use(authorize('admin'));
router.use(featureFlag('enterprise_intelligence'));

// ============================================================
// Part 1 - Telemetry
// ============================================================

router.post('/intelligence-enterprise/telemetry/events', ei.collectTelemetryEvent);
router.get('/intelligence-enterprise/telemetry/metrics', ei.getTelemetryMetrics);
router.get('/intelligence-enterprise/telemetry/metrics/history', ei.getMetricHistory);
router.get('/intelligence-enterprise/telemetry/metrics/percentiles', ei.getPercentiles);
router.get('/intelligence-enterprise/telemetry/metrics/heatmap', ei.getHeatmap);
router.get('/intelligence-enterprise/telemetry/metrics/rolling-average', ei.getRollingAverage);
router.post('/intelligence-enterprise/telemetry/health', ei.reportServiceHealth);
router.get('/intelligence-enterprise/telemetry/health', ei.getServiceHealth);
router.post('/intelligence-enterprise/telemetry/resources', ei.reportResourceUsage);
router.get('/intelligence-enterprise/telemetry/resources', ei.getResourceUsage);
router.get('/intelligence-enterprise/telemetry/dashboard', ei.getTelemetryDashboard);

// ============================================================
// Part 2 - Distributed Tracing
// ============================================================

router.post('/intelligence-enterprise/tracing/traces', ei.startTrace);
router.put('/intelligence-enterprise/tracing/traces/:id/end', ei.endTrace);
router.post('/intelligence-enterprise/tracing/traces/:id/spans', ei.startSpan);
router.put('/intelligence-enterprise/tracing/spans/:id/end', ei.endSpan);
router.post('/intelligence-enterprise/tracing/traces/:id/events', ei.addTraceEvent);
router.get('/intelligence-enterprise/tracing/traces/:id', ei.getTrace);
router.get('/intelligence-enterprise/tracing/traces', ei.searchTraces);
router.get('/intelligence-enterprise/tracing/traces/:id/timeline', ei.getTraceTimeline);
router.get('/intelligence-enterprise/tracing/traces/:id/critical-path', ei.getCriticalPath);
router.get('/intelligence-enterprise/tracing/dependencies', ei.getServiceDependencies);
router.get('/intelligence-enterprise/tracing/analytics', ei.getTraceAnalytics);

// ============================================================
// Part 3 - AIOps
// ============================================================

router.get('/intelligence-enterprise/aiops/metrics', ei.analyzeAIOpsMetrics);
router.get('/intelligence-enterprise/aiops/failures', ei.analyzeFailures);
router.get('/intelligence-enterprise/aiops/degradation', ei.detectPerformanceDegradation);
router.get('/intelligence-enterprise/aiops/capacity', ei.analyzeCapacity);
router.get('/intelligence-enterprise/aiops/root-cause', ei.getRootCauseHypotheses);
router.get('/intelligence-enterprise/aiops/optimizations', ei.getAIOpsOptimizationSuggestions);
router.get('/intelligence-enterprise/aiops/incidents/:id/summary', ei.getIncidentSummary);
router.get('/intelligence-enterprise/aiops/incidents/:id/recovery', ei.getRecoveryRecommendations);
router.get('/intelligence-enterprise/aiops/trends', ei.getTrendAnalysis);
router.get('/intelligence-enterprise/aiops/dashboard', ei.getAIOpsDashboard);

// ============================================================
// Part 4 - FinOps
// ============================================================

router.post('/intelligence-enterprise/finops/costs', ei.recordCost);
router.get('/intelligence-enterprise/finops/costs/breakdown', ei.getCostBreakdown);
router.get('/intelligence-enterprise/finops/costs/trend', ei.getCostTrend);
router.get('/intelligence-enterprise/finops/costs/analysis', ei.analyzeCosts);
router.get('/intelligence-enterprise/finops/costs/forecast', ei.forecastCost);
router.get('/intelligence-enterprise/finops/budgets', ei.getBudgetStatus);
router.post('/intelligence-enterprise/finops/budgets/alerts', ei.createBudgetAlert);
router.get('/intelligence-enterprise/finops/budgets/alerts/check', ei.checkBudgetAlerts);
router.get('/intelligence-enterprise/finops/dashboard', ei.getFinOpsDashboard);

// ============================================================
// Part 5 - Performance Optimization
// ============================================================

router.get('/intelligence-enterprise/performance/slow-endpoints', ei.detectSlowEndpoints);
router.get('/intelligence-enterprise/performance/slow-queries', ei.detectSlowQueries);
router.get('/intelligence-enterprise/performance/large-payloads', ei.detectLargePayloads);
router.get('/intelligence-enterprise/performance/expensive-aggregations', ei.detectExpensiveAggregations);
router.get('/intelligence-enterprise/performance/memory-issues', ei.detectMemoryIssues);
router.get('/intelligence-enterprise/performance/cache-misses', ei.detectCacheMisses);
router.get('/intelligence-enterprise/performance/report', ei.getPerformanceReport);
router.get('/intelligence-enterprise/performance/recommendations', ei.getPerformanceRecommendations);
router.get('/intelligence-enterprise/performance/dashboard', ei.getPerformanceDashboard);

// ============================================================
// Part 6 - Capacity Planning
// ============================================================

router.get('/intelligence-enterprise/capacity/forecast/traffic', ei.forecastTraffic);
router.get('/intelligence-enterprise/capacity/forecast/orders', ei.forecastOrders);
router.get('/intelligence-enterprise/capacity/forecast/users', ei.forecastUsers);
router.get('/intelligence-enterprise/capacity/forecast/storage', ei.forecastStorage);
router.get('/intelligence-enterprise/capacity/forecast/database', ei.forecastDatabaseGrowth);
router.get('/intelligence-enterprise/capacity/forecast/ai-usage', ei.forecastAiUsage);
router.get('/intelligence-enterprise/capacity/scaling-recommendations', ei.getScalingRecommendations);
router.get('/intelligence-enterprise/capacity/peak-predictions', ei.getPeakPredictions);
router.get('/intelligence-enterprise/capacity/seasonality', ei.detectSeasonality);
router.get('/intelligence-enterprise/capacity/dashboard', ei.getCapacityDashboard);

// ============================================================
// Part 7 - Enterprise KPI
// ============================================================

router.get('/intelligence-enterprise/kpi/dashboard', ei.getKpiDashboard);
router.get('/intelligence-enterprise/kpi/compare', ei.compareKpiPeriod);
router.get('/intelligence-enterprise/kpi/enterprise', ei.getEnterpriseKpi);
router.post('/intelligence-enterprise/kpi/calculate/operational', ei.calculateOperationalKpis);
router.post('/intelligence-enterprise/kpi/calculate/financial', ei.calculateFinancialKpis);
router.post('/intelligence-enterprise/kpi/calculate/marketplace', ei.calculateMarketplaceKpis);
router.post('/intelligence-enterprise/kpi/calculate/seller', ei.calculateSellerKpis);
router.post('/intelligence-enterprise/kpi/calculate/buyer', ei.calculateBuyerKpis);
router.post('/intelligence-enterprise/kpi/calculate/ai', ei.calculateAiKpis);

// ============================================================
// Part 8 - AI Quality
// ============================================================

router.get('/intelligence-enterprise/ai-quality/dashboard', ei.getQualityDashboard);
router.get('/intelligence-enterprise/ai-quality/accuracy', ei.calculateAiAccuracy);
router.get('/intelligence-enterprise/ai-quality/adoption', ei.calculateAiAdoption);
router.get('/intelligence-enterprise/ai-quality/acceptance', ei.calculateAiAcceptance);
router.get('/intelligence-enterprise/ai-quality/confidence', ei.calculateAiConfidence);
router.post('/intelligence-enterprise/ai-quality/feedback', ei.trackAiFeedback);
router.get('/intelligence-enterprise/ai-quality/false-recommendations', ei.getFalseRecommendations);
router.get('/intelligence-enterprise/ai-quality/improvement-trends', ei.getImprovementTrends);

// ============================================================
// Part 9 - Continuous Optimization
// ============================================================

router.get('/intelligence-enterprise/optimization/recommendations', ei.getOptimizationRecommendations);
router.post('/intelligence-enterprise/optimization/recommendations', ei.createOptimizationRecommendation);
router.put('/intelligence-enterprise/optimization/recommendations/:id/approve', ei.approveOptimizationRecommendation);
router.put('/intelligence-enterprise/optimization/recommendations/:id/reject', ei.rejectOptimizationRecommendation);
router.post('/intelligence-enterprise/optimization/recommendations/:id/implement', ei.implementOptimizationRecommendation);
router.get('/intelligence-enterprise/optimization/detection/unused-features', ei.detectUnusedFeatures);
router.get('/intelligence-enterprise/optimization/detection/low-adoption', ei.detectLowAdoption);
router.get('/intelligence-enterprise/optimization/detection/slow-workflows', ei.detectSlowWorkflows);
router.get('/intelligence-enterprise/optimization/detection/duplicate-operations', ei.detectDuplicateOperations);
router.get('/intelligence-enterprise/optimization/detection/manual-bottlenecks', ei.detectManualBottlenecks);
router.get('/intelligence-enterprise/optimization/roadmap', ei.getImprovementRoadmap);
router.get('/intelligence-enterprise/optimization/dashboard', ei.getOptimizationDashboard);

// ============================================================
// Part 10 - Enterprise Insights
// ============================================================

router.get('/intelligence-enterprise/insights', ei.getEnterpriseInsights);
router.get('/intelligence-enterprise/insights/:id', ei.getEnterpriseInsight);
router.put('/intelligence-enterprise/insights/:id/acknowledge', ei.acknowledgeInsight);
router.put('/intelligence-enterprise/insights/:id/dismiss', ei.dismissInsight);
router.post('/intelligence-enterprise/insights/generate/executive', ei.generateExecutiveInsights);
router.post('/intelligence-enterprise/insights/generate/marketplace', ei.generateMarketplaceInsights);
router.post('/intelligence-enterprise/insights/generate/seller', ei.generateSellerInsights);
router.post('/intelligence-enterprise/insights/generate/buyer', ei.generateBuyerInsights);
router.post('/intelligence-enterprise/insights/generate/operations', ei.generateOperationsInsights);
router.post('/intelligence-enterprise/insights/generate/financial', ei.generateFinancialInsights);
router.get('/intelligence-enterprise/insights/dashboard', ei.getInsightsDashboard);

// ============================================================
// Part 11 - Predictive Business
// ============================================================

router.get('/intelligence-enterprise/predictive/forecast', ei.getBusinessForecast);
router.post('/intelligence-enterprise/predictive/forecast/revenue', ei.generateRevenueForecast);
router.post('/intelligence-enterprise/predictive/forecast/orders', ei.generateOrdersForecast);
router.post('/intelligence-enterprise/predictive/forecast/growth', ei.generateGrowthForecast);
router.post('/intelligence-enterprise/predictive/forecast/demand', ei.generateDemandForecast);
router.post('/intelligence-enterprise/predictive/forecast/supplier', ei.generateSupplierForecast);
router.post('/intelligence-enterprise/predictive/forecast/product-demand', ei.generateProductDemandForecast);
router.post('/intelligence-enterprise/predictive/forecast/category-trends', ei.generateCategoryTrendsForecast);
router.post('/intelligence-enterprise/predictive/forecast/all', ei.generateAllForecasts);
router.get('/intelligence-enterprise/predictive/dashboard', ei.getPredictiveDashboard);

// ============================================================
// Part 12 - Alert Correlation
// ============================================================

router.get('/intelligence-enterprise/alerts/groups', ei.getAlertGroups);
router.get('/intelligence-enterprise/alerts/groups/:id', ei.getAlertGroup);
router.post('/intelligence-enterprise/alerts/correlate', ei.correlateAlerts);
router.put('/intelligence-enterprise/alerts/groups/:id/resolve', ei.resolveAlertGroup);
router.get('/intelligence-enterprise/alerts/dashboard', ei.getAlertCorrelationDashboard);

// ============================================================
// Part 13 - Benchmarking
// ============================================================

router.get('/intelligence-enterprise/benchmarking/reports', ei.getBenchmarkReports);
router.get('/intelligence-enterprise/benchmarking/reports/:id', ei.getBenchmarkReport);
router.post('/intelligence-enterprise/benchmarking/generate/monthly', ei.generateMonthlyBenchmark);
router.post('/intelligence-enterprise/benchmarking/generate/quarterly', ei.generateQuarterlyBenchmark);
router.post('/intelligence-enterprise/benchmarking/generate/yearly', ei.generateYearlyBenchmark);
router.get('/intelligence-enterprise/benchmarking/compare', ei.compareBenchmarkPeriods);
router.get('/intelligence-enterprise/benchmarking/history', ei.getBenchmarkHistory);
router.get('/intelligence-enterprise/benchmarking/dashboard', ei.getBenchmarkDashboard);

// ============================================================
// Part 14 - Executive Decision Intelligence
// ============================================================

router.get('/intelligence-enterprise/decision/priorities', ei.getDecisionPriorities);
router.get('/intelligence-enterprise/decision/risks', ei.getRiskEvolution);
router.get('/intelligence-enterprise/decision/investments', ei.getInvestmentOpportunities);
router.get('/intelligence-enterprise/decision/improvements', ei.getOperationalImprovements);
router.get('/intelligence-enterprise/decision/cost-reductions', ei.getCostReductions);
router.get('/intelligence-enterprise/decision/revenue-opportunities', ei.getRevenueOpportunities);
router.get('/intelligence-enterprise/decision/dashboard', ei.getDecisionIntelligenceDashboard);

// ============================================================
// Part 16 - Optimization Automation
// ============================================================

router.get('/intelligence-enterprise/automations', ei.getOptimizationAutomations);
router.post('/intelligence-enterprise/automations', ei.createOptimizationAutomation);
router.put('/intelligence-enterprise/automations/:id', ei.updateOptimizationAutomation);
router.delete('/intelligence-enterprise/automations/:id', ei.deleteOptimizationAutomation);
router.post('/intelligence-enterprise/automations/:id/activate', ei.activateOptimizationAutomation);
router.post('/intelligence-enterprise/automations/:id/pause', ei.pauseOptimizationAutomation);
router.post('/intelligence-enterprise/automations/:id/evaluate', ei.evaluateOptimizationAutomation);
router.post('/intelligence-enterprise/automations/:id/execute', ei.executeOptimizationAutomation);
router.post('/intelligence-enterprise/automations/:id/approve', ei.approveOptimizationExecution);
router.get('/intelligence-enterprise/automations/:id/executions', ei.getOptimizationExecutions);
router.post('/intelligence-enterprise/automations/executions/:executionId/rollback', ei.rollbackOptimizationExecution);
router.get('/intelligence-enterprise/automations/dashboard', ei.getAutomationDashboard);

export default router;
