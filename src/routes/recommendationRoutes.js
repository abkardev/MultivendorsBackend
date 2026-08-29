import express from 'express';
import {
  personalized,
  trending,
  similarProducts,
  recommendedVendors,
  frequentlyBought,
} from '../controllers/recommendationController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/recommendations/personalized', protect, personalized);
router.get('/recommendations/trending', trending);
router.get('/recommendations/similar/:productId', similarProducts);
router.get('/recommendations/vendors', protect, recommendedVendors);
router.get('/recommendations/frequently-bought/:productId', frequentlyBought);

export default router;
