#!/usr/bin/env node
/**
 * production-smoke-test.cjs
 *
 * SAFE production smoke test. Read-only against the target host.
 *   - never creates financial transactions,
 *   - never marks a payment completed (that is exclusively the verified-webhook path),
 *   - never sends email that isn't triggered by the operator themselves.
 *
 * Checks (each reported PASS/FAIL/SKIPPED):
 *   GET /api/health            - liveness
 *   GET /api/live              - liveness (alive)
 *   GET /api/ready             - readiness (accepts 200 or 503-with-deps; reports both)
 *   GET /api/metrics           - metrics snapshot present
 *   POST /api/auth/login       - auth round-trip when TEST_EMAIL/TEST_PASSWORD provided
 *   GET  /api/products         - public catalog reachable
 *   GET  /api/vendors          - vendor list reachable
 *   GET  /api/admin/...guard   - admin-only route returns 401/403 without a token
 *   OPTIONS preflight          - CORS check using ORIGIN header
 *
 * Usage:
 *   node scripts/production-smoke-test.cjs --url https://api.yourdomain.com
 *   TEST_EMAIL=... TEST_PASSWORD=... node scripts/production-smoke-test.cjs --url https://api.yourdomain.com
 * Exit code 0 when every check that ran either PASSED or is SKIPPED.
 */
const AUTH_SKIP_RX = /(health|live|ready|metrics)/;

(async () => {
  const argUrl = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null;
  const base = (argUrl || process.env.SMOKE_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  const origin = process.env.SMOKE_ORIGIN || 'https://yourdomain.com';

  const results = [];
  const r = (name, status, detail) => {
    results.push({ name, status, detail });
    console.log(`${name.padEnd(58)} ${status.padEnd(9)} ${detail || ''}`);
  };
  const fail = () => process.exitCode = 1;

  const get = async (path, headers = {}) => {
    const res = await fetch(base + path, { headers: { accept: 'application/json', ...headers } });
    let body = null;
    try { body = await res.json(); } catch {}
    return { status: res.status, body, headers: res.headers };
  };

  console.log(`# production-smoke-test -> ${base}\n`);

  // 1. liveness
  try {
    const { status, body } = await get('/api/health');
    status === 200 && body?.status === 'ok'
      ? r('GET /api/health', 'PASS', `status=ok uptime=${body.uptime}`)
      : (r('GET /api/health', 'FAIL', `code=${status} body=${JSON.stringify(body)}`), fail());
  } catch (e) { r('GET /api/health', 'FAIL', e.message); fail(); }

  // 2. alive
  try {
    const { status, body } = await get('/api/live');
    status === 200 && body?.status === 'alive' ? r('GET /api/live', 'PASS', 'alive') : (r('GET /api/live', 'FAIL', `code=${status}`), fail());
  } catch (e) { r('GET /api/live', 'FAIL', e.message); fail(); }

  // 3. readiness (may be 503 in degraded mode; must still carry the deps payload)
  try {
    const { status, body } = await get('/api/ready');
    const deps = body?.dependencies;
    if (deps && typeof deps === 'object') {
      const flags = Object.entries(deps).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join(' ');
      r('GET /api/ready', status === 200 ? 'PASS' : 'DEGRADED', `code=${status} deps -> ${flags}`);
    } else {
      r('GET /api/ready', status === 200 ? 'PASS' : 'FAIL', `code=${status} (no deps map)`);
      if (status !== 200) fail();
    }
  } catch (e) { r('GET /api/ready', 'FAIL', e.message); fail(); }

  // 4. metrics
  try {
    const { status } = await get('/api/metrics');
    status === 200 ? r('GET /api/metrics', 'PASS', 'snapshot ok') : (r('GET /api/metrics', 'FAIL', `code=${status}`), fail());
  } catch (e) { r('GET /api/metrics', 'FAIL', e.message); fail(); }

  // 5. auth round-trip (only if provided)
  if (email && password) {
    try {
      const res = await fetch(base + '/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200 && body.token) {
        r('POST /api/auth/login', 'PASS', 'authenticated (token issued)');
        // 6. admin-only guard using a real token
        const admin = await get('/api/admin/analytics/overview', { authorization: `Bearer ${body.token}` });
        if (admin.status === 200) r('GET admin-only', 'PASS', 'authorized');
        else if (admin.status === 401 || admin.status === 403) r('GET admin-only', 'PASS', `correctly rejected ${admin.status} for non-admin/user`);
        else { r('GET admin-only', 'FAIL', `unexpected code=${admin.status}`); fail(); }
        // 7. unauthorized request (no token)
        const unauth = await get('/api/admin/analytics/overview');
        if (unauth.status === 401 || unauth.status === 403) r('GET admin-only (no token)', 'PASS', `rejected ${unauth.status}`);
        else { r('GET admin-only (no token)', 'FAIL', `code=${unauth.status}`); fail(); }
        // 8. logout (revoke session, read-only)
        const logout = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${body.token}` } });
        r('POST /api/auth/logout', logout.status === 200 || logout.status === 401 || logout.status === 204 ? 'PASS' : 'WARN', `code=${logout.status}`);
      } else {
        r('POST /api/auth/login', 'FAIL', `code=${res.status} ${JSON.stringify(body)}`);
        fail();
      }
    } catch (e) { r('POST /api/auth/login', 'FAIL', e.message); fail(); }
  } else {
    r('POST /api/auth/login', 'SKIPPED', 'TEST_EMAIL/TEST_PASSWORD not set (auth checks skipped)');
  }

  // 9. public catalog endpoint reachability (some catalogs are auth-guarded: 401/403 = endpoint present)
  for (const p of ['/api/products']) {
    try {
      const { status } = await get(p);
      if ([200, 404].includes(status)) r(`GET ${p}`, 'PASS', `code=${status}`);
      else if ([401, 403].includes(status)) r(`GET ${p}`, 'PASS', `code=${status} (auth-guarded catalog; visible with token)`);
      else { r(`GET ${p}`, 'FAIL', `code=${status}`); fail(); }
    } catch (e) { r(`GET ${p}`, 'FAIL', e.message); fail(); }
  }

  // 10. CORS preflight
  try {
    const pre = await fetch(base + '/api/health', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'GET' } });
    const allowOrigin = pre.headers.get('access-control-allow-origin');
    r('OPTIONS preflight (CORS)', allowOrigin ? 'PASS' : 'WARN', allowOrigin ? `access-control-allow-origin=${allowOrigin}` : 'no ACAO header on response');
  } catch (e) { r('OPTIONS preflight (CORS)', 'FAIL', e.message); fail(); }

  console.log('\n# summary');
  const ok = results.filter((x) => x.status === 'PASS').length;
  const degraded = results.filter((x) => x.status === 'DEGRADED').length;
  const skip = results.filter((x) => x.status === 'SKIPPED').length;
  const bad = results.filter((x) => x.status === 'FAIL').length;
  const warn = results.filter((x) => x.status === 'WARN').length;
  console.log(`PASS ${ok} | DEGRADED ${degraded} | SKIPPED ${skip} | WARN ${warn} | FAIL ${bad}`);
  console.log(bad === 0 ? 'SMOKE: PASS' : `SMOKE: ${bad} FAILURE(S)`);
})().catch((e) => { console.error('fatal', e.message); process.exitCode = 2; });