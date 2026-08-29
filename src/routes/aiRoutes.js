import express from 'express';
import { productAssistant, rfqAssistant, getHistory } from '../controllers/aiController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.post('/ai/product-assistant', protect, authorize('vendor'), productAssistant);
router.post('/ai/rfq-assistant', protect, authorize('vendor'), rfqAssistant);
router.get('/ai/history', protect, authorize('vendor'), getHistory);

export default router;
