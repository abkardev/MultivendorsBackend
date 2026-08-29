import express from 'express';
import {
  getBuyingRequests, getBuyingRequestById, createBuyingRequest,
  updateBuyingRequest, deleteBuyingRequest, getMyBuyingRequests,
  submitQuote, getMyQuotes,
} from '../controllers/buyingRequestController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/buying-requests', getBuyingRequests);
router.get('/buying-requests/:id', getBuyingRequestById);
router.post('/buying-requests', protect, authorize('user', 'admin'), createBuyingRequest);
router.put('/buying-requests/:id', protect, authorize('user', 'admin'), updateBuyingRequest);
router.delete('/buying-requests/:id', protect, authorize('user', 'admin'), deleteBuyingRequest);
router.get('/my/buying-requests', protect, authorize('user', 'admin'), getMyBuyingRequests);
router.post('/buying-requests/:id/quote', protect, authorize('vendor'), submitQuote);
router.get('/my/quotes', protect, authorize('vendor'), getMyQuotes);

export default router;
