import expressAsyncHandler from 'express-async-handler';
import { AppError } from '../middlewares/errorHandler.js';
import { logAuditEvent } from '../services/auditService.js';
import procurementAgentService from '../services/procurementAgentService.js';
import procurementPlaybookService from '../services/procurementPlaybookService.js';
import procurementKnowledgeEngine from '../services/procurementKnowledgeEngine.js';
import procurementAutomationService from '../services/procurementAutomationService.js';
import aiRfqGeneratorService from '../services/aiRfqGeneratorService.js';
import aiNegotiationService from '../services/aiNegotiationService.js';
import supplierPortfolioOptimizerService from '../services/supplierPortfolioOptimizerService.js';
import procurementRiskIntelligenceService from '../services/procurementRiskIntelligenceService.js';
import procurementTimelineService from '../services/procurementTimelineService.js';
import executiveBriefService from '../services/executiveBriefService.js';
import ProcurementPlan from '../models/ProcurementPlan.js';

const auditMeta = { category: 'autonomous_procurement', source: 'autonomous_procurement' };

export const interpretIntent = expressAsyncHandler(async (req, res) => {
  const { intent } = req.body;
  if (!intent) throw new AppError('intent is required', 400);
  const data = await procurementAgentService.interpretIntent(req.user._id, intent);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'interpret_procurement_intent', details: { intent } });
  res.json({ success: true, data });
});

export const createProcurementPlan = expressAsyncHandler(async (req, res) => {
  const { intent } = req.body;
  if (!intent) throw new AppError('intent is required', 400);
  const plan = await procurementAgentService.createPlan(req.user._id, intent);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'create_procurement_plan', entityType: 'ProcurementPlan', entityId: plan._id });
  res.status(201).json({ success: true, data: plan });
});

export const getProcurementPlan = expressAsyncHandler(async (req, res) => {
  const plan = await procurementAgentService.getPlan(req.params.id, req.user._id);
  if (!plan) throw new AppError('Plan not found', 404);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_procurement_plan', entityType: 'ProcurementPlan', entityId: req.params.id });
  res.json({ success: true, data: plan });
});

export const updateProcurementPlan = expressAsyncHandler(async (req, res) => {
  const plan = await procurementAgentService.updatePlan(req.params.id, req.user._id, req.body);
  if (!plan) throw new AppError('Plan not found', 404);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'update_procurement_plan', entityType: 'ProcurementPlan', entityId: req.params.id });
  res.json({ success: true, data: plan });
});

export const listProcurementPlans = expressAsyncHandler(async (req, res) => {
  const { status } = req.query;
  const plans = await procurementAgentService.listPlans(req.user._id, status);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'list_procurement_plans' });
  res.json({ success: true, data: plans });
});

export const deleteProcurementPlan = expressAsyncHandler(async (req, res) => {
  await procurementAgentService.deletePlan(req.params.id, req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'delete_procurement_plan', entityType: 'ProcurementPlan', entityId: req.params.id });
  res.json({ success: true, message: 'Plan deleted' });
});

export const getPlaybooks = expressAsyncHandler(async (req, res) => {
  const data = procurementPlaybookService.getAllPlaybooks();
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_playbooks' });
  res.json({ success: true, data });
});

export const getPlaybook = expressAsyncHandler(async (req, res) => {
  const data = procurementPlaybookService.getPlaybook(req.params.name);
  if (!data) throw new AppError('Playbook not found', 404);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_playbook', details: { playbook: req.params.name } });
  res.json({ success: true, data });
});

export const getRecommendedPlaybook = expressAsyncHandler(async (req, res) => {
  const { intent } = req.query;
  if (!intent) throw new AppError('intent is required', 400);
  const name = procurementPlaybookService.getRecommendedPlaybook(intent);
  const data = procurementPlaybookService.getPlaybook(name);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'recommend_playbook', details: { intent, playbook: name } });
  res.json({ success: true, data: { recommended: name, playbook: data } });
});

export const explainSupplier = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await procurementKnowledgeEngine.explainSupplier(vendorId);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'explain_supplier', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const explainProduct = expressAsyncHandler(async (req, res) => {
  const { productId } = req.query;
  if (!productId) throw new AppError('productId is required', 400);
  const data = await procurementKnowledgeEngine.explainProduct(productId);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'explain_product', entityType: 'Product', entityId: productId });
  res.json({ success: true, data });
});

export const explainRecommendation = expressAsyncHandler(async (req, res) => {
  const { type } = req.query;
  if (!type) throw new AppError('type is required', 400);
  const data = await procurementKnowledgeEngine.explainRecommendation(req.user._id, type);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'explain_recommendation', details: { type } });
  res.json({ success: true, data });
});

export const getAutomations = expressAsyncHandler(async (req, res) => {
  const data = await procurementAutomationService.getAutomations(req.user._id);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_automations' });
  res.json({ success: true, data });
});

export const toggleAutomation = expressAsyncHandler(async (req, res) => {
  const { automationId, enabled } = req.body;
  if (!automationId) throw new AppError('automationId is required', 400);
  const data = await procurementAutomationService.toggleAutomation(req.user._id, automationId, enabled);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'toggle_automation', details: { automationId, enabled } });
  res.json({ success: true, data });
});

export const getAutomationConfig = expressAsyncHandler(async (req, res) => {
  const { automationId } = req.query;
  if (!automationId) throw new AppError('automationId is required', 400);
  const data = await procurementAutomationService.getAutomationConfig(req.user._id, automationId);
  res.json({ success: true, data });
});

export const updateAutomationConfig = expressAsyncHandler(async (req, res) => {
  const { automationId, ...config } = req.body;
  if (!automationId) throw new AppError('automationId is required', 400);
  const data = await procurementAutomationService.updateAutomationConfig(req.user._id, automationId, config);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'update_automation_config', details: { automationId } });
  res.json({ success: true, data });
});

export const generateRfq = expressAsyncHandler(async (req, res) => {
  const data = aiRfqGeneratorService.generateRfq(req.body);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'generate_ai_rfq' });
  res.json({ success: true, data });
});

export const generateNegotiationPlan = expressAsyncHandler(async (req, res) => {
  const { vendorId, productId, targetQuantity } = req.body;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await aiNegotiationService.generateNegotiationPlan(vendorId, productId, targetQuantity);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'generate_negotiation_plan', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const optimizeSupplierPortfolio = expressAsyncHandler(async (req, res) => {
  const { strategy, category } = req.query;
  const data = await supplierPortfolioOptimizerService.optimize(req.user._id, strategy || 'balanced', category);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'optimize_supplier_portfolio', details: { strategy } });
  res.json({ success: true, data });
});

export const getRiskMap = expressAsyncHandler(async (req, res) => {
  const { vendorId } = req.query;
  if (!vendorId) throw new AppError('vendorId is required', 400);
  const data = await procurementRiskIntelligenceService.getRiskMap(vendorId);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_risk_map', entityType: 'Vendor', entityId: vendorId });
  res.json({ success: true, data });
});

export const generateTimeline = expressAsyncHandler(async (req, res) => {
  const data = procurementTimelineService.generateTimeline(req.body);
  const totalDays = procurementTimelineService.getTotalDuration(data);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'generate_timeline' });
  res.json({ success: true, data: { phases: data, totalDays } });
});

export const generateBrief = expressAsyncHandler(async (req, res) => {
  const type = req.query.type || 'monthly';
  const data = await executiveBriefService.generateBrief(req.user._id, type);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'generate_executive_brief', details: { type } });
  res.json({ success: true, data });
});

export const getAutonomousDashboard = expressAsyncHandler(async (req, res) => {
  const [plans, playbooks, automations, decisions] = await Promise.all([
    procurementAgentService.listPlans(req.user._id),
    Promise.resolve(procurementPlaybookService.getAllPlaybooks()),
    procurementAutomationService.getAutomations(req.user._id),
    Promise.resolve([]),
  ]);
  logAuditEvent({ ...auditMeta, userId: req.user._id, action: 'view_autonomous_dashboard' });
  res.json({
    success: true,
    data: {
      plans: plans.length,
      activePlans: plans.filter(p => p.status === 'active').length,
      playbooks: playbooks.length,
      automations: automations.length,
      enabledAutomations: automations.filter(a => a.enabled).length,
    },
  });
});
