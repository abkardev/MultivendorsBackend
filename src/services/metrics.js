import { getLogger } from './logger.js';
import mongoose from 'mongoose';

const logger = getLogger('api');
const metricsLogger = getLogger('audit');

class MetricsCollector {
  constructor() {
    this.reset();
    setInterval(() => this.snapshot(), 60000);
  }

  reset() {
    this.metrics = {
      api: {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        slowRequestCount: 0,
        totalResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity,
        requestsByRoute: {},
        requestsByMethod: {},
        requestsByStatus: {},
      },
      auth: {
        loginSuccess: 0,
        loginFailure: 0,
        twoFactorUsage: 0,
      },
      marketplace: {
        orders: 0,
        rfqs: 0,
        quotations: 0,
        shipments: 0,
        payments: 0,
        escrowReleases: 0,
        refunds: 0,
        withdrawals: 0,
      },
      users: {
        activeUsers: new Set(),
        activeVendors: new Set(),
        onlineSessions: 0,
      },
      infrastructure: {
        memoryUsage: 0,
        cpuUsage: 0,
        eventLoopDelay: 0,
        dbConnections: 0,
      },
      slowRequests: [],
    };
  }

  recordRequest(method, route, statusCode, responseTime, userId) {
    const m = this.metrics;
    m.api.totalRequests++;

    if (statusCode < 400) m.api.successCount++;
    else if (statusCode >= 400) m.api.errorCount++;

    m.api.totalResponseTime += responseTime;
    m.api.maxResponseTime = Math.max(m.api.maxResponseTime, responseTime);
    m.api.minResponseTime = Math.min(m.api.minResponseTime, responseTime);

    if (!m.api.requestsByRoute[route]) m.api.requestsByRoute[route] = 0;
    m.api.requestsByRoute[route]++;

    if (!m.api.requestsByMethod[method]) m.api.requestsByMethod[method] = 0;
    m.api.requestsByMethod[method]++;

    const statusGroup = `${Math.floor(statusCode / 100)}xx`;
    if (!m.api.requestsByStatus[statusGroup]) m.api.requestsByStatus[statusGroup] = 0;
    m.api.requestsByStatus[statusGroup]++;

    if (responseTime > 5000) {
      m.api.slowRequestCount++;
      m.slowRequests.push({
        method,
        route,
        statusCode,
        responseTime,
        userId,
        timestamp: new Date(),
      });
      if (m.slowRequests.length > 100) m.slowRequests.shift();
    }

    if (userId) m.users.activeUsers.add(userId.toString());
  }

  recordAuthEvent(type, success) {
    if (type === 'login') {
      if (success) this.metrics.auth.loginSuccess++;
      else this.metrics.auth.loginFailure++;
    } else if (type === '2fa') {
      this.metrics.auth.twoFactorUsage++;
    }
  }

  recordMarketplaceEvent(eventType) {
    if (this.metrics.marketplace[eventType] !== undefined) {
      this.metrics.marketplace[eventType]++;
    }
  }

  async collectInfrastructureMetrics() {
    try {
      const memUsage = process.memoryUsage();
      this.metrics.infrastructure.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
      this.metrics.infrastructure.dbConnections = mongoose.connection.readyState === 1 ?
        mongoose.connection.$activePlans?.length || 1 : 0;

      const start = Date.now();
      await new Promise(resolve => setImmediate(resolve));
      this.metrics.infrastructure.eventLoopDelay = Date.now() - start;
    } catch (err) {
      logger.error('Failed to collect infrastructure metrics', err);
    }
  }

  async snapshot() {
    await this.collectInfrastructureMetrics();
    const snapshot = {
      timestamp: new Date().toISOString(),
      avgResponseTime: this.metrics.api.totalRequests > 0
        ? Math.round(this.metrics.api.totalResponseTime / this.metrics.api.totalRequests * 100) / 100
        : 0,
      errorRate: this.metrics.api.totalRequests > 0
        ? Math.round(this.metrics.api.errorCount / this.metrics.api.totalRequests * 10000) / 100
        : 0,
      activeUsers: this.metrics.users.activeUsers.size,
      ...this.metrics.infrastructure,
    };
    metricsLogger.info(snapshot, 'metrics snapshot');
  }

  getSnapshot() {
    const m = this.metrics;
    return {
      timestamp: new Date().toISOString(),
      api: {
        totalRequests: m.api.totalRequests,
        successCount: m.api.successCount,
        errorCount: m.api.errorCount,
        errorRate: m.api.totalRequests > 0
          ? Math.round(m.api.errorCount / m.api.totalRequests * 10000) / 100
          : 0,
        avgResponseTime: m.api.totalRequests > 0
          ? Math.round(m.api.totalResponseTime / m.api.totalRequests * 100) / 100
          : 0,
        maxResponseTime: m.api.maxResponseTime,
        minResponseTime: m.api.minResponseTime === Infinity ? 0 : m.api.minResponseTime,
        slowRequestCount: m.api.slowRequestCount,
        requestsByRoute: m.api.requestsByRoute,
        requestsByMethod: m.api.requestsByMethod,
        requestsByStatus: m.api.requestsByStatus,
      },
      auth: m.auth,
      marketplace: m.marketplace,
      users: {
        activeUsers: m.users.activeUsers.size,
        activeVendors: m.users.activeVendors.size,
        onlineSessions: m.users.onlineSessions,
      },
      infrastructure: m.infrastructure,
      slowRequests: m.slowRequests.slice(-10),
    };
  }
}

export const metricsCollector = new MetricsCollector();

export function metricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    metricsCollector.recordRequest(
      req.method,
      req.originalUrl,
      res.statusCode,
      responseTime,
      req.user?._id
    );
  });

  next();
}

export default metricsCollector;
