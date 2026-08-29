import { logger } from './logger.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      http: { requests: 0, errors: 0, avgResponseTime: 0, totalResponseTime: 0 },
      database: { queries: 0, slowQueries: 0, errors: 0, avgQueryTime: 0 },
      cache: { hits: 0, misses: 0 },
      ai: { requests: 0, tokensUsed: 0, errors: 0, avgLatency: 0 },
      queue: { processed: 0, failed: 0, pending: 0 },
      scheduler: { runs: 0, failures: 0, lastRun: null },
      events: { published: 0, delivered: 0, failed: 0 },
      notifications: { sent: 0, failed: 0 },
      search: { queries: 0, avgLatency: 0 },
    };
    this.startTime = Date.now();
    this.alerts = [];
    this.slas = {};
  }

  recordHttpRequest(method, path, statusCode, duration) {
    this.metrics.http.requests++;
    this.metrics.http.totalResponseTime += duration;
    this.metrics.http.avgResponseTime = this.metrics.http.totalResponseTime / this.metrics.http.requests;
    if (statusCode >= 500) this.metrics.http.errors++;
    // Log slow requests
    if (duration > 1000) logger.warn(`Slow request: ${method} ${path} took ${duration}ms`);
  }

  recordDatabaseQuery(duration, collection) {
    this.metrics.database.queries++;
    this.metrics.database.avgQueryTime = 
      ((this.metrics.database.avgQueryTime * (this.metrics.database.queries - 1)) + duration) / this.metrics.database.queries;
    if (duration > 500) {
      this.metrics.database.slowQueries++;
      logger.warn(`Slow query on ${collection}: ${duration}ms`);
    }
  }

  recordDatabaseError() { this.metrics.database.errors++; }

  recordCacheHit() { this.metrics.cache.hits++; }
  recordCacheMiss() { this.metrics.cache.misses++; }

  recordAiRequest(tokens, duration) {
    this.metrics.ai.requests++;
    this.metrics.ai.tokensUsed += tokens;
    this.metrics.ai.avgLatency = 
      ((this.metrics.ai.avgLatency * (this.metrics.ai.requests - 1)) + duration) / this.metrics.ai.requests;
    if (duration > 5000) logger.warn(`Slow AI request: ${duration}ms`);
  }
  recordAiError() { this.metrics.ai.errors++; }

  recordQueueProcessed() { this.metrics.queue.processed++; }
  recordQueueFailed() { this.metrics.queue.failed++; }

  recordSchedulerRun(name) { this.metrics.scheduler.runs++; this.metrics.scheduler.lastRun = name; }
  recordSchedulerFailure() { this.metrics.scheduler.failures++; }

  recordEventPublished() { this.metrics.events.published++; }
  recordEventDelivered() { this.metrics.events.delivered++; }
  recordEventFailed() { this.metrics.events.failed++; }

  recordNotificationSent() { this.metrics.notifications.sent++; }
  recordNotificationFailed() { this.metrics.notifications.failed++; }

  recordSearchQuery(duration) {
    this.metrics.search.queries++;
    this.metrics.search.avgLatency = 
      ((this.metrics.search.avgLatency * (this.metrics.search.queries - 1)) + duration) / this.metrics.search.queries;
  }

  getMetrics() {
    return {
      ...this.metrics,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      startTime: this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  getHealth() {
    return {
      status: 'healthy',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage().heapUsed / 1024 / 1024,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  triggerAlert(severity, message, context = {}) {
    const alert = { severity, message, context, timestamp: new Date().toISOString(), id: `alert_${Date.now()}_${Math.random().toString(36).slice(2)}` };
    this.alerts.push(alert);
    logger[severity === 'critical' ? 'error' : 'warn'](`[ALERT-${severity}] ${message}`, context);
    if (this.alerts.length > 1000) this.alerts.shift();
    return alert;
  }

  getAlerts(severity, limit = 50) {
    let filtered = this.alerts;
    if (severity) filtered = filtered.filter(a => a.severity === severity);
    return filtered.slice(-limit);
  }

  registerSLA(name, target, window) {
    this.slas[name] = { target, window, breaches: [] };
  }

  checkSLA(name) {
    const sla = this.slas[name];
    if (!sla) return null;
    // Check if metrics meet SLA target
    const current = this.metrics.http.avgResponseTime;
    const met = current <= sla.target;
    if (!met) sla.breaches.push({ timestamp: new Date().toISOString(), value: current });
    return { name, target: sla.target, current, met, breaches: sla.breaches.length };
  }
}

export const monitoringService = new MonitoringService();
