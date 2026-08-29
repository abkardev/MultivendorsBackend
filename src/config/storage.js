import dotenv from 'dotenv';
dotenv.config();

export const STORAGE_CONFIG = {
  provider: process.env.STORAGE_PROVIDER || 'cloudflare_r2',
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    r2: {
      accessKeyId: process.env.CF_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CF_R2_SECRET_ACCESS_KEY,
      publicBucket: process.env.CF_R2_PUBLIC_BUCKET || 'manus-public',
      protectedBucket: process.env.CF_R2_PROTECTED_BUCKET || 'manus-protected',
      publicUrl: process.env.CF_R2_PUBLIC_URL,
    },
    cdn: {
      zoneId: process.env.CF_CDN_ZONE_ID,
      domain: process.env.CF_CDN_DOMAIN,
      apiToken: process.env.CF_CDN_API_TOKEN,
    },
    images: {
      enabled: process.env.CF_IMAGES_ENABLED === 'true',
      accountHash: process.env.CF_IMAGES_ACCOUNT_HASH,
      apiToken: process.env.CF_IMAGES_API_TOKEN,
      defaultQuality: parseInt(process.env.CF_IMAGES_DEFAULT_QUALITY || '85'),
      formats: ['webp', 'avif'],
    },
    turnstile: {
      siteKey: process.env.CF_TURNSTILE_SITE_KEY,
      secretKey: process.env.CF_TURNSTILE_SECRET_KEY,
    },
    stream: {
      enabled: process.env.CF_STREAM_ENABLED === 'true',
      apiToken: process.env.CF_STREAM_API_TOKEN,
    },
  },
};

export const FILE_CATEGORIES = {
  products: {
    images: { path: 'products/images', public: true, maxSize: 5 * 1024 * 1024, allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] },
    documents: { path: 'products/documents', public: false, maxSize: 20 * 1024 * 1024, allowedMimes: ['application/pdf'] },
  },
  vendors: {
    logos: { path: 'vendors/logos', public: true, maxSize: 2 * 1024 * 1024, allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] },
    'commercial-registrations': { path: 'vendors/commercial-registrations', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'] },
    'tax-certificates': { path: 'vendors/tax-certificates', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'] },
    'factory-licenses': { path: 'vendors/factory-licenses', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'] },
    'iso-certificates': { path: 'vendors/iso-certificates', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png'] },
  },
  rfqs: {
    attachments: { path: 'rfqs/attachments', public: false, maxSize: 20 * 1024 * 1024, allowedMimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
    drawings: { path: 'rfqs/drawings', public: false, maxSize: 50 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png', 'application/dwg', 'application/dxf'] },
    specifications: { path: 'rfqs/specifications', public: false, maxSize: 20 * 1024 * 1024, allowedMimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  },
  tenders: {
    documents: { path: 'tenders/documents', public: false, maxSize: 50 * 1024 * 1024, allowedMimes: ['application/pdf'] },
  },
  orders: {
    invoices: { path: 'orders/invoices', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['application/pdf'] },
  },
  contracts: {
    agreements: { path: 'contracts/agreements', public: false, maxSize: 20 * 1024 * 1024, allowedMimes: ['application/pdf'] },
  },
  factories: {
    images: { path: 'factories/images', public: true, maxSize: 10 * 1024 * 1024, allowedMimes: ['image/jpeg', 'image/png', 'image/webp'] },
    videos: { path: 'factories/videos', public: false, maxSize: 200 * 1024 * 1024, allowedMimes: ['video/mp4', 'video/quicktime'] },
  },
  support: {
    attachments: { path: 'support/attachments', public: false, maxSize: 20 * 1024 * 1024, allowedMimes: ['application/pdf', 'image/jpeg', 'image/png', 'application/zip'] },
  },
  general: {
    uploads: { path: 'uploads', public: false, maxSize: 10 * 1024 * 1024, allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] },
  },
};

export const SIGNED_URL_EXPIRY = {
  default: 15 * 60,
  view: 60 * 60,
  download: 30 * 60,
  share: 24 * 60 * 60,
};

export const STORAGE_LIMITS = {
  maxFileSize: 200 * 1024 * 1024,
  maxUploadsPerMinute: 10,
  totalStoragePerVendor: 5 * 1024 * 1024 * 1024,
};
