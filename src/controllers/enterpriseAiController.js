import { aiCopilotService } from '../services/aiCopilotService.js';
import { knowledgeGraphService } from '../services/knowledgeGraphService.js';
import { semanticSearchService } from '../services/semanticSearchService.js';
import { businessRulesEngineService } from '../services/businessRulesEngineService.js';
import { eventDrivenAutomationService } from '../services/eventDrivenAutomationService.js';
import { aiWorkflowDesignerService } from '../services/aiWorkflowDesignerService.js';
import { hyperAutomationService } from '../services/hyperAutomationService.js';
import { explainableAiService } from '../services/explainableAiService.js';
import { predictiveIntelligenceService } from '../services/predictiveIntelligenceService.js';
import { digitalTwinService } from '../services/digitalTwinService.js';
import { recommendationEngineV3Service } from '../services/recommendationEngineV3Service.js';
import { anomalyDetectionService } from '../services/anomalyDetectionService.js';
import { reportingStudioService } from '../services/reportingStudioService.js';
import { integrationHubService } from '../services/integrationHubService.js';
import { lowCodeAutomationService } from '../services/lowCodeAutomationService.js';
import { usageIntelligenceService } from '../services/usageIntelligenceService.js';
import { logAuditEvent } from '../services/auditService.js';

// ============================================================
// Part 1 - AI Copilots
// ============================================================

export const createCopilotSession = async (req, res) => {
  try {
    const result = await aiCopilotService.createCopilotSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCopilotSessions = async (req, res) => {
  try {
    const result = await aiCopilotService.getCopilotSessions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCopilotSession = async (req, res) => {
  try {
    const result = await aiCopilotService.getCopilotSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendCopilotMessage = async (req, res) => {
  try {
    const result = await aiCopilotService.sendCopilotMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCopilotConversation = async (req, res) => {
  try {
    const result = await aiCopilotService.getCopilotConversation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const clearCopilotSession = async (req, res) => {
  try {
    const result = await aiCopilotService.clearCopilotSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeCopilotAction = async (req, res) => {
  try {
    const result = await aiCopilotService.executeCopilotAction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCopilotInsights = async (req, res) => {
  try {
    const result = await aiCopilotService.getCopilotInsights(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 2 - Knowledge Graph
// ============================================================

export const syncKnowledgeEntity = async (req, res) => {
  try {
    const result = await knowledgeGraphService.syncKnowledgeEntity(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createKnowledgeRelationship = async (req, res) => {
  try {
    const result = await knowledgeGraphService.createKnowledgeRelationship(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeEntity = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getKnowledgeEntity(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchKnowledgeEntities = async (req, res) => {
  try {
    const result = await knowledgeGraphService.searchKnowledgeEntities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEntityRelationships = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getEntityRelationships(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getImpactAnalysis = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getImpactAnalysis(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDependencyGraph = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getDependencyGraph(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRecommendationGraph = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getRecommendationGraph(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const discoverRelatedEntities = async (req, res) => {
  try {
    const result = await knowledgeGraphService.discoverRelatedEntities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEntityExplorer = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getEntityExplorer(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRelationshipExplorer = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getRelationshipExplorer(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const findEntityPath = async (req, res) => {
  try {
    const result = await knowledgeGraphService.findEntityPath(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGraphStats = async (req, res) => {
  try {
    const result = await knowledgeGraphService.getGraphStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const syncAllEntities = async (req, res) => {
  try {
    const result = await knowledgeGraphService.syncAllEntities(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 3 - Semantic Search
// ============================================================

export const semanticSearch = async (req, res) => {
  try {
    const result = await semanticSearchService.semanticSearch(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const naturalLanguageSearch = async (req, res) => {
  try {
    const result = await semanticSearchService.naturalLanguageSearch(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const result = await semanticSearchService.getSearchSuggestions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRelatedSearchResults = async (req, res) => {
  try {
    const result = await semanticSearchService.getRelatedSearchResults(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchExplanation = async (req, res) => {
  try {
    const result = await semanticSearchService.getSearchExplanation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchAISummary = async (req, res) => {
  try {
    const result = await semanticSearchService.getSearchAISummary(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const manageSearchSynonyms = async (req, res) => {
  try {
    const result = await semanticSearchService.manageSearchSynonyms(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSavedSearches = async (req, res) => {
  try {
    const result = await semanticSearchService.getSavedSearches(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const saveSearch = async (req, res) => {
  try {
    const result = await semanticSearchService.saveSearch(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteSavedSearch = async (req, res) => {
  try {
    const result = await semanticSearchService.deleteSavedSearch(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const reindexSearch = async (req, res) => {
  try {
    const result = await semanticSearchService.reindexSearch(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 4 - Business Rules Engine
// ============================================================

export const getBusinessRules = async (req, res) => {
  try {
    const result = await businessRulesEngineService.getBusinessRules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.getBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.createBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.updateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.deleteBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.activateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deactivateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.deactivateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.testBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const simulateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.simulateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.approveBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRuleVersions = async (req, res) => {
  try {
    const result = await businessRulesEngineService.getBusinessRuleVersions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.rollbackBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.evaluateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateAllBusinessRules = async (req, res) => {
  try {
    const result = await businessRulesEngineService.evaluateAllBusinessRules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateBusinessRule = async (req, res) => {
  try {
    const result = await businessRulesEngineService.validateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRuleDependencies = async (req, res) => {
  try {
    const result = await businessRulesEngineService.getBusinessRuleDependencies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRuleImpact = async (req, res) => {
  try {
    const result = await businessRulesEngineService.getBusinessRuleImpact(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 5 - Event-Driven Automation
// ============================================================

export const getEventRules = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.getEventRules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createEventRule = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.createEventRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateEventRule = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.updateEventRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteEventRule = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.deleteEventRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const toggleEventRule = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.toggleEventRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const fireEvent = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.fireEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEventLogs = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.getEventLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEventLog = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.getEventLog(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryEvent = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.retryEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEventStats = async (req, res) => {
  try {
    const result = await eventDrivenAutomationService.getEventStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 6 - AI Workflow Designer
// ============================================================

export const getWorkflowDefinitions = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowDefinition = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWorkflowDefinition = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.createWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWorkflowDefinition = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.updateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWorkflowDefinition = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.deleteWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateWorkflow = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.activateWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deactivateWorkflow = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.deactivateWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeWorkflow = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.executeWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowExecutions = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowExecutions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowExecution = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowTemplates = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateWorkflow = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.validateWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowAnalytics = async (req, res) => {
  try {
    const result = await aiWorkflowDesignerService.getWorkflowAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 7 - Hyper Automation
// ============================================================

export const getHyperAutomationDashboard = async (req, res) => {
  try {
    const result = await hyperAutomationService.getHyperAutomationDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRunningWorkflows = async (req, res) => {
  try {
    const result = await hyperAutomationService.getRunningWorkflows(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFailedWorkflows = async (req, res) => {
  try {
    const result = await hyperAutomationService.getFailedWorkflows(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryFailedWorkflow = async (req, res) => {
  try {
    const result = await hyperAutomationService.retryFailedWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const cancelRunningWorkflow = async (req, res) => {
  try {
    const result = await hyperAutomationService.cancelRunningWorkflow(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationQueue = async (req, res) => {
  try {
    const result = await hyperAutomationService.getAutomationQueue(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationPerformance = async (req, res) => {
  try {
    const result = await hyperAutomationService.getAutomationPerformance(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationAiSuggestions = async (req, res) => {
  try {
    const result = await hyperAutomationService.getAutomationAiSuggestions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationROI = async (req, res) => {
  try {
    const result = await hyperAutomationService.getAutomationROI(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 8 - Explainable AI
// ============================================================

export const explainDecision = async (req, res) => {
  try {
    const result = await explainableAiService.explainDecision(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiAuditRecord = async (req, res) => {
  try {
    const result = await explainableAiService.getAiAuditRecord(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const compareAiAlternatives = async (req, res) => {
  try {
    const result = await explainableAiService.compareAiAlternatives(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getExplanationTemplate = async (req, res) => {
  try {
    const result = await explainableAiService.getExplanationTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 9 - Predictive Intelligence
// ============================================================

export const getPrediction = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getPrediction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generatePrediction = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.generatePrediction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAllPredictions = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getAllPredictions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPredictionAccuracy = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getPredictionAccuracy(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retrainPredictionModel = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.retrainPredictionModel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDemandForecast = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getDemandForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSupplyForecast = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getSupplyForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRevenueForecast = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getRevenueForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getChurnPrediction = async (req, res) => {
  try {
    const result = await predictiveIntelligenceService.getChurnPrediction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 10 - Digital Twin
// ============================================================

export const getTwinSnapshot = async (req, res) => {
  try {
    const result = await digitalTwinService.getTwinSnapshot(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTwinHistory = async (req, res) => {
  try {
    const result = await digitalTwinService.getTwinHistory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const simulateScenario = async (req, res) => {
  try {
    const result = await digitalTwinService.simulateScenario(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCapacityPlan = async (req, res) => {
  try {
    const result = await digitalTwinService.getCapacityPlan(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getGrowthForecast = async (req, res) => {
  try {
    const result = await digitalTwinService.getGrowthForecast(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMarketplaceHealth = async (req, res) => {
  try {
    const result = await digitalTwinService.getMarketplaceHealth(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 11 - Recommendation Engine V3
// ============================================================

export const getRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getProductRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getProductRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSupplierRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getSupplierRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCategoryRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getCategoryRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPricingRecommendationV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getPricingRecommendationV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDiscountRecommendationV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getDiscountRecommendationV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSubscriptionRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getSubscriptionRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getWorkflowRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApprovalRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getApprovalRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getKnowledgeRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getReportRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPlaybookRecommendationsV3 = async (req, res) => {
  try {
    const result = await recommendationEngineV3Service.getPlaybookRecommendationsV3(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 12 - Anomaly Detection
// ============================================================

export const getAnomalies = async (req, res) => {
  try {
    const result = await anomalyDetectionService.getAnomalies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAnomaly = async (req, res) => {
  try {
    const result = await anomalyDetectionService.getAnomaly(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const detectAnomalies = async (req, res) => {
  try {
    const result = await anomalyDetectionService.detectAnomalies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const investigateAnomaly = async (req, res) => {
  try {
    const result = await anomalyDetectionService.investigateAnomaly(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resolveAnomaly = async (req, res) => {
  try {
    const result = await anomalyDetectionService.resolveAnomaly(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const ignoreAnomaly = async (req, res) => {
  try {
    const result = await anomalyDetectionService.ignoreAnomaly(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAnomalyStats = async (req, res) => {
  try {
    const result = await anomalyDetectionService.getAnomalyStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const runAllDetections = async (req, res) => {
  try {
    const result = await anomalyDetectionService.runAllDetections(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAnomalyTrends = async (req, res) => {
  try {
    const result = await anomalyDetectionService.getAnomalyTrends(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 13 - Reporting Studio
// ============================================================

export const getReportTemplates = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportTemplate = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createReportTemplate = async (req, res) => {
  try {
    const result = await reportingStudioService.createReportTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateReportTemplate = async (req, res) => {
  try {
    const result = await reportingStudioService.updateReportTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteReportTemplate = async (req, res) => {
  try {
    const result = await reportingStudioService.deleteReportTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateReport = async (req, res) => {
  try {
    const result = await reportingStudioService.generateReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const scheduleReport = async (req, res) => {
  try {
    const result = await reportingStudioService.scheduleReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unscheduleReport = async (req, res) => {
  try {
    const result = await reportingStudioService.unscheduleReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getScheduledReports = async (req, res) => {
  try {
    const result = await reportingStudioService.getScheduledReports(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const exportReport = async (req, res) => {
  try {
    const result = await reportingStudioService.exportReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportHistory = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportHistory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const duplicateReportTemplate = async (req, res) => {
  try {
    const result = await reportingStudioService.duplicateReportTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 14 - Integration Hub
// ============================================================

export const getIntegrationEndpoints = async (req, res) => {
  try {
    const result = await integrationHubService.getIntegrationEndpoints(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationEndpoint = async (req, res) => {
  try {
    const result = await integrationHubService.getIntegrationEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIntegrationEndpoint = async (req, res) => {
  try {
    const result = await integrationHubService.createIntegrationEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateIntegrationEndpoint = async (req, res) => {
  try {
    const result = await integrationHubService.updateIntegrationEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteIntegrationEndpoint = async (req, res) => {
  try {
    const result = await integrationHubService.deleteIntegrationEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testIntegrationEndpoint = async (req, res) => {
  try {
    const result = await integrationHubService.testIntegrationEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getImportJobs = async (req, res) => {
  try {
    const result = await integrationHubService.getImportJobs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getExportJobs = async (req, res) => {
  try {
    const result = await integrationHubService.getExportJobs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createImportJob = async (req, res) => {
  try {
    const result = await integrationHubService.createImportJob(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createExportJob = async (req, res) => {
  try {
    const result = await integrationHubService.createExportJob(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeadLetterQueue = async (req, res) => {
  try {
    const result = await integrationHubService.getDeadLetterQueue(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryDeadLetter = async (req, res) => {
  try {
    const result = await integrationHubService.retryDeadLetter(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationStats = async (req, res) => {
  try {
    const result = await integrationHubService.getIntegrationStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWebhookLogs = async (req, res) => {
  try {
    const result = await integrationHubService.getWebhookLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 15 - Low-Code Automation
// ============================================================

export const getAutomationComponents = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.getAutomationComponents(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLowCodeTemplates = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.getLowCodeTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLowCodeTemplate = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.getLowCodeTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createFromAutomationTemplate = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.createFromAutomationTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateAutomation = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.validateAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testAutomation = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.testAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const publishAutomation = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.publishAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationExecutionLogs = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.getAutomationExecutionLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rollbackAutomation = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.rollbackAutomation(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getComponentCatalog = async (req, res) => {
  try {
    const result = await lowCodeAutomationService.getComponentCatalog(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 16 - Usage Intelligence
// ============================================================

export const trackUsageEvent = async (req, res) => {
  try {
    const result = await usageIntelligenceService.trackUsageEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFeatureAdoption = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getFeatureAdoption(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getModuleUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getModuleUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getAiUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAutomationUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getAutomationUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getWorkflowUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getSearchUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getNotificationUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getNotificationUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDashboardUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getDashboardUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApiUsageStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getApiUsageStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getActiveUsersStats = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getActiveUsersStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUserJourney = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getUserJourney(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getActivationFunnel = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getActivationFunnel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRetentionCohort = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getRetentionCohort(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPowerUsers = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getPowerUsers(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLicenseUtilization = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getLicenseUtilization(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getHeatmapData = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getHeatmapData(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFeatureFunnels = async (req, res) => {
  try {
    const result = await usageIntelligenceService.getFeatureFunnels(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
