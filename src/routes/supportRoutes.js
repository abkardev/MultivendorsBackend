import { Router } from 'express';
import { auth, authorize } from '../middlewares/auth.js';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/supportController.js';

const router = Router();

const supportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many requests. Try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

/* User-facing */
router.get('/my', auth, c.getMyTickets);
router.get('/my/stats', auth, c.getMyDashboardStats);
router.post('/', auth, supportLimiter, c.createTicket);
router.get('/departments', auth, c.getDepartments);
router.get('/canned-responses', auth, c.getCannedResponses);
router.get('/:id', auth, c.getTicketById);
router.post('/:id/messages', auth, c.sendMessage);
router.post('/:id/close', auth, c.closeTicket);
router.post('/:id/reopen', auth, c.reopenTicket);
router.post('/:id/rating', auth, c.submitRating);

/* Admin / Agent */
router.get('/', auth, authorize('admin', 'support'), c.getAllTickets);
router.get('/agent/stats', auth, c.getAgentDashboardStats);
router.get('/:id/detail', auth, authorize('admin', 'support'), c.getTicketDetail);
router.put('/:id', auth, authorize('admin', 'support'), c.updateTicket);
router.post('/:id/assign', auth, authorize('admin', 'support'), c.assignTicket);
router.post('/:id/notes', auth, authorize('admin', 'support'), c.addInternalNote);
router.post('/merge', auth, authorize('admin'), c.mergeTickets);

/* Department management */
router.post('/departments', auth, authorize('admin'), c.createDepartment);
router.put('/departments/:id', auth, authorize('admin'), c.updateDepartment);

/* Canned responses management */
router.post('/canned-responses', auth, authorize('admin', 'support'), c.createCannedResponse);
router.put('/canned-responses/:id', auth, authorize('admin', 'support'), c.updateCannedResponse);
router.delete('/canned-responses/:id', auth, authorize('admin', 'support'), c.deleteCannedResponse);

/* Analytics */
router.get('/analytics', auth, authorize('admin', 'support'), c.getAnalytics);

export default router;
