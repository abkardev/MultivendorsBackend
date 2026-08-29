import { Router } from 'express';
import FeatureFlag from '../models/FeatureFlag.js';
import { protect } from '../middlewares/authMiddleware.js';
import { getAllFlags, setFeatureFlag, upsertFeatureFlag } from '../services/featureFlagService.js';

const router = Router();

// List all flags (admin only)
router.get('/admin/feature-flags', protect, async (req, res) => {
  try {
    const flags = await getAllFlags();
    res.json({ status: true, data: flags });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Create/update a flag
router.post('/admin/feature-flags', protect, async (req, res) => {
  try {
    const flag = await upsertFeatureFlag(req.body, req.user._id);
    res.json({ status: true, data: flag });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

// Toggle a flag
router.patch('/admin/feature-flags/:key/toggle', protect, async (req, res) => {
  try {
    const flag = await setFeatureFlag(req.params.key, req.body.enabled, req.user._id);
    if (!flag) return res.status(404).json({ status: false, message: 'Flag not found' });
    res.json({ status: true, data: flag });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
});

export default router;
