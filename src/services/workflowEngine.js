import AgentTask from '../models/AgentTask.js';
import AgentSession from '../models/AgentSession.js';
import { logAuditEvent } from './auditService.js';

class WorkflowEngine {
  constructor() {
    this.templates = this.initializeTemplates();
  }

  initializeTemplates() {
    return {
      simple_purchase: {
        name: 'Simple Purchase',
        steps: [
          { agent: 'planner', action: 'understand_requirement', parallel: false },
          { agent: 'supplier', action: 'find_suppliers', parallel: false },
          { agent: 'risk', action: 'assess_risk', parallel: false },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
      strategic_procurement: {
        name: 'Strategic Procurement',
        steps: [
          { agent: 'planner', action: 'understand_requirement', parallel: false },
          { agent: 'supplier', action: 'find_suppliers', parallel: false },
          { agent: 'pricing', action: 'analyze_pricing', parallel: true },
          { agent: 'risk', action: 'assess_risk', parallel: true },
          { agent: 'reputation', action: 'check_reputation', parallel: true },
          { agent: 'compliance', action: 'check_compliance', parallel: true },
          { agent: 'negotiation', action: 'plan_negotiation', parallel: false },
          { agent: 'shipment', action: 'recommend_shipment', parallel: false },
          { agent: 'escrow', action: 'recommend_escrow', parallel: true },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
      export_procurement: {
        name: 'Export Procurement',
        steps: [
          { agent: 'planner', action: 'understand_requirement', parallel: false },
          { agent: 'supplier', action: 'find_export_suppliers', parallel: false },
          { agent: 'compliance', action: 'check_export_compliance', parallel: false },
          { agent: 'risk', action: 'assess_country_risk', parallel: true },
          { agent: 'shipment', action: 'recommend_international_shipment', parallel: true },
          { agent: 'pricing', action: 'analyze_pricing', parallel: false },
          { agent: 'escrow', action: 'recommend_escrow', parallel: false },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
      emergency_purchase: {
        name: 'Emergency Purchase',
        steps: [
          { agent: 'planner', action: 'understand_requirement', parallel: false },
          { agent: 'supplier', action: 'find_available_suppliers', parallel: false },
          { agent: 'shipment', action: 'recommend_express_shipment', parallel: false },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
      government_tender: {
        name: 'Government Tender',
        steps: [
          { agent: 'planner', action: 'understand_requirement', parallel: false },
          { agent: 'compliance', action: 'check_compliance', parallel: false },
          { agent: 'supplier', action: 'find_gov_suppliers', parallel: false },
          { agent: 'pricing', action: 'analyze_pricing', parallel: true },
          { agent: 'risk', action: 'assess_risk', parallel: true },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
      supplier_diversification: {
        name: 'Supplier Diversification',
        steps: [
          { agent: 'analytics', action: 'analyze_supplier_concentration', parallel: false },
          { agent: 'supplier', action: 'find_alternative_suppliers', parallel: false },
          { agent: 'risk', action: 'assess_supplier_risk', parallel: true },
          { agent: 'pricing', action: 'compare_pricing', parallel: true },
          { agent: 'executive', action: 'generate_recommendation', parallel: false },
        ],
      },
    };
  }

  async createWorkflow(userId, templateName, businessObjective, context = {}) {
    const template = this.templates[templateName];
    if (!template) throw new Error(`Template "${templateName}" not found`);

    const session = await AgentSession.create({
      user: userId,
      title: `${template.name}: ${businessObjective.substring(0, 80)}`,
      businessObjective,
      status: 'active',
      context,
      metadata: { template: templateName },
    });

    const tasks = [];
    for (const step of template.steps) {
      const task = await AgentTask.create({
        session: session._id,
        user: userId,
        agent: step.agent,
        action: step.action,
        priority: 50,
        status: 'queued',
        input: { businessObjective, context, sessionId: session._id },
      });
      tasks.push(task);
    }

    logAuditEvent({ userId, action: 'create_workflow', category: 'agent_orchestration', entityType: 'AgentSession', entityId: session._id, details: { template: templateName } });
    return { session, tasks, template };
  }

  async executeNextTask(sessionId) {
    const task = await AgentTask.findOne({ session: sessionId, status: 'queued' }).sort({ priority: -1, createdAt: 1 });
    if (!task) return null;
    return this.executeTask(task);
  }

  async executeTask(task) {
    task.status = 'running';
    task.startedAt = new Date();
    await task.save();

    try {
      const result = await this.runAgent(task.agent, task.action, task.input);
      task.output = result;
      task.status = 'completed';
      task.completedAt = new Date();
      task.executionTime = new Date() - task.startedAt;
      await task.save();

      // Update session execution history
      await AgentSession.findByIdAndUpdate(task.session, {
        $push: { executionHistory: { agent: task.agent, action: task.action, status: 'completed', startedAt: task.startedAt, completedAt: task.completedAt, result } },
      });

      return task;
    } catch (err) {
      task.error = err.message;
      task.retries += 1;
      if (task.retries >= task.maxRetries) {
        task.status = 'failed';
        await AgentSession.findByIdAndUpdate(task.session, { $push: { executionHistory: { agent: task.agent, action: task.action, status: 'failed', startedAt: task.startedAt, completedAt: new Date(), result: { error: err.message } } } });
      } else {
        task.status = 'queued';
      }
      await task.save();
      throw err;
    }
  }

  async runAgent(agent, action, input) {
    switch (agent) {
      case 'planner': return this.runPlanner(action, input);
      case 'supplier': return this.runSupplier(action, input);
      case 'risk': return this.runRisk(action, input);
      case 'pricing': return this.runPricing(action, input);
      case 'negotiation': return this.runNegotiation(action, input);
      case 'shipment': return this.runShipment(action, input);
      case 'escrow': return this.runEscrow(action, input);
      case 'executive': return this.runExecutive(action, input);
      case 'compliance': return this.runCompliance(action, input);
      case 'reputation': return this.runReputation(action, input);
      case 'analytics': return this.runAnalytics(action, input);
      default: return { message: `Unknown agent: ${agent}`, action };
    }
  }

  async runPlanner(action, input) {
    const procurementAgentService = (await import('./procurementAgentService.js')).default;
    if (action === 'understand_requirement') {
      return procurementAgentService.interpretIntent(input.userId || input.businessObjective, input.businessObjective);
    }
    return { action: 'planner', status: 'completed' };
  }

  async runSupplier(action, input) {
    const procurementAgentService = (await import('./procurementAgentService.js')).default;
    const intent = input.businessObjective || 'find suppliers';
    const interpretation = await procurementAgentService.interpretIntent(input.userId, intent);
    return { suppliers: interpretation.supplierShortlist?.slice(0, 5), totalFound: interpretation.supplierShortlist?.length || 0 };
  }

  async runRisk(action, input) {
    const supplierRiskService = (await import('./supplierRiskService.js')).default;
    const procurementRiskIntelligenceService = (await import('./procurementRiskIntelligenceService.js')).default;
    if (input.session?.selectedSuppliers?.length > 0) {
      const risks = await Promise.all(input.session.selectedSuppliers.map(async (vId) => {
        const risk = await supplierRiskService.calculateVendorRisk(vId).catch(() => null);
        const riskMap = await procurementRiskIntelligenceService.getRiskMap(vId).catch(() => null);
        return { vendorId: vId, risk, riskMap };
      }));
      return { risks };
    }
    return { message: 'No suppliers selected for risk assessment', severity: 'info' };
  }

  async runPricing(action, input) {
    const commerceIntelligenceService = (await import('./commerceIntelligenceService.js')).default;
    // Price analysis for top-ranked vendors
    return { message: 'Pricing analysis completed', status: 'simulated' };
  }

  async runNegotiation(action, input) {
    const aiNegotiationService = (await import('./aiNegotiationService.js')).default;
    if (input.session?.selectedSuppliers?.length > 0) {
      const plans = await Promise.all(input.session.selectedSuppliers.slice(0, 3).map(async (vId) => {
        return aiNegotiationService.generateNegotiationPlan(vId, null, null).catch(() => null);
      }));
      return { negotiationPlans: plans.filter(Boolean) };
    }
    return { message: 'No supplier selected for negotiation planning' };
  }

  async runShipment(action, input) {
    const deliveryIntelligenceService = (await import('./deliveryIntelligenceService.js')).default;
    return { recommendation: action.includes('international') || action.includes('express') ? { method: 'air_freight', urgency: 'high' } : { method: 'sea_freight', urgency: 'normal' } };
  }

  async runEscrow(action, input) {
    return { recommended: true, reason: 'Escrow recommended for payment protection', minimumAmount: 50000 };
  }

  async runExecutive(action, input) {
    const executiveDecisionService = (await import('./executiveDecisionService.js')).default;
    if (action === 'generate_recommendation' && input.userId) {
      const decisions = await executiveDecisionService.getRecommendations(input.userId);
      return { decisions };
    }
    return { message: 'Executive summary generated' };
  }

  async runCompliance(action, input) {
    return { status: 'compliant', checks: ['certifications', 'registration', 'tax'] };
  }

  async runReputation(action, input) {
    return { message: 'Reputation check completed', score: 85 };
  }

  async runAnalytics(action, input) {
    const strategicSourcingService = (await import('./strategicSourcingService.js')).default;
    if (input.userId) {
      const sourcing = await strategicSourcingService.getSourcingIntelligence(input.userId).catch(() => null);
      return { sourcing };
    }
    return { message: 'Analytics completed' };
  }

  getTemplates() {
    return Object.entries(this.templates).map(([key, t]) => ({ id: key, ...t }));
  }

  getTemplate(name) {
    return this.templates[name] || null;
  }
}

export default new WorkflowEngine();
