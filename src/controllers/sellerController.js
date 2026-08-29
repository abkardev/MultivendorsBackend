import { sellerCRMService } from '../services/sellerCRMService.js';
import { leadManagementService } from '../services/leadManagementService.js';
import { quotationProService } from '../services/quotationProService.js';
import { productPerformanceService } from '../services/productPerformanceService.js';
import { salesDashboardService } from '../services/salesDashboardService.js';
import { salesForecastingService } from '../services/salesForecastingService.js';
import { aiSalesAssistantService } from '../services/aiSalesAssistantService.js';
import { sellerAutomationService } from '../services/sellerAutomationService.js';
import { customerSuccessService } from '../services/customerSuccessService.js';
import { marketingCenterService } from '../services/marketingCenterService.js';
import { pricingIntelligenceService } from '../services/pricingIntelligenceService.js';
import { sellerReputationService } from '../services/sellerReputationService.js';
import { exportInternationalService } from '../services/exportInternationalService.js';
import { sellerKnowledgeBaseService } from '../services/sellerKnowledgeBaseService.js';
import { documentsCenterService } from '../services/documentsCenterService.js';
import { manualShippingService } from '../services/manualShippingService.js';
import { logAuditEvent } from '../services/auditService.js';
import { SellerCustomer } from '../models/SellerCustomer.js';

// ── CRM ──
export const listCustomers = async (req, res) => {
  try {
    const result = await sellerCRMService.getCustomers(req.user._id, req.query);
    res.json({ status: true, ...result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCustomer = async (req, res) => {
  try {
    const customer = await sellerCRMService.getCustomer(req.user._id, req.params.id);
    if (!customer) return res.status(404).json({ status: false, message: 'Customer not found' });
    res.json({ status: true, data: customer });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateCustomer = async (req, res) => {
  try {
    const customer = await sellerCRMService.updateCustomer(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: customer });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createCustomerTag = async (req, res) => {
  try {
    const tag = await sellerCRMService.createTag(req.user._id, req.body);
    res.status(201).json({ status: true, data: tag });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const listCustomerTags = async (req, res) => {
  try {
    const tags = await sellerCRMService.getTags(req.user._id);
    res.json({ status: true, data: tags });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteCustomerTag = async (req, res) => {
  try {
    await sellerCRMService.deleteTag(req.user._id, req.params.tagId);
    res.json({ status: true, message: 'Tag deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const addCustomerActivity = async (req, res) => {
  try {
    const customer = await SellerCustomer.findOne({ _id: req.params.id, vendor: req.user._id });
    if (!customer) return res.status(404).json({ status: false, message: 'Customer not found' });
    const activity = await sellerCRMService.addActivity(req.user._id, customer.buyer, req.body);
    res.status(201).json({ status: true, data: activity });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCustomerActivities = async (req, res) => {
  try {
    const activities = await sellerCRMService.getActivities(req.user._id, req.params.id, { limit: req.query.limit });
    res.json({ status: true, data: activities });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCustomerPipelines = async (req, res) => {
  try {
    const pipelines = await sellerCRMService.getPipeline(req.user._id);
    res.json({ status: true, data: pipelines });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createCustomerPipeline = async (req, res) => {
  try {
    const pipeline = await sellerCRMService.createPipeline(req.user._id, req.body);
    res.status(201).json({ status: true, data: pipeline });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateCustomerPipeline = async (req, res) => {
  try {
    const pipeline = await sellerCRMService.updatePipelineStage(req.user._id, req.params.id, req.body.stage);
    res.json({ status: true, data: pipeline });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteCustomerPipeline = async (req, res) => {
  try {
    const { CustomerPipeline } = await import('../models/CustomerPipeline.js');
    const pipeline = await CustomerPipeline.findOneAndDelete({ _id: req.params.id, vendor: req.user._id });
    if (!pipeline) return res.status(404).json({ status: false, message: 'Pipeline not found' });
    res.json({ status: true, message: 'Pipeline deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const assignCustomerPipeline = async (req, res) => {
  try {
    const customer = await sellerCRMService.assignToPipeline(req.user._id, req.params.id, req.body.pipelineId);
    res.json({ status: true, data: customer });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCustomerReminders = async (req, res) => {
  try {
    const reminders = await sellerCRMService.getReminders(req.user._id, { ...req.query, customerId: req.params.id });
    res.json({ status: true, data: reminders });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createCustomerReminder = async (req, res) => {
  try {
    const reminder = await sellerCRMService.createReminder(req.user._id, { ...req.body, buyer: req.params.id });
    res.status(201).json({ status: true, data: reminder });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const completeReminder = async (req, res) => {
  try {
    const reminder = await sellerCRMService.completeReminder(req.user._id, req.params.reminderId);
    res.json({ status: true, data: reminder });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Lead Management ──
export const listLeads = async (req, res) => {
  try {
    const result = await leadManagementService.getLeads(req.user._id, req.query);
    res.json({ status: true, ...result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createLead = async (req, res) => {
  try {
    const lead = await leadManagementService.createLead(req.user._id, req.body);
    res.status(201).json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getLead = async (req, res) => {
  try {
    const lead = await leadManagementService.getLead(req.user._id, req.params.id);
    if (!lead) return res.status(404).json({ status: false, message: 'Lead not found' });
    res.json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await leadManagementService.updateLead(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteLead = async (req, res) => {
  try {
    await leadManagementService.deleteLead(req.user._id, req.params.id);
    res.json({ status: true, message: 'Lead deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateLeadStage = async (req, res) => {
  try {
    const lead = await leadManagementService.updateStage(req.user._id, req.params.id, req.body.stage, req.body);
    res.json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const qualifyLead = async (req, res) => {
  try {
    const lead = await leadManagementService.aiQualify(req.user._id, req.params.id);
    res.json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const convertLead = async (req, res) => {
  try {
    const lead = await leadManagementService.updateStage(req.user._id, req.params.id, 'won', { buyerId: req.body.buyerId });
    res.json({ status: true, data: lead });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getLeadStats = async (req, res) => {
  try {
    const stats = await leadManagementService.getPipelineAnalytics(req.user._id);
    res.json({ status: true, data: stats });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Quotation Pro ──
export const listQuotationTemplates = async (req, res) => {
  try {
    const templates = await quotationProService.getTemplates(req.user._id);
    res.json({ status: true, data: templates });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createQuotationTemplate = async (req, res) => {
  try {
    const template = await quotationProService.createTemplate(req.user._id, req.body);
    res.status(201).json({ status: true, data: template });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getQuotationTemplate = async (req, res) => {
  try {
    const template = await quotationProService.getTemplate(req.user._id, req.params.id);
    if (!template) return res.status(404).json({ status: false, message: 'Template not found' });
    res.json({ status: true, data: template });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateQuotationTemplate = async (req, res) => {
  try {
    const template = await quotationProService.updateTemplate(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: template });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteQuotationTemplate = async (req, res) => {
  try {
    await quotationProService.deleteTemplate(req.user._id, req.params.id);
    res.json({ status: true, message: 'Template deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getQuotationVersions = async (req, res) => {
  try {
    const versions = await quotationProService.getVersions(req.params.id);
    res.json({ status: true, data: versions });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getQuotationAnalytics = async (req, res) => {
  try {
    const analytics = await quotationProService.getQuotationAnalytics(req.user._id);
    res.json({ status: true, data: analytics });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Product Performance ──
export const listProductPerformance = async (req, res) => {
  try {
    const result = await productPerformanceService.getPerformance(req.user._id, req.query);
    res.json({ status: true, ...result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getProductPerformance = async (req, res) => {
  try {
    const performance = await productPerformanceService.getProductDetail(req.user._id, req.params.productId);
    if (!performance) return res.status(404).json({ status: false, message: 'Performance data not found' });
    res.json({ status: true, data: performance });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getProductAnalytics = async (req, res) => {
  try {
    const analytics = await productPerformanceService.getPerformance(req.user._id, req.query);
    res.json({ status: true, data: analytics });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Sales Dashboard ──
export const getSalesDashboard = async (req, res) => {
  try {
    const dashboard = await salesDashboardService.getDashboard(req.user._id);
    res.json({ status: true, data: dashboard });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const listSalesGoals = async (req, res) => {
  try {
    const goals = await salesDashboardService.getGoals(req.user._id);
    res.json({ status: true, data: goals });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createSalesGoal = async (req, res) => {
  try {
    const goal = await salesDashboardService.createGoal(req.user._id, req.body);
    res.status(201).json({ status: true, data: goal });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateSalesGoal = async (req, res) => {
  try {
    const goal = await salesDashboardService.updateGoal(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: goal });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteSalesGoal = async (req, res) => {
  try {
    await salesDashboardService.deleteGoal(req.user._id, req.params.id);
    res.json({ status: true, message: 'Goal deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Sales Forecasting ──
export const generateForecast = async (req, res) => {
  try {
    const forecast = await salesForecastingService.generateForecast(req.user._id, req.body.type, req.body.options);
    res.status(201).json({ status: true, data: forecast });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const listForecasts = async (req, res) => {
  try {
    const forecasts = await salesForecastingService.getForecasts(req.user._id, req.query);
    res.json({ status: true, data: forecasts });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getForecast = async (req, res) => {
  try {
    const forecast = await salesForecastingService.getForecast(req.user._id, req.params.id);
    if (!forecast) return res.status(404).json({ status: false, message: 'Forecast not found' });
    res.json({ status: true, data: forecast });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getHistoricalTrends = async (req, res) => {
  try {
    const trends = await salesForecastingService.getHistoricalTrends(req.user._id, req.query);
    res.json({ status: true, data: trends });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── AI Sales Assistant ──
export const processAiQuery = async (req, res) => {
  try {
    const result = await aiSalesAssistantService.processQuery(req.user._id, req.body.query);
    res.json({ status: true, data: result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Seller Automation ──
export const listAutomationRules = async (req, res) => {
  try {
    const rules = await sellerAutomationService.getRules(req.user._id);
    res.json({ status: true, data: rules });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createAutomationRule = async (req, res) => {
  try {
    const rule = await sellerAutomationService.createRule(req.user._id, req.body);
    res.status(201).json({ status: true, data: rule });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateAutomationRule = async (req, res) => {
  try {
    const rule = await sellerAutomationService.updateRule(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: rule });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteAutomationRule = async (req, res) => {
  try {
    await sellerAutomationService.deleteRule(req.user._id, req.params.id);
    res.json({ status: true, message: 'Rule deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const toggleAutomationRule = async (req, res) => {
  try {
    const rule = await sellerAutomationService.toggleRule(req.user._id, req.params.id);
    res.json({ status: true, data: rule });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const runAutomations = async (req, res) => {
  try {
    const results = await sellerAutomationService.processAutomations(req.user._id);
    res.json({ status: true, data: results });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Customer Success ──
export const getHealthScores = async (req, res) => {
  try {
    const scores = await customerSuccessService.getHealthScores(req.user._id);
    res.json({ status: true, data: scores });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCustomerHealth = async (req, res) => {
  try {
    const health = await customerSuccessService.getCustomerHealth(req.user._id, req.params.id);
    res.json({ status: true, data: health });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getHealthTrends = async (req, res) => {
  try {
    const trends = await customerSuccessService.getHealthTrends(req.user._id);
    res.json({ status: true, data: trends });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getAtRiskCustomers = async (req, res) => {
  try {
    const customers = await customerSuccessService.getAtRiskCustomers(req.user._id);
    res.json({ status: true, data: customers });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const recalculateHealth = async (req, res) => {
  try {
    const health = await customerSuccessService.triggerHealthRecalculation(req.user._id, req.params.id);
    res.json({ status: true, data: health });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Marketing Center ──
export const listCampaigns = async (req, res) => {
  try {
    const campaigns = await marketingCenterService.getCampaigns(req.user._id);
    res.json({ status: true, data: campaigns });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.createCampaign(req.user._id, req.body);
    res.status(201).json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.getCampaign(req.user._id, req.params.id);
    if (!campaign) return res.status(404).json({ status: false, message: 'Campaign not found' });
    res.json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.updateCampaign(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteCampaign = async (req, res) => {
  try {
    await marketingCenterService.deleteCampaign(req.user._id, req.params.id);
    res.json({ status: true, message: 'Campaign deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const launchCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.launchCampaign(req.user._id, req.params.id);
    res.json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const pauseCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.pauseCampaign(req.user._id, req.params.id);
    res.json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const completeCampaign = async (req, res) => {
  try {
    const campaign = await marketingCenterService.completeCampaign(req.user._id, req.params.id);
    res.json({ status: true, data: campaign });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getCampaignStats = async (req, res) => {
  try {
    const stats = await marketingCenterService.getCampaignStats(req.user._id);
    res.json({ status: true, data: stats });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Pricing Intelligence ──
export const analyzeProductPricing = async (req, res) => {
  try {
    const intelligence = await pricingIntelligenceService.analyzeProductPricing(req.user._id, req.params.productId);
    res.json({ status: true, data: intelligence });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getProductPricing = async (req, res) => {
  try {
    const intelligence = await pricingIntelligenceService.getProductPricing(req.user._id, req.params.productId);
    res.json({ status: true, data: intelligence });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getPricingList = async (req, res) => {
  try {
    const result = await pricingIntelligenceService.getPricingList(req.user._id);
    res.json({ status: true, data: result });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getPricingRecommendations = async (req, res) => {
  try {
    const recommendations = await pricingIntelligenceService.getPricingRecommendations(req.user._id);
    res.json({ status: true, data: recommendations });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getPriceHistory = async (req, res) => {
  try {
    const history = await pricingIntelligenceService.getPriceHistory(req.user._id, req.params.productId);
    res.json({ status: true, data: history });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Seller Reputation ──
export const getReputationDashboard = async (req, res) => {
  try {
    const dashboard = await sellerReputationService.getReputationDashboard(req.user._id);
    res.json({ status: true, data: dashboard });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const respondToReview = async (req, res) => {
  try {
    const review = await sellerReputationService.respondToReview(req.user._id, req.params.reviewId, req.body.response);
    res.json({ status: true, data: review });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getReviewAnalytics = async (req, res) => {
  try {
    const analytics = await sellerReputationService.getReviewAnalytics(req.user._id);
    res.json({ status: true, data: analytics });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Export & International Sales ──
export const assessExportReadiness = async (req, res) => {
  try {
    const readiness = await exportInternationalService.assessExportReadiness(req.user._id);
    res.json({ status: true, data: readiness });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getExportReadiness = async (req, res) => {
  try {
    const readiness = await exportInternationalService.getExportReadiness(req.user._id);
    res.json({ status: true, data: readiness });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getExportOpportunities = async (req, res) => {
  try {
    const opportunities = await exportInternationalService.getExportOpportunities(req.user._id);
    res.json({ status: true, data: opportunities });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateExportReadiness = async (req, res) => {
  try {
    const readiness = await exportInternationalService.updateExportReadiness(req.user._id, req.body);
    res.json({ status: true, data: readiness });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Seller Knowledge Base ──
export const listKnowledgeArticles = async (req, res) => {
  try {
    const articles = await sellerKnowledgeBaseService.getArticles(req.user._id, req.query);
    res.json({ status: true, data: articles });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const createKnowledgeArticle = async (req, res) => {
  try {
    const article = await sellerKnowledgeBaseService.createArticle(req.user._id, req.body);
    res.status(201).json({ status: true, data: article });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getKnowledgeArticle = async (req, res) => {
  try {
    const article = await sellerKnowledgeBaseService.getArticle(req.user._id, req.params.id);
    if (!article) return res.status(404).json({ status: false, message: 'Article not found' });
    res.json({ status: true, data: article });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateKnowledgeArticle = async (req, res) => {
  try {
    const article = await sellerKnowledgeBaseService.updateArticle(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: article });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteKnowledgeArticle = async (req, res) => {
  try {
    await sellerKnowledgeBaseService.deleteArticle(req.user._id, req.params.id);
    res.json({ status: true, message: 'Article deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getKnowledgeCategories = async (req, res) => {
  try {
    const categories = await sellerKnowledgeBaseService.getCategories(req.user._id);
    res.json({ status: true, data: categories });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getKnowledgeTags = async (req, res) => {
  try {
    const tags = await sellerKnowledgeBaseService.getTags(req.user._id);
    res.json({ status: true, data: tags });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const searchKnowledgeArticles = async (req, res) => {
  try {
    const articles = await sellerKnowledgeBaseService.searchArticles(req.user._id, req.query.q);
    res.json({ status: true, data: articles });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getPopularKnowledgeArticles = async (req, res) => {
  try {
    const articles = await sellerKnowledgeBaseService.getPopularArticles(req.user._id, req.query.limit);
    res.json({ status: true, data: articles });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Documents Center ──
export const listDocuments = async (req, res) => {
  try {
    const documents = await documentsCenterService.getDocuments(req.user._id, req.query);
    res.json({ status: true, data: documents });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getDocument = async (req, res) => {
  try {
    const doc = await documentsCenterService.getDocument(req.user._id, req.params.id);
    if (!doc) return res.status(404).json({ status: false, message: 'Document not found' });
    res.json({ status: true, data: doc });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateDocument = async (req, res) => {
  try {
    const doc = await documentsCenterService.updateDocument(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: doc });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteDocument = async (req, res) => {
  try {
    await documentsCenterService.deleteDocument(req.user._id, req.params.id);
    res.json({ status: true, message: 'Document deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getDocumentVersions = async (req, res) => {
  try {
    const versions = await documentsCenterService.getDocumentVersions(req.user._id, req.params.id);
    res.json({ status: true, data: versions });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getDocumentCategories = async (req, res) => {
  try {
    const categories = await documentsCenterService.getCategories(req.user._id);
    res.json({ status: true, data: categories });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getDocumentStats = async (req, res) => {
  try {
    const stats = await documentsCenterService.getDocumentStats(req.user._id);
    res.json({ status: true, data: stats });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

// ── Manual Shipping ──
export const createShipment = async (req, res) => {
  try {
    const shipment = await manualShippingService.createShipment(req.user._id, req.body);
    res.status(201).json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const listShipments = async (req, res) => {
  try {
    const shipments = await manualShippingService.getShipments(req.user._id, req.query);
    res.json({ status: true, data: shipments });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getShipment = async (req, res) => {
  try {
    const shipment = await manualShippingService.getShipment(req.user._id, req.params.id);
    if (!shipment) return res.status(404).json({ status: false, message: 'Shipment not found' });
    res.json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateShipment = async (req, res) => {
  try {
    const shipment = await manualShippingService.updateShipment(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const updateShipmentStatus = async (req, res) => {
  try {
    const shipment = await manualShippingService.updateShipmentStatus(req.user._id, req.params.id, req.body.status, req.body.notes);
    res.json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const addTrackingUpdate = async (req, res) => {
  try {
    const shipment = await manualShippingService.addTrackingUpdate(req.user._id, req.params.id, req.body);
    res.json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const attachShipmentDocument = async (req, res) => {
  try {
    const shipment = await manualShippingService.attachDocument(req.user._id, req.params.id, req.body.documentId);
    res.json({ status: true, data: shipment });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const getShipmentStats = async (req, res) => {
  try {
    const stats = await manualShippingService.getShipmentStats(req.user._id);
    res.json({ status: true, data: stats });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};

export const deleteShipment = async (req, res) => {
  try {
    await manualShippingService.deleteShipment(req.user._id, req.params.id);
    res.json({ status: true, message: 'Shipment deleted' });
  } catch (err) { res.status(500).json({ status: false, message: err.message }); }
};
