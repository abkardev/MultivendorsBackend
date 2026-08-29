import { monitoringService } from '../services/monitoringService.js';

// Response time tracking
export const responseTimer = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitoringService.recordHttpRequest(req.method, req.originalUrl, res.statusCode, duration);
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  next();
};

// Query profiler for MongoDB
export const queryProfiler = (req, res, next) => {
  const originalExec = mongoose.Query.prototype.exec;
  mongoose.Query.prototype.exec = function () {
    const start = Date.now();
    const result = originalExec.apply(this, arguments);
    if (result && result.then) {
      return result.then((data) => {
        const duration = Date.now() - start;
        monitoringService.recordDatabaseQuery(duration, this.model?.modelName || 'unknown');
        return data;
      });
    }
    return result;
  };
  next();
};

// Cache control headers
export const cacheControl = (req, res, next) => {
  if (req.method === 'GET') {
    if (req.originalUrl.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
  next();
};

// Compression optimization
export const compressionConfig = {
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
};

// Request coalescing (deduplicate concurrent identical requests)
const pendingRequests = new Map();
export const requestCoalescer = (req, res, next) => {
  if (req.method !== 'GET') return next();
  const key = `${req.originalUrl}:${JSON.stringify(req.query)}`;
  if (pendingRequests.has(key)) {
    pendingRequests.get(key).push({ res });
    return;
  }
  pendingRequests.set(key, [{ res }]);
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const waiters = pendingRequests.get(key);
    pendingRequests.delete(key);
    originalJson(body);
    for (const waiter of waiters) {
      if (waiter.res !== res) waiter.res.json(body);
    }
  };
  next();
};
