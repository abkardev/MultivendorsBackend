import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { dbConnect } from "./src/utils/utils.js";
import config from "./src/services/config.js";
import helmet from "helmet";
import { requestLogger } from './src/services/logger.js';
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import { errorHandler, notFound } from "./src/middlewares/errorHandler.js";
import { maintenanceMode } from './src/middlewares/maintenanceMode.js';
import { apiVersion } from './src/middlewares/apiVersion.js';

// Import routes
import userRouter from "./src/routes/userRoutes.js";
import realVendorRouter from "./src/routes/vendorRoutes.js";
import productRouter from "./src/routes/productRoutes.js";
import brandRouter from "./src/routes/brandRoutes.js";
import categoryRouter from "./src/routes/categoryRoutes.js";
import subcategoryRouter from "./src/routes/subCategoryRoutes.js";
import wishlistRouter from "./src/routes/wishlistRoutes.js";
import reviewRouter from "./src/routes/reviewRoutes.js";
import uploadRouter from "./src/routes/uploadRoutes.js";
import orderRouter from "./src/routes/orderRoutes.js";
import supportRouter from "./src/routes/supportRoutes.js";
import chatRouter from "./src/routes/chatRoutes.js";
import announcementRouter from "./src/routes/announcementRoutes.js";
import aiSearchRouter from "./src/routes/aiSearchRoutes.js";
import escrowRoutes from './src/routes/escrowRoutes.js';
import verificationRouter from './src/routes/verificationRoutes.js';
import tenderRouter from './src/routes/tenderRoutes.js';
import buyingRequestRouter from './src/routes/buyingRequestRoutes.js';
import whatsappRouter from './src/routes/whatsappRoutes.js';
import crmRouter from './src/routes/crmRoutes.js';
import aiRouter from './src/routes/aiRoutes.js';
import recommendationRouter from './src/routes/recommendationRoutes.js';
import advertisingRouter from './src/routes/advertisingRoutes.js';
import procurementRouter from './src/routes/procurementRoutes.js';
import advancedRfqRouter from './src/routes/advancedRfqRoutes.js';
import analyticsRouter from './src/routes/analyticsRoutes.js';
import subscriptionRouter from './src/routes/subscriptionRoutes.js';
import shipmentRouter from './src/routes/shipmentRoutes.js';
import rbacRouter from './src/routes/rbacRoutes.js';
import auditRouter from './src/routes/auditRoutes.js';
import notificationRouter from './src/routes/notificationRoutes.js';
import settingsRouter from './src/routes/settingsRoutes.js';
import documentRouter from './src/routes/documentRoutes.js';
import approvalRouter from './src/routes/approvalRoutes.js';
import factoryRouter from './src/routes/factoryRoutes.js';
import warehouseRouter from './src/routes/warehouseRoutes.js';
import taxonomyRouter from './src/routes/taxonomyRoutes.js';
import specRouter from './src/routes/specRoutes.js';
import storeEmployeeRouter from './src/routes/storeEmployeeRoutes.js';
import paymentRouter from './src/routes/paymentRoutes.js';
import complianceRouter from './src/routes/complianceRoutes.js';
import storageRouter from './src/routes/storageRoutes.js';
import translationRouter from './src/routes/translationRoutes.js';
import i18nRouter from './src/routes/i18nRoutes.js';
import vendorPaymentGatewayRouter from './src/routes/vendorPaymentGatewayRoutes.js';
import { storageRegistry } from './src/services/storage/index.js';
import { notificationService } from './src/services/notificationService.js';
import stripeWebhook from './src/webhooks/stripeWebhook.js';
import subscriptionWebhook from './src/controllers/subscriptionWebhook.js';
import paymentWebhookRouter from './src/routes/webhookRoutes.js';
import adminPaymentRouter from './src/routes/adminPaymentRoutes.js';
import quotationRoutes from './src/routes/quotationRoutes.js';
import negotiationRoutes from './src/routes/negotiationRoutes.js';
import procurementDocumentRoutes from './src/routes/procurementDocumentRoutes.js';
import healthRoutes from './src/routes/healthRoutes.js';
import metricsRoutes from './src/routes/metricsRoutes.js';
import analyticsOperationalRoutes from './src/routes/analyticsOperationalRoutes.js';
import swaggerRoutes from './src/routes/swaggerRoutes.js';
import featureFlagRoutes from './src/routes/featureFlagRoutes.js';
import deploymentRoutes from './src/routes/deploymentRoutes.js';
import rfqMatchingRoutes from './src/routes/rfqMatchingRoutes.js';
import aiTrustRoutes from './src/routes/aiTrustRoutes.js';
import reputationAdminRoutes from './src/routes/reputationAdminRoutes.js';
import buyerExperienceRoutes from './src/routes/buyerExperienceRoutes.js';
import commerceIntelligenceRoutes from './src/routes/commerceIntelligenceRoutes.js';
import executiveRoutes from './src/routes/executiveRoutes.js';
import autonomousProcurementRoutes from './src/routes/autonomousProcurementRoutes.js';
import agentOrchestratorRoutes from './src/routes/agentOrchestratorRoutes.js';
import { metricsMiddleware } from './src/services/metrics.js';

// Phase 4.5.6 Enterprise routes
import enterpriseConfigRoutes from './src/routes/enterpriseConfigRoutes.js';
import enterpriseCacheRoutes from './src/routes/enterpriseCacheRoutes.js';
import enterpriseSearchRoutes from './src/routes/enterpriseSearchRoutes.js';
import enterpriseDiagnosticsRoutes from './src/routes/enterpriseDiagnosticsRoutes.js';
import apiManagementRoutes from './src/routes/apiManagementRoutes.js';
import disasterRecoveryRoutes from './src/routes/disasterRecoveryRoutes.js';
import enterpriseMonitoringRoutes from './src/routes/enterpriseMonitoringRoutes.js';
import operationalAnalyticsRoutes from './src/routes/operationalAnalyticsRoutes.js';
import enterpriseAuditRoutes from './src/routes/enterpriseAuditRoutes.js';
import enterpriseSchedulerRoutes from './src/routes/enterpriseSchedulerRoutes.js';
import deploymentRoutesEnterprise from './src/routes/deploymentRoutes.js';
import securityRoutes from './src/routes/securityRoutes.js';
import enterpriseNotificationRoutes from './src/routes/enterpriseNotificationRoutes.js';

// Phase 4.6 Seller Growth routes
import sellerRoutes from './src/routes/sellerRoutes.js';

// Phase 4.7 Enterprise Operations routes
import enterpriseOpsRoutes from './src/routes/enterpriseOpsRoutes.js';

// Phase 4.8 Enterprise AI routes
import enterpriseAiRoutes from './src/routes/enterpriseAiRoutes.js';

// Phase 4.9 Enterprise Platform routes
import enterprisePlatformRoutes from './src/routes/enterprisePlatformRoutes.js';

// Phase 5.1 Enterprise Intelligence routes
import enterpriseIntelligenceRoutes from './src/routes/enterpriseIntelligenceRoutes.js';

// Phase 5.2 Enterprise Commercial routes
import enterpriseCommercialRoutes from './src/routes/enterpriseCommercialRoutes.js';

// Phase 6.0 Enterprise Scale routes
import enterpriseScaleRoutes from './src/routes/enterpriseScaleRoutes.js';

// Import socket handler
import { setupChatSocket } from "./src/sockets/chat.socket.js";
import { setupSupportSocket } from "./src/services/supportService.js";
import { rbacService } from './src/services/rbacService.js';
import { execSync } from 'child_process';

// Scheduler Registry — all cron jobs consolidated here
import { schedulerRegistry, initializeSchedulers } from './src/schedulers/schedulerRegistry.js';

// Load Environment Variables
dotenv.config();

// Validate required environment variables
import { validateEnvironment, printStartupDiagnostics } from './src/utils/envValidator.js';
const envResults = validateEnvironment();
printStartupDiagnostics(envResults);

// Production startup gate: refuse to boot when mandatory deps are missing.
import { enforceProductionConfig } from './src/utils/productionConfigValidator.js';
enforceProductionConfig();

// Connect to MongoDB
dbConnect();

// Bootstrap readiness: wait for Mongo/Redis before accepting traffic.
import { validateBootstrapReadiness } from './src/utils/readinessValidator.js';

try {
  const readiness = await validateBootstrapReadiness();
  if (!readiness.ok) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[ready] FAILED — db=${readiness.db} redis=${readiness.redis}`);
      process.exit(1);
    }
    console.warn(`[ready] degraded (dev allowed): db=${readiness.db} redis=${readiness.redis}`);
  } else {
    console.log(`[ready] ok — db=${readiness.db} redis=${readiness.redis}`);
  }
} catch (err) {
  if (process.env.NODE_ENV === 'production') { console.error('[ready] failed:', err.message); process.exit(1); }
}

// Initialize Express App
const app = express();

// Trust the first reverse-proxy hop (nginx / platform LB) in production so
// req.ip, rate limiting, audit logging and webhook IP capture see the real
// client IP instead of the proxy address. Dev keeps trust off.
app.set('trust proxy', config.server.trustProxy);

// Create HTTP Server for Socket.io
const httpServer = createServer(app);

const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:8080';
const allowedOrigins = rawOrigins.split(',').map(s => s.trim());

// Initialize Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Setup Socket.io handlers
setupChatSocket(io);

notificationService.setSocketIO(io);
setupSupportSocket(io);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
  }
});

// Initialize all scheduler jobs from the registry
initializeSchedulers();

// Maintenance Mode (earliest middleware, before everything except helmet)
app.use(maintenanceMode);

// API Versioning
app.use(apiVersion('v1'));

// Middleware Setup
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'", 'https://*.stripe.com', 'https://challenges.cloudflare.com', 'https://api.moyasar.com', 'https://payment.hyperpay.com', 'wss://*', 'ws://*'],
      frameSrc: ["'self'", 'https://*.stripe.com', 'https://challenges.cloudflare.com', 'https://payment.hyperpay.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'self'", 'blob:'],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: { features: { camera: [], microphone: [], geolocation: [] } },
  hidePoweredBy: true,
}));
app.use(requestLogger);
app.set('etag', 'strong');
app.use(compression());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { status: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { status: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: false, message: 'AI request limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { status: false, message: 'Too many sensitive operations, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { status: false, message: 'Upload limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { status: false, message: 'Too many payment operations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { status: false, message: 'Too many support requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to auth routes and general API
app.use('/api/user/login', authLimiter);
app.use('/api/user/register', authLimiter);
app.use('/api/user/forgot-password', authLimiter);
app.use('/api/user/verify-2fa', authLimiter);
app.use('/api/user/send-2fa-email', authLimiter);
app.use('/api/user/reset-password', authLimiter);
app.use('/api/user/change-password', authLimiter);
app.use('/api/user/2fa', authLimiter);
app.use('/api', apiLimiter);

// NoSQL injection protection
app.use(mongoSanitize());

// Webhook-specific rate limiter (higher limit for provider callbacks)
const webhookLimiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 60, message: { success: false, message: 'Too many webhook requests' }, standardHeaders: true, legacyHeaders: false, });
// Stripe Webhooks MUST be before express.json()
app.post('/api/webhooks/stripe', webhookLimiter, express.raw({ type: 'application/json' }), stripeWebhook);
app.post('/api/subscription/webhook', webhookLimiter, express.raw({ type: 'application/json' }), subscriptionWebhook);
app.use('/api/webhooks', webhookLimiter, paymentWebhookRouter);

app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware);

// Health check and metrics routes (no auth required)
app.use('/api', healthRoutes);
app.use('/api', metricsRoutes);

// Granular rate limiters for sensitive endpoints
app.use('/api/payment', paymentLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/support', supportLimiter);
app.use('/api/escrow', sensitiveLimiter);
app.use('/api/wallet', sensitiveLimiter);
app.use('/api/shipments', sensitiveLimiter);

// API Routes
app.use("/api/user", userRouter);
app.use("/api/vendor", realVendorRouter);
app.use("/api/product", productRouter);
app.use("/api/brand", brandRouter);
app.use("/api/category", categoryRouter);
app.use("/api/subcategory", subcategoryRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/review", reviewRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/order", orderRouter);
app.use("/api/support", supportRouter);
app.use("/api/chat", chatRouter);
app.use("/api/announcement", announcementRouter);
app.use("/api/search", aiSearchRouter);
app.use('/api', escrowRoutes);
app.use('/api', verificationRouter);
app.use('/api', tenderRouter);
app.use('/api', buyingRequestRouter);
app.use('/api', whatsappRouter);
app.use('/api', crmRouter);
app.use('/api/ai', aiLimiter);
app.use('/api', aiRouter);
app.use('/api', recommendationRouter);
app.use('/api', advertisingRouter);
app.use('/api', procurementRouter);
app.use('/api', advancedRfqRouter);
app.use('/api', analyticsRouter);
app.use('/api', subscriptionRouter);
app.use('/api', shipmentRouter);
app.use('/api', rbacRouter);
app.use('/api', auditRouter);
app.use('/api', notificationRouter);
app.use('/api', settingsRouter);
app.use('/api', documentRouter);
app.use('/api', approvalRouter);
app.use('/api', factoryRouter);
app.use('/api', warehouseRouter);
app.use('/api', paymentRouter);
app.use('/api', complianceRouter);
app.use('/api', storageRouter);
app.use('/api/taxonomy', taxonomyRouter);
app.use('/api/specs', specRouter);
app.use('/api/store-employees', storeEmployeeRouter);
app.use('/api/translate', translationRouter);
app.use('/api/i18n', i18nRouter);
app.use('/api/vendor', vendorPaymentGatewayRouter);
app.use('/api/admin/payments', adminPaymentRouter);
app.use('/api', quotationRoutes);
app.use('/api', negotiationRoutes);
app.use('/api', procurementDocumentRoutes);
app.use('/api', analyticsOperationalRoutes);
app.use('/api', featureFlagRoutes);
app.use('/api', deploymentRoutes);
app.use('/api', rfqMatchingRoutes);
app.use('/api', aiTrustRoutes);
app.use('/api', reputationAdminRoutes);
app.use('/api/buyer', buyerExperienceRoutes);
app.use('/api/intelligence', commerceIntelligenceRoutes);
app.use('/api/executive', executiveRoutes);
app.use('/api/autonomous', autonomousProcurementRoutes);
app.use('/api/orchestrator', agentOrchestratorRoutes);
app.use('/', swaggerRoutes);

// Phase 4.5.6 Enterprise route mounts
app.use('/api/enterprise/config', enterpriseConfigRoutes);
app.use('/api/enterprise/cache', enterpriseCacheRoutes);
app.use('/api/enterprise/search', enterpriseSearchRoutes);
app.use('/api/enterprise/diagnostics', enterpriseDiagnosticsRoutes);
app.use('/api/enterprise/api-management', apiManagementRoutes);
app.use('/api/enterprise/disaster-recovery', disasterRecoveryRoutes);
app.use('/api/enterprise/monitoring', enterpriseMonitoringRoutes);
app.use('/api/enterprise/analytics', operationalAnalyticsRoutes);
app.use('/api/enterprise/audit', enterpriseAuditRoutes);
app.use('/api/enterprise/scheduler', enterpriseSchedulerRoutes);
app.use('/api/enterprise/deployment', deploymentRoutesEnterprise);
app.use('/api/enterprise/security', securityRoutes);
app.use('/api/enterprise/notifications', enterpriseNotificationRoutes);

// Phase 4.6 Seller Growth route mounts
app.use('/api/seller', sellerRoutes);

// Phase 4.7 Enterprise Operations route mounts
app.use('/api', enterpriseOpsRoutes);

// Phase 4.8 Enterprise AI route mounts
app.use('/api', enterpriseAiRoutes);

// Phase 4.9 Enterprise Platform route mounts
app.use('/api', enterprisePlatformRoutes);

// Phase 5.1 Enterprise Intelligence route mounts
app.use('/api', enterpriseIntelligenceRoutes);

// Phase 5.2 Enterprise Commercial route mounts
app.use('/api', enterpriseCommercialRoutes);

// Phase 6.0 Enterprise Scale route mounts
app.use('/api', enterpriseScaleRoutes);

// Error Handler Middlewares
app.use(notFound);
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 9000;

function startServer(attempt = 0) {
  httpServer.listen(PORT);
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 3) {
      console.log(`Port ${PORT} in use, attempting to free it (attempt ${attempt + 1})...`);
      try {
        const result = execSync(`netstat -ano | findstr ":${PORT}" | findstr LISTENING`, { encoding: 'utf8', timeout: 5000 });
        const lines = result.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(pid)) {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore', timeout: 3000 });
            console.log(`Killed PID ${pid} on port ${PORT}`);
          }
        }
      } catch {}
      httpServer.removeAllListeners('error');
      setTimeout(() => startServer(attempt + 1), 1000);
    } else {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    }
  });
  httpServer.on('listening', async () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Socket.io is ready for connections`);

    try {
      await rbacService.initialize();
      console.log('RBAC system initialized');
    } catch (err) {
      console.error('RBAC initialization failed:', err.message);
    }

    try {
      storageRegistry.initialize();
    } catch (err) {
      console.error('Storage provider initialization failed:', err.message);
    }
  });
}

startServer();

export { io };
