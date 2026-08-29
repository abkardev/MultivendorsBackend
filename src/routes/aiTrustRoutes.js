import { Router } from 'express';
import { generateVendorTrustInsights, generateBuyerTrustInsights } from '../services/aiTrustInsightsService.js';
import { getLogger } from '../services/logger.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/ai/trust/vendor/:vendorId', async (req, res) => {
  const insights = await generateVendorTrustInsights(req.params.vendorId);
  res.json({ status: true, data: insights });
});

router.get('/ai/trust/buyer/:userId', protect, async (req, res) => {
  const insights = await generateBuyerTrustInsights(req.params.userId);
  res.json({ status: true, data: insights });
});

export default router;
