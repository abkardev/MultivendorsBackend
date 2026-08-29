import { DependencyGraph } from '../models/DependencyGraph.js';
import { ServiceTopology } from '../models/ServiceTopology.js';
import { RootCauseAnalysis } from '../models/RootCauseAnalysis.js';
import { ReliabilityIncident } from '../models/ReliabilityIncident.js';
import { ServiceHealth } from '../models/ServiceHealth.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { MetricSeries } from '../models/MetricSeries.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class AdvancedObservabilityService {
  async buildDependencyGraph() {
    const topologies = await ServiceTopology.find({}).lean();
    const services = topologies.map(t => ({
      name: t.service,
      type: t.type,
      version: t.version,
      status: t.status,
      dependencies: (t.dependencies || []).map(d => ({
        service: d.service,
        type: d.type,
        critical: d.critical,
        latency: d.latency,
      })),
    }));
    const allNodes = services.map(s => ({ id: s.name, type: s.type, status: s.status }));
    const allEdges = [];
    for (const s of services) {
      for (const d of (s.dependencies || [])) {
        allEdges.push({ source: s.name, target: d.service, type: d.type, critical: d.critical });
      }
    }
    const graph = await DependencyGraph.create({
      name: 'auto-generated',
      version: new Date().toISOString(),
      services,
      topology: { nodes: allNodes, edges: allEdges, levels: 1 },
      lastUpdated: new Date(),
    });
    await logAuditEvent({
      action: 'observability.graph.build', category: 'system',
      entityType: 'DependencyGraph', entityId: graph._id,
      description: 'Built dependency graph from service topologies',
      status: 'success',
    });
    return graph;
  }

  async getDependencyGraph(id) {
    const graph = await DependencyGraph.findById(id).lean();
    if (!graph) throw new Error('Dependency graph not found');
    return graph;
  }

  async getCurrentTopology() {
    const topologies = await ServiceTopology.find({}).sort({ service: 1 }).lean();
    const statusSummary = { healthy: 0, degraded: 0, down: 0, maintenance: 0 };
    for (const t of topologies) statusSummary[t.status] = (statusSummary[t.status] || 0) + 1;
    return { services: topologies, summary: statusSummary, total: topologies.length };
  }

  async getServiceTopology(serviceName) {
    const top = await ServiceTopology.findOne({ service: serviceName }).lean();
    if (!top) throw new Error('Service topology not found');
    return top;
  }

  async updateServiceStatus(serviceName, status) {
    const existing = await ServiceTopology.findOne({ service: serviceName });
    const previousStatus = existing ? existing.status : null;
    const top = await ServiceTopology.findOneAndUpdate(
      { service: serviceName },
      { service: serviceName, status, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    if (previousStatus && previousStatus !== status) {
      await logAuditEvent({
        action: 'observability.service.status', category: 'system',
        entityType: 'ServiceTopology', entityId: top._id,
        newValue: { service: serviceName, from: previousStatus, to: status },
        description: `Service ${serviceName} status changed to ${status}`,
        status: 'success',
      });
    }
    return top;
  }

  async recordDependencyCheck(serviceName, dependencyName, status, latency) {
    const top = await ServiceTopology.findOne({ service: serviceName });
    if (!top) throw new Error('Service topology not found');
    const existingDep = (top.dependencies || []).find(d => d.service === dependencyName);
    if (existingDep) {
      existingDep.status = status;
      existingDep.latency = latency;
      existingDep.lastChecked = new Date();
    } else {
      top.dependencies.push({ service: dependencyName, status, latency, lastChecked: new Date() });
    }
    const depSv = await ServiceTopology.findOne({ service: dependencyName });
    if (depSv && !depSv.dependents.includes(serviceName)) {
      depSv.dependents.push(serviceName);
      await depSv.save();
    }
    await top.save();
    return top;
  }

  async getServiceDependents(serviceName) {
    const top = await ServiceTopology.findOne({ service: serviceName }).lean();
    if (!top) return [];
    return top.dependents || [];
  }

  async identifyErrorPropagation(sourceService, startTime, endTime) {
    const start = startTime ? new Date(startTime) : new Date(Date.now() - 86400000);
    const end = endTime ? new Date(endTime) : new Date();
    const topology = await ServiceTopology.find({}).lean();
    const depMap = {};
    for (const t of topology) depMap[t.service] = (t.dependents || []);
    const propagated = [];
    const queue = [sourceService];
    const visited = new Set();
    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const incidents = await ReliabilityIncident.find({
        service: current, status: { $ne: 'resolved' },
        createdAt: { $gte: start, $lte: end },
      }).lean();
      if (incidents.length > 0) {
        propagated.push({ service: current, incidents, propagatedFrom: current !== sourceService });
      }
      for (const dep of (depMap[current] || [])) {
        if (!visited.has(dep)) queue.push(dep);
      }
    }
    return { sourceService, period: { start, end }, propagated, totalAffected: propagated.length };
  }

  async performRootCauseAnalysis(incidentId) {
    const incident = await ReliabilityIncident.findById(incidentId).lean();
    if (!incident) throw new Error('Incident not found');
    const existing = await RootCauseAnalysis.findOne({ incident: incidentId });
    if (existing) return existing;
    const relatedIncidents = await ReliabilityIncident.find({
      service: incident.service,
      createdAt: { $gte: new Date(new Date(incident.createdAt).getTime() - 3600000), $lte: incident.createdAt },
      _id: { $ne: incidentId },
    }).lean();
    const symptoms = [{
      type: 'primary', description: incident.title,
      timestamp: incident.createdAt, evidence: incident.rootCause || 'Under investigation',
    }];
    for (const ri of relatedIncidents) {
      symptoms.push({ type: 'related', description: ri.title, timestamp: ri.createdAt, evidence: '' });
    }
    const analysis = await RootCauseAnalysis.create({
      incident: incidentId,
      title: `RCA: ${incident.title}`,
      status: 'draft',
      symptoms,
      rootCause: {
        type: incident.rootCause ? 'known' : 'unknown',
        description: incident.rootCause || 'Root cause not yet determined',
        service: incident.service,
        confidence: incident.rootCause ? 80 : 30,
      },
      timeline: (incident.timeline || []).map(t => ({
        timestamp: t.timestamp, event: t.action || t.description,
        service: incident.service, impact: incident.severity,
      })),
      impact: {
        duration: incident.impact ? incident.impact.duration : 0,
        usersAffected: incident.impact ? incident.impact.usersAffected : 0,
        requestsLost: incident.impact ? incident.impact.requestsAffected : 0,
        slaBreached: incident.slaImpact ? incident.slaImpact.breached : false,
      },
      recommendations: [],
    });
    await logAuditEvent({
      action: 'observability.rca.create', category: 'system',
      entityType: 'RootCauseAnalysis', entityId: analysis._id,
      description: `Created RCA for incident: ${incident.title}`,
      status: 'success',
    });
    return analysis;
  }

  async getRootCauseAnalysis(id) {
    const analysis = await RootCauseAnalysis.findById(id).populate('incident').lean();
    if (!analysis) throw new Error('Root cause analysis not found');
    return analysis;
  }

  async listRootCauseAnalyses(filter = {}) {
    const { status, limit = 20, offset = 0 } = filter;
    const query = {};
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      RootCauseAnalysis.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      RootCauseAnalysis.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async getCallGraph(serviceName, depth = 3) {
    const topology = await ServiceTopology.find({}).lean();
    const depMap = {};
    for (const t of topology) {
      depMap[t.service] = (t.dependencies || []).map(d => d.service);
    }
    const callGraph = {};
    const queue = [{ service: serviceName, level: 0 }];
    const visited = new Set();
    while (queue.length > 0) {
      const { service, level } = queue.shift();
      if (visited.has(service) || level > depth) continue;
      visited.add(service);
      callGraph[service] = { level, dependencies: [] };
      for (const dep of (depMap[service] || [])) {
        callGraph[service].dependencies.push(dep);
        queue.push({ service: dep, level: level + 1 });
      }
    }
    return { root: serviceName, depth, callGraph };
  }

  async getServiceImpactAnalysis(serviceName) {
    const topology = await ServiceTopology.find({}).lean();
    const depMap = {};
    const services = {};
    for (const t of topology) {
      services[t.service] = t;
      depMap[t.service] = (t.dependents || []);
    }
    const affected = new Set();
    const queue = [serviceName];
    while (queue.length > 0) {
      const current = queue.shift();
      if (affected.has(current)) continue;
      affected.add(current);
      for (const dep of (depMap[current] || [])) {
        queue.push(dep);
      }
    }
    affected.delete(serviceName);
    const impactDetails = [];
    for (const name of affected) {
      const sv = services[name];
      if (sv) {
        impactDetails.push({ service: name, type: sv.type, status: sv.status });
      }
    }
    return {
      targetService: serviceName,
      totalAffected: impactDetails.length,
      directDependents: depMap[serviceName] || [],
      cascadeImpact: impactDetails,
      risk: impactDetails.length > 5 ? 'high' : impactDetails.length > 2 ? 'medium' : 'low',
    };
  }

  async getSLADashboard(period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const incidents = await ReliabilityIncident.find({ createdAt: { $gte: start } }).lean();
    const services = await ServiceTopology.find({}).lean();
    const slaByService = {};
    for (const sv of services) {
      const svIncidents = incidents.filter(i => i.service === sv.service);
      const breaches = svIncidents.filter(i => i.slaImpact && i.slaImpact.breached).length;
      const totalDowntime = svIncidents.reduce((sum, i) => {
        return sum + (i.impact && i.impact.duration ? i.impact.duration : 0);
      }, 0);
      const totalMinutes = period * 24 * 60;
      const uptimePercent = totalMinutes > 0 ? Math.max(0, ((totalMinutes - totalDowntime) / totalMinutes) * 100) : 100;
      slaByService[sv.service] = {
        uptime: Math.round(uptimePercent * 100) / 100,
        incidents: svIncidents.length,
        slaBreaches: breaches,
        totalDowntime,
        slaCompliant: uptimePercent >= 99.9,
      };
    }
    return { period, slaByService, generatedAt: new Date() };
  }

  async getDependencyHealth() {
    const topologies = await ServiceTopology.find({}).lean();
    const results = [];
    let healthy = 0; let degraded = 0; let down = 0;
    for (const t of topologies) {
      for (const dep of (t.dependencies || [])) {
        if (dep.status === 'healthy') healthy++;
        else if (dep.status === 'degraded') degraded++;
        else if (dep.status === 'down') down++;
        results.push({
          service: t.service, dependency: dep.service,
          status: dep.status, critical: dep.critical,
          latency: dep.latency, lastChecked: dep.lastChecked,
        });
      }
    }
    const total = results.length;
    return {
      dependencies: results,
      summary: { healthy, degraded, down, total, healthPercent: total > 0 ? Math.round((healthy / total) * 100) : 100 },
    };
  }

  async generateObservabilityReport() {
    const [topology, depGraphs, rcas, sla] = await Promise.all([
      this.getCurrentTopology(),
      DependencyGraph.find({}).sort({ createdAt: -1 }).limit(5).lean(),
      RootCauseAnalysis.find({}).sort({ createdAt: -1 }).limit(20).lean(),
      this.getSLADashboard(30),
    ]);
    return {
      generatedAt: new Date(),
      serviceTopology: topology,
      recentGraphs: depGraphs,
      recentRootCauseAnalyses: rcas,
      slaDashboard: sla,
      reportType: 'comprehensive',
    };
  }

  async correlateMetrics(metric1, metric2, period = 30) {
    const start = new Date(Date.now() - period * 86400000);
    const [series1, series2] = await Promise.all([
      MetricSeries.findOne({ name: metric1, granularity: 'hour' }).lean(),
      MetricSeries.findOne({ name: metric2, granularity: 'hour' }).lean(),
    ]);
    if (!series1 || !series2) throw new Error('One or both metrics not found');
    const v1 = (series1.values || []).filter(v => new Date(v.timestamp) >= start).map(v => v.value);
    const v2 = (series2.values || []).filter(v => new Date(v.timestamp) >= start).map(v => v.value);
    const n = Math.min(v1.length, v2.length);
    if (n < 2) return { metric1, metric2, correlation: 0, sampleSize: n };
    const avg1 = v1.slice(0, n).reduce((s, v) => s + v, 0) / n;
    const avg2 = v2.slice(0, n).reduce((s, v) => s + v, 0) / n;
    let num = 0; let d1 = 0; let d2 = 0;
    for (let i = 0; i < n; i++) {
      const diff1 = v1[i] - avg1;
      const diff2 = v2[i] - avg2;
      num += diff1 * diff2;
      d1 += diff1 * diff1;
      d2 += diff2 * diff2;
    }
    const denom = Math.sqrt(d1 * d2);
    const correlation = denom > 0 ? num / denom : 0;
    return { metric1, metric2, correlation: Math.round(correlation * 100) / 100, sampleSize: n, period };
  }

  async getServiceMap() {
    const topologies = await ServiceTopology.find({}).lean();
    const nodes = [];
    const edges = [];
    for (const t of topologies) {
      nodes.push({
        id: t.service, type: t.type, status: t.status,
        metrics: t.metrics, instances: t.instances, region: t.region,
      });
      for (const dep of (t.dependencies || [])) {
        edges.push({
          source: t.service, target: dep.service,
          type: dep.type, critical: dep.critical, status: dep.status,
        });
      }
    }
    return { nodes, edges, generatedAt: new Date() };
  }
}

export const advancedObservabilityService = new AdvancedObservabilityService();
