import expressAsyncHandler from 'express-async-handler';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../services/auditService.js';
import executiveDecisionService from '../services/executiveDecisionService.js';
import executiveScorecardService from '../services/executiveScorecardService.js';
import executiveKPIService from '../services/executiveKPIService.js';
import budgetIntelligenceService from '../services/budgetIntelligenceService.js';
import supplierPortfolioService from '../services/supplierPortfolioService.js';
import executiveForecastService from '../services/executiveForecastService.js';
import scenarioSimulationService from '../services/scenarioSimulationService.js';
import strategicSourcingService from '../services/strategicSourcingService.js';
import contractIntelligenceService from '../services/contractIntelligenceService.js';
import { governanceService } from '../services/governanceService.js';

const auditMeta = { category: 'executive_intelligence', source: 'executive_intelligence' };

export const getDecisionRecommendations = expressAsyncHandler(async (req, res) => {
  const data = await executiveDecisionService.getRecommendations(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_decision_recommendations' });
  res.json({ success: true, data });
});

export const getScorecard = expressAsyncHandler(async (req, res) => {
  const data = await executiveScorecardService.getScorecard(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_scorecard' });
  res.json({ success: true, data });
});

export const getScorecardByDepartment = expressAsyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  if (!departmentId) throw new AppError('departmentId is required', 400);
  const data = await executiveScorecardService.getScorecardByDepartment(departmentId);
  if (!data) throw new AppError('Scorecard not found', 404);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_department_scorecard', entityType: 'Department', entityId: departmentId });
  res.json({ success: true, data });
});

export const getScorecardByCategory = expressAsyncHandler(async (req, res) => {
  const { categoryId } = req.query;
  if (!categoryId) throw new AppError('categoryId is required', 400);
  const data = await executiveScorecardService.getScorecardByCategory(categoryId);
  if (!data) throw new AppError('Scorecard not found', 404);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_category_scorecard', entityType: 'Category', entityId: categoryId });
  res.json({ success: true, data });
});

export const getExecutiveKPIs = expressAsyncHandler(async (req, res) => {
  const data = await executiveKPIService.getKPIs(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_executive_kpis' });
  res.json({ success: true, data });
});

export const getBudgetOverview = expressAsyncHandler(async (req, res) => {
  const data = await budgetIntelligenceService.getBudgetOverview(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_budget_overview' });
  res.json({ success: true, data });
});

export const getBudgetByCategory = expressAsyncHandler(async (req, res) => {
  const { category } = req.query;
  if (!category) throw new AppError('category is required', 400);
  const data = await budgetIntelligenceService.getBudgetByCategory(req.user._id, category);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_budget_category', entityType: 'Category', entityId: category });
  res.json({ success: true, data });
});

export const getBudgetAlerts = expressAsyncHandler(async (req, res) => {
  const data = await budgetIntelligenceService.getBudgetAlerts(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_budget_alerts' });
  res.json({ success: true, data });
});

export const getSupplierPortfolio = expressAsyncHandler(async (req, res) => {
  const data = await supplierPortfolioService.getPortfolio(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_supplier_portfolio' });
  res.json({ success: true, data });
});

export const getSpendForecast = expressAsyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const data = await executiveForecastService.getSpendForecast(req.user._id, months);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_spend_forecast' });
  res.json({ success: true, data });
});

export const getDemandForecast = expressAsyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const data = await executiveForecastService.getDemandForecast(req.user._id, months);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_demand_forecast' });
  res.json({ success: true, data });
});

export const getRiskForecast = expressAsyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 3;
  const data = await executiveForecastService.getRiskForecast(req.user._id, months);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_risk_forecast' });
  res.json({ success: true, data });
});

export const runSimulation = expressAsyncHandler(async (req, res) => {
  const data = await scenarioSimulationService.simulate(req.body);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'run_simulation', details: { type: req.body.type } });
  res.json({ success: true, data });
});

export const getSourcingIntelligence = expressAsyncHandler(async (req, res) => {
  const data = await strategicSourcingService.getSourcingIntelligence(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_sourcing_intelligence' });
  res.json({ success: true, data });
});

export const getContractOverview = expressAsyncHandler(async (req, res) => {
  const data = await contractIntelligenceService.getContractOverview(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_contract_overview' });
  res.json({ success: true, data });
});

export const getExpiringContracts = expressAsyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const data = await contractIntelligenceService.getExpiringContracts(req.user._id, days);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_expiring_contracts' });
  res.json({ success: true, data });
});

export const getGovernanceMetrics = expressAsyncHandler(async (req, res) => {
  const data = await governanceService.getGovernanceMetrics(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_governance_metrics' });
  res.json({ success: true, data });
});

export const getBenchmarking = expressAsyncHandler(async (req, res) => {
  const { period } = req.query;
  await executiveScorecardService.getScorecard(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_benchmarking', details: { period } });
  res.json({ success: true, data: { message: 'Benchmarking data', period } });
});

export const getExecutiveProcurementDashboard = expressAsyncHandler(async (req, res) => {
  const [kpis, scorecard, decisions, portfolio, budget, governance] = await Promise.all([
    executiveKPIService.getKPIs(req.user._id),
    executiveScorecardService.getScorecard(req.user._id),
    executiveDecisionService.getRecommendations(req.user._id),
    supplierPortfolioService.getPortfolio(req.user._id),
    budgetIntelligenceService.getBudgetOverview(req.user._id),
    governanceService.getGovernanceMetrics(req.user._id),
  ]);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_executive_procurement_dashboard' });
  res.json({ success: true, data: { kpis, scorecard, decisions, portfolio, budget, governance } });
});

export const getExecutiveFinanceDashboard = expressAsyncHandler(async (req, res) => {
  const [kpis, budget, forecast, contracts] = await Promise.all([
    executiveKPIService.getKPIs(req.user._id),
    budgetIntelligenceService.getBudgetOverview(req.user._id),
    executiveForecastService.getSpendForecast(req.user._id, 3),
    contractIntelligenceService.getContractOverview(req.user._id),
  ]);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_executive_finance_dashboard' });
  res.json({ success: true, data: { kpis, budget, forecast, contracts } });
});

export const getExecutiveSupplyChainDashboard = expressAsyncHandler(async (req, res) => {
  const [kpis, scorecard, sourcing, portfolio, governance] = await Promise.all([
    executiveKPIService.getKPIs(req.user._id),
    executiveScorecardService.getScorecard(req.user._id),
    strategicSourcingService.getSourcingIntelligence(req.user._id),
    supplierPortfolioService.getPortfolio(req.user._id),
    governanceService.getGovernanceMetrics(req.user._id),
  ]);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_executive_supply_chain_dashboard' });
  res.json({ success: true, data: { kpis, scorecard, sourcing, portfolio, governance } });
});

export const getBoardReport = expressAsyncHandler(async (req, res) => {
  const { type } = req.query;
  const [kpis, scorecard, decisions, portfolio, budget] = await Promise.all([
    executiveKPIService.getKPIs(req.user._id),
    executiveScorecardService.getScorecard(req.user._id),
    executiveDecisionService.getRecommendations(req.user._id),
    supplierPortfolioService.getPortfolio(req.user._id),
    budgetIntelligenceService.getBudgetOverview(req.user._id),
  ]);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_board_report', details: { type } });
  res.json({ success: true, data: { type, generatedAt: new Date(), kpis, scorecard, decisions, portfolio, budget } });
});

export const askExecutiveAI = expressAsyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) throw new AppError('query is required', 400);
  const { default: executiveAIAssistantService } = await import('../services/executiveAIAssistantService.js');
  const data = await executiveAIAssistantService.answerQuery(req.user._id, query);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'executive_ai_query', details: { query } });
  res.json({ success: true, data });
});

export const getExecutiveConfig = expressAsyncHandler(async (req, res) => {
  const Setting = (await import('../models/Setting.js')).default;
  const config = await Setting.findOne({ key: 'executive_config' }).lean();
  res.json({ success: true, data: config?.value || getDefaultExecutiveConfig() });
});

export const updateExecutiveConfig = expressAsyncHandler(async (req, res) => {
  const Setting = (await import('../models/Setting.js')).default;
  const config = { ...getDefaultExecutiveConfig(), ...req.body };
  await Setting.findOneAndUpdate(
    { key: 'executive_config' },
    { key: 'executive_config', value: config, updatedBy: req.user._id },
    { upsert: true, new: true }
  );
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'update_executive_config' });
  res.json({ success: true, data: config });
});

function getDefaultExecutiveConfig() {
  return {
    kpiFormulas: { costSavingsRate: 0.1, procurementROIMultiplier: 100 },
    budgetThresholds: { warning: 80, critical: 95 },
    riskThresholds: { low: 30, moderate: 50, high: 75 },
    simulationDefaults: { inflationRate: 0.05, localSupplierDiscount: 0.1, splitOrderCostIncrease: 0.05, splitOrderRiskReduction: 0.2, bulkDiscountRate: 0.15 },
    savingsTargets: { annual: 500000, quarterly: 125000, monthly: 41667 },
    forecastWindow: 90,
  };
}
