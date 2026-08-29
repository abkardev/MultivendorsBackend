import { Router } from 'express';
import { protect, admin } from '../middlewares/authMiddleware.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  getSupplierIntelligence,
  getPriceIntelligence,
  getProcurementIntelligence,
  getDeliveryIntelligence,
  getDeliveryConfidence,
  getSupplierRisk,
  getExportRisk,
  getProcurementHealth,
  getMarketIntelligence,
  getPredictiveAnalytics,
  detectOpportunities,
  getAlerts,
  getIntelligenceWeights,
  updateIntelligenceWeights,
  getRiskThresholds,
  updateRiskThresholds,
  getBuyerIntelligenceDashboard,
  getSupplierIntelligenceDashboard,
  getMarketplaceIntelligenceDashboard,
} from '../controllers/commerceIntelligenceController.js';

const router = Router();

router.use(protect);

// Intelligence queries
router.get('/supplier-intelligence', featureFlag('commerce_intelligence'), getSupplierIntelligence);
router.get('/price-intelligence', featureFlag('commerce_intelligence'), getPriceIntelligence);
router.get('/procurement-intelligence', featureFlag('commerce_intelligence'), getProcurementIntelligence);
router.get('/delivery-intelligence', featureFlag('commerce_intelligence'), getDeliveryIntelligence);
router.get('/delivery-confidence', featureFlag('commerce_intelligence'), getDeliveryConfidence);
router.get('/supplier-risk', featureFlag('commerce_intelligence'), getSupplierRisk);
router.get('/export-risk', featureFlag('commerce_intelligence'), getExportRisk);
router.get('/procurement-health', featureFlag('commerce_intelligence'), getProcurementHealth);
router.get('/market-intelligence', featureFlag('commerce_intelligence'), getMarketIntelligence);
router.get('/predictive-analytics', featureFlag('commerce_intelligence'), getPredictiveAnalytics);
router.get('/opportunities', featureFlag('commerce_intelligence'), detectOpportunities);
router.get('/alerts', featureFlag('commerce_intelligence'), getAlerts);

// Dashboards
router.get('/dashboard/buyer', featureFlag('commerce_intelligence'), getBuyerIntelligenceDashboard);
router.get('/dashboard/supplier', featureFlag('commerce_intelligence'), getSupplierIntelligenceDashboard);
router.get('/dashboard/marketplace', featureFlag('commerce_intelligence'), getMarketplaceIntelligenceDashboard);

// Admin controls
router.get('/admin/weights', protect, admin, getIntelligenceWeights);
router.put('/admin/weights', protect, admin, updateIntelligenceWeights);
router.get('/admin/thresholds', protect, admin, getRiskThresholds);
router.put('/admin/thresholds', protect, admin, updateRiskThresholds);

export default router;
