import express from 'express';
import {
  createReview, getReviews, getReviewById, updateReview, deleteReview,
  voteReview, reportReview, respondToReview,
  moderateReview, adminGetReviews, adminGetReportedReviews, adminDismissReport,
  getVendorReputationSummary, getBuyerReputationSummary, getVendorTimeline,
} from '../controllers/reviewController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', getReviews);
router.get('/:id', getReviewById);
router.get('/reputation/vendor/:vendorId', getVendorReputationSummary);
router.get('/reputation/vendor/:vendorId/timeline', getVendorTimeline);

router.post('/', protect, createReview);
router.put('/:id', protect, updateReview);
router.delete('/:id', protect, deleteReview);
router.post('/:id/vote', protect, voteReview);
router.post('/:id/report', protect, reportReview);
router.post('/:id/respond', protect, respondToReview);
router.get('/reputation/buyer/:userId', protect, getBuyerReputationSummary);

router.get('/admin/reviews', protect, authorize('admin', 'super_admin'), adminGetReviews);
router.get('/admin/reviews/reported', protect, authorize('admin', 'super_admin'), adminGetReportedReviews);
router.put('/admin/reviews/:id/moderate', protect, authorize('admin', 'super_admin'), moderateReview);
router.put('/admin/reviews/:id/dismiss-report', protect, authorize('admin', 'super_admin'), adminDismissReport);

export default router;
