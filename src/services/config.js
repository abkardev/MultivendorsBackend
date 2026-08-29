const ENV = process.env.NODE_ENV || 'development';

const config = {
  env: ENV,
  isDev: ENV === 'development',
  isTest: ENV === 'testing',
  isStaging: ENV === 'staging',
  isProd: ENV === 'production',

  server: {
    port: parseInt(process.env.PORT) || 9000,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    backendUrl: process.env.BACKEND_URL || `http://localhost:${parseInt(process.env.PORT) || 9000}`,
    trustProxy: ENV === 'production',
    corsOrigins: (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:8080').split(',').map(s => s.trim()),
  },

  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/manus',
    options: {
      maxPoolSize: parseInt(process.env.DB_MAX_POOL) || 10,
      minPoolSize: parseInt(process.env.DB_MIN_POOL) || 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '7d',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600000,
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION) || 900000,
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'cloudflare_r2',
    r2: {
      endpoint: process.env.R2_ENDPOINT,
      accessKey: process.env.R2_ACCESS_KEY,
      secretKey: process.env.R2_SECRET_KEY,
      bucket: process.env.R2_BUCKET || 'manus-uploads',
      publicUrl: process.env.R2_PUBLIC_URL,
      region: process.env.R2_REGION || 'auto',
    },
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 10485760,
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || ['image/jpeg', 'image/png', 'application/pdf'],
  },

  rateLimit: {
    api: { windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_API) || 200 },
    auth: { windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_AUTH) || 20 },
    ai: { windowMs: 15 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_AI) || 30 },
    payment: { windowMs: 60 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_PAYMENT) || 20 },
    upload: { windowMs: 60 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_UPLOAD) || 50 },
    webhook: { windowMs: 1 * 60 * 1000, max: parseInt(process.env.RATE_LIMIT_WEBHOOK) || 60 },
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    category: process.env.LOG_CATEGORY || 'api',
    pretty: ENV !== 'production',
  },

  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    path: process.env.SWAGGER_PATH || '/api-docs',
  },

  maintenance: {
    enabled: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'System is under maintenance. Please try again later.',
    eta: process.env.MAINTENANCE_ETA || '',
    whitelist: (process.env.MAINTENANCE_WHITELIST || '').split(',').filter(Boolean),
  },

  features: {
    aiSearch: process.env.FEATURE_AI_SEARCH !== 'false',
    aiProductAssistant: process.env.FEATURE_AI_PRODUCT_ASSISTANT !== 'false',
    aiRfqAssistant: process.env.FEATURE_AI_RFQ_ASSISTANT !== 'false',
    procurement: process.env.FEATURE_PROCUREMENT !== 'false',
    tender: process.env.FEATURE_TENDER !== 'false',
    advertisements: process.env.FEATURE_ADVERTISEMENTS !== 'false',
    autoTranslation: process.env.FEATURE_AUTO_TRANSLATION !== 'false',
    whatsapp: process.env.FEATURE_WHATSAPP !== 'false',
    governmentVerification: process.env.FEATURE_GOVERNMENT_VERIFICATION !== 'false',
    reputationRanking: process.env.FEATURE_REPUTATION_RANKING !== 'false',
    reputationAiInsights: process.env.FEATURE_REPUTATION_AI_INSIGHTS !== 'false',
    reputationAutoRecalculation: process.env.FEATURE_REPUTATION_AUTO_RECALC !== 'false',
    reputationBadgeSystem: process.env.FEATURE_REPUTATION_BADGE !== 'false',
    reputationSearchWeight: process.env.FEATURE_REPUTATION_SEARCH_WEIGHT !== 'false',
    reputationRfqWeight: process.env.FEATURE_REPUTATION_RFQ_WEIGHT !== 'false',
    reputationProcurementWeight: process.env.FEATURE_REPUTATION_PROCUREMENT_WEIGHT !== 'false',
  },

  payments: {
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
    },
    hyperpay: {
      entityId: process.env.HYPERPAY_ENTITY_ID,
      accessToken: process.env.HYPERPAY_ACCESS_TOKEN,
      webhookSecret: process.env.HYPERPAY_WEBHOOK_SECRET,
    },
    moyasar: {
      publishableKey: process.env.MOYASAR_PUBLISHABLE_KEY,
      secretKey: process.env.MOYASAR_SECRET_KEY,
      webhookSecret: process.env.MOYASAR_WEBHOOK_SECRET,
    },
  },

  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'noreply@manus.com',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 2000,
    temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
  },
};

export function get(key, defaultValue) {
  const keys = key.split('.');
  let value = config;
  for (const k of keys) {
    if (value === undefined || value === null) return defaultValue;
    value = value[k];
  }
  return value !== undefined ? value : defaultValue;
}

export function isEnvironment(env) {
  return ENV === env;
}

export default config;
