import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  listNotifications, getUnreadCount, markAsRead, markAllAsRead,
  archiveNotification, sendTestNotification, deleteAllNotifications,
} from '../controllers/notificationController.js';

const router = Router();

router.get('/notifications', protect, listNotifications);
router.get('/notifications/unread-count', protect, getUnreadCount);
router.put('/notifications/:id/read', protect, markAsRead);
router.put('/notifications/read-all', protect, markAllAsRead);
router.put('/notifications/:id/archive', protect, archiveNotification);
router.delete('/notifications', protect, deleteAllNotifications);
router.post('/notifications/test', protect, sendTestNotification);
router.post('/notifications/broadcast', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, body, type, channels } = req.body;
    const { notificationService } = await import('../services/notificationService.js');
    const result = await notificationService.sendToAll({ type, title, body, channels });
    res.json({ status: true, count: result.length });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

export default router;
