import { enterpriseTelemetryService } from '../services/enterpriseTelemetryService.js';
import { distributedTracingService } from '../services/distributedTracingService.js';
import { aiOpsService } from '../services/aiOpsService.js';
import { finOpsService } from '../services/finOpsService.js';
import { performanceOptimizationService } from '../services/performanceOptimizationService.js';
import { capacityPlanningService } from '../services/capacityPlanningService.js';
import { enterpriseKpiService } from '../services/enterpriseKpiService.js';
import { aiQualityService } from '../services/aiQualityService.js';
import continuousOptimizationService from '../services/continuousOptimizationService.js';
import enterpriseInsightsService from '../services/enterpriseInsightsService.js';
import predictiveBusinessService from '../services/predictiveBusinessService.js';
import alertCorrelationService from '../services/alertCorrelationService.js';
import benchmarkingService from '../services/benchmarkingService.js';
import executiveDecisionIntelligenceService from '../services/executiveDecisionIntelligenceService.js';
import optimizationAutomationService from '../services/optimizationAutomationService.js';

// ============================================================
// Part 1 - Telemetry
// ============================================================

export const collectTelemetryEvent = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.collectTelemetryEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTelemetryMetrics = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getTelemetryMetrics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMetricHistory = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getMetricHistory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPercentiles = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getPercentiles(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getHeatmap = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getHeatmap(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRollingAverage = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getRollingAverage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const reportServiceHealth = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.reportServiceHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getServiceHealth = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getServiceHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const reportResourceUsage = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.reportResourceUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getResourceUsage = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getResourceUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTelemetryDashboard = async (req, res) => {
  try {
    const result = await enterpriseTelemetryService.getTelemetryDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 2 - Distributed Tracing
// ============================================================

export const startTrace = async (req, res) => {
  try {
    const result = await distributedTracingService.startTrace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const endTrace = async (req, res) => {
  try {
    const result = await distributedTracingService.endTrace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const startSpan = async (req, res) => {
  try {
    const result = await distributedTracingService.startSpan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const endSpan = async (req, res) => {
  try {
    const result = await distributedTracingService.endSpan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addTraceEvent = async (req, res) => {
  try {
    const result = await distributedTracingService.addTraceEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTrace = async (req, res) => {
  try {
    const result = await distributedTracingService.getTrace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchTraces = async (req, res) => {
  try {
    const result = await distributedTracingService.searchTraces(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTraceTimeline = async (req, res) => {
  try {
    const result = await distributedTracingService.getTraceTimeline(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCriticalPath = async (req, res) => {
  try {
    const result = await distributedTracingService.getCriticalPath(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getServiceDependencies = async (req, res) => {
  try {
    const result = await distributedTracingService.getServiceDependencies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTraceAnalytics = async (req, res) => {
  try {
    const result = await distributedTracingService.getTraceAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 3 - AIOps
// ============================================================

export const analyzeAIOpsMetrics = async (req, res) => {
  try {
    const result = await aiOpsService.analyzeAIOpsMetrics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const analyzeFailures = async (req, res) => {
  try {
    const result = await aiOpsService.analyzeFailures(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectPerformanceDegradation = async (req, res) => {
  try {
    const result = await aiOpsService.detectPerformanceDegradation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const analyzeCapacity = async (req, res) => {
  try {
    const result = await aiOpsService.analyzeCapacity(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRootCauseHypotheses = async (req, res) => {
  try {
    const result = await aiOpsService.getRootCauseHypotheses(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAIOpsOptimizationSuggestions = async (req, res) => {
  try {
    const result = await aiOpsService.getAIOpsOptimizationSuggestions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIncidentSummary = async (req, res) => {
  try {
    const result = await aiOpsService.getIncidentSummary(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRecoveryRecommendations = async (req, res) => {
  try {
    const result = await aiOpsService.getRecoveryRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTrendAnalysis = async (req, res) => {
  try {
    const result = await aiOpsService.getTrendAnalysis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAIOpsDashboard = async (req, res) => {
  try {
    const result = await aiOpsService.getAIOpsDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 4 - FinOps
// ============================================================

export const recordCost = async (req, res) => {
  try {
    const result = await finOpsService.recordCost(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCostBreakdown = async (req, res) => {
  try {
    const result = await finOpsService.getCostBreakdown(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCostTrend = async (req, res) => {
  try {
    const result = await finOpsService.getCostTrend(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const analyzeCosts = async (req, res) => {
  try {
    const result = await finOpsService.analyzeCosts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastCost = async (req, res) => {
  try {
    const result = await finOpsService.forecastCost(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBudgetStatus = async (req, res) => {
  try {
    const result = await finOpsService.getBudgetStatus(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createBudgetAlert = async (req, res) => {
  try {
    const result = await finOpsService.createBudgetAlert(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkBudgetAlerts = async (req, res) => {
  try {
    const result = await finOpsService.checkBudgetAlerts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFinOpsDashboard = async (req, res) => {
  try {
    const result = await finOpsService.getFinOpsDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 5 - Performance Optimization
// ============================================================

export const detectSlowEndpoints = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectSlowEndpoints(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectSlowQueries = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectSlowQueries(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectLargePayloads = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectLargePayloads(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectExpensiveAggregations = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectExpensiveAggregations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectMemoryIssues = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectMemoryIssues(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectCacheMisses = async (req, res) => {
  try {
    const result = await performanceOptimizationService.detectCacheMisses(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPerformanceReport = async (req, res) => {
  try {
    const result = await performanceOptimizationService.getPerformanceReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPerformanceRecommendations = async (req, res) => {
  try {
    const result = await performanceOptimizationService.getPerformanceRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPerformanceDashboard = async (req, res) => {
  try {
    const result = await performanceOptimizationService.getPerformanceDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 6 - Capacity Planning
// ============================================================

export const forecastTraffic = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastTraffic(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastOrders = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastOrders(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastUsers = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastUsers(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastStorage = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastStorage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastDatabaseGrowth = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastDatabaseGrowth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const forecastAiUsage = async (req, res) => {
  try {
    const result = await capacityPlanningService.forecastAiUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getScalingRecommendations = async (req, res) => {
  try {
    const result = await capacityPlanningService.getScalingRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPeakPredictions = async (req, res) => {
  try {
    const result = await capacityPlanningService.getPeakPredictions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectSeasonality = async (req, res) => {
  try {
    const result = await capacityPlanningService.detectSeasonality(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCapacityDashboard = async (req, res) => {
  try {
    const result = await capacityPlanningService.getCapacityDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 7 - Enterprise KPI
// ============================================================

export const getKpiDashboard = async (req, res) => {
  try {
    const result = await enterpriseKpiService.getKpiDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const compareKpiPeriod = async (req, res) => {
  try {
    const result = await enterpriseKpiService.compareKpiPeriod(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEnterpriseKpi = async (req, res) => {
  try {
    const result = await enterpriseKpiService.getEnterpriseKpi(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateOperationalKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateOperationalKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateFinancialKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateFinancialKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateMarketplaceKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateMarketplaceKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateSellerKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateSellerKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateBuyerKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateBuyerKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateAiKpis = async (req, res) => {
  try {
    const result = await enterpriseKpiService.calculateAiKpis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 8 - AI Quality
// ============================================================

export const getQualityDashboard = async (req, res) => {
  try {
    const result = await aiQualityService.getQualityDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateAiAccuracy = async (req, res) => {
  try {
    const result = await aiQualityService.calculateAiAccuracy(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateAiAdoption = async (req, res) => {
  try {
    const result = await aiQualityService.calculateAiAdoption(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateAiAcceptance = async (req, res) => {
  try {
    const result = await aiQualityService.calculateAiAcceptance(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const calculateAiConfidence = async (req, res) => {
  try {
    const result = await aiQualityService.calculateAiConfidence(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const trackAiFeedback = async (req, res) => {
  try {
    const result = await aiQualityService.trackAiFeedback(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFalseRecommendations = async (req, res) => {
  try {
    const result = await aiQualityService.getFalseRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getImprovementTrends = async (req, res) => {
  try {
    const result = await aiQualityService.getImprovementTrends(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 9 - Continuous Optimization
// ============================================================

export const getOptimizationRecommendations = async (req, res) => {
  try {
    const result = await continuousOptimizationService.getOptimizationRecommendations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createOptimizationRecommendation = async (req, res) => {
  try {
    const result = await continuousOptimizationService.createOptimizationRecommendation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveOptimizationRecommendation = async (req, res) => {
  try {
    const result = await continuousOptimizationService.approveOptimizationRecommendation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rejectOptimizationRecommendation = async (req, res) => {
  try {
    const result = await continuousOptimizationService.rejectOptimizationRecommendation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const implementOptimizationRecommendation = async (req, res) => {
  try {
    const result = await continuousOptimizationService.implementOptimizationRecommendation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectUnusedFeatures = async (req, res) => {
  try {
    const result = await continuousOptimizationService.detectUnusedFeatures(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectLowAdoption = async (req, res) => {
  try {
    const result = await continuousOptimizationService.detectLowAdoption(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectSlowWorkflows = async (req, res) => {
  try {
    const result = await continuousOptimizationService.detectSlowWorkflows(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectDuplicateOperations = async (req, res) => {
  try {
    const result = await continuousOptimizationService.detectDuplicateOperations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectManualBottlenecks = async (req, res) => {
  try {
    const result = await continuousOptimizationService.detectManualBottlenecks(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getImprovementRoadmap = async (req, res) => {
  try {
    const result = await continuousOptimizationService.getImprovementRoadmap(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOptimizationDashboard = async (req, res) => {
  try {
    const result = await continuousOptimizationService.getOptimizationDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 10 - Enterprise Insights
// ============================================================

export const getEnterpriseInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.getEnterpriseInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEnterpriseInsight = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.getEnterpriseInsight(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const acknowledgeInsight = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.acknowledgeInsight(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const dismissInsight = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.dismissInsight(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateExecutiveInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateExecutiveInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateMarketplaceInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateMarketplaceInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateSellerInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateSellerInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateBuyerInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateBuyerInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateOperationsInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateOperationsInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateFinancialInsights = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.generateFinancialInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getInsightsDashboard = async (req, res) => {
  try {
    const result = await enterpriseInsightsService.getInsightsDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 11 - Predictive Business
// ============================================================

export const getBusinessForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.getBusinessForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateRevenueForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateRevenueForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateOrdersForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateOrdersForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateGrowthForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateGrowthForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateDemandForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateDemandForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateSupplierForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateSupplierForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateProductDemandForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateProductDemandForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateCategoryTrendsForecast = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateCategoryTrendsForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateAllForecasts = async (req, res) => {
  try {
    const result = await predictiveBusinessService.generateAllForecasts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPredictiveDashboard = async (req, res) => {
  try {
    const result = await predictiveBusinessService.getPredictiveDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 12 - Alert Correlation
// ============================================================

export const getAlertGroups = async (req, res) => {
  try {
    const result = await alertCorrelationService.getAlertGroups(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAlertGroup = async (req, res) => {
  try {
    const result = await alertCorrelationService.getAlertGroup(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const correlateAlerts = async (req, res) => {
  try {
    const result = await alertCorrelationService.correlateAlerts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resolveAlertGroup = async (req, res) => {
  try {
    const result = await alertCorrelationService.resolveAlertGroup(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAlertCorrelationDashboard = async (req, res) => {
  try {
    const result = await alertCorrelationService.getAlertCorrelationDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 13 - Benchmarking
// ============================================================

export const getBenchmarkReports = async (req, res) => {
  try {
    const result = await benchmarkingService.getBenchmarkReports(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBenchmarkReport = async (req, res) => {
  try {
    const result = await benchmarkingService.getBenchmarkReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateMonthlyBenchmark = async (req, res) => {
  try {
    const result = await benchmarkingService.generateMonthlyBenchmark(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateQuarterlyBenchmark = async (req, res) => {
  try {
    const result = await benchmarkingService.generateQuarterlyBenchmark(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateYearlyBenchmark = async (req, res) => {
  try {
    const result = await benchmarkingService.generateYearlyBenchmark(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const compareBenchmarkPeriods = async (req, res) => {
  try {
    const result = await benchmarkingService.compareBenchmarkPeriods(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBenchmarkHistory = async (req, res) => {
  try {
    const result = await benchmarkingService.getBenchmarkHistory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBenchmarkDashboard = async (req, res) => {
  try {
    const result = await benchmarkingService.getBenchmarkDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 14 - Executive Decision Intelligence
// ============================================================

export const getDecisionPriorities = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getDecisionPriorities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRiskEvolution = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getRiskEvolution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getInvestmentOpportunities = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getInvestmentOpportunities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOperationalImprovements = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getOperationalImprovements(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCostReductions = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getCostReductions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenueOpportunities = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getRevenueOpportunities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDecisionIntelligenceDashboard = async (req, res) => {
  try {
    const result = await executiveDecisionIntelligenceService.getDecisionIntelligenceDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 16 - Optimization Automation
// ============================================================

export const getOptimizationAutomations = async (req, res) => {
  try {
    const result = await optimizationAutomationService.getOptimizationAutomations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.createOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.updateOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.deleteOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.activateOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const pauseOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.pauseOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.evaluateOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeOptimizationAutomation = async (req, res) => {
  try {
    const result = await optimizationAutomationService.executeOptimizationAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveOptimizationExecution = async (req, res) => {
  try {
    const result = await optimizationAutomationService.approveOptimizationExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOptimizationExecutions = async (req, res) => {
  try {
    const result = await optimizationAutomationService.getOptimizationExecutions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackOptimizationExecution = async (req, res) => {
  try {
    const result = await optimizationAutomationService.rollbackOptimizationExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationDashboard = async (req, res) => {
  try {
    const result = await optimizationAutomationService.getAutomationDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
