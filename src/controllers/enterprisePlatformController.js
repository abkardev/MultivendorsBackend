import { enterpriseIntegrationService } from '../services/enterpriseIntegrationService.js';
import { developerPlatformService } from '../services/developerPlatformService.js';
import { workflowBuilderService } from '../services/workflowBuilderService.js';
import { rulesEngineService } from '../services/rulesEngineService.js';
import { formsBuilderService } from '../services/formsBuilderService.js';
import { enterpriseDocumentsService } from '../services/enterpriseDocumentsService.js';
import { globalMarketplaceService } from '../services/globalMarketplaceService.js';
import { multiOrganizationService } from '../services/multiOrganizationService.js';
import { communicationCenterService } from '../services/communicationCenterService.js';
import { knowledgePlatformService } from '../services/knowledgePlatformService.js';
import { aiIntegrationPlatformService } from '../services/aiIntegrationPlatformService.js';
import { eventBusService } from '../services/eventBusService.js';
import { pluginMarketplaceService } from '../services/pluginMarketplaceService.js';
import { reportingStudioService } from '../services/reportingStudioService.js';
import { mobileSupportService } from '../services/mobileSupportService.js';
import { saasFoundationService } from '../services/saasFoundationService.js';

// ============================================================
// Part 1 - Enterprise Integration Hub
// ============================================================

export const getIntegrationProviders = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationProviders(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationProvider = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.createIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationConnections = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationConnections(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.updateIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.deleteIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.testIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const healthCheckIntegrationConnection = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.healthCheckIntegrationConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationConnectionLogs = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationConnectionLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationCredential = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationCredential(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIntegrationCredential = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.createIntegrationCredential(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateIntegrationCredential = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.updateIntegrationCredential(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteIntegrationCredential = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.deleteIntegrationCredential(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationTemplates = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createIntegrationFromTemplate = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.createIntegrationFromTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getIntegrationConnectionStats = async (req, res) => {
  try {
    const result = await enterpriseIntegrationService.getIntegrationConnectionStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 2 - Developer Platform
// ============================================================

export const createDeveloperApp = async (req, res) => {
  try {
    const result = await developerPlatformService.createDeveloperApp(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeveloperApps = async (req, res) => {
  try {
    const result = await developerPlatformService.getDeveloperApps(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeveloperApp = async (req, res) => {
  try {
    const result = await developerPlatformService.getDeveloperApp(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateDeveloperApp = async (req, res) => {
  try {
    const result = await developerPlatformService.updateDeveloperApp(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteDeveloperApp = async (req, res) => {
  try {
    const result = await developerPlatformService.deleteDeveloperApp(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const regenerateAppSecret = async (req, res) => {
  try {
    const result = await developerPlatformService.regenerateAppSecret(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createApiKey = async (req, res) => {
  try {
    const result = await developerPlatformService.createApiKey(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeveloperApiKeys = async (req, res) => {
  try {
    const result = await developerPlatformService.getDeveloperApiKeys(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const revokeApiKey = async (req, res) => {
  try {
    const result = await developerPlatformService.revokeApiKey(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWebhookEndpoints = async (req, res) => {
  try {
    const result = await developerPlatformService.getWebhookEndpoints(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWebhookEndpoint = async (req, res) => {
  try {
    const result = await developerPlatformService.createWebhookEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWebhookEndpoint = async (req, res) => {
  try {
    const result = await developerPlatformService.updateWebhookEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWebhookEndpoint = async (req, res) => {
  try {
    const result = await developerPlatformService.deleteWebhookEndpoint(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getApiUsageLogs = async (req, res) => {
  try {
    const result = await developerPlatformService.getApiUsageLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeveloperDashboard = async (req, res) => {
  try {
    const result = await developerPlatformService.getDeveloperDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 3 - Workflow Builder
// ============================================================

export const getWorkflowDefinitions = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.createWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.updateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.deleteWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.activateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deactivateWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.deactivateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const duplicateWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.duplicateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.executeWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowExecutions = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowExecutions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowExecution = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const cancelWorkflowExecution = async (req, res) => {
  try {
    const result = await workflowBuilderService.cancelWorkflowExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryWorkflowExecution = async (req, res) => {
  try {
    const result = await workflowBuilderService.retryWorkflowExecution(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowTriggers = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowTriggers(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWorkflowTrigger = async (req, res) => {
  try {
    const result = await workflowBuilderService.createWorkflowTrigger(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWorkflowTrigger = async (req, res) => {
  try {
    const result = await workflowBuilderService.updateWorkflowTrigger(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWorkflowTrigger = async (req, res) => {
  try {
    const result = await workflowBuilderService.deleteWorkflowTrigger(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowTemplates = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateWorkflowDefinition = async (req, res) => {
  try {
    const result = await workflowBuilderService.validateWorkflowDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkflowAnalytics = async (req, res) => {
  try {
    const result = await workflowBuilderService.getWorkflowAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 4 - Rules Engine
// ============================================================

export const getBusinessRules = async (req, res) => {
  try {
    const result = await rulesEngineService.getBusinessRules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.getBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.createBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.updateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.deleteBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.activateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deactivateBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.deactivateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.testBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const simulateBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.simulateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateBusinessRule = async (req, res) => {
  try {
    const result = await rulesEngineService.evaluateBusinessRule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateBusinessRules = async (req, res) => {
  try {
    const result = await rulesEngineService.evaluateBusinessRules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessRuleVersions = async (req, res) => {
  try {
    const result = await rulesEngineService.getBusinessRuleVersions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createRuleSet = async (req, res) => {
  try {
    const result = await rulesEngineService.createRuleSet(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRuleSets = async (req, res) => {
  try {
    const result = await rulesEngineService.getRuleSets(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRuleSet = async (req, res) => {
  try {
    const result = await rulesEngineService.getRuleSet(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateRuleSet = async (req, res) => {
  try {
    const result = await rulesEngineService.updateRuleSet(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteRuleSet = async (req, res) => {
  try {
    const result = await rulesEngineService.deleteRuleSet(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const evaluateRuleSet = async (req, res) => {
  try {
    const result = await rulesEngineService.evaluateRuleSet(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRuleExecutionLogs = async (req, res) => {
  try {
    const result = await rulesEngineService.getRuleExecutionLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRulesAnalytics = async (req, res) => {
  try {
    const result = await rulesEngineService.getRulesAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 5 - Forms Builder
// ============================================================

export const getFormDefinitions = async (req, res) => {
  try {
    const result = await formsBuilderService.getFormDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.getFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.createFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.updateFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.deleteFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const publishFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.publishFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const duplicateFormDefinition = async (req, res) => {
  try {
    const result = await formsBuilderService.duplicateFormDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFormSubmissions = async (req, res) => {
  try {
    const result = await formsBuilderService.getFormSubmissions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFormSubmission = async (req, res) => {
  try {
    const result = await formsBuilderService.getFormSubmission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createFormSubmission = async (req, res) => {
  try {
    const result = await formsBuilderService.createFormSubmission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateFormSubmission = async (req, res) => {
  try {
    const result = await formsBuilderService.updateFormSubmission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveFormSubmission = async (req, res) => {
  try {
    const result = await formsBuilderService.approveFormSubmission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rejectFormSubmission = async (req, res) => {
  try {
    const result = await formsBuilderService.rejectFormSubmission(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFormAnalytics = async (req, res) => {
  try {
    const result = await formsBuilderService.getFormAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const validateFormData = async (req, res) => {
  try {
    const result = await formsBuilderService.validateFormData(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 6 - Enterprise Documents
// ============================================================

export const getDocumentFolders = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getDocumentFolders(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDocumentFolder = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.createDocumentFolder(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateDocumentFolder = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.updateDocumentFolder(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteDocumentFolder = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.deleteDocumentFolder(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEnterpriseDocuments = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getEnterpriseDocuments(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEnterpriseDocument = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getEnterpriseDocument(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createEnterpriseDocument = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.createEnterpriseDocument(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateEnterpriseDocument = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.updateEnterpriseDocument(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteEnterpriseDocument = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.deleteEnterpriseDocument(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDocumentVersions = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getDocumentVersions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDocumentVersion = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.createDocumentVersion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDocumentTemplates = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getDocumentTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDocumentTemplate = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.createDocumentTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateDocumentFromTemplate = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.generateDocumentFromTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDocumentComments = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getDocumentComments(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addDocumentComment = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.addDocumentComment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resolveDocumentComment = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.resolveDocumentComment(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approveEnterpriseDocument = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.approveEnterpriseDocument(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDocumentsAnalytics = async (req, res) => {
  try {
    const result = await enterpriseDocumentsService.getDocumentsAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 7 - Global Marketplace
// ============================================================

export const getCountries = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getCountries(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCountry = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getCountry(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCountry = async (req, res) => {
  try {
    const result = await globalMarketplaceService.createCountry(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCountry = async (req, res) => {
  try {
    const result = await globalMarketplaceService.updateCountry(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteCountry = async (req, res) => {
  try {
    const result = await globalMarketplaceService.deleteCountry(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getRegions = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getRegions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createRegion = async (req, res) => {
  try {
    const result = await globalMarketplaceService.createRegion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateRegion = async (req, res) => {
  try {
    const result = await globalMarketplaceService.updateRegion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteRegion = async (req, res) => {
  try {
    const result = await globalMarketplaceService.deleteRegion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCurrencies = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getCurrencies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCurrency = async (req, res) => {
  try {
    const result = await globalMarketplaceService.createCurrency(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCurrency = async (req, res) => {
  try {
    const result = await globalMarketplaceService.updateCurrency(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTaxRegions = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getTaxRegions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTaxRegion = async (req, res) => {
  try {
    const result = await globalMarketplaceService.createTaxRegion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTaxRegion = async (req, res) => {
  try {
    const result = await globalMarketplaceService.updateTaxRegion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLocalizationSettings = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getLocalizationSettings(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const upsertLocalizationSettings = async (req, res) => {
  try {
    const result = await globalMarketplaceService.upsertLocalizationSettings(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getBusinessHours = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getBusinessHours(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getHolidays = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getHolidays(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createHolidayCalendar = async (req, res) => {
  try {
    const result = await globalMarketplaceService.createHolidayCalendar(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addHoliday = async (req, res) => {
  try {
    const result = await globalMarketplaceService.addHoliday(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMarketplaceRegions = async (req, res) => {
  try {
    const result = await globalMarketplaceService.getMarketplaceRegions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 8 - Multi Organization
// ============================================================

export const getOrganizations = async (req, res) => {
  try {
    const result = await multiOrganizationService.getOrganizations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOrganization = async (req, res) => {
  try {
    const result = await multiOrganizationService.getOrganization(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createOrganization = async (req, res) => {
  try {
    const result = await multiOrganizationService.createOrganization(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateOrganization = async (req, res) => {
  try {
    const result = await multiOrganizationService.updateOrganization(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOrganizationTree = async (req, res) => {
  try {
    const result = await multiOrganizationService.getOrganizationTree(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createOrgRelationship = async (req, res) => {
  try {
    const result = await multiOrganizationService.createOrgRelationship(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOrgRelationships = async (req, res) => {
  try {
    const result = await multiOrganizationService.getOrgRelationships(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateOrgRelationship = async (req, res) => {
  try {
    const result = await multiOrganizationService.updateOrgRelationship(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const terminateOrgRelationship = async (req, res) => {
  try {
    const result = await multiOrganizationService.terminateOrgRelationship(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWorkspaces = async (req, res) => {
  try {
    const result = await multiOrganizationService.getWorkspaces(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createWorkspace = async (req, res) => {
  try {
    const result = await multiOrganizationService.createWorkspace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateWorkspace = async (req, res) => {
  try {
    const result = await multiOrganizationService.updateWorkspace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const result = await multiOrganizationService.deleteWorkspace(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addWorkspaceMember = async (req, res) => {
  try {
    const result = await multiOrganizationService.addWorkspaceMember(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeWorkspaceMember = async (req, res) => {
  try {
    const result = await multiOrganizationService.removeWorkspaceMember(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPartnerNetwork = async (req, res) => {
  try {
    const result = await multiOrganizationService.getPartnerNetwork(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addPartner = async (req, res) => {
  try {
    const result = await multiOrganizationService.addPartner(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removePartner = async (req, res) => {
  try {
    const result = await multiOrganizationService.removePartner(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSharedProjects = async (req, res) => {
  try {
    const result = await multiOrganizationService.getSharedProjects(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createSharedProject = async (req, res) => {
  try {
    const result = await multiOrganizationService.createSharedProject(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const shareProjectItem = async (req, res) => {
  try {
    const result = await multiOrganizationService.shareProjectItem(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getOrganizationsAnalytics = async (req, res) => {
  try {
    const result = await multiOrganizationService.getOrganizationsAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 9 - Communication Center
// ============================================================

export const getMessageChannels = async (req, res) => {
  try {
    const result = await communicationCenterService.getMessageChannels(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createMessageChannel = async (req, res) => {
  try {
    const result = await communicationCenterService.createMessageChannel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMessageChannel = async (req, res) => {
  try {
    const result = await communicationCenterService.getMessageChannel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateMessageChannel = async (req, res) => {
  try {
    const result = await communicationCenterService.updateMessageChannel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteMessageChannel = async (req, res) => {
  try {
    const result = await communicationCenterService.deleteMessageChannel(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addChannelMember = async (req, res) => {
  try {
    const result = await communicationCenterService.addChannelMember(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeChannelMember = async (req, res) => {
  try {
    const result = await communicationCenterService.removeChannelMember(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMessageThreads = async (req, res) => {
  try {
    const result = await communicationCenterService.getMessageThreads(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createMessageThread = async (req, res) => {
  try {
    const result = await communicationCenterService.createMessageThread(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const result = await communicationCenterService.getMessages(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const result = await communicationCenterService.sendMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const editMessage = async (req, res) => {
  try {
    const result = await communicationCenterService.editMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const result = await communicationCenterService.deleteMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const addMessageReaction = async (req, res) => {
  try {
    const result = await communicationCenterService.addMessageReaction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeMessageReaction = async (req, res) => {
  try {
    const result = await communicationCenterService.removeMessageReaction(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const result = await communicationCenterService.pinMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unpinMessage = async (req, res) => {
  try {
    const result = await communicationCenterService.unpinMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getActivityFeed = async (req, res) => {
  try {
    const result = await communicationCenterService.getActivityFeed(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createActivityEvent = async (req, res) => {
  try {
    const result = await communicationCenterService.createActivityEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const markChannelRead = async (req, res) => {
  try {
    const result = await communicationCenterService.markChannelRead(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const result = await communicationCenterService.getUnreadCount(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchMessages = async (req, res) => {
  try {
    const result = await communicationCenterService.searchMessages(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 10 - Knowledge Platform
// ============================================================

export const getKnowledgeArticles = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getKnowledgeArticles(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeArticle = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getKnowledgeArticle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createKnowledgeArticle = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createKnowledgeArticle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateKnowledgeArticle = async (req, res) => {
  try {
    const result = await knowledgePlatformService.updateKnowledgeArticle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteKnowledgeArticle = async (req, res) => {
  try {
    const result = await knowledgePlatformService.deleteKnowledgeArticle(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const markArticleHelpful = async (req, res) => {
  try {
    const result = await knowledgePlatformService.markArticleHelpful(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeCategories = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getKnowledgeCategories(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createKnowledgeCategory = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createKnowledgeCategory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateKnowledgeCategory = async (req, res) => {
  try {
    const result = await knowledgePlatformService.updateKnowledgeCategory(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeVideos = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getKnowledgeVideos(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createKnowledgeVideo = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createKnowledgeVideo(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTrainingModules = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getTrainingModules(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTrainingModule = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createTrainingModule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTrainingModule = async (req, res) => {
  try {
    const result = await knowledgePlatformService.updateTrainingModule(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getLearningPaths = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getLearningPaths(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createLearningPath = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createLearningPath(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const enrollInTraining = async (req, res) => {
  try {
    const result = await knowledgePlatformService.enrollInTraining(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTrainingProgress = async (req, res) => {
  try {
    const result = await knowledgePlatformService.updateTrainingProgress(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getCertifications = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getCertifications(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createCertification = async (req, res) => {
  try {
    const result = await knowledgePlatformService.createCertification(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const issueCertificate = async (req, res) => {
  try {
    const result = await knowledgePlatformService.issueCertificate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUserEnrollments = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getUserEnrollments(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getKnowledgeAnalytics = async (req, res) => {
  try {
    const result = await knowledgePlatformService.getKnowledgeAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const searchKnowledge = async (req, res) => {
  try {
    const result = await knowledgePlatformService.searchKnowledge(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 11 - AI Integration Platform
// ============================================================

export const getAiProviders = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.getAiProviders(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createAiProvider = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.createAiProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateAiProvider = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.updateAiProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteAiProvider = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.deleteAiProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const setDefaultAiProvider = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.setDefaultAiProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const testAiProviderConnection = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.testAiProviderConnection(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiProviderConfigs = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.getAiProviderConfigs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createAiProviderConfig = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.createAiProviderConfig(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateAiProviderConfig = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.updateAiProviderConfig(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteAiProviderConfig = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.deleteAiProviderConfig(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiPromptTemplates = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.getAiPromptTemplates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createAiPromptTemplate = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.createAiPromptTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateAiPromptTemplate = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.updateAiPromptTemplate(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const executeAiPrompt = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.executeAiPrompt(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const switchAiProvider = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.switchAiProvider(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiUsageLogs = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.getAiUsageLogs(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getAiAnalytics = async (req, res) => {
  try {
    const result = await aiIntegrationPlatformService.getAiAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 12 - Event Bus
// ============================================================

export const publishEvent = async (req, res) => {
  try {
    const result = await eventBusService.publishEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const subscribeToEvent = async (req, res) => {
  try {
    const result = await eventBusService.subscribeToEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEventSubscriptions = async (req, res) => {
  try {
    const result = await eventBusService.getEventSubscriptions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateEventSubscription = async (req, res) => {
  try {
    const result = await eventBusService.updateEventSubscription(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unsubscribeFromEvent = async (req, res) => {
  try {
    const result = await eventBusService.unsubscribeFromEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const result = await eventBusService.getEvents(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEvent = async (req, res) => {
  try {
    const result = await eventBusService.getEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const replayEvent = async (req, res) => {
  try {
    const result = await eventBusService.replayEvent(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDeadLetterQueue = async (req, res) => {
  try {
    const result = await eventBusService.getDeadLetterQueue(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const retryDeadLetterMessage = async (req, res) => {
  try {
    const result = await eventBusService.retryDeadLetterMessage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getEventBusStats = async (req, res) => {
  try {
    const result = await eventBusService.getEventBusStats(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 13 - Plugin Marketplace
// ============================================================

export const getPlugins = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPlugins(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createPlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.createPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updatePlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.updatePlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const approvePlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.approvePlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const rejectPlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.rejectPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPluginInstallations = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPluginInstallations(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const installPlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.installPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const enablePlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.enablePlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const disablePlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.disablePlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const uninstallPlugin = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.uninstallPlugin(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPluginUpdates = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPluginUpdates(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updatePluginVersion = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.updatePluginVersion(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPluginDependencies = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPluginDependencies(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getMarketplaceListings = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getMarketplaceListings(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createMarketplaceListing = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.createMarketplaceListing(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPluginAnalytics = async (req, res) => {
  try {
    const result = await pluginMarketplaceService.getPluginAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 14 - Reporting Studio
// ============================================================

export const getReportDefinitions = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportDefinitions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportDefinition = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createReportDefinition = async (req, res) => {
  try {
    const result = await reportingStudioService.createReportDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateReportDefinition = async (req, res) => {
  try {
    const result = await reportingStudioService.updateReportDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteReportDefinition = async (req, res) => {
  try {
    const result = await reportingStudioService.deleteReportDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const duplicateReportDefinition = async (req, res) => {
  try {
    const result = await reportingStudioService.duplicateReportDefinition(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const generateEnterpriseReport = async (req, res) => {
  try {
    const result = await reportingStudioService.generateEnterpriseReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportExecutions = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportExecutions(req.user?._id, req.params, req.query, req.body);
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

export const exportEnterpriseReport = async (req, res) => {
  try {
    const result = await reportingStudioService.exportEnterpriseReport(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDashboards = async (req, res) => {
  try {
    const result = await reportingStudioService.getDashboards(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createDashboard = async (req, res) => {
  try {
    const result = await reportingStudioService.createDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateDashboard = async (req, res) => {
  try {
    const result = await reportingStudioService.updateDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const deleteDashboard = async (req, res) => {
  try {
    const result = await reportingStudioService.deleteDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getDashboardById = async (req, res) => {
  try {
    const result = await reportingStudioService.getDashboardById(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const shareDashboard = async (req, res) => {
  try {
    const result = await reportingStudioService.shareDashboard(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getReportAnalytics = async (req, res) => {
  try {
    const result = await reportingStudioService.getReportAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 15 - Mobile Support
// ============================================================

export const createSyncSession = async (req, res) => {
  try {
    const result = await mobileSupportService.createSyncSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSyncSessions = async (req, res) => {
  try {
    const result = await mobileSupportService.getSyncSessions(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const revokeSyncSession = async (req, res) => {
  try {
    const result = await mobileSupportService.revokeSyncSession(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const registerPushToken = async (req, res) => {
  try {
    const result = await mobileSupportService.registerPushToken(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const unregisterPushToken = async (req, res) => {
  try {
    const result = await mobileSupportService.unregisterPushToken(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPushTokens = async (req, res) => {
  try {
    const result = await mobileSupportService.getPushTokens(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getChangesSince = async (req, res) => {
  try {
    const result = await mobileSupportService.getChangesSince(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const applyOfflineChanges = async (req, res) => {
  try {
    const result = await mobileSupportService.applyOfflineChanges(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const resolveSyncConflict = async (req, res) => {
  try {
    const result = await mobileSupportService.resolveSyncConflict(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSyncConflicts = async (req, res) => {
  try {
    const result = await mobileSupportService.getSyncConflicts(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSyncAnalytics = async (req, res) => {
  try {
    const result = await mobileSupportService.getSyncAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const sendPushNotification = async (req, res) => {
  try {
    const result = await mobileSupportService.sendPushNotification(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 16 - SaaS Foundation
// ============================================================

export const getTenants = async (req, res) => {
  try {
    const result = await saasFoundationService.getTenants(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenant = async (req, res) => {
  try {
    const result = await saasFoundationService.getTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createTenant = async (req, res) => {
  try {
    const result = await saasFoundationService.createTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateTenant = async (req, res) => {
  try {
    const result = await saasFoundationService.updateTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const suspendTenant = async (req, res) => {
  try {
    const result = await saasFoundationService.suspendTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const activateTenant = async (req, res) => {
  try {
    const result = await saasFoundationService.activateTenant(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getFeaturePackages = async (req, res) => {
  try {
    const result = await saasFoundationService.getFeaturePackages(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const createFeaturePackage = async (req, res) => {
  try {
    const result = await saasFoundationService.createFeaturePackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateFeaturePackage = async (req, res) => {
  try {
    const result = await saasFoundationService.updateFeaturePackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const assignFeaturePackage = async (req, res) => {
  try {
    const result = await saasFoundationService.assignFeaturePackage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getUsageQuota = async (req, res) => {
  try {
    const result = await saasFoundationService.getUsageQuota(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const trackUsage = async (req, res) => {
  try {
    const result = await saasFoundationService.trackUsage(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const checkQuota = async (req, res) => {
  try {
    const result = await saasFoundationService.checkQuota(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getWhiteLabelConfig = async (req, res) => {
  try {
    const result = await saasFoundationService.getWhiteLabelConfig(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const upsertWhiteLabelConfig = async (req, res) => {
  try {
    const result = await saasFoundationService.upsertWhiteLabelConfig(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenantByDomain = async (req, res) => {
  try {
    const result = await saasFoundationService.getTenantByDomain(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getTenantAnalytics = async (req, res) => {
  try {
    const result = await saasFoundationService.getTenantAnalytics(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPlatformOverview = async (req, res) => {
  try {
    const result = await saasFoundationService.getPlatformOverview(req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
