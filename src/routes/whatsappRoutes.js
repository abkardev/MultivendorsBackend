import express from 'express';
import { getWhatsAppSettings, updateWhatsAppSettings, sendTestMessage, sendOrderNotificationCtrl, sendShippingNotificationCtrl } from '../controllers/whatsappController.js';
import { authorize, protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/whatsapp/settings', protect, authorize('vendor'), getWhatsAppSettings);
router.put('/whatsapp/settings', protect, authorize('vendor'), updateWhatsAppSettings);
router.post('/whatsapp/test', protect, authorize('vendor'), sendTestMessage);
router.post('/whatsapp/notify/order', protect, authorize('vendor'), sendOrderNotificationCtrl);
router.post('/whatsapp/notify/shipping', protect, authorize('vendor'), sendShippingNotificationCtrl);

export default router;
