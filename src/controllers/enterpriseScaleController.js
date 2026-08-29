import { performanceEngineeringService } from '../services/performanceEngineeringService.js';
import { distributedProcessingService } from '../services/distributedProcessingService.js';
import { scalingManagerService } from '../services/scalingManagerService.js';
import { multiRegionService } from '../services/multiRegionService.js';
import { databaseOptimizationService } from '../services/databaseOptimizationService.js';
import { enterpriseCacheOptimizationService } from '../services/enterpriseCacheOptimizationService.js';
import { reliabilityEngineeringService } from '../services/reliabilityEngineeringService.js';
import { chaosEngineeringService } from '../services/chaosEngineeringService.js';
import { advancedObservabilityService } from '../services/advancedObservabilityService.js';
import { costOptimizationService } from '../services/costOptimizationService.js';
import { benchmarkService } from '../services/benchmarkService.js';
import { releaseEngineeringService } from '../services/releaseEngineeringService.js';
import { globalComplianceInfrastructureService } from '../services/globalComplianceInfrastructureService.js';
import { reliabilityDashboardService } from '../services/reliabilityDashboardService.js';
import { productionOperationsService } from '../services/productionOperationsService.js';
import { productionCertificationService } from '../services/productionCertificationService.js';

const handler = (service, method) => async (req, res) => {
  try {
    const result = await service[method](req.user?._id, req.params, req.query, req.body);
    res.json({ status: true, data: result });
  } catch (err) {
    res.status(err.message.includes('not found') ? 404 : 500).json({ status: false, message: err.message });
  }
};

// ============================================================
// Part 1 - Performance Engineering
// ============================================================

export const recordProfile = handler(performanceEngineeringService, 'recordProfile');
export const detectSlowQueries = handler(performanceEngineeringService, 'detectSlowQueries');
export const analyzeQuery_eng = handler(performanceEngineeringService, 'analyzeQuery');
export const createBudget = handler(performanceEngineeringService, 'createBudget');
export const updateBudget = handler(performanceEngineeringService, 'updateBudget');
export const listBudgets = handler(performanceEngineeringService, 'listBudgets');
export const validateBudget = handler(performanceEngineeringService, 'validateBudget');
export const generateSnapshot = handler(performanceEngineeringService, 'generateSnapshot');
export const getSnapshots = handler(performanceEngineeringService, 'getSnapshots');
export const getSnapshot = handler(performanceEngineeringService, 'getSnapshot');
export const getPerformanceTrend = handler(performanceEngineeringService, 'getPerformanceTrend');
export const compareSnapshots = handler(performanceEngineeringService, 'compareSnapshots');
export const generateOptimizationRecommendations = handler(performanceEngineeringService, 'generateOptimizationRecommendations');
export const getProfileSummary = handler(performanceEngineeringService, 'getProfileSummary');
export const getSlowQueries = handler(performanceEngineeringService, 'getSlowQueries');
export const getQueryRecommendations = handler(performanceEngineeringService, 'getQueryRecommendations');

// ============================================================
// Part 2 - Distributed Processing
// ============================================================

export const registerWorker = handler(distributedProcessingService, 'registerWorker');
export const getWorker = handler(distributedProcessingService, 'getWorker');
export const listWorkers = handler(distributedProcessingService, 'listWorkers');
export const updateWorkerStatus = handler(distributedProcessingService, 'updateWorkerStatus');
export const createQueue = handler(distributedProcessingService, 'createQueue');
export const getQueue = handler(distributedProcessingService, 'getQueue');
export const listQueues = handler(distributedProcessingService, 'listQueues');
export const updateQueueStatus = handler(distributedProcessingService, 'updateQueueStatus');
export const enqueueJob = handler(distributedProcessingService, 'enqueueJob');
export const dequeueJob = handler(distributedProcessingService, 'dequeueJob');
export const completeJob = handler(distributedProcessingService, 'completeJob');
export const failJob = handler(distributedProcessingService, 'failJob');
export const retryJob = handler(distributedProcessingService, 'retryJob');
export const getQueueMetrics_dist = handler(distributedProcessingService, 'getQueueMetrics');
export const getWorkerLoad = handler(distributedProcessingService, 'getWorkerLoad');
export const rebalanceQueues = handler(distributedProcessingService, 'rebalanceQueues');
export const processDeadLetterQueue = handler(distributedProcessingService, 'processDeadLetterQueue');
export const getJobHistory = handler(distributedProcessingService, 'getJobHistory');

// ============================================================
// Part 3 - Scaling Manager
// ============================================================

export const createPolicy_scale = handler(scalingManagerService, 'createPolicy');
export const updatePolicy_scale = handler(scalingManagerService, 'updatePolicy');
export const getPolicy = handler(scalingManagerService, 'getPolicy');
export const listPolicies = handler(scalingManagerService, 'listPolicies');
export const deletePolicy = handler(scalingManagerService, 'deletePolicy');
export const simulateScaling = handler(scalingManagerService, 'simulateScaling');
export const recordScalingEvent = handler(scalingManagerService, 'recordScalingEvent');
export const getScalingHistory = handler(scalingManagerService, 'getScalingHistory');
export const getResourceGroups = handler(scalingManagerService, 'getResourceGroups');
export const getResourceGroup = handler(scalingManagerService, 'getResourceGroup');
export const updateResourceUtilization = handler(scalingManagerService, 'updateResourceUtilization');
export const getScalingRecommendations = handler(scalingManagerService, 'getScalingRecommendations');
export const forecastResources = handler(scalingManagerService, 'forecastResources');
export const evaluatePolicy = handler(scalingManagerService, 'evaluatePolicy');
export const getScaleUpRecommendations = handler(scalingManagerService, 'getScaleUpRecommendations');
export const getScaleDownRecommendations = handler(scalingManagerService, 'getScaleDownRecommendations');
export const markAsSimulation_scale = handler(scalingManagerService, 'markAsSimulation');

// ============================================================
// Part 4 - Multi-Region
// ============================================================

export const createRegion = handler(multiRegionService, 'createRegion');
export const updateRegion = handler(multiRegionService, 'updateRegion');
export const getRegion = handler(multiRegionService, 'getRegion');
export const listRegions = handler(multiRegionService, 'listRegions');
export const deleteRegion = handler(multiRegionService, 'deleteRegion');
export const setPreferredRegion = handler(multiRegionService, 'setPreferredRegion');
export const createPolicy_region = handler(multiRegionService, 'createPolicy');
export const updatePolicy_region = handler(multiRegionService, 'updatePolicy');
export const getPolicies = handler(multiRegionService, 'getPolicies');
export const createReplication = handler(multiRegionService, 'createReplication');
export const updateReplication = handler(multiRegionService, 'updateReplication');
export const getReplications = handler(multiRegionService, 'getReplications');
export const getRegionTopology = handler(multiRegionService, 'getRegionTopology');
export const getFailoverPlan = handler(multiRegionService, 'getFailoverPlan');
export const validateDataResidency_region = handler(multiRegionService, 'validateDataResidency');
export const getLatencyProfile = handler(multiRegionService, 'getLatencyProfile');
export const getPreferredRegion = handler(multiRegionService, 'getPreferredRegion');

// ============================================================
// Part 5 - Database Optimization
// ============================================================

export const analyzeIndex = handler(databaseOptimizationService, 'analyzeIndex');
export const detectMissingIndexes = handler(databaseOptimizationService, 'detectMissingIndexes');
export const detectDuplicateIndexes = handler(databaseOptimizationService, 'detectDuplicateIndexes');
export const getIndexRecommendations = handler(databaseOptimizationService, 'getIndexRecommendations');
export const createIndex = handler(databaseOptimizationService, 'createIndex');
export const updateIndex = handler(databaseOptimizationService, 'updateIndex');
export const listIndexes = handler(databaseOptimizationService, 'listIndexes');
export const recordQueryExecution = handler(databaseOptimizationService, 'recordQueryExecution');
export const analyzeQuery_db = handler(databaseOptimizationService, 'analyzeQuery');
export const getSlowestQueries = handler(databaseOptimizationService, 'getSlowestQueries');
export const getCollectionStatistics = handler(databaseOptimizationService, 'getCollectionStatistics');
export const updateCollectionStats = handler(databaseOptimizationService, 'updateCollectionStats');
export const forecastCollectionGrowth = handler(databaseOptimizationService, 'forecastCollectionGrowth');
export const getStorageRecommendations = handler(databaseOptimizationService, 'getStorageRecommendations');
export const getQueryCostEstimate = handler(databaseOptimizationService, 'getQueryCostEstimate');
export const generateOptimizationReport = handler(databaseOptimizationService, 'generateOptimizationReport');

// ============================================================
// Part 6 - Enterprise Cache Optimization
// ============================================================

export const createPartition = handler(enterpriseCacheOptimizationService, 'createPartition');
export const updatePartition = handler(enterpriseCacheOptimizationService, 'updatePartition');
export const getPartition = handler(enterpriseCacheOptimizationService, 'getPartition');
export const listPartitions = handler(enterpriseCacheOptimizationService, 'listPartitions');
export const createPolicy_cache = handler(enterpriseCacheOptimizationService, 'createPolicy');
export const updatePolicy_cache = handler(enterpriseCacheOptimizationService, 'updatePolicy');
export const listPolicies_cache = handler(enterpriseCacheOptimizationService, 'listPolicies');
export const createWarmup = handler(enterpriseCacheOptimizationService, 'createWarmup');
export const updateWarmup = handler(enterpriseCacheOptimizationService, 'updateWarmup');
export const listWarmups = handler(enterpriseCacheOptimizationService, 'listWarmups');
export const runWarmup = handler(enterpriseCacheOptimizationService, 'runWarmup');
export const getWarmupStatus = handler(enterpriseCacheOptimizationService, 'getWarmupStatus');
export const analyzeHitRatio = handler(enterpriseCacheOptimizationService, 'analyzeHitRatio');
export const optimizeEvictionPolicy = handler(enterpriseCacheOptimizationService, 'optimizeEvictionPolicy');
export const getDependencyGraph_cache = handler(enterpriseCacheOptimizationService, 'getDependencyGraph');
export const generateCacheRecommendations = handler(enterpriseCacheOptimizationService, 'generateCacheRecommendations');
export const getCacheHealth = handler(enterpriseCacheOptimizationService, 'getCacheHealth');
export const simulateTagInvalidation = handler(enterpriseCacheOptimizationService, 'simulateTagInvalidation');

// ============================================================
// Part 7 - Reliability Engineering
// ============================================================

export const createCircuitBreaker = handler(reliabilityEngineeringService, 'createCircuitBreaker');
export const getCircuitBreaker = handler(reliabilityEngineeringService, 'getCircuitBreaker');
export const listCircuitBreakers = handler(reliabilityEngineeringService, 'listCircuitBreakers');
export const updateCircuitBreakerState = handler(reliabilityEngineeringService, 'updateCircuitBreakerState');
export const recordFailure = handler(reliabilityEngineeringService, 'recordFailure');
export const recordSuccess = handler(reliabilityEngineeringService, 'recordSuccess');
export const createRetryPolicy = handler(reliabilityEngineeringService, 'createRetryPolicy');
export const updateRetryPolicy = handler(reliabilityEngineeringService, 'updateRetryPolicy');
export const listRetryPolicies = handler(reliabilityEngineeringService, 'listRetryPolicies');
export const calculateRetryDelay = handler(reliabilityEngineeringService, 'calculateRetryDelay');
export const createBulkheadPolicy = handler(reliabilityEngineeringService, 'createBulkheadPolicy');
export const updateBulkheadPolicy = handler(reliabilityEngineeringService, 'updateBulkheadPolicy');
export const listBulkheadPolicies = handler(reliabilityEngineeringService, 'listBulkheadPolicies');
export const checkBulkheadCapacity = handler(reliabilityEngineeringService, 'checkBulkheadCapacity');
export const recordReliabilityIncident = handler(reliabilityEngineeringService, 'recordReliabilityIncident');
export const updateIncident = handler(reliabilityEngineeringService, 'updateIncident');
export const getIncident = handler(reliabilityEngineeringService, 'getIncident');
export const listIncidents = handler(reliabilityEngineeringService, 'listIncidents');
export const calculateSLA = handler(reliabilityEngineeringService, 'calculateSLA');
export const getReliabilityScore = handler(reliabilityEngineeringService, 'getReliabilityScore');
export const generateReliabilityReport = handler(reliabilityEngineeringService, 'generateReliabilityReport');

// ============================================================
// Part 8 - Chaos Engineering
// ============================================================

export const createExperiment = handler(chaosEngineeringService, 'createExperiment');
export const updateExperiment = handler(chaosEngineeringService, 'updateExperiment');
export const getExperiment = handler(chaosEngineeringService, 'getExperiment');
export const listExperiments = handler(chaosEngineeringService, 'listExperiments');
export const deleteExperiment = handler(chaosEngineeringService, 'deleteExperiment');
export const runExperiment = handler(chaosEngineeringService, 'runExperiment');
export const stopExperiment = handler(chaosEngineeringService, 'stopExperiment');
export const getExperimentStatus = handler(chaosEngineeringService, 'getExperimentStatus');
export const createFailureScenario = handler(chaosEngineeringService, 'createFailureScenario');
export const simulateDatabaseFailure = handler(chaosEngineeringService, 'simulateDatabaseFailure');
export const simulateCacheFailure = handler(chaosEngineeringService, 'simulateCacheFailure');
export const simulateNetworkLatency = handler(chaosEngineeringService, 'simulateNetworkLatency');
export const simulateServiceDegradation = handler(chaosEngineeringService, 'simulateServiceDegradation');
export const simulateWorkerOutage = handler(chaosEngineeringService, 'simulateWorkerOutage');
export const simulateResourceExhaustion = handler(chaosEngineeringService, 'simulateResourceExhaustion');
export const getFailureImpactAnalysis = handler(chaosEngineeringService, 'getFailureImpactAnalysis');
export const getExperimentHistory = handler(chaosEngineeringService, 'getExperimentHistory');
export const generateChaosReport = handler(chaosEngineeringService, 'generateChaosReport');
export const validateExperiment = handler(chaosEngineeringService, 'validateExperiment');

// ============================================================
// Part 9 - Advanced Observability
// ============================================================

export const buildDependencyGraph = handler(advancedObservabilityService, 'buildDependencyGraph');
export const getDependencyGraph_obs = handler(advancedObservabilityService, 'getDependencyGraph');
export const getCurrentTopology = handler(advancedObservabilityService, 'getCurrentTopology');
export const getServiceTopology = handler(advancedObservabilityService, 'getServiceTopology');
export const updateServiceStatus = handler(advancedObservabilityService, 'updateServiceStatus');
export const recordDependencyCheck = handler(advancedObservabilityService, 'recordDependencyCheck');
export const getServiceDependents = handler(advancedObservabilityService, 'getServiceDependents');
export const identifyErrorPropagation = handler(advancedObservabilityService, 'identifyErrorPropagation');
export const performRootCauseAnalysis = handler(advancedObservabilityService, 'performRootCauseAnalysis');
export const getRootCauseAnalysis = handler(advancedObservabilityService, 'getRootCauseAnalysis');
export const listRootCauseAnalyses = handler(advancedObservabilityService, 'listRootCauseAnalyses');
export const getCallGraph = handler(advancedObservabilityService, 'getCallGraph');
export const getServiceImpactAnalysis = handler(advancedObservabilityService, 'getServiceImpactAnalysis');
export const getSLADashboard = handler(advancedObservabilityService, 'getSLADashboard');
export const getDependencyHealth = handler(advancedObservabilityService, 'getDependencyHealth');
export const generateObservabilityReport = handler(advancedObservabilityService, 'generateObservabilityReport');
export const correlateMetrics = handler(advancedObservabilityService, 'correlateMetrics');
export const getServiceMap = handler(advancedObservabilityService, 'getServiceMap');

// ============================================================
// Part 10 - Cost Optimization
// ============================================================

export const recordResourceCost = handler(costOptimizationService, 'recordResourceCost');
export const updateResourceCost = handler(costOptimizationService, 'updateResourceCost');
export const getResourceCost = handler(costOptimizationService, 'getResourceCost');
export const listResourceCosts = handler(costOptimizationService, 'listResourceCosts');
export const getCostBreakdown = handler(costOptimizationService, 'getCostBreakdown');
export const getCostTrend = handler(costOptimizationService, 'getCostTrend');
export const forecastCost = handler(costOptimizationService, 'forecastCost');
export const createCostRecommendation = handler(costOptimizationService, 'createCostRecommendation');
export const updateCostRecommendation = handler(costOptimizationService, 'updateCostRecommendation');
export const listCostRecommendations = handler(costOptimizationService, 'listCostRecommendations');
export const approveRecommendation = handler(costOptimizationService, 'approveRecommendation');
export const implementRecommendation = handler(costOptimizationService, 'implementRecommendation');
export const dismissRecommendation = handler(costOptimizationService, 'dismissRecommendation');
export const createResourceOptimization = handler(costOptimizationService, 'createResourceOptimization');
export const updateResourceOptimization = handler(costOptimizationService, 'updateResourceOptimization');
export const listResourceOptimizations = handler(costOptimizationService, 'listResourceOptimizations');
export const calculatePotentialSavings = handler(costOptimizationService, 'calculatePotentialSavings');
export const generateCostReport = handler(costOptimizationService, 'generateCostReport');
export const getWasteAnalysis = handler(costOptimizationService, 'getWasteAnalysis');
export const getEfficiencyScore = handler(costOptimizationService, 'getEfficiencyScore');

// ============================================================
// Part 11 - Benchmark Service
// ============================================================

export const createScenario = handler(benchmarkService, 'createScenario');
export const updateScenario = handler(benchmarkService, 'updateScenario');
export const getScenario = handler(benchmarkService, 'getScenario');
export const listScenarios = handler(benchmarkService, 'listScenarios');
export const deleteScenario = handler(benchmarkService, 'deleteScenario');
export const runBenchmark = handler(benchmarkService, 'runBenchmark');
export const getBenchmarkExecution = handler(benchmarkService, 'getExecution');
export const listBenchmarkExecutions = handler(benchmarkService, 'listExecutions');
export const compareExecutions = handler(benchmarkService, 'compareExecutions');
export const getBenchmarkResults = handler(benchmarkService, 'getBenchmarkResults');
export const generateBenchmarkReport = handler(benchmarkService, 'generateBenchmarkReport');
export const getLatestResults = handler(benchmarkService, 'getLatestResults');
export const getTrend = handler(benchmarkService, 'getTrend');
export const markAsSimulation_bench = handler(benchmarkService, 'markAsSimulation');

// ============================================================
// Part 12 - Release Engineering
// ============================================================

export const createStrategy = handler(releaseEngineeringService, 'createStrategy');
export const updateStrategy = handler(releaseEngineeringService, 'updateStrategy');
export const getStrategy = handler(releaseEngineeringService, 'getStrategy');
export const listStrategies = handler(releaseEngineeringService, 'listStrategies');
export const createPipeline = handler(releaseEngineeringService, 'createPipeline');
export const updatePipeline = handler(releaseEngineeringService, 'updatePipeline');
export const getPipeline = handler(releaseEngineeringService, 'getPipeline');
export const listPipelines = handler(releaseEngineeringService, 'listPipelines');
export const createRolloutPolicy = handler(releaseEngineeringService, 'createRolloutPolicy');
export const updateRolloutPolicy = handler(releaseEngineeringService, 'updateRolloutPolicy');
export const getRolloutPolicy = handler(releaseEngineeringService, 'getRolloutPolicy');
export const listRolloutPolicies = handler(releaseEngineeringService, 'listRolloutPolicies');
export const planDeployment = handler(releaseEngineeringService, 'planDeployment');
export const simulateCanaryDeployment = handler(releaseEngineeringService, 'simulateCanaryDeployment');
export const simulateBlueGreenDeployment = handler(releaseEngineeringService, 'simulateBlueGreenDeployment');
export const simulateProgressiveRollout = handler(releaseEngineeringService, 'simulateProgressiveRollout');
export const validateRelease = handler(releaseEngineeringService, 'validateRelease');
export const generateDeploymentPlan = handler(releaseEngineeringService, 'generateDeploymentPlan');
export const getRollbackPlan = handler(releaseEngineeringService, 'getRollbackPlan');
export const approveDeployment = handler(releaseEngineeringService, 'approveDeployment');
export const getAllPipelines = handler(releaseEngineeringService, 'getAllPipelines');

// ============================================================
// Part 13 - Global Compliance Infrastructure
// ============================================================

export const createComplianceProfile = handler(globalComplianceInfrastructureService, 'createComplianceProfile');
export const updateComplianceProfile = handler(globalComplianceInfrastructureService, 'updateComplianceProfile');
export const getComplianceProfile = handler(globalComplianceInfrastructureService, 'getComplianceProfile');
export const listComplianceProfiles = handler(globalComplianceInfrastructureService, 'listComplianceProfiles');
export const validateCompliance = handler(globalComplianceInfrastructureService, 'validateCompliance');
export const createRetentionPolicy = handler(globalComplianceInfrastructureService, 'createRetentionPolicy');
export const updateRetentionPolicy = handler(globalComplianceInfrastructureService, 'updateRetentionPolicy');
export const getRetentionPolicy = handler(globalComplianceInfrastructureService, 'getRetentionPolicy');
export const listRetentionPolicies = handler(globalComplianceInfrastructureService, 'listRetentionPolicies');
export const createDataResidencyRule = handler(globalComplianceInfrastructureService, 'createDataResidencyRule');
export const updateDataResidencyRule = handler(globalComplianceInfrastructureService, 'updateDataResidencyRule');
export const getDataResidencyRule = handler(globalComplianceInfrastructureService, 'getDataResidencyRule');
export const listDataResidencyRules = handler(globalComplianceInfrastructureService, 'listDataResidencyRules');
export const validateDataResidency_comp = handler(globalComplianceInfrastructureService, 'validateDataResidency');
export const getComplianceSummary_comp = handler(globalComplianceInfrastructureService, 'getComplianceSummary');
export const getDataClassification = handler(globalComplianceInfrastructureService, 'getDataClassification');
export const generateComplianceReport = handler(globalComplianceInfrastructureService, 'generateComplianceReport');
export const checkRetentionCompliance = handler(globalComplianceInfrastructureService, 'checkRetentionCompliance');

// ============================================================
// Part 14 - Reliability Dashboard
// ============================================================

export const getAvailabilityMetrics = handler(reliabilityDashboardService, 'getAvailabilityMetrics');
export const getSLAMetrics = handler(reliabilityDashboardService, 'getSLAMetrics');
export const getErrorRates = handler(reliabilityDashboardService, 'getErrorRates');
export const getRecoveryMetrics = handler(reliabilityDashboardService, 'getRecoveryMetrics');
export const getCapacityMetrics = handler(reliabilityDashboardService, 'getCapacityMetrics');
export const getPerformanceMetrics = handler(reliabilityDashboardService, 'getPerformanceMetrics');
export const getScalingMetrics = handler(reliabilityDashboardService, 'getScalingMetrics');
export const getCacheMetrics = handler(reliabilityDashboardService, 'getCacheMetrics');
export const getDatabaseMetrics = handler(reliabilityDashboardService, 'getDatabaseMetrics');
export const getQueueMetrics_dash = handler(reliabilityDashboardService, 'getQueueMetrics');
export const getCostMetrics = handler(reliabilityDashboardService, 'getCostMetrics');
export const getComplianceMetrics = handler(reliabilityDashboardService, 'getComplianceMetrics');
export const generateExecutiveDashboard = handler(reliabilityDashboardService, 'generateExecutiveDashboard');
export const getReliabilityTrend = handler(reliabilityDashboardService, 'getReliabilityTrend');
export const getTopIncidents = handler(reliabilityDashboardService, 'getTopIncidents');
export const getImprovementMetrics = handler(reliabilityDashboardService, 'getImprovementMetrics');
export const generateDashboardReport = handler(reliabilityDashboardService, 'generateDashboardReport');

// ============================================================
// Part 15 - Production Operations
// ============================================================

export const getProductionOverview = handler(productionOperationsService, 'getProductionOverview');
export const getActiveIncidents = handler(productionOperationsService, 'getActiveIncidents');
export const getResourceUsage = handler(productionOperationsService, 'getResourceUsage');
export const runScalingSimulation = handler(productionOperationsService, 'runScalingSimulation');
export const getQueueMonitoring = handler(productionOperationsService, 'getQueueMonitoring');
export const getHealthOverview = handler(productionOperationsService, 'getHealthOverview');
export const getReleaseOverview = handler(productionOperationsService, 'getReleaseOverview');
export const getCostOverview = handler(productionOperationsService, 'getCostOverview');
export const getReliabilityOverview = handler(productionOperationsService, 'getReliabilityOverview');
export const getOptimizationRecommendations = handler(productionOperationsService, 'getOptimizationRecommendations');
export const getPerformanceSummary = handler(productionOperationsService, 'getPerformanceSummary');
export const getComplianceSummary_ops = handler(productionOperationsService, 'getComplianceSummary');
export const getOperationsScorecard = handler(productionOperationsService, 'getOperationsScorecard');
export const getRecentActivities = handler(productionOperationsService, 'getRecentActivities');
export const generateOperationsReport = handler(productionOperationsService, 'generateOperationsReport');

// ============================================================
// Part 16 - Production Certification
// ============================================================

export const certify = handler(productionCertificationService, 'certify');
export const getCertification = handler(productionCertificationService, 'getCertification');
export const listCertifications = handler(productionCertificationService, 'listCertifications');
export const recalculateCertification = handler(productionCertificationService, 'recalculateCertification');
export const assessReadiness = handler(productionCertificationService, 'assessReadiness');
export const getReadinessAssessment = handler(productionCertificationService, 'getReadinessAssessment');
export const runScalabilityCertification = handler(productionCertificationService, 'runScalabilityCertification');
export const runReliabilityCertification = handler(productionCertificationService, 'runReliabilityCertification');
export const runAvailabilityCertification = handler(productionCertificationService, 'runAvailabilityCertification');
export const runPerformanceCertification = handler(productionCertificationService, 'runPerformanceCertification');
export const runSecurityCertification = handler(productionCertificationService, 'runSecurityCertification');
export const runMonitoringCertification = handler(productionCertificationService, 'runMonitoringCertification');
export const runOperationsCertification = handler(productionCertificationService, 'runOperationsCertification');
export const runComplianceCertification = handler(productionCertificationService, 'runComplianceCertification');
export const generateCertificationReport = handler(productionCertificationService, 'generateCertificationReport');
export const getLatestCertifications = handler(productionCertificationService, 'getLatestCertifications');
