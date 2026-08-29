import { Router } from 'express';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getDecisionRecommendations,
  getScorecard, getScorecardByDepartment, getScorecardByCategory,
  getExecutiveKPIs,
  getBudgetOverview, getBudgetByCategory, getBudgetAlerts,
  getSupplierPortfolio,
  getSpendForecast, getDemandForecast, getRiskForecast,
  runSimulation,
  getSourcingIntelligence,
  getContractOverview, getExpiringContracts,
  getGovernanceMetrics,
  getBenchmarking,
  getExecutiveProcurementDashboard, getExecutiveFinanceDashboard, getExecutiveSupplyChainDashboard,
  getBoardReport,
  askExecutiveAI,
  getExecutiveConfig, updateExecutiveConfig,
} from '../controllers/executiveController.js';

const router = Router();
router.use(protect);

router.get('/decisions', featureFlag('executive_intelligence'), getDecisionRecommendations);
router.get('/scorecard', featureFlag('executive_intelligence'), getScorecard);
router.get('/scorecard/department', featureFlag('executive_intelligence'), getScorecardByDepartment);
router.get('/scorecard/category', featureFlag('executive_intelligence'), getScorecardByCategory);
router.get('/kpis', featureFlag('executive_intelligence'), getExecutiveKPIs);
router.get('/budget', featureFlag('executive_intelligence'), getBudgetOverview);
router.get('/budget/category', featureFlag('executive_intelligence'), getBudgetByCategory);
router.get('/budget/alerts', featureFlag('executive_intelligence'), getBudgetAlerts);
router.get('/portfolio', featureFlag('executive_intelligence'), getSupplierPortfolio);
router.get('/forecast/spend', featureFlag('executive_intelligence'), getSpendForecast);
router.get('/forecast/demand', featureFlag('executive_intelligence'), getDemandForecast);
router.get('/forecast/risk', featureFlag('executive_intelligence'), getRiskForecast);
router.post('/simulate', featureFlag('executive_intelligence'), runSimulation);
router.get('/sourcing', featureFlag('executive_intelligence'), getSourcingIntelligence);
router.get('/contracts', featureFlag('executive_intelligence'), getContractOverview);
router.get('/contracts/expiring', featureFlag('executive_intelligence'), getExpiringContracts);
router.get('/governance', featureFlag('executive_intelligence'), getGovernanceMetrics);
router.get('/benchmarking', featureFlag('executive_intelligence'), getBenchmarking);

router.post('/ai/ask', featureFlag('executive_intelligence'), askExecutiveAI);

router.get('/dashboard/procurement', featureFlag('executive_intelligence'), getExecutiveProcurementDashboard);
router.get('/dashboard/finance', featureFlag('executive_intelligence'), getExecutiveFinanceDashboard);
router.get('/dashboard/supply-chain', featureFlag('executive_intelligence'), getExecutiveSupplyChainDashboard);

router.get('/reports/board', featureFlag('executive_intelligence'), getBoardReport);

router.get('/admin/config', protect, admin, getExecutiveConfig);
router.put('/admin/config', protect, admin, updateExecutiveConfig);

export default router;
