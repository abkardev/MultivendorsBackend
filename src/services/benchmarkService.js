import { BenchmarkScenario } from '../models/BenchmarkScenario.js';
import { BenchmarkExecution } from '../models/BenchmarkExecution.js';
import { BenchmarkResult } from '../models/BenchmarkResult.js';
import { BenchmarkReport } from '../models/BenchmarkReport.js';
import { TelemetryEvent } from '../models/TelemetryEvent.js';
import { MetricSnapshot } from '../models/MetricSnapshot.js';
import { MetricSeries } from '../models/MetricSeries.js';
import { logAuditEvent } from './auditService.js';
import { getLogger } from './logger.js';

const logger = getLogger('api');

class BenchmarkService {
  async createScenario(data) {
    const scenario = await BenchmarkScenario.create(data);
    await logAuditEvent({
      action: 'benchmark.scenario.create', category: 'system',
      entityType: 'BenchmarkScenario', entityId: scenario._id,
      description: `Created benchmark scenario: ${scenario.name}`,
      status: 'success',
    });
    return scenario;
  }

  async updateScenario(id, data) {
    const scenario = await BenchmarkScenario.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!scenario) throw new Error('BenchmarkScenario not found');
    await logAuditEvent({
      action: 'benchmark.scenario.update', category: 'system',
      entityType: 'BenchmarkScenario', entityId: id,
      description: `Updated benchmark scenario: ${scenario.name}`,
      status: 'success',
    });
    return scenario;
  }

  async getScenario(id) {
    const scenario = await BenchmarkScenario.findById(id).lean();
    if (!scenario) throw new Error('BenchmarkScenario not found');
    const executions = await BenchmarkExecution.find({ scenario: id }).sort({ createdAt: -1 }).limit(20).lean();
    return { ...scenario, executions };
  }

  async listScenarios(filter = {}) {
    const { type, status, limit = 20, offset = 0 } = filter;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const [items, total] = await Promise.all([
      BenchmarkScenario.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
      BenchmarkScenario.countDocuments(query),
    ]);
    return { items, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) };
  }

  async deleteScenario(id) {
    const scenario = await BenchmarkScenario.findByIdAndDelete(id);
    if (!scenario) throw new Error('BenchmarkScenario not found');
    await BenchmarkExecution.deleteMany({ scenario: id });
    await logAuditEvent({
      action: 'benchmark.scenario.delete', category: 'system',
      entityType: 'BenchmarkScenario', entityId: id,
      description: `Deleted scenario: ${scenario.name}`,
      status: 'success',
    });
    return { deleted: true };
  }

  async runBenchmark(scenarioId) {
    const scenario = await BenchmarkScenario.findById(scenarioId);
    if (!scenario) throw new Error('BenchmarkScenario not found');

    scenario.status = 'running';
    await scenario.save();

    const startedAt = new Date();
    const execution = await BenchmarkExecution.create({
      scenario: scenarioId,
      status: 'running',
      startedAt,
    });

    const type = scenario.type;

    let results;
    switch (type) {
      case 'api': results = await this.runApiBenchmark(scenario.parameters); break;
      case 'database': results = await this.runDatabaseBenchmark(scenario.parameters); break;
      case 'ai': results = await this.runAIBenchmark(scenario.parameters); break;
      case 'search': results = await this.runSearchBenchmark(scenario.parameters); break;
      case 'procurement': results = await this.runProcurementBenchmark(scenario.parameters); break;
      default: results = await this.runApiBenchmark(scenario.parameters);
    }

    results.simulated = true;
    results.simulationNote = 'Generated from real telemetry data averages';

    const completedAt = new Date();
    execution.status = 'completed';
    execution.completedAt = completedAt;
    execution.duration = completedAt - startedAt;
    execution.results = {
      totalRequests: results.totalRequests,
      successfulRequests: results.successfulRequests,
      failedRequests: results.failedRequests,
      avgLatency: results.avgLatency,
      p50Latency: results.p50Latency,
      p95Latency: results.p95Latency,
      p99Latency: results.p99Latency,
      throughput: results.throughput,
      errorRate: results.errorRate,
      concurrency: scenario.parameters ? scenario.parameters.concurrency || 1 : 1,
    };

    const previousExecution = await BenchmarkExecution.findOne({ scenario: scenarioId, _id: { $ne: execution._id } })
      .sort({ createdAt: -1 }).lean();
    if (previousExecution && previousExecution.results) {
      execution.comparisons = {
        vsPrevious: {
          latencyDiff: execution.results.avgLatency - (previousExecution.results.avgLatency || 0),
          throughputDiff: execution.results.throughput - (previousExecution.results.throughput || 0),
        },
        vsThreshold: {
          latencyOk: !scenario.thresholds || !scenario.thresholds.maxLatency || execution.results.avgLatency <= scenario.thresholds.maxLatency,
          errorRateOk: !scenario.thresholds || !scenario.thresholds.maxErrorRate || execution.results.errorRate <= scenario.thresholds.maxErrorRate,
          throughputOk: !scenario.thresholds || !scenario.thresholds.minThroughput || execution.results.throughput >= scenario.thresholds.minThroughput,
        },
      };
    }

    await execution.save();

    if (results.detailedResults) {
      const resultDocs = results.detailedResults.map(r => ({
        execution: execution._id,
        endpoint: r.endpoint,
        method: r.method,
        metric: r.metric,
        value: r.value,
        unit: r.unit,
      }));
      if (resultDocs.length > 0) await BenchmarkResult.insertMany(resultDocs);
    }

    scenario.status = 'completed';
    await scenario.save();

    await logAuditEvent({
      action: 'benchmark.run', category: 'system',
      entityType: 'BenchmarkExecution', entityId: execution._id,
      description: `SIMULATION - Benchmark executed for scenario: ${scenario.name} (type: ${type})`,
      status: 'success',
    });

    return execution;
  }

  async getExecution(id) {
    const execution = await BenchmarkExecution.findById(id).populate('scenario').lean();
    if (!execution) throw new Error('BenchmarkExecution not found');
    return execution;
  }

  async listExecutions(scenarioId) {
    const executions = await BenchmarkExecution.find({ scenario: scenarioId })
      .sort({ createdAt: -1 }).limit(50).lean();
    return executions;
  }

  async compareExecutions(id1, id2) {
    const [e1, e2] = await Promise.all([
      BenchmarkExecution.findById(id1).populate('scenario').lean(),
      BenchmarkExecution.findById(id2).populate('scenario').lean(),
    ]);
    if (!e1 || !e2) throw new Error('One or both executions not found');
    return {
      execution1: e1,
      execution2: e2,
      differences: {
        avgLatency: e1.results ? (e1.results.avgLatency - (e2.results ? e2.results.avgLatency : 0)) : 0,
        throughput: e1.results ? (e1.results.throughput - (e2.results ? e2.results.throughput : 0)) : 0,
        errorRate: e1.results ? (e1.results.errorRate - (e2.results ? e2.results.errorRate : 0)) : 0,
        p95Latency: e1.results ? (e1.results.p95Latency - (e2.results ? e2.results.p95Latency : 0)) : 0,
      },
    };
  }

  async getBenchmarkResults(executionId) {
    return BenchmarkResult.find({ execution: executionId }).sort({ timestamp: 1 }).lean();
  }

  async _getTelemetryAvg(type) {
    const events = await TelemetryEvent.find({ type })
      .sort({ timestamp: -1 }).limit(100).lean();
    if (events.length === 0) return { avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    const values = events.map(e => e.value).sort((a, b) => a - b);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const p = (idx) => values[Math.min(Math.floor(idx), values.length - 1)];
    return {
      avg: Math.round(avg * 100) / 100,
      p50: p(values.length * 0.5),
      p95: p(values.length * 0.95),
      p99: p(values.length * 0.99),
      count: values.length,
    };
  }

  async runApiBenchmark(params) {
    const latencyData = await this._getTelemetryAvg('api_latency');
    const concurrency = (params && params.concurrency) || 10;
    const duration = (params && params.duration) || 60;

    const avgLatency = latencyData.avg || 45;
    const throughputBase = latencyData.count > 0 ? Math.round(1000 / Math.max(avgLatency, 1) * concurrency) : 500;
    const throughput = throughputBase * (duration / 1000);
    const errorRate = Math.round((Math.random() * 0.5 + 0.1) * 100) / 100;

    return {
      avgLatency,
      p50Latency: latencyData.p50 || avgLatency,
      p95Latency: latencyData.p95 || avgLatency * 2,
      p99Latency: latencyData.p99 || avgLatency * 3,
      throughput: Math.round(throughput),
      totalRequests: Math.round(throughput),
      successfulRequests: Math.round(throughput * (1 - errorRate / 100)),
      failedRequests: Math.round(throughput * errorRate / 100),
      errorRate,
      simulated: true,
      telemetrySource: `api_latency (${latencyData.count} samples)`,
      detailedResults: [
        { endpoint: '/api/v1/products', method: 'GET', metric: 'latency', value: avgLatency, unit: 'ms' },
        { endpoint: '/api/v1/products', method: 'GET', metric: 'throughput', value: throughput, unit: 'rps' },
        { endpoint: '/api/v1/search', method: 'GET', metric: 'latency', value: avgLatency * 1.2, unit: 'ms' },
      ],
    };
  }

  async runDatabaseBenchmark(params) {
    const latencyData = await this._getTelemetryAvg('db_latency');
    const avgLatency = latencyData.avg || 25;
    const baseQps = latencyData.count > 0 ? Math.round(1000 / Math.max(avgLatency, 1)) : 200;
    const totalQueries = baseQps * 60;

    return {
      avgLatency,
      p50Latency: latencyData.p50 || avgLatency,
      p95Latency: latencyData.p95 || avgLatency * 2.5,
      p99Latency: latencyData.p99 || avgLatency * 4,
      throughput: Math.round(baseQps),
      totalRequests: totalQueries,
      successfulRequests: Math.round(totalQueries * 0.995),
      failedRequests: Math.round(totalQueries * 0.005),
      errorRate: 0.5,
      simulated: true,
      telemetrySource: `db_latency (${latencyData.count} samples)`,
      detailedResults: [
        { endpoint: 'db/query', method: 'SELECT', metric: 'latency', value: avgLatency, unit: 'ms' },
        { endpoint: 'db/write', method: 'INSERT', metric: 'latency', value: avgLatency * 1.5, unit: 'ms' },
      ],
    };
  }

  async runAIBenchmark(params) {
    const latencyData = await this._getTelemetryAvg('ai_latency');
    const avgLatency = latencyData.avg || 200;
    const requests = 100;

    return {
      avgLatency,
      p50Latency: latencyData.p50 || avgLatency,
      p95Latency: latencyData.p95 || avgLatency * 1.5,
      p99Latency: latencyData.p99 || avgLatency * 2,
      throughput: Math.round(60000 / Math.max(avgLatency, 1)),
      totalRequests: requests,
      successfulRequests: Math.round(requests * 0.99),
      failedRequests: Math.round(requests * 0.01),
      errorRate: 1,
      simulated: true,
      telemetrySource: `ai_latency (${latencyData.count} samples)`,
      detailedResults: [
        { endpoint: 'ai/completion', method: 'POST', metric: 'latency', value: avgLatency, unit: 'ms' },
        { endpoint: 'ai/embedding', method: 'POST', metric: 'latency', value: avgLatency * 0.7, unit: 'ms' },
      ],
    };
  }

  async runSearchBenchmark(params) {
    const latencyData = await this._getTelemetryAvg('search_latency');
    const avgLatency = latencyData.avg || 30;
    const queries = 500;

    return {
      avgLatency,
      p50Latency: latencyData.p50 || avgLatency,
      p95Latency: latencyData.p95 || avgLatency * 2,
      p99Latency: latencyData.p99 || avgLatency * 3,
      throughput: Math.round(1000 / Math.max(avgLatency, 1) * 10),
      totalRequests: queries,
      successfulRequests: Math.round(queries * 0.99),
      failedRequests: Math.round(queries * 0.01),
      errorRate: 1,
      simulated: true,
      telemetrySource: `search_latency (${latencyData.count} samples)`,
      detailedResults: [
        { endpoint: 'search/query', method: 'GET', metric: 'latency', value: avgLatency, unit: 'ms' },
        { endpoint: 'search/suggest', method: 'GET', metric: 'latency', value: avgLatency * 0.5, unit: 'ms' },
      ],
    };
  }

  async runProcurementBenchmark(params) {
    const latencyData = await this._getTelemetryAvg('api_latency');
    const avgLatency = (latencyData.avg || 45) * 3;
    const flows = 50;

    return {
      avgLatency,
      p50Latency: avgLatency * 0.9,
      p95Latency: avgLatency * 1.8,
      p99Latency: avgLatency * 3,
      throughput: Math.round(60000 / Math.max(avgLatency, 1)),
      totalRequests: flows * 8,
      successfulRequests: Math.round(flows * 8 * 0.97),
      failedRequests: Math.round(flows * 8 * 0.03),
      errorRate: 3,
      simulated: true,
      telemetrySource: `api_latency averages (procurement flow)`,
      detailedResults: [
        { endpoint: 'procurement/rfq/create', method: 'POST', metric: 'latency', value: avgLatency, unit: 'ms' },
        { endpoint: 'procurement/rfq/respond', method: 'POST', metric: 'latency', value: avgLatency * 1.2, unit: 'ms' },
        { endpoint: 'procurement/order/place', method: 'POST', metric: 'latency', value: avgLatency * 0.8, unit: 'ms' },
      ],
    };
  }

  async generateBenchmarkReport(executionId) {
    const execution = await BenchmarkExecution.findById(executionId).populate('scenario').lean();
    if (!execution) throw new Error('BenchmarkExecution not found');
    const scenario = execution.scenario;
    const report = await BenchmarkReport.create({
      name: `Report - ${scenario.name}`,
      type: 'custom',
      period: { start: execution.startedAt, end: execution.completedAt },
      categories: [{
        name: scenario.type,
        currentValue: execution.results ? execution.results.avgLatency : 0,
        trend: 'stable',
      }],
      overall: {
        score: execution.results ? Math.max(0, 100 - execution.results.errorRate) : 0,
        trend: 'stable',
        summary: `Benchmark report for ${scenario.name}`,
      },
      generatedAt: new Date(),
    });
    return report;
  }

  async getLatestResults(type) {
    const execution = await BenchmarkExecution.find()
      .populate({ path: 'scenario', match: { type }, select: 'name type' })
      .sort({ createdAt: -1 }).limit(10).lean();
    const filtered = execution.filter(e => e.scenario);
    return filtered;
  }

  async getTrend(type) {
    const executions = await BenchmarkExecution.find()
      .populate({ path: 'scenario', match: { type }, select: 'name type' })
      .sort({ createdAt: -1 }).limit(50).lean();
    const filtered = executions.filter(e => e.scenario && e.results);
    const trend = filtered.map(e => ({
      date: e.createdAt,
      avgLatency: e.results ? e.results.avgLatency : 0,
      throughput: e.results ? e.results.throughput : 0,
      errorRate: e.results ? e.results.errorRate : 0,
    })).reverse();
    return { type, dataPoints: trend.length, trend };
  }

  async markAsSimulation(scenarioId) {
    const scenario = await BenchmarkScenario.findByIdAndUpdate(
      scenarioId,
      { 'metadata.simulation': 'true' },
      { new: true }
    );
    if (!scenario) throw new Error('BenchmarkScenario not found');
    await logAuditEvent({
      action: 'benchmark.mark_simulation', category: 'system',
      entityType: 'BenchmarkScenario', entityId: scenarioId,
      description: `Scenario ${scenario.name} marked as simulation`,
      status: 'success',
    });
    return scenario;
  }
}

export const benchmarkService = new BenchmarkService();
