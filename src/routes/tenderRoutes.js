import express from 'express';
import {
  getTenders, getTenderById, createTender, updateTender, deleteTender,
  getMyTenders, submitBid, getMyBids, awardTender,
} from '../controllers/tenderController.js';
import { authorize, protect } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.get('/tenders', getTenders);
router.get('/tenders/:id', getTenderById);
router.post('/tenders', protect, authorize('user', 'admin'), audit('create', 'tender', (req) => `Created tender by ${req.user.name}`), createTender);
router.put('/tenders/:id', protect, authorize('user', 'admin'), updateTender);
router.delete('/tenders/:id', protect, authorize('user', 'admin'), deleteTender);
router.get('/my/tenders', protect, authorize('user', 'admin'), getMyTenders);
router.post('/tenders/:id/bid', protect, authorize('vendor'), submitBid);
router.get('/my/bids', protect, authorize('vendor'), getMyBids);
router.post('/tenders/:id/award', protect, authorize('user', 'admin'), audit('update', 'tender', (req) => `Awarded tender ${req.params.id} by ${req.user.name}`), awardTender);

export default router;
