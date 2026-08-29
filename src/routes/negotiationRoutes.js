import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { audit } from '../middlewares/auditMiddleware.js';
import { startNegotiation, addCounterOffer, acceptNegotiation, declineNegotiation, getNegotiations, getNegotiationById } from '../controllers/negotiationController.js';

const router = Router();

router.get('/negotiations', protect, authorize('vendor', 'buyer', 'admin'), getNegotiations);
router.get('/negotiations/:id', protect, authorize('vendor', 'buyer', 'admin'), getNegotiationById);
router.post('/negotiations', protect, authorize('vendor', 'buyer', 'admin'), audit('create', 'negotiation', (req) => `Negotiation started between buyer ${req.body.buyer} and vendor ${req.body.vendor}`), startNegotiation);
router.post('/negotiations/:id/counter', protect, authorize('vendor', 'buyer', 'admin'), addCounterOffer);
router.post('/negotiations/:id/accept', protect, authorize('vendor', 'buyer', 'admin'), acceptNegotiation);
router.post('/negotiations/:id/decline', protect, authorize('vendor', 'buyer', 'admin'), declineNegotiation);

export default router;
