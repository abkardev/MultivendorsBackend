import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import http from 'http';

// Mirror the production boot: NODE_ENV=production BEFORE importing config so
// config.server.trustProxy takes its production value (trust one hop).
process.env.NODE_ENV = 'production';

let config;

beforeAll(async () => {
  config = (await import('../services/config.js')).default;
});

afterAll(() => {
  delete process.env.NODE_ENV;
});

function startServer(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (server?.closeAllConnections) server.closeAllConnections();
    server.close(() => resolve());
  });
}

async function request(port, path, headers = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    headers: { Connection: 'close', ...headers },
  });
  return res;
}

describe('trust proxy wiring (Phase 3.5 / B2)', () => {
  it('config.server.trustProxy trusts exactly one proxy hop in production', () => {
    expect(config.server.trustProxy).toBe(1);
  });

  it('req.ip reflects the real client from X-Forwarded-For through one trusted hop', async () => {
    const app = express();
    app.set('trust proxy', config.server.trustProxy);
    app.get('/echo', (req, res) => res.send(req.ip));
    const server = await startServer(app);
    try {
      // nginx sets X-Forwarded-For to the client IP on a single-hop topology.
      const res = await request(server.address().port, '/echo', {
        'X-Forwarded-For': '203.0.113.7',
      });
      expect(await res.text()).toBe('203.0.113.7');
    } finally {
      await stopServer(server);
    }
  });

  it('two real clients behind the proxy do not share a rate-limit bucket', async () => {
    const app = express();
    app.set('trust proxy', config.server.trustProxy);
    const limiter = rateLimit({
      windowMs: 60000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.get('/hit', limiter, (req, res) => res.sendStatus(200));
    const server = await startServer(app);
    try {
      const port = server.address().port;
      // Client A exhausts its own bucket.
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.10' })).status).toBe(200);
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.10' })).status).toBe(200);
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.10' })).status).toBe(429);
      // Client B still has its own allowance.
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.99' })).status).toBe(200);
      // And Client B can continue until its own limit.
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.99' })).status).toBe(200);
    } finally {
      await stopServer(server);
    }
  });

  it('regression: without trust proxy clients collide on the shared proxy IP', async () => {
    // This is the configuration BEFORE the fix: all users share one bucket.
    const app = express();
    const limiter = rateLimit({
      windowMs: 60000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.get('/hit', limiter, (req, res) => res.sendStatus(200));
    const server = await startServer(app);
    try {
      const port = server.address().port;
      await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.10' });
      await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.10' });
      // A different XFF client is throttled too, because req.ip = proxy IP.
      expect((await request(port, '/hit', { 'X-Forwarded-For': '203.0.113.99' })).status).toBe(429);
    } finally {
      await stopServer(server);
    }
  });
});