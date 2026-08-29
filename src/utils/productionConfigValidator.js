import { getLogger } from '../services/logger.js';

const logger = getLogger('security');

// Production startup gate: refuse to boot in NODE_ENV=production when a
// mandatory dependency is not configured. Development/test environments keep
// their existing lenient behaviour.
export function validateProductionConfig() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const results = { ok: true, missing: [], warnings: [] };
  if (NODE_ENV !== 'production') return results;

  const has = (name) => !!process.env[name] && String(process.env[name]).trim() !== '';

  const critical = [
    { name: 'JWT_SECRET', reason: 'authentication' },
    { name: 'MONGODB_URI', reason: 'database connection' },
    { name: 'FRONTEND_URL', reason: 'CORS origin + links (password reset)' },
  ];

  // Storage: R2 is required unless a legacy storage provider is explicitly selected.
  const storageProvider = process.env.STORAGE_PROVIDER || 'cloudflare_r2';
  if (storageProvider === 'cloudflare_r2') {
    critical.push(
      { name: 'CF_ACCOUNT_ID', reason: 'Cloudflare account for R2' },
      { name: 'CF_R2_ACCESS_KEY_ID', reason: 'R2 access key' },
      { name: 'CF_R2_SECRET_ACCESS_KEY', reason: 'R2 secret key' },
      { name: 'CF_R2_PUBLIC_URL', reason: 'public bucket URL' },
    );
  }

  // Email: required unless the operator explicitly disabled SMTP.
  if (process.env.SMTP_ENABLED !== 'false') {
    critical.push({ name: 'SMTP_HOST', reason: 'transactional email (password reset/2FA)' });
    critical.push({ name: 'SMTP_PORT', reason: 'transactional email' });
  } else {
    results.warnings.push('SMTP_ENABLED=false set — email is disabled in production');
  }

  // Payment: at least one live card provider must be configured.
  const paymentMode = process.env.PAYMENT_MODE || 'live';
  const moyasar = has('MOYASAR_API_KEY') && has('MOYASAR_WEBHOOK_SECRET');
  const hyperpay = has('HYPERPAY_ENTITY_ID') && has('HYPERPAY_ACCESS_TOKEN') && has('HYPERPAY_WEBHOOK_SECRET');
  if (paymentMode !== 'live') {
    results.missing.push({ name: 'PAYMENT_MODE', reason: `must be "live"; current value ${paymentMode || '(unset)'}` });
  }
  if (!moyasar && !hyperpay) {
    critical.push({
      name: 'MOYASAR_API_KEY|HYPERPAY_ENTITY_ID',
      reason: 'at least one live payment provider (Moyasar and/or HyperPay) must be configured',
    });
  }

  // Bot protection: Turnstile keys required on auth forms.
  critical.push({ name: 'CF_TURNSTILE_SITE_KEY', reason: 'Turnstile widget key' });
  critical.push({ name: 'CF_TURNSTILE_SECRET_KEY', reason: 'Turnstile server key' });

  for (const item of critical) {
    if (!has(item.name)) results.missing.push(item);
  }

  if (!has('REDIS_URL')) {
    results.warnings.push('REDIS_URL not set — cache will use in-memory fallback (not recommended in production)');
  }

  results.ok = results.missing.length === 0;
  return results;
}

export function enforceProductionConfig() {
  const results = validateProductionConfig();
  for (const w of results.warnings) logger.warn(`[config] ${w}`);
  if (results.ok) {
    logger.info('[config] Production configuration validated');
    return results;
  }
  logger.fatal('PRODUCTION CONFIGURATION INCOMPLETE — refusing to start');
  for (const item of results.missing) {
    logger.fatal(`  - ${item.name}: required for ${item.reason}`);
  }
  process.exit(1);
}