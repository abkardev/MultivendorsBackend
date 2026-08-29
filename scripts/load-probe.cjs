#!/usr/bin/env node
/**
 * load-probe.cjs — controlled, READ-ONLY load probe for the local stack.
 *
 * Safety:
 *  - exercises only public/health/metrics/catalog endpoints (no writes,
 *    no order creation, no payment creation),
 *  - login is exercised ONLY when LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD
 *    are set and stays a small share (auth rate limiter is active).
 *  - stays under the per-IP global limiter (200 req / 15 min) so the run is
 *    honest: 429s indicate the anti-DoS limiter did its job, not app errors.
 *
 * Usage (from backend_latest/):
 *   node scripts/load-probe.cjs --url http://localhost:9000 --duration 30 --rate 4
 * Output: per-route counts, filtered latencies (p50/p75/p95/p99/max), errors.
 * Exit code 0 = no transport errors and no 5xx (excluding expected /api/ready 503).
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const parse = () => {
  const a = process.argv;
  const val = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  return {
    url: (val('--url', process.env.LOAD_PROBE_URL || 'http://localhost:9000')).replace(/\/$/, ''),
    duration: parseInt(val('--duration', '30'), 10),
    rate: parseInt(val('--rate', '4'), 10),
  };
};

const cfg = parse();
const email = process.env.LOAD_TEST_EMAIL;
const password = process.env.LOAD_TEST_PASSWORD;

const WEIGHTS = { '/api/health': 30, '/api/product/': 30, '/api/vendor/vendors': 10, '/api/metrics': 15, '/api/ready': 10 };
const ROUTES = Object.entries(WEIGHTS).flatMap(([route, w]) => Array(w).fill(route));
const LOGIN_SHARE = email && password ? 5 : 0;

const pick = () => {
  if (LOGIN_SHARE && Math.random() * 100 < LOGIN_SHARE) return 'login';
  return ROUTES[Math.floor(Math.random() * ROUTES.length)];
};

const latencies = [];
let ok = 0, httpErr = 0, transportErr = 0, throttled = 0, readyDegraded = 0;
const byRoute = {};
let token = null;

const attempt = async () => {
  const route = pick();
  const started = Date.now();
  let status = 0;
  try {
    let res;
    if (route === 'login') {
      res = await fetch(cfg.url + '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) token = (await res.json()).token || token;
    } else {
      const headers = { accept: 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      res = await fetch(cfg.url + route, { headers });
    }
    status = res.status;
    const ms = Date.now() - started;

    if (status === 429) {
      throttled++;
    } else if (route === '/api/ready' && status === 503) {
      readyDegraded++;
      latencies.push(ms);
    } else if (status >= 500) {
      httpErr++;
      latencies.push(ms);
    } else {
      ok++;
      latencies.push(ms);
      byRoute[route] = (byRoute[route] || 0) + 1;
    }
  } catch (e) {
    const ms = Date.now() - started;
    latencies.push(ms);
    transportErr++;
    console.error(`transport error: ${e.cause?.code || e.message}`);
  }
};

const pct = (p) => {
  if (!latencies.length) return 0;
  const s = [...latencies].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const run = async () => {
  console.log(`# load-probe -> ${cfg.url} | duration=${cfg.duration}s | rate=${cfg.rate}/s\n`);
  const started = Date.now();
  const interval = 1000 / cfg.rate;
  const total = cfg.rate * cfg.duration;
  let sent = 0;
  const jobs = [];
  while (sent < total && Date.now() - started < cfg.duration * 1000) {
    const before = Date.now();
    jobs.push(attempt());
    sent++;
    const wait = interval - (Date.now() - before);
    if (wait > 0) await delay(wait);
  }
  await Promise.all(jobs);
  const elapsed = (Date.now() - started) / 1000;

  console.log(`requests        ${sent}`);
  console.log(`completed(2xx)  ${ok}`);
  console.log(`ready degraded  ${readyDegraded}`);
  console.log(`throttled 429   ${throttled}`);
  console.log(`transport err   ${transportErr}`);
  console.log(`http 5xx        ${httpErr}`);
  console.log(`statuses/route  ${JSON.stringify(byRoute)}`);
  console.log(`throughput      ${(sent / elapsed).toFixed(2)} req/s (nominal ${cfg.rate}/s)`);
  console.log(`latency p50 ${pct(50)}ms | p75 ${pct(75)}ms | p95 ${pct(95)}ms | p99 ${pct(99)}ms | max ${Math.max(...latencies, 0)}ms`);
  console.log(transportErr === 0 && httpErr === 0 ? '\nLOAD: PASS' : `\nLOAD: ${transportErr + httpErr} ERROR(S)`);
  process.exitCode = transportErr === 0 && httpErr === 0 ? 0 : 1;
};

run();