import express from 'express';
import { auth } from '../middlewares/auth.js';
import { getMyGateway, saveGateway, deleteGateway } from '../controllers/vendorPaymentGatewayController.js';

const router = express.Router();

router.get('/payment-gateway', auth, getMyGateway);
router.post('/payment-gateway', auth, saveGateway);
router.delete('/payment-gateway', auth, deleteGateway);

export default router;
