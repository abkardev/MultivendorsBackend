import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  listCustomers, getCustomer, updateCustomer,
  createCustomerTag, listCustomerTags, deleteCustomerTag,
  addCustomerActivity, getCustomerActivities,
  getCustomerPipelines, createCustomerPipeline, updateCustomerPipeline, deleteCustomerPipeline, assignCustomerPipeline,
  getCustomerReminders, createCustomerReminder, completeReminder,
  listLeads, createLead, getLead, updateLead, deleteLead, updateLeadStage, qualifyLead, convertLead, getLeadStats,
  listQuotationTemplates, createQuotationTemplate, getQuotationTemplate, updateQuotationTemplate, deleteQuotationTemplate,
  getQuotationVersions, getQuotationAnalytics,
  listProductPerformance, getProductPerformance, getProductAnalytics,
  getSalesDashboard, listSalesGoals, createSalesGoal, updateSalesGoal, deleteSalesGoal,
  generateForecast, listForecasts, getForecast, getHistoricalTrends,
  processAiQuery,
  listAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule, toggleAutomationRule, runAutomations,
  getHealthScores, getCustomerHealth, getHealthTrends, getAtRiskCustomers, recalculateHealth,
  listCampaigns, createCampaign, getCampaign, updateCampaign, deleteCampaign, launchCampaign, pauseCampaign, completeCampaign, getCampaignStats,
  analyzeProductPricing, getProductPricing, getPricingList, getPricingRecommendations, getPriceHistory,
  getReputationDashboard, respondToReview, getReviewAnalytics,
  assessExportReadiness, getExportReadiness, getExportOpportunities, updateExportReadiness,
  listKnowledgeArticles, createKnowledgeArticle, getKnowledgeArticle, updateKnowledgeArticle, deleteKnowledgeArticle,
  getKnowledgeCategories, getKnowledgeTags, searchKnowledgeArticles, getPopularKnowledgeArticles,
  listDocuments, getDocument, updateDocument, deleteDocument, getDocumentVersions, getDocumentCategories, getDocumentStats,
  createShipment, listShipments, getShipment, updateShipment, updateShipmentStatus, addTrackingUpdate, attachShipmentDocument, getShipmentStats, deleteShipment,
} from '../controllers/sellerController.js';

const router = Router();

router.use(protect);
router.use(featureFlag('seller_tools'));

// ── CRM ──
router.get('/customers', listCustomers);
router.get('/customers/:id', getCustomer);
router.patch('/customers/:id', updateCustomer);
router.get('/customers/:id/activities', getCustomerActivities);
router.post('/customers/:id/activities', addCustomerActivity);
router.get('/customers/:id/reminders', getCustomerReminders);
router.post('/customers/:id/reminders', createCustomerReminder);
router.get('/tags', listCustomerTags);
router.post('/tags', createCustomerTag);
router.delete('/tags/:tagId', deleteCustomerTag);
router.get('/pipelines', getCustomerPipelines);
router.post('/pipelines', createCustomerPipeline);
router.patch('/pipelines/:id', updateCustomerPipeline);
router.delete('/pipelines/:id', deleteCustomerPipeline);
router.post('/pipelines/assign/:id', assignCustomerPipeline);
router.patch('/reminders/:reminderId/complete', completeReminder);

// ── Leads ──
router.get('/leads', listLeads);
router.post('/leads', createLead);
router.get('/leads/:id', getLead);
router.patch('/leads/:id', updateLead);
router.delete('/leads/:id', deleteLead);
router.patch('/leads/:id/stage', updateLeadStage);
router.post('/leads/:id/qualify', qualifyLead);
router.post('/leads/:id/convert', convertLead);
router.get('/leads-stats', getLeadStats);

// ── Quotation Pro ──
router.get('/quotation-templates', listQuotationTemplates);
router.post('/quotation-templates', createQuotationTemplate);
router.get('/quotation-templates/:id', getQuotationTemplate);
router.patch('/quotation-templates/:id', updateQuotationTemplate);
router.delete('/quotation-templates/:id', deleteQuotationTemplate);
router.get('/quotation-templates/:id/versions', getQuotationVersions);
router.get('/quotation-analytics', getQuotationAnalytics);

// ── Product Performance ──
router.get('/product-performance', listProductPerformance);
router.get('/product-performance/:productId', getProductPerformance);
router.get('/product-analytics', getProductAnalytics);

// ── Sales Dashboard ──
router.get('/dashboard', getSalesDashboard);
router.get('/goals', listSalesGoals);
router.post('/goals', createSalesGoal);
router.patch('/goals/:id', updateSalesGoal);
router.delete('/goals/:id', deleteSalesGoal);

// ── Sales Forecasting ──
router.get('/forecasts', listForecasts);
router.post('/forecasts/generate', generateForecast);
router.get('/forecasts/:id', getForecast);
router.get('/historical-trends', getHistoricalTrends);

// ── AI Sales Assistant ──
router.post('/ai-assistant/query', processAiQuery);

// ── Automation ──
router.get('/automation-rules', listAutomationRules);
router.post('/automation-rules', createAutomationRule);
router.patch('/automation-rules/:id', updateAutomationRule);
router.delete('/automation-rules/:id', deleteAutomationRule);
router.post('/automation-rules/:id/toggle', toggleAutomationRule);
router.post('/automations/run', runAutomations);

// ── Customer Success ──
router.get('/health-scores', getHealthScores);
router.get('/health-scores/:id', getCustomerHealth);
router.get('/health-trends', getHealthTrends);
router.get('/at-risk-customers', getAtRiskCustomers);
router.post('/health-scores/:id/recalculate', recalculateHealth);

// ── Marketing Center ──
router.get('/campaigns', listCampaigns);
router.post('/campaigns', createCampaign);
router.get('/campaigns/:id', getCampaign);
router.patch('/campaigns/:id', updateCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.post('/campaigns/:id/launch', launchCampaign);
router.post('/campaigns/:id/pause', pauseCampaign);
router.post('/campaigns/:id/complete', completeCampaign);
router.get('/campaign-stats', getCampaignStats);

// ── Pricing Intelligence ──
router.post('/pricing/:productId/analyze', analyzeProductPricing);
router.get('/pricing/:productId', getProductPricing);
router.get('/pricing-list', getPricingList);
router.get('/pricing-recommendations', getPricingRecommendations);
router.get('/pricing/:productId/history', getPriceHistory);

// ── Seller Reputation ──
router.get('/reputation', getReputationDashboard);
router.get('/review-analytics', getReviewAnalytics);
router.post('/reviews/:reviewId/respond', respondToReview);

// ── Export & International ──
router.post('/export/assess', assessExportReadiness);
router.get('/export/readiness', getExportReadiness);
router.get('/export/opportunities', getExportOpportunities);
router.patch('/export/readiness', updateExportReadiness);

// ── Knowledge Base ──
router.get('/knowledge-articles', listKnowledgeArticles);
router.post('/knowledge-articles', createKnowledgeArticle);
router.get('/knowledge-articles/:id', getKnowledgeArticle);
router.patch('/knowledge-articles/:id', updateKnowledgeArticle);
router.delete('/knowledge-articles/:id', deleteKnowledgeArticle);
router.get('/knowledge-categories', getKnowledgeCategories);
router.get('/knowledge-tags', getKnowledgeTags);
router.get('/knowledge-search', searchKnowledgeArticles);
router.get('/knowledge-popular', getPopularKnowledgeArticles);

// ── Documents Center ──
router.get('/documents', listDocuments);
router.get('/documents/:id', getDocument);
router.patch('/documents/:id', updateDocument);
router.delete('/documents/:id', deleteDocument);
router.get('/documents/:id/versions', getDocumentVersions);
router.get('/document-categories', getDocumentCategories);
router.get('/document-stats', getDocumentStats);

// ── Manual Shipping ──
router.get('/shipments', listShipments);
router.post('/shipments', createShipment);
router.get('/shipments/:id', getShipment);
router.patch('/shipments/:id', updateShipment);
router.delete('/shipments/:id', deleteShipment);
router.patch('/shipments/:id/status', updateShipmentStatus);
router.post('/shipments/:id/tracking', addTrackingUpdate);
router.post('/shipments/:id/documents', attachShipmentDocument);
router.get('/shipment-stats', getShipmentStats);

export default router;
