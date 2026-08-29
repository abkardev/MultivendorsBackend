import pino from 'pino';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '../../logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

const streams = [
  { stream: NODE_ENV === 'production' ? process.stdout : pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }) },
  { stream: pino.transport({ target: 'pino/file', options: { destination: path.join(LOG_DIR, 'api.log') } }), level: LOG_LEVEL },
  { stream: pino.transport({ target: 'pino/file', options: { destination: path.join(LOG_DIR, 'error.log') } }), level: 'error' },
];

const categoryStreams = [
  'auth', 'payments', 'escrow', 'shipments', 'procurement',
  'ai', 'uploads', 'security', 'audit', 'jobs', 'webhooks'
];

categoryStreams.forEach(cat => {
  streams.push({
    stream: pino.transport({
      target: 'pino/file',
      options: { destination: path.join(LOG_DIR, `${cat}.log`) }
    }),
    level: LOG_LEVEL,
  });
});

const baseLogger = pino({
  level: LOG_LEVEL,
  base: {
    pid: process.pid,
    host: os.hostname(),
    env: NODE_ENV,
    service: 'backend',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.token', 'body.secret'],
    censor: '[REDACTED]',
  },
}, pino.multistream(streams));

const categoryLoggers = {};
categoryStreams.forEach(cat => {
  categoryLoggers[cat] = baseLogger.child({ category: cat });
});

export function getLogger(category = 'api') {
  return categoryLoggers[category] || baseLogger;
}

export const logger = baseLogger;

export function createRequestLogger(req, res) {
  const correlationId = req.correlationId || randomUUID();
  const logger = baseLogger.child({
    correlationId,
    userId: req.user?._id || req.user?.id,
    vendorId: req.user?.vendorId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    route: req.originalUrl,
    method: req.method,
  });

  const start = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]({
      responseTime,
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
    }, 'request completed');
  });

  return logger;
}

export function requestLogger(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);

  req.log = createRequestLogger(req, res);

  req.log.info({
    query: req.query,
  }, `${req.method} ${req.originalUrl}`);

  next();
}

export function childLogger(parent, context = {}) {
  return parent.child(context);
}

export default baseLogger;
