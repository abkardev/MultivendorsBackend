import mongoose from 'mongoose';
import Redis from 'ioredis';

// Waits until mongoose reaches the connected state, resolving at that point.
export function waitForMongo(timeoutMs = 30000) {
  return new Promise((resolve) => {
    if (mongoose.connection.readyState === 1) return resolve(true);
    const started = Date.now();
    const timer = setInterval(() => {
      if (mongoose.connection.readyState === 1) { clearInterval(timer); resolve(true); }
      else if (Date.now() - started > timeoutMs) { clearInterval(timer); resolve(false); }
    }, 200);
  });
}

// Lightweight Redis ping using a short-lived client; never touches app state.
export async function pingRedis(timeoutMs = 5000) {
  const url = process.env.REDIS_URL;
  if (!url) return false;
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: timeoutMs,
  });
  try {
    await client.connect();
    const pong = await client.ping();
    await client.quit().catch(() => {});
    return pong === 'PONG';
  } catch {
    client.disconnect();
    return false;
  }
}

// Production: blocks startup until MongoDB is connected and, when REDIS_URL is
// set, Redis answers PING. Non-production: best-effort with a short timeout.
export async function validateBootstrapReadiness() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const db = await waitForMongo(NODE_ENV === 'production' ? 30000 : 8000);
  const requireRedis = !!process.env.REDIS_URL;
  const redis = requireRedis ? await pingRedis() : false;
  if (NODE_ENV !== 'production') {
    return { ok: true, db, redis, production: false };
  }
  return { ok: db && (!requireRedis || redis), db, redis, production: true };
}