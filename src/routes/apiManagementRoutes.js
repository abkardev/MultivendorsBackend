import { Router } from 'express';
import { protect, authorize, optionalAuth } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  createApiKey, listApiKeys, revokeApiKey, rotateApiKey, getApiKeyUsage,
  createClientApplication, listClientApplications,
  createRatePlan, listRatePlans, getUsageStats,
  createWebhookEndpoint, listWebhookEndpoints, updateWebhookEndpoint,
  deleteWebhookEndpoint, pauseWebhookEndpoint, resumeWebhookEndpoint,
  listWebhookEvents, retryWebhookEvent, getWebhookStats, regenerateWebhookSecret,
} from '../controllers/apiManagementController.js';

const router = Router();

const ff = featureFlag('api_management');

router.get('/usage', protect, authorize('admin'), ff, getUsageStats);

router.get('/keys', protect, ff, listApiKeys);
router.post('/keys', protect, ff, createApiKey);
router.put('/keys/:id/revoke', protect, ff, revokeApiKey);
router.post('/keys/:id/rotate', protect, ff, rotateApiKey);
router.get('/keys/:id/usage', protect, ff, getApiKeyUsage);

router.get('/apps', protect, ff, listClientApplications);
router.post('/apps', protect, ff, createClientApplication);

router.get('/plans', protect, ff, listRatePlans);
router.post('/plans', protect, authorize('admin'), ff, createRatePlan);

router.get('/webhooks', protect, ff, listWebhookEndpoints);
router.post('/webhooks', protect, ff, createWebhookEndpoint);
router.put('/webhooks/:id', protect, ff, updateWebhookEndpoint);
router.delete('/webhooks/:id', protect, ff, deleteWebhookEndpoint);
router.post('/webhooks/:id/pause', protect, ff, pauseWebhookEndpoint);
router.post('/webhooks/:id/resume', protect, ff, resumeWebhookEndpoint);
router.post('/webhooks/:id/regenerate-secret', protect, ff, regenerateWebhookSecret);
router.get('/webhooks/:id/events', protect, ff, listWebhookEvents);
router.get('/webhooks/:id/stats', protect, ff, getWebhookStats);
router.post('/webhooks/events/:eventId/retry', protect, ff, retryWebhookEvent);

export default router;
