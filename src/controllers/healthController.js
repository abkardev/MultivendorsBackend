import mongoose from 'mongoose';
import { storageRegistry } from '../services/storage/index.js';
import { cacheService } from '../services/cacheService.js';
import { pingRedis } from '../utils/readinessValidator.js';
import { getLogger } from '../services/logger.js';

const logger = getLogger('api');

export async function getHealth(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'manus-backend',
    version: '1.0.0',
  });
}

export async function getLiveness(req, res) {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
}

export async function getReadiness(req, res) {
  const checks = {
    api: { status: 'ok' },
    database: await checkDatabase(),
    cache: await checkCache(),
    storage: await checkStorage(),
    socketio: { status: 'ok' },
    timestamp: new Date().toISOString(),
  };

  const allOk = Object.values(checks).every(c => c.status === 'ok' || typeof c.status === 'undefined');
  const httpStatus = allOk ? 200 : 503;

  res.status(httpStatus).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
    dependencies: configuredIntegrations(),
  });
}

// Safe internal inventory: reports only whether each integration is
// CONFIGURED (env presence) — never leaks values, keys, or URLs.
function configuredIntegrations() {
  const has = (k) => !!process.env[k];
  return {
    mongodb: { configured: has('MONGODB_URI') },
    redis: { configured: has('REDIS_URL') },
    storage: {
      configured: has('CF_R2_ACCESS_KEY_ID') && has('CF_R2_SECRET_ACCESS_KEY') && !!process.env.CF_R2_PUBLIC_BUCKET,
      provider: process.env.STORAGE_PROVIDER || 'cloudflare_r2',
      legacyBunnyCDN: process.env.STORAGE_LEGACY_BUNNYCDN === 'true',
    },
    smtp: {
      configured: has('SMTP_HOST') && has('SMTP_USER') && has('SMTP_PASS') && process.env.SMTP_ENABLED !== 'false',
      explicitDisabled: process.env.SMTP_ENABLED === 'false',
    },
    turnstile: { configured: has('CF_TURNSTILE_SITE_KEY') && has('CF_TURNSTILE_SECRET_KEY') },
    moyasar: {
      configured: has('MOYASAR_API_KEY'),
      mode: process.env.MOYASAR_MODE || 'sandbox',
    },
    hyperpay: {
      configured: has('HYPERPAY_ENTITY_ID') && has('HYPERPAY_ACCESS_TOKEN'),
      mode: process.env.HYPERPAY_MODE || 'sandbox',
    },
    stripe: {
      configured: has('STRIPE_SECRET_KEY'),
      subscriptionsEnabled: process.env.STRIPE_SUBSCRIPTIONS_ENABLED === 'true',
    },
    paymentMode: process.env.PAYMENT_MODE || 'test',
  };
}

async function checkDatabase() {
  try {
    const state = mongoose.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    const status = state === 1 ? 'ok' : 'degraded';
    return {
      status,
      state: states[state] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

async function checkCache() {
  const configured = !!process.env.REDIS_URL;
  if (!configured) {
    return { status: 'degraded', configured: false, detail: 'REDIS_URL not set — using in-memory cache' };
  }
  const ok = await pingRedis();
  return {
    status: ok ? 'ok' : 'error',
    configured: true,
    connected: ok || cacheService.connected,
  };
}

async function checkStorage() {
  try {
    const provider = storageRegistry.getDefault();
    const health = await provider.healthCheck();
    return {
      status: health.status === 'healthy' ? 'ok' : 'degraded',
      provider: provider.name,
    };
  } catch (err) {
    return { status: 'degraded', message: err.message };
  }
}
