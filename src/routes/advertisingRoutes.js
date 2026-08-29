import express from 'express';
import { getCampaigns, getCampaignById, createCampaign, updateCampaign, deleteCampaign, getAdStats } from '../controllers/advertisingController.js';
import { authorize, protect } from '../middlewares/auth.js';
import { loadSubscription, requireActiveSubscription, requireFeature } from '../middlewares/planLimits.js';

const router = express.Router();

router.use(protect, authorize('vendor'), loadSubscription);

router.get('/advertising/campaigns', requireActiveSubscription, getCampaigns);
router.get('/advertising/campaigns/stats', requireActiveSubscription, getAdStats);
router.get('/advertising/campaigns/:id', requireActiveSubscription, getCampaignById);
router.post('/advertising/campaigns', requireActiveSubscription, requireFeature(f => f.adsTools && f.adsTools !== 'none', 'Advertising requires Growth plan or higher'), createCampaign);
router.put('/advertising/campaigns/:id', requireActiveSubscription, updateCampaign);
router.delete('/advertising/campaigns/:id', requireActiveSubscription, deleteCampaign);

export default router;
