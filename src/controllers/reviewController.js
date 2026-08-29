import expressAsyncHandler from 'express-async-handler';
import Review from '../models/reviewModel.js';
import Order from '../models/Order.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sanitizeBody } from '../utils/sanitize.js';
import { paginateResult } from '../utils/pagination.js';
import { logAuditEvent } from '../services/auditService.js';
import { calculateVendorReputation } from '../services/vendorReputationService.js';
import { calculateBuyerReputation } from '../services/buyerReputationService.js';
import { getLogger } from '../services/logger.js';
import { isAdmin } from '../utils/ownership.js';

const logger = getLogger('api');

const ALLOWED_FIELDS = ['rating', 'productQuality', 'communication', 'delivery', 'packaging', 'service', 'title', 'comment', 'recommendation', 'reviewType', 'media'];

export const createReview = expressAsyncHandler(async (req, res) => {
  const { order: orderId, product, reviewType = 'product' } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);
  if (order.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) {
    throw new AppError('Not authorized to review this order', 403);
  }
  if (order.status !== 'delivered' && order.status !== 'completed') {
    throw new AppError('Can only review completed orders', 400);
  }

  const existing = await Review.findOne({ order: orderId, reviewType, user: req.user._id });
  if (existing) throw new AppError('You have already reviewed this order', 409);

  const reviewData = sanitizeBody(req.body, ALLOWED_FIELDS);
  reviewData.user = req.user._id;
  reviewData.order = orderId;
  reviewData.product = product || order.items?.[0]?.product;
  reviewData.vendor = order.vendor;
  reviewData.isVerifiedPurchase = true;

  const review = await Review.create(reviewData);

  calculateVendorReputation(order.vendor).catch(() => {});
  calculateBuyerReputation(req.user._id).catch(() => {});

  logAuditEvent({ userId: req.user._id, action: 'create_review', category: 'order', entityType: 'Review', entityId: review._id, newValue: reviewData });

  res.status(201).json({ status: true, data: review });
});

export const getReviews = expressAsyncHandler(async (req, res) => {
  const { product, vendor, user, reviewType, sort = 'createdAt', direction = 'desc' } = req.query;
  const query = { isDeleted: false };

  if (req.query.moderationStatus && isAdmin(req.user)) {
    query.moderationStatus = req.query.moderationStatus;
  } else {
    query.moderationStatus = 'approved';
  }

  if (product) query.product = product;
  if (vendor) query.vendor = vendor;
  if (user) query.user = user;
  if (reviewType) query.reviewType = reviewType;

  const result = await paginateResult(Review, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort,
    direction,
    populate: ['user', 'product'],
  });

  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const getReviewById = expressAsyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id).populate('user', 'name avatar').populate('product', 'name images');
  if (!review || review.isDeleted) throw new AppError('Review not found', 404);
  res.json({ status: true, data: review });
});

export const updateReview = expressAsyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (review.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) {
    throw new AppError('Not authorized', 403);
  }

  const oldData = { ...review.toObject() };
  const allowed = sanitizeBody(req.body, ALLOWED_FIELDS);
  Object.assign(review, allowed);
  await review.save();

  logAuditEvent({ userId: req.user._id, action: 'update_review', category: 'order', entityType: 'Review', entityId: review._id, oldValue: oldData, newValue: allowed });

  res.json({ status: true, data: review });
});

export const deleteReview = expressAsyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (review.user.toString() !== req.user._id.toString() && !isAdmin(req.user)) {
    throw new AppError('Not authorized', 403);
  }

  review.isDeleted = true;
  review.deletedAt = new Date();
  review.deletedBy = req.user._id;
  await review.save();

  logAuditEvent({ userId: req.user._id, action: 'delete_review', category: 'order', entityType: 'Review', entityId: review._id, oldValue: { isDeleted: false } });

  res.json({ status: true, message: 'Review deleted' });
});

export const voteReview = expressAsyncHandler(async (req, res) => {
  const { vote } = req.body;
  if (!['helpful', 'not_helpful'].includes(vote)) throw new AppError('Invalid vote', 400);

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  const userId = req.user._id;
  const helpfulIdx = review.helpfulVotes.indexOf(userId);
  const notHelpfulIdx = review.notHelpfulVotes.indexOf(userId);

  if (helpfulIdx > -1) review.helpfulVotes.splice(helpfulIdx, 1);
  if (notHelpfulIdx > -1) review.notHelpfulVotes.splice(notHelpfulIdx, 1);

  if (vote === 'helpful') review.helpfulVotes.push(userId);
  else review.notHelpfulVotes.push(userId);

  review.helpfulCount = review.helpfulVotes.length;
  review.notHelpfulCount = review.notHelpfulVotes.length;
  await review.save();

  res.json({ status: true, data: { helpfulCount: review.helpfulCount, notHelpfulCount: review.notHelpfulCount } });
});

export const reportReview = expressAsyncHandler(async (req, res) => {
  const { reason, description } = req.body;
  if (!['spam', 'fake_review', 'offensive', 'harassment', 'wrong_product', 'duplicate', 'other'].includes(reason)) {
    throw new AppError('Invalid report reason', 400);
  }

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  if (review.reports.some(r => r.reportedBy.toString() === req.user._id.toString() && r.status === 'pending')) {
    throw new AppError('You have already reported this review', 409);
  }

  review.reports.push({ reportedBy: req.user._id, reason, description });
  review.reportCount = review.reports.length;
  review.isFlagged = review.reportCount >= 3;
  await review.save();

  logAuditEvent({ userId: req.user._id, action: 'report_review', category: 'order', entityType: 'Review', entityId: review._id, newValue: { reason } });

  res.json({ status: true, message: 'Review reported' });
});

export const respondToReview = expressAsyncHandler(async (req, res) => {
  const { comment } = req.body;
  if (!comment || comment.length > 5000) throw new AppError('Comment is required and must be under 5000 characters', 400);

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (!review.vendor || review.vendor.toString() !== req.user.vendorId?.toString()) {
    throw new AppError('Only the vendor can respond', 403);
  }

  const response = review.vendorResponse || {};
  if (response.comment && (response.editCount || 0) >= 3) {
    throw new AppError('Maximum edits reached', 400);
  }

  review.vendorResponse = {
    comment,
    createdAt: response.createdAt || new Date(),
    updatedAt: new Date(),
    editCount: (response.editCount || 0) + 1,
  };
  await review.save();

  logAuditEvent({ userId: req.user._id, action: 'respond_review', category: 'order', entityType: 'Review', entityId: review._id, newValue: { comment } });

  res.json({ status: true, data: review.vendorResponse });
});

export const moderateReview = expressAsyncHandler(async (req, res) => {
  const { action, reason } = req.body;
  if (!['approve', 'reject', 'hide', 'restore'].includes(action)) throw new AppError('Invalid action', 400);

  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  const statusMap = { approve: 'approved', reject: 'rejected', hide: 'hidden', restore: 'approved' };
  review.moderationStatus = statusMap[action];
  review.moderationHistory.push({
    action,
    reason: reason || `${action} by admin`,
    moderatedBy: req.user._id,
    moderatedAt: new Date(),
  });

  if (action === 'restore') review.isDeleted = false;
  await review.save();

  logAuditEvent({ userId: req.user._id, action: `moderate_review_${action}`, category: 'order', entityType: 'Review', entityId: review._id, newValue: { moderationStatus: review.moderationStatus } });

  res.json({ status: true, data: review });
});

export const adminGetReviews = expressAsyncHandler(async (req, res) => {
  const query = {};
  if (req.query.moderationStatus) query.moderationStatus = req.query.moderationStatus;
  if (req.query.isFlagged) query.isFlagged = req.query.isFlagged === 'true';
  if (req.query.isDeleted) query.isDeleted = req.query.isDeleted === 'true';
  if (req.query.vendor) query.vendor = req.query.vendor;
  if (req.query.product) query.product = req.query.product;

  const result = await paginateResult(Review, query, {
    page: req.query.page,
    limit: req.query.limit || 50,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
    populate: ['user', 'product', 'vendor'],
  });

  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const adminGetReportedReviews = expressAsyncHandler(async (req, res) => {
  const query = { isFlagged: true, 'reports.status': 'pending' };
  const result = await paginateResult(Review, query, {
    page: req.query.page,
    limit: req.query.limit || 50,
    sort: 'reportCount',
    direction: 'desc',
    populate: ['user', 'product'],
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const adminDismissReport = expressAsyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);

  const reportIdx = review.reports.findIndex(r => r._id.toString() === req.body.reportId);
  if (reportIdx === -1) throw new AppError('Report not found', 404);

  review.reports[reportIdx].status = 'dismissed';
  review.isFlagged = review.reports.some(r => r.status === 'pending');
  await review.save();

  res.json({ status: true, message: 'Report dismissed' });
});

export const getVendorReputationSummary = expressAsyncHandler(async (req, res) => {
  const [rep, badges, reviewStats] = await Promise.all([
    import('../models/VendorReputation.js').then(m => m.default.findOne({ vendor: req.params.vendorId }).lean()),
    import('../models/VendorBadge.js').then(m => m.default.find({ vendor: req.params.vendorId, isActive: true }).lean()),
    Review.aggregate([
      { $match: { vendor: req.params.vendorId, moderationStatus: 'approved', isDeleted: false } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 }, avgQuality: { $avg: '$productQuality' }, avgDelivery: { $avg: '$delivery' }, avgCommunication: { $avg: '$communication' } } },
    ]),
  ]);

  const stats = reviewStats[0] || {};
  res.json({
    status: true,
    data: {
      score: rep?.currentScore || 0,
      breakdown: rep?.scoreBreakdown || {},
      badges: badges || [],
      reviews: {
        averageRating: Math.round((stats.avgRating || 0) * 10) / 10,
        totalReviews: stats.count || 0,
        averageQuality: Math.round((stats.avgQuality || 0) * 10) / 10,
        averageDelivery: Math.round((stats.avgDelivery || 0) * 10) / 10,
        averageCommunication: Math.round((stats.avgCommunication || 0) * 10) / 10,
      },
      lastCalculated: rep?.lastCalculatedAt,
    },
  });
});

export const getBuyerReputationSummary = expressAsyncHandler(async (req, res) => {
  const rep = await import('../models/BuyerReputation.js').then(m => m.default.findOne({ user: req.params.userId }).lean());
  if (!rep) return res.json({ status: true, data: { score: 0, label: 'new_buyer', statistics: {} } });

  res.json({ status: true, data: rep });
});

export const getVendorTimeline = expressAsyncHandler(async (req, res) => {
  const Timeline = (await import('../models/ReputationEvent.js')).default;
  const events = await Timeline.find({ vendor: req.params.vendorId, isPublic: true }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ status: true, data: events });
});
