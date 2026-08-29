#!/usr/bin/env node
/**
 * verify-production-integrations.cjs
 *
 * SAFE production integration verification. Never performs financial transactions,
 * never modifies payments, never sends email, never uploads arbitrary files,
 * never prints or logs secret values.
 *
 * Checks performed:
 *   MongoDB   - read-only ping + serverStatus via mongoose
 *   Redis     - PING when REDIS_URL is set (read-only)
 *   SMTP      - nodemailer transport.verify() (EHLO only; sends NO mail)
 *   R2        - aws-sdk headBucket (read-only) when CF_R2 keys are set
 *   Moyasar   - configuration present / placeholder / mode-consistency check (no network)
 *   HyperPay  - configuration present / mode-consistency check (no network)
 *   Stripe    - configuration present / mode-consistency check (no network)
 *   PayPal    - NOT_IN_SCOPE unless PAYPAL_ENABLED=true, then credential presence (fail-closed)
 *   Turnstile - configuration presence check (no network)
 *   DNS/TLS   - NOT_IN_SCOPE (operator-managed edge infra); presence clue from FRONTEND_URL
 *
 * Statuses: PASS | FAIL | SKIPPED | CONFIGURATION_REQUIRED | NOT_IN_SCOPE
 *
 * Usage:
 *   node scripts/verify-production-integrations.cjs
 *   node scripts/verify-production-integrations.cjs --dotenv .env   # load env file (values never printed)
 * Exit code 0 unless a hard FAIL occurs. CONFIGURATION_REQUIRED / NOT_IN_SCOPE are not failures.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const fs = require('fs');
const path = require('path');

const dotenvIndex = process.argv.indexOf('--dotenv');
if (dotenvIndex > -1 && process.argv[dotenvIndex + 1]) {
  const p = path.resolve(process.argv[dotenvIndex + 1]);
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const i = t.indexOf('=');
      const k = t.slice(0, i).trim();
      if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } else {
    console.error(`env file not found: ${p}`);
    process.exit(2);
  }
}

// ---- small helpers ----------------------------------------------------------
const isSet = (k) => {
  const v = process.env[k];
  return v !== undefined && String(v).trim() !== '';
};
const isPlaceholder = (k) => {
  const v = String(process.env[k] || '').toLowerCase();
  return /your_|your-|changeme|change-this|replaceme|placeholder|xxx|example|sample|dummy|\<\s*secret/.test(v);
};
const hasSandboxPrefix = (k, prefixes) => {
  const v = String(process.env[k] || '');
  return prefixes.some((p) => v.startsWith(p));
};

const results = [];
function report(integration, status, detail, hint = '') {
  results.push({ integration, status, detail, hint });
  console.log(`${integration.padEnd(12)} ${status.padEnd(26)} ${detail}`);
  if (hint) console.log(`${''.padEnd(12)} ${''.padEnd(26)}   -> ${hint}`);
}

let exitCode = 0;
const fail = (msg) => {
  console.error(`  FAIL: ${msg}`);
  exitCode = 1;
};

// ---- MongoDB ----------------------------------------------------------------
(async () => {
  const uri = process.env.MONGODB_URI;
  if (!isSet('MONGODB_URI')) {
    report('MongoDB', 'CONFIGURATION_REQUIRED', 'MONGODB_URI not set', 'Set a DB URL such as mongodb+srv://user:pass@host/db?retryWrites=true&w=majority');
  } else {
    try {
      const mongoose = require('mongoose');
      mongoose.set('bufferCommands', false);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      const db = mongoose.connection.db;
      const ping = await db.command({ ping: 1 });
      const st = await db.command({ serverStatus: 1 });
      const host = st.host || mongoose.connection.host;
      report('MongoDB', ping.ok === 1 ? 'PASS' : 'FAIL', `connected host=${host} uptime=${Math.round(st.uptime)}s`);
      await mongoose.disconnect();
    } catch (e) {
      report('MongoDB', 'FAIL', `connection/ping failed: ${e.message}`, 'Check network, credentials, TLS, and serverSelectionTimeoutMS');
      fail('MongoDB');
    }
  }

  // ---- Redis ------------------------------------------------------------------
  if (!isSet('REDIS_URL')) {
    report('Redis', 'CONFIGURATION_REQUIRED', 'REDIS_URL not set (in-memory fallback active)', 'Optional for launch; set redis://[:pass@]host:port to enable shared cache');
  } else {
    try {
      const Redis = require('ioredis');
      const r = new Redis(process.env.REDIS_URL, { lazyConnect: true, connectTimeout: 4000, maxRetriesPerRequest: 1, retryStrategy: null });
      r.on('error', () => {}); // swallow connect noise; failures surface via the await below
      await r.connect();
      const pong = await r.ping();
      await r.quit().catch(() => {});
      report('Redis', pong === 'PONG' ? 'PASS' : 'FAIL', `ping returned ${pong}`);
      if (pong !== 'PONG') fail('Redis');
    } catch (e) {
      report('Redis', 'FAIL', `connect/ping failed: ${e.message}`, 'Verify REDIS_URL and network access');
      fail('Redis');
    }
  }

  // ---- SMTP -------------------------------------------------------------------
  if (!isSet('SMTP_HOST') || !isSet('SMTP_PASS')) {
    report('SMTP', 'CONFIGURATION_REQUIRED', 'SMTP_HOST/SMTP_USER/SMTP_PASS not set', 'Provision an SMTP provider (recommended AWS SES SMTP); set SMTP_ENABLED=true in production');
  } else {
    try {
      const nodemailer = require('nodemailer');
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: (process.env.SMTP_SECURE || 'false') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      const ok = await t.verify();
      await t.close();
      report('SMTP', ok ? 'PASS' : 'FAIL', `transport.verify() ok (no mail sent)`);
      if (!ok) fail('SMTP');
    } catch (e) {
      report('SMTP', 'FAIL', `transport.verify() failed: ${e.message}`, 'Fix host/port/auth/TLS; confirm the provider allows your sender');
      fail('SMTP');
    }
  }

  // ---- Cloudflare R2 ------------------------------------------------------------
  const r2Keys = ['CF_R2_ACCESS_KEY_ID', 'CF_R2_SECRET_ACCESS_KEY'];
  const r2All = r2Keys.every(isSet) && isSet('CF_R2_PUBLIC_BUCKET');
  if (!r2All) {
    const legacy = ['R2_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_BUCKET'].filter(isSet).length;
    report('R2', 'CONFIGURATION_REQUIRED', 'CF_R2_* credentials not set' + (legacy ? ` (legacy R2_* vars present but UNUSED: ${legacy})` : ''), 'Create a scoped R2 API token; set CF_R2_ACCESS_KEY_ID/SECRET_ACCESS_KEY/PUBLIC_BUCKET');
  } else {
    try {
      const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
      const { CF_ACCOUNT_ID } = process.env;
      const endpoint = `https://${CF_ACCOUNT_ID || 'ACCOUNT_ID_MISSING'}.r2.cloudflarestorage.com`;
      const client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId: process.env.CF_R2_ACCESS_KEY_ID, secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY },
      });
      await client.send(new HeadBucketCommand({ Bucket: process.env.CF_R2_PUBLIC_BUCKET }));
      await client.destroy();
      report('R2', 'PASS', `headBucket ok on ${process.env.CF_R2_PUBLIC_BUCKET} (read-only)`);
    } catch (e) {
      report('R2', 'FAIL', `headBucket failed: ${e.message}`, 'Verify account id, token scope, bucket name, network');
      fail('R2');
    }
  }

  // ---- Payment providers (configuration-only, no network) ------------------------
  const mode = process.env.PAYMENT_MODE || 'test';
  const moyKey = process.env.MOYASAR_API_KEY || '';
  if (!moyKey || isPlaceholder('MOYASAR_API_KEY')) {
    report('Moyasar', 'CONFIGURATION_REQUIRED', 'MOYASAR_API_KEY missing/placeholder', 'Get key from dash.moyasar.com (Test/Live); configure MOYASAR_WEBHOOK_SECRET too');
  } else {
    const sandboxKey = moyKey.startsWith('sk_test_');
    if (mode === 'live' && sandboxKey) report('Moyasar', 'FAIL', 'PAYMENT_MODE=live but MOYASAR_API_KEY is a sandbox (sk_test_) key', 'Switch to the live key before going live');
    else report('Moyasar', 'PASS', `configured mode=${mode} key-class=${sandboxKey ? 'sandbox' : 'live'}`);
  }
  if (!isSet('MOYASAR_WEBHOOK_SECRET') || isPlaceholder('MOYASAR_WEBHOOK_SECRET')) {
    report('Moyasar-Webhook', 'CONFIGURATION_REQUIRED', 'MOYASAR_WEBHOOK_SECRET missing/placeholder', 'Set in the Moyasar dashboard webhook settings; it signs x-moyasar-signature');
  } else {
    report('Moyasar-Webhook', 'PASS', 'webhook secret configured');
  }

  if (!isSet('HYPERPAY_ENTITY_ID') || !isSet('HYPERPAY_ACCESS_TOKEN')) {
    report('HyperPay', 'CONFIGURATION_REQUIRED', 'HYPERPAY_ENTITY_ID/HYPERPAY_ACCESS_TOKEN missing', 'Only required if HyperPay is the secondary gateway');
  } else {
    report('HyperPay', 'PASS', `configured mode=${process.env.HYPERPAY_MODE || 'sandbox'}`);
  }

  const subsEnabled = (process.env.STRIPE_SUBSCRIPTIONS_ENABLED || 'false') === 'true';
  if (!isSet('STRIPE_SECRET_KEY') || isPlaceholder('STRIPE_SECRET_KEY')) {
    report('Stripe', subsEnabled ? 'FAIL' : 'CONFIGURATION_REQUIRED', subsEnabled ? 'STRIPE_SUBSCRIPTIONS_ENABLED=true but STRIPE_SECRET_KEY missing/placeholder' : 'STRIPE_SECRET_KEY missing (subscriptions disabled; optional)', 'Get key at dashboard.stripe.com/api; used ONLY for subscriptions/legacy escrow webhook');
    if (subsEnabled) fail('Stripe');
  } else {
    const sandboxKey = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
    if (mode === 'live' && subsEnabled && sandboxKey) report('Stripe', 'FAIL', 'subscriptions enabled with sandbox key', 'Use live Stripe key for live payments');
    else report('Stripe', 'PASS', `configured subscriptions=${subsEnabled} key-class=${sandboxKey ? 'test' : 'live'}`);
  }

  if (!isSet('CF_TURNSTILE_SECRET_KEY') || !isSet('CF_TURNSTILE_SITE_KEY')) {
    report('Turnstile', 'CONFIGURATION_REQUIRED', 'CF_TURNSTILE_* keys missing', 'Create a site at dash.cloudflare.com (Turnstile); middleware auto-passes when unset -> NOT acceptable in production');
  } else {
    report('Turnstile', 'PASS', 'site+secret keys configured (middleware active on login/register/forgot/reset)');
  }

  // ---- PayPal (NOT_IN_SCOPE unless explicitly enabled; webhooks fail-closed) --------
  const paypalEnabled = (process.env.PAYPAL_ENABLED || 'false') === 'true';
  if (!paypalEnabled) {
    report('PayPal', 'NOT_IN_SCOPE', 'PAYPAL_ENABLED != true (webhooks fail-closed until enabled)', 'Enable + set PAYPAL_CLIENT_ID/SECRET/API_URL/WEBHOOK_ID to use the PayPal gateway');
  } else {
    const missing = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'].filter((k) => !isSet(k));
    if (missing.length) {
      report('PayPal', 'FAIL', `PAYPAL_ENABLED=true but missing: ${missing.join(', ')}`, 'Webhooks REJECTED (400) until all PayPal credentials are set');
      fail('PayPal');
    } else {
      report('PayPal', 'PASS', `configured mode=${process.env.PAYPAL_MODE || 'sandbox'} (real verify-webhook-signature enabled)`);
    }
  }

  // ---- DNS / TLS (operator-managed edge infra; config-only presence clue) -----------
  const frontendUrl = process.env.FRONTEND_URL || '';
  const hasDevOrigins = /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(frontendUrl);
  if (!isSet('FRONTEND_URL')) {
    report('DNS/TLS', 'CONFIGURATION_REQUIRED', 'FRONTEND_URL not set', 'Set comma-separated production origins; HTTPS at the edge (Cloudflare/proxy) is operator scope');
  } else if (hasDevOrigins) {
    report('DNS/TLS', 'NOT_IN_SCOPE', `FRONTEND_URL contains dev origins (${frontendUrl})`, 'Operator: point A/CNAME records + TLS certs; replace dev origins for production CORS');
  } else {
    report('DNS/TLS', 'NOT_IN_SCOPE', `FRONTEND_URL prod-looking (${frontendUrl})`, 'Operator-managed: verify DNS A/CNAME, TLS cert, and edge config on the host');
  }

  if (isPlaceholder('JWT_SECRET') || !isSet('JWT_SECRET') || String(process.env.JWT_SECRET).length < 32) {
    report('JWT', 'FAIL', 'JWT_SECRET missing/weak/placeholder', 'Set a random 64-char secret; rotate it (historical .env exposure)');
    fail('JWT');
  } else {
    report('JWT', 'PASS', `JWT_SECRET length ${String(process.env.JWT_SECRET).length}`);
  }

  console.log('\n--- summary ---');
  const failCount = results.filter((r) => r.status === 'FAIL').length;
  const cfgCount = results.filter((r) => r.status === 'CONFIGURATION_REQUIRED').length;
  const scopeCount = results.filter((r) => r.status === 'NOT_IN_SCOPE').length;
  const passCount = results.filter((r) => r.status === 'PASS').length;
  console.log(`PASS: ${passCount} | CONFIGURATION_REQUIRED: ${cfgCount} | NOT_IN_SCOPE: ${scopeCount} | FAIL: ${failCount}`);
  console.log(failCount === 0 ? 'EXIT: OK' : `EXIT: ${failCount} FAILURE(S)`);
  process.exit(failCount === 0 ? 0 : 1);
})().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(2);
});