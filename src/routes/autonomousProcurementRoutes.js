import { Router } from 'express';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  interpretIntent,
  createProcurementPlan, getProcurementPlan, updateProcurementPlan, listProcurementPlans, deleteProcurementPlan,
  getPlaybooks, getPlaybook, getRecommendedPlaybook,
  explainSupplier, explainProduct, explainRecommendation,
  getAutomations, toggleAutomation, getAutomationConfig, updateAutomationConfig,
  generateRfq,
  generateNegotiationPlan,
  optimizeSupplierPortfolio,
  getRiskMap,
  generateTimeline,
  generateBrief,
  getAutonomousDashboard,
} from '../controllers/autonomousProcurementController.js';

const router = Router();
router.use(protect);

router.post('/agent/interpret', featureFlag('autonomous_procurement'), interpretIntent);

router.get('/plans', featureFlag('autonomous_procurement'), listProcurementPlans);
router.post('/plans', featureFlag('autonomous_procurement'), createProcurementPlan);
router.get('/plans/:id', featureFlag('autonomous_procurement'), getProcurementPlan);
router.put('/plans/:id', featureFlag('autonomous_procurement'), updateProcurementPlan);
router.delete('/plans/:id', featureFlag('autonomous_procurement'), deleteProcurementPlan);

router.get('/playbooks', featureFlag('autonomous_procurement'), getPlaybooks);
router.get('/playbooks/recommend', featureFlag('autonomous_procurement'), getRecommendedPlaybook);
router.get('/playbooks/:name', featureFlag('autonomous_procurement'), getPlaybook);

router.get('/explain/supplier', featureFlag('autonomous_procurement'), explainSupplier);
router.get('/explain/product', featureFlag('autonomous_procurement'), explainProduct);
router.get('/explain/recommendation', featureFlag('autonomous_procurement'), explainRecommendation);

router.get('/automations', featureFlag('autonomous_procurement'), getAutomations);
router.post('/automations/toggle', featureFlag('autonomous_procurement'), toggleAutomation);
router.get('/automations/config', featureFlag('autonomous_procurement'), getAutomationConfig);
router.post('/automations/config', featureFlag('autonomous_procurement'), updateAutomationConfig);

router.post('/rfq/generate', featureFlag('autonomous_procurement'), generateRfq);

router.post('/negotiation/plan', featureFlag('autonomous_procurement'), generateNegotiationPlan);

router.get('/suppliers/optimize', featureFlag('autonomous_procurement'), optimizeSupplierPortfolio);

router.get('/risks/map', featureFlag('autonomous_procurement'), getRiskMap);

router.post('/timeline/generate', featureFlag('autonomous_procurement'), generateTimeline);

router.get('/reports/brief', featureFlag('autonomous_procurement'), generateBrief);

router.get('/dashboard', featureFlag('autonomous_procurement'), getAutonomousDashboard);

export default router;
