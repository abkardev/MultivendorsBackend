import expressAsyncHandler from 'express-async-handler';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../services/auditService.js';
import commerceIntelligenceService from '../services/commerceIntelligenceService.js';
import supplierRiskService from '../services/supplierRiskService.js';
import deliveryIntelligenceService from '../services/deliveryIntelligenceService.js';
import procurementHealthService from '../services/procurementHealthService.js';
import marketIntelligenceService from '../services/marketIntelligenceService.js';
// predictiveAnalyticsService has been consolidated - using commerceIntelligenceService.getPredictiveAnalytics() instead
import opportunityDetectionService from '../services/opportunityDetectionService.js';
import smartAlertsService from '../services/smartAlertsService.js';
import adminControlsService from '../services/adminControlsService.js';

const auditDefaults = { userId: null, category: 'commerce_intelligence', source: 'commerce_intelligence' };

export const getSupplierIntelligence = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await commerceIntelligenceService.getSupplierIntelligence(vendorId);
  if (!data) throw new AppError('Supplier intelligence not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_supplier_intelligence', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const getPriceIntelligence = expressAsyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId) throw new AppError('productId is required', 400);
  const data = await commerceIntelligenceService.getPriceIntelligence(productId);
  if (!data) throw new AppError('Price intelligence not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_price_intelligence', entityType: 'Product', entityId: productId });
  res.json({ success: true, data });
});

export const getProcurementIntelligence = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await commerceIntelligenceService.getProcurementIntelligence(userId);
  if (!data) throw new AppError('Procurement intelligence not found', 404);
  logAuditEvent({ ...auditDefaults, userId, action: 'view_procurement_intelligence' });
  res.json({ success: true, data });
});

export const getDeliveryIntelligence = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await commerceIntelligenceService.getDeliveryIntelligence(vendorId);
  if (!data) throw new AppError('Delivery intelligence not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_delivery_intelligence', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const getDeliveryConfidence = expressAsyncHandler(async (req, res) => {
  const { shipmentId } = req.query;
  if (!shipmentId) throw new AppError('shipmentId is required', 400);
  const data = await deliveryIntelligenceService.getShippingConfidence(shipmentId);
  if (!data) throw new AppError('Delivery confidence not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_delivery_confidence', entityType: 'Shipment', entityId: shipmentId });
  res.json({ success: true, data });
});

export const getSupplierRisk = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await supplierRiskService.calculateVendorRisk(vendorId);
  if (!data) throw new AppError('Supplier risk data not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_supplier_risk', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const getExportRisk = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await supplierRiskService.calculateExportRisk(vendorId);
  if (!data) throw new AppError('Export risk data not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_export_risk', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const getProcurementHealth = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await procurementHealthService.getHealth(userId);
  if (!data) throw new AppError('Procurement health data not found', 404);
  logAuditEvent({ ...auditDefaults, userId, action: 'view_procurement_health' });
  res.json({ success: true, data });
});

export const getMarketIntelligence = expressAsyncHandler(async (req, res) => {
  const data = await marketIntelligenceService.getMarketOverview();
  if (!data) throw new AppError('Market intelligence not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_market_intelligence' });
  res.json({ success: true, data });
});

export const getPredictiveAnalytics = expressAsyncHandler(async (req, res) => {
  const data = await commerceIntelligenceService.getPredictiveAnalytics();
  if (!data) throw new AppError('Predictive analytics not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_predictive_analytics' });
  res.json({ success: true, data });
});

export const detectOpportunities = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await opportunityDetectionService.detectOpportunities(userId);
  if (!data) throw new AppError('Opportunities not found', 404);
  logAuditEvent({ ...auditDefaults, userId, action: 'view_opportunities' });
  res.json({ success: true, data });
});

export const getAlerts = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const data = await smartAlertsService.checkForAlerts(userId);
  if (!data) throw new AppError('Alerts not found', 404);
  logAuditEvent({ ...auditDefaults, userId, action: 'view_alerts' });
  res.json({ success: true, data });
});

export const getIntelligenceWeights = expressAsyncHandler(async (req, res) => {
  const data = await adminControlsService.getWeights();
  if (!data) throw new AppError('Weights configuration not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_intelligence_weights', category: 'admin' });
  res.json({ success: true, data });
});

export const updateIntelligenceWeights = expressAsyncHandler(async (req, res) => {
  const data = await adminControlsService.updateWeights(req.body, req.user._id);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'update_intelligence_weights', category: 'admin', newValue: req.body });
  res.json({ success: true, data });
});

export const getRiskThresholds = expressAsyncHandler(async (req, res) => {
  const data = await adminControlsService.getThresholds();
  if (!data) throw new AppError('Risk thresholds not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_risk_thresholds', category: 'admin' });
  res.json({ success: true, data });
});

export const updateRiskThresholds = expressAsyncHandler(async (req, res) => {
  const data = await adminControlsService.updateThresholds(req.body, req.user._id);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'update_risk_thresholds', category: 'admin', newValue: req.body });
  res.json({ success: true, data });
});

export const getBuyerIntelligenceDashboard = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;
  const [health, recommendations, opportunities, alerts] = await Promise.all([
    procurementHealthService.getHealth(userId),
    commerceIntelligenceService.getProcurementIntelligence(userId),
    opportunityDetectionService.detectOpportunities(userId),
    smartAlertsService.checkForAlerts(userId),
  ]);
  logAuditEvent({ ...auditDefaults, userId, action: 'view_buyer_intelligence_dashboard' });
  res.json({ success: true, data: { health, recommendations, opportunities, alerts } });
});

export const getSupplierIntelligenceDashboard = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const [intel, delivery, risk] = await Promise.all([
    commerceIntelligenceService.getSupplierIntelligence(vendorId),
    commerceIntelligenceService.getDeliveryIntelligence(vendorId),
    supplierRiskService.calculateVendorRisk(vendorId),
  ]);
  if (!intel && !delivery && !risk) throw new AppError('Supplier intelligence dashboard data not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_supplier_intelligence_dashboard', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data: { intel, delivery, risk } });
});

export const getMarketplaceIntelligenceDashboard = expressAsyncHandler(async (req, res) => {
  const [market, predictions] = await Promise.all([
    marketIntelligenceService.getMarketOverview(),
    commerceIntelligenceService.getPredictiveAnalytics(),
  ]);
  if (!market && !predictions) throw new AppError('Marketplace intelligence dashboard data not found', 404);
  logAuditEvent({ ...auditDefaults, userId: req.user._id, action: 'view_marketplace_intelligence_dashboard' });
  res.json({ success: true, data: { market, predictions } });
});
