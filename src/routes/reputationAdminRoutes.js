import { Router } from 'express';
import { reputationScheduler } from '../schedulers/reputationScheduler.js';
import { reputationCache } from '../services/reputationCache.js';
import { getRankingWeights, setRankingWeights } from '../services/rankingEngine.js';
import { Vendor } from '../models/vendorModel.js';
import { calculateVendorReputation } from '../services/vendorReputationService.js';
import { calculateBuyerReputation } from '../services/buyerReputationService.js';
import { getLogger } from '../services/logger.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(protect, authorize('admin', 'super_admin'));

router.post('/admin/reputation/recalculate-all', async (req, res) => {
  reputationScheduler.scheduledRecalculation();
  res.json({ status: true, message: 'Recalculation queued for all vendors' });
});

router.post('/admin/reputation/recalculate-vendor/:vendorId', async (req, res) => {
  reputationScheduler.queueVendorRecalculation(req.params.vendorId);
  res.json({ status: true, message: 'Recalculation queued for vendor' });
});

router.post('/admin/reputation/recalculate-buyer/:userId', async (req, res) => {
  reputationScheduler.queueBuyerRecalculation(req.params.userId);
  res.json({ status: true, message: 'Recalculation queued for buyer' });
});

router.get('/admin/reputation/scheduler-stats', async (req, res) => {
  res.json({ status: true, data: reputationScheduler.getStats() });
});

router.get('/admin/reputation/cache-stats', async (req, res) => {
  res.json({ status: true, data: reputationCache.getStats() });
});

router.post('/admin/reputation/clear-cache', async (req, res) => {
  reputationCache.clear();
  res.json({ status: true, message: 'Reputation cache cleared' });
});

router.get('/admin/reputation/ranking-weights', async (req, res) => {
  res.json({ status: true, data: getRankingWeights() });
});

router.put('/admin/reputation/ranking-weights', async (req, res) => {
  setRankingWeights(req.body);
  res.json({ status: true, message: 'Ranking weights updated', data: getRankingWeights() });
});

router.get('/admin/reputation/overview', async (req, res) => {
  const [vendorCount, buyerCount, avgVendorScore, badgesCount] = await Promise.all([
    Vendor.countDocuments(),
    (await import('../models/BuyerReputation.js')).default.countDocuments(),
    (await import('../models/VendorReputation.js')).default.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$currentScore' } } },
    ]),
    (await import('../models/VendorBadge.js')).default.countDocuments({ isActive: true }),
  ]);
  res.json({
    status: true,
    data: {
      vendorsWithReputation: vendorCount,
      buyersWithReputation: buyerCount,
      averageVendorScore: Math.round(avgVendorScore[0]?.avgScore || 0),
      totalActiveBadges: badgesCount,
    },
  });
});

export default router;
