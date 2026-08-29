import { getLogger } from '../services/logger.js';

const logger = getLogger('security');

export function validateEnvironment() {
  const results = { critical: [], optional: [], warnings: [] };

  const checks = {
    critical: [
      { name: 'JWT_SECRET', message: 'JWT secret is required for authentication' },
      { name: 'MONGODB_URI', message: 'MongoDB URI is required for database connection' },
      { name: 'FRONTEND_URL', message: 'Frontend URL is required for CORS' },
    ],
    production: [
      { name: 'CF_ACCOUNT_ID', message: 'Cloudflare account ID required for R2 storage' },
      { name: 'CF_R2_ACCESS_KEY_ID', message: 'R2 access key ID required for file storage' },
      { name: 'CF_R2_SECRET_ACCESS_KEY', message: 'R2 secret access key required for file storage' },
      { name: 'CF_R2_PUBLIC_URL', message: 'R2 public bucket URL required for public assets' },
      { name: 'SMTP_HOST', message: 'SMTP host required for transactional email' },
      { name: 'SMTP_PORT', message: 'SMTP port required for transactional email' },
      { name: 'PAYMENT_MODE', message: 'PAYMENT_MODE must be explicitly set to live in production' },
      { name: 'MOYASAR_API_KEY', message: 'Moyasar API key required for primary card payments (KSA)' },
      { name: 'MOYASAR_WEBHOOK_SECRET', message: 'Moyasar webhook secret required to verify payment webhooks' },
      { name: 'HYPERPAY_ENTITY_ID', message: 'HyperPay entity ID required for fallback card payments (KSA)' },
      { name: 'HYPERPAY_ACCESS_TOKEN', message: 'HyperPay access token required for fallback card payments' },
      { name: 'HYPERPAY_WEBHOOK_SECRET', message: 'HyperPay webhook secret required to verify fallback webhooks' },
      { name: 'CF_TURNSTILE_SITE_KEY', message: 'Turnstile site key required for bot protection on auth forms' },
      { name: 'CF_TURNSTILE_SECRET_KEY', message: 'Turnstile secret key required to verify auth tokens' },
      { name: 'STRIPE_SECRET_KEY', message: 'Stripe key required if subscription billing is enabled' },
    ],
    optional: [
      { name: 'LOG_LEVEL', message: 'Log level defaults to info', defaultValue: 'info' },
      { name: 'PORT', message: 'Port defaults to 9000', defaultValue: '9000' },
      { name: 'NODE_ENV', message: 'Environment defaults to development', defaultValue: 'development' },
    ],
  };

  const NODE_ENV = process.env.NODE_ENV || 'development';

  for (const check of checks.critical) {
    if (!process.env[check.name]) {
      results.critical.push(check);
    }
  }

  if (NODE_ENV === 'production') {
    for (const check of checks.production) {
      if (!process.env[check.name]) {
        results.warnings.push(check);
      }
    }
  }

  for (const check of checks.optional) {
    if (!process.env[check.name]) {
      results.optional.push(check);
    }
  }

  return results;
}

export function printStartupDiagnostics(results) {
  logger.info('=== Environment Validation ===');

  if (results.critical.length > 0) {
    logger.fatal('CRITICAL VARIABLES MISSING:');
    for (const v of results.critical) {
      logger.fatal(`  - ${v.name}: ${v.message}`);
    }
    logger.fatal('Application cannot start without critical variables');
    process.exit(1);
  }

  if (results.warnings.length > 0) {
    logger.warn('PRODUCTION RECOMMENDATIONS:');
    for (const v of results.warnings) {
      logger.warn(`  - ${v.name}: ${v.message}`);
    }
  }

  if (results.optional.length > 0) {
    logger.debug('OPTIONAL CONFIGURATIONS (using defaults):');
    for (const v of results.optional) {
      logger.debug(`  - ${v.name}: ${v.message} (default: ${v.defaultValue})`);
    }
  }

  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Log Level: ${process.env.LOG_LEVEL || 'info'}`);
  logger.info('=== Validation Complete ===');
}
