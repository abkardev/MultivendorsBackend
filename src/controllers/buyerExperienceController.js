import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Comparison from '../models/Comparison.js';
import FavoriteSupplier from '../models/FavoriteSupplier.js';
import SavedSearch from '../models/SavedSearch.js';
import SavedFilter from '../models/SavedFilter.js';
import RecentlyViewed from '../models/RecentlyViewed.js';
import WishlistItem from '../models/wishlistModel.js';
import WishlistFolder from '../models/WishlistFolder.js';
import ProductCollection from '../models/ProductCollection.js';
import SearchHistory from '../models/SearchHistory.js';
import ProcurementProject from '../models/ProcurementProject.js';
import ProcurementCalendarEvent from '../models/ProcurementCalendarEvent.js';
import { Order } from '../models/orderModel.js';
import { Product } from '../models/productModel.js';
import { Vendor } from '../models/vendorModel.js';
import { AppError } from '../middlewares/errorHandler.js';
import { sanitizeBody } from '../utils/sanitize.js';
import { paginateResult } from '../utils/pagination.js';
import { logAuditEvent } from '../services/auditService.js';
import { emitEvent } from '../services/eventService.js';
import { notificationService } from '../services/notificationService.js';
import { canAccess } from '../utils/ownership.js';
import { isFeatureEnabled } from '../services/featureFlagService.js';

const FEATURE_BUYER_EXPERIENCE = 'buyer_experience';

const trackAnalytics = async (userId, event, metadata = {}) => {
  try {
    await emitEvent({
      eventType: 'analytics_event',
      userId,
      data: { event, ...metadata, timestamp: new Date() },
      source: 'buyer_experience',
    });
  } catch (err) {
    console.error('Analytics tracking error:', err.message);
  }
};

// ──────────────────────────────────────────────
// 1. COMPARISON
// ──────────────────────────────────────────────

const COMPARISON_ALLOWED = ['type', 'items', 'itemModel', 'name'];

export const createComparison = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, COMPARISON_ALLOWED);
  data.user = req.user._id;
  const comparison = await Comparison.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_comparison', category: 'buyer_experience', entityType: 'Comparison', entityId: comparison._id, newValue: data });
  await notificationService.send({ recipient: req.user._id, type: 'comparison_created', title: 'Product comparison created', body: `New ${data.type} comparison has been created`, data: { comparisonId: comparison._id, type: data.type }, channels: ['in_app'], link: '/buyer/compare' });
  emitEvent({ eventType: 'comparison.created', userId: req.user._id, data: { comparisonId: comparison._id, type: data.type }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'comparison_created', { comparisonId: comparison._id, type: data.type });
  res.status(201).json({ status: true, data: comparison });
});

export const getComparisons = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.type) query.type = req.query.type;
  const result = await paginateResult(Comparison, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'updatedAt',
    direction: req.query.direction || 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const getComparisonById = expressAsyncHandler(async (req, res) => {
  const comparison = await Comparison.findById(req.params.id).populate('items');
  if (!comparison) throw new AppError('Comparison not found', 404);
  if (!canAccess(req.user, comparison.user)) throw new AppError('Not authorized', 403);
  res.json({ status: true, data: comparison });
});

export const deleteComparison = expressAsyncHandler(async (req, res) => {
  const comparison = await Comparison.findById(req.params.id);
  if (!comparison) throw new AppError('Comparison not found', 404);
  if (!canAccess(req.user, comparison.user)) throw new AppError('Not authorized', 403);
  await comparison.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_comparison', category: 'buyer_experience', entityType: 'Comparison', entityId: req.params.id });
  emitEvent({ eventType: 'comparison.deleted', userId: req.user._id, data: { comparisonId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Comparison deleted' });
});

export const addToComparison = expressAsyncHandler(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) throw new AppError('itemId is required', 400);
  const comparison = await Comparison.findById(req.params.id);
  if (!comparison) throw new AppError('Comparison not found', 404);
  if (!canAccess(req.user, comparison.user)) throw new AppError('Not authorized', 403);
  if (!comparison.items.includes(itemId)) {
    comparison.items.push(itemId);
    comparison.updatedAt = new Date();
    await comparison.save();
  }
  logAuditEvent({ userId: req.user._id, action: 'add_to_comparison', category: 'buyer_experience', entityType: 'Comparison', entityId: comparison._id, newValue: { itemId } });
  emitEvent({ eventType: 'comparison.item_added', userId: req.user._id, data: { comparisonId: comparison._id, itemId }, source: 'buyer_experience' });
  res.json({ status: true, data: comparison });
});

export const removeFromComparison = expressAsyncHandler(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) throw new AppError('itemId is required', 400);
  const comparison = await Comparison.findById(req.params.id);
  if (!comparison) throw new AppError('Comparison not found', 404);
  if (!canAccess(req.user, comparison.user)) throw new AppError('Not authorized', 403);
  comparison.items = comparison.items.filter(i => i.toString() !== itemId);
  comparison.updatedAt = new Date();
  await comparison.save();
  logAuditEvent({ userId: req.user._id, action: 'remove_from_comparison', category: 'buyer_experience', entityType: 'Comparison', entityId: comparison._id, newValue: { itemId } });
  emitEvent({ eventType: 'comparison.item_removed', userId: req.user._id, data: { comparisonId: comparison._id, itemId }, source: 'buyer_experience' });
  res.json({ status: true, data: comparison });
});

// ──────────────────────────────────────────────
// 2. FAVORITE SUPPLIERS
// ──────────────────────────────────────────────

const FAVORITE_ALLOWED = ['notifyNewProducts', 'notifyPromotions', 'notifyAnnouncements'];

export const followSupplier = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const { vendor } = req.body;
  if (!vendor) throw new AppError('vendor is required', 400);
  const vendorDoc = await Vendor.findById(vendor).select('name');
  const existing = await FavoriteSupplier.findOne({ user: req.user._id, vendor });
  if (existing) return res.json({ status: true, data: existing });
  const favorite = await FavoriteSupplier.create({ user: req.user._id, vendor });
  logAuditEvent({ userId: req.user._id, action: 'follow_supplier', category: 'buyer_experience', entityType: 'FavoriteSupplier', entityId: favorite._id, newValue: { vendor } });
  await notificationService.send({ recipient: req.user._id, type: 'supplier_followed', title: 'Successfully followed supplier', body: `You are now following ${vendorDoc?.name || 'this supplier'}`, data: { vendorId: vendor, vendorName: vendorDoc?.name }, channels: ['in_app'], link: `/suppliers/${vendor}` });
  emitEvent({ eventType: 'supplier.followed', userId: req.user._id, data: { vendor }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'supplier_followed', { vendorId: vendor });
  res.status(201).json({ status: true, data: favorite });
});

export const unfollowSupplier = expressAsyncHandler(async (req, res) => {
  const favorite = await FavoriteSupplier.findOne({ user: req.user._id, vendor: req.params.vendorId });
  if (!favorite) throw new AppError('Favorite supplier not found', 404);
  const vendorDoc = await Vendor.findById(req.params.vendorId).select('name');
  await favorite.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'unfollow_supplier', category: 'buyer_experience', entityType: 'FavoriteSupplier', entityId: req.params.vendorId });
  await notificationService.send({ recipient: req.user._id, type: 'supplier_unfollowed', title: 'Unfollowed supplier', body: `You have unfollowed ${vendorDoc?.name || 'this supplier'}`, data: { vendorId: req.params.vendorId }, channels: ['in_app'] });
  emitEvent({ eventType: 'supplier.unfollowed', userId: req.user._id, data: { vendor: req.params.vendorId }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Supplier unfollowed' });
});

export const getFavoriteSuppliers = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  const result = await paginateResult(FavoriteSupplier, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
    populate: { path: 'vendor', select: 'name logo rating' },
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const updateSupplierNotifications = expressAsyncHandler(async (req, res) => {
  const favorite = await FavoriteSupplier.findOne({ user: req.user._id, vendor: req.params.vendorId });
  if (!favorite) throw new AppError('Favorite supplier not found', 404);
  const updates = sanitizeBody(req.body, FAVORITE_ALLOWED);
  Object.assign(favorite, updates);
  await favorite.save();
  logAuditEvent({ userId: req.user._id, action: 'update_supplier_notifications', category: 'buyer_experience', entityType: 'FavoriteSupplier', entityId: favorite._id, newValue: updates });
  res.json({ status: true, data: favorite });
});

// ──────────────────────────────────────────────
// 3. SAVED SEARCHES
// ──────────────────────────────────────────────

const SAVED_SEARCH_ALLOWED = ['name', 'query', 'filters', 'sort', 'direction', 'category', 'industry', 'country', 'notifyNewResults'];

export const createSavedSearch = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, SAVED_SEARCH_ALLOWED);
  data.user = req.user._id;
  const saved = await SavedSearch.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_saved_search', category: 'buyer_experience', entityType: 'SavedSearch', entityId: saved._id });
  emitEvent({ eventType: 'saved_search.created', userId: req.user._id, data: { searchId: saved._id, name: saved.name }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'saved_search_created', { searchId: saved._id });
  res.status(201).json({ status: true, data: saved });
});

export const getSavedSearches = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  const result = await paginateResult(SavedSearch, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'updatedAt',
    direction: req.query.direction || 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const updateSavedSearch = expressAsyncHandler(async (req, res) => {
  const saved = await SavedSearch.findById(req.params.id);
  if (!saved) throw new AppError('Saved search not found', 404);
  if (!canAccess(req.user, saved.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, SAVED_SEARCH_ALLOWED);
  Object.assign(saved, updates);
  await saved.save();
  logAuditEvent({ userId: req.user._id, action: 'update_saved_search', category: 'buyer_experience', entityType: 'SavedSearch', entityId: saved._id, newValue: updates });
  emitEvent({ eventType: 'saved_search.updated', userId: req.user._id, data: { searchId: saved._id, name: saved.name }, source: 'buyer_experience' });
  res.json({ status: true, data: saved });
});

export const deleteSavedSearch = expressAsyncHandler(async (req, res) => {
  const saved = await SavedSearch.findById(req.params.id);
  if (!saved) throw new AppError('Saved search not found', 404);
  if (!canAccess(req.user, saved.user)) throw new AppError('Not authorized', 403);
  await saved.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_saved_search', category: 'buyer_experience', entityType: 'SavedSearch', entityId: req.params.id });
  emitEvent({ eventType: 'saved_search.deleted', userId: req.user._id, data: { searchId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Saved search deleted' });
});

// ──────────────────────────────────────────────
// 4. SAVED FILTERS
// ──────────────────────────────────────────────

const SAVED_FILTER_ALLOWED = ['name', 'filters', 'type'];

export const createSavedFilter = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, SAVED_FILTER_ALLOWED);
  data.user = req.user._id;
  const saved = await SavedFilter.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_saved_filter', category: 'buyer_experience', entityType: 'SavedFilter', entityId: saved._id });
  emitEvent({ eventType: 'saved_filter.created', userId: req.user._id, data: { filterId: saved._id }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'saved_filter_created', { filterId: saved._id });
  res.status(201).json({ status: true, data: saved });
});

export const getSavedFilters = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.type) query.type = req.query.type;
  const result = await paginateResult(SavedFilter, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const updateSavedFilter = expressAsyncHandler(async (req, res) => {
  const saved = await SavedFilter.findById(req.params.id);
  if (!saved) throw new AppError('Saved filter not found', 404);
  if (!canAccess(req.user, saved.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, SAVED_FILTER_ALLOWED);
  Object.assign(saved, updates);
  await saved.save();
  logAuditEvent({ userId: req.user._id, action: 'update_saved_filter', category: 'buyer_experience', entityType: 'SavedFilter', entityId: saved._id, newValue: updates });
  emitEvent({ eventType: 'saved_filter.updated', userId: req.user._id, data: { filterId: saved._id }, source: 'buyer_experience' });
  res.json({ status: true, data: saved });
});

export const deleteSavedFilter = expressAsyncHandler(async (req, res) => {
  const saved = await SavedFilter.findById(req.params.id);
  if (!saved) throw new AppError('Saved filter not found', 404);
  if (!canAccess(req.user, saved.user)) throw new AppError('Not authorized', 403);
  await saved.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_saved_filter', category: 'buyer_experience', entityType: 'SavedFilter', entityId: req.params.id });
  emitEvent({ eventType: 'saved_filter.deleted', userId: req.user._id, data: { filterId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Saved filter deleted' });
});

// ──────────────────────────────────────────────
// 5. RECENTLY VIEWED
// ──────────────────────────────────────────────

const RECENTLY_VIEWED_ALLOWED = ['entityType', 'entityId', 'title', 'image', 'url'];

export const trackView = expressAsyncHandler(async (req, res) => {
  const data = sanitizeBody(req.body, RECENTLY_VIEWED_ALLOWED);
  if (!data.entityType || !data.entityId) throw new AppError('entityType and entityId are required', 400);
  data.user = req.user._id;
  await RecentlyViewed.findOneAndUpdate(
    { user: req.user._id, entityType: data.entityType, entityId: data.entityId },
    { ...data, viewedAt: new Date() },
    { upsert: true, new: true },
  );
  trackAnalytics(req.user._id, 'view_tracked', { entityType: data.entityType, entityId: data.entityId });
  res.status(201).json({ status: true, message: 'View tracked' });
});

export const getRecentlyViewed = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.entityType) query.entityType = req.query.entityType;
  const result = await paginateResult(RecentlyViewed, query, {
    page: req.query.page,
    limit: parseInt(req.query.limit) || 20,
    sort: 'viewedAt',
    direction: 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const clearRecentlyViewed = expressAsyncHandler(async (req, res) => {
  await RecentlyViewed.deleteMany({ user: req.user._id });
  res.json({ status: true, message: 'Recently viewed cleared' });
});

export const removeRecentlyViewed = expressAsyncHandler(async (req, res) => {
  const entry = await RecentlyViewed.findOne({ _id: req.params.id, user: req.user._id });
  if (!entry) throw new AppError('Entry not found', 404);
  await entry.deleteOne();
  res.json({ status: true, message: 'Entry removed' });
});

// ──────────────────────────────────────────────
// 6. MULTI WISHLIST
// ──────────────────────────────────────────────

const FOLDER_ALLOWED = ['name', 'description', 'icon', 'order'];
const WISHLIST_ITEM_ALLOWED = ['product', 'wishlist', 'notes', 'priority'];

export const createFolder = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, FOLDER_ALLOWED);
  data.user = req.user._id;
  const folder = await WishlistFolder.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_folder', category: 'buyer_experience', entityType: 'WishlistFolder', entityId: folder._id });
  emitEvent({ eventType: 'wishlist_folder.created', userId: req.user._id, data: { folderId: folder._id }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'folder_created', { folderId: folder._id });
  res.status(201).json({ status: true, data: folder });
});

export const getFolders = expressAsyncHandler(async (req, res) => {
  const folders = await WishlistFolder.find({ user: req.user._id }).sort({ order: 1, createdAt: -1 });
  const foldersWithCount = await Promise.all(folders.map(async (f) => {
    const itemCount = await WishlistItem.countDocuments({ wishlist: f._id });
    return { ...f.toObject(), itemCount };
  }));
  res.json({ status: true, data: foldersWithCount });
});

export const updateFolder = expressAsyncHandler(async (req, res) => {
  const folder = await WishlistFolder.findById(req.params.id);
  if (!folder) throw new AppError('Folder not found', 404);
  if (!canAccess(req.user, folder.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, FOLDER_ALLOWED);
  Object.assign(folder, updates);
  await folder.save();
  logAuditEvent({ userId: req.user._id, action: 'update_folder', category: 'buyer_experience', entityType: 'WishlistFolder', entityId: folder._id, newValue: updates });
  emitEvent({ eventType: 'wishlist_folder.updated', userId: req.user._id, data: { folderId: folder._id }, source: 'buyer_experience' });
  res.json({ status: true, data: folder });
});

export const deleteFolder = expressAsyncHandler(async (req, res) => {
  const folder = await WishlistFolder.findById(req.params.id);
  if (!folder) throw new AppError('Folder not found', 404);
  if (!canAccess(req.user, folder.user)) throw new AppError('Not authorized', 403);
  await WishlistItem.updateMany({ wishlist: folder._id }, { $unset: { wishlist: '' } });
  await folder.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_folder', category: 'buyer_experience', entityType: 'WishlistFolder', entityId: req.params.id });
  emitEvent({ eventType: 'wishlist_folder.deleted', userId: req.user._id, data: { folderId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Folder deleted' });
});

export const addToWishlist = expressAsyncHandler(async (req, res) => {
  const data = sanitizeBody(req.body, WISHLIST_ITEM_ALLOWED);
  if (!data.product) throw new AppError('product is required', 400);
  data.user = req.user._id;
  const existing = await WishlistItem.findOne({ user: req.user._id, product: data.product });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    logAuditEvent({ userId: req.user._id, action: 'update_wishlist_item', category: 'buyer_experience', entityType: 'WishlistItem', entityId: existing._id, newValue: data });
    await notificationService.send({ recipient: req.user._id, type: 'wishlist_added', title: 'Added to wishlist', body: 'Item added to your wishlist', data: { product: data.product }, channels: ['in_app'], link: '/wishlist' });
    return res.json({ status: true, data: existing });
  }
  const item = await WishlistItem.create(data);
  logAuditEvent({ userId: req.user._id, action: 'add_to_wishlist', category: 'buyer_experience', entityType: 'WishlistItem', entityId: item._id });
  emitEvent({ eventType: 'wishlist.item_added', userId: req.user._id, data: { product: data.product }, source: 'buyer_experience' });
  await notificationService.send({ recipient: req.user._id, type: 'wishlist_added', title: 'Added to wishlist', body: 'Item added to your wishlist', data: { product: data.product }, channels: ['in_app'], link: '/wishlist' });
  res.status(201).json({ status: true, data: item });
});

export const removeFromWishlist = expressAsyncHandler(async (req, res) => {
  const item = await WishlistItem.findOne({ _id: req.params.id, user: req.user._id });
  if (!item) throw new AppError('Wishlist item not found', 404);
  await item.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'remove_from_wishlist', category: 'buyer_experience', entityType: 'WishlistItem', entityId: req.params.id });
  emitEvent({ eventType: 'wishlist.item_removed', userId: req.user._id, data: { itemId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Item removed from wishlist' });
});

export const getWishlistItems = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.wishlist) query.wishlist = req.query.wishlist;
  if (req.query.priority) query.priority = req.query.priority;
  const result = await paginateResult(WishlistItem, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
    populate: { path: 'product', select: 'name images price currency' },
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

// ──────────────────────────────────────────────
// 7. PRODUCT COLLECTIONS
// ──────────────────────────────────────────────

const COLLECTION_ALLOWED = ['name', 'description', 'visibility', 'coverImage', 'sharedWith'];

export const createCollection = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, COLLECTION_ALLOWED);
  data.user = req.user._id;
  const collection = await ProductCollection.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_collection', category: 'buyer_experience', entityType: 'ProductCollection', entityId: collection._id });
  emitEvent({ eventType: 'product_collection.created', userId: req.user._id, data: { collectionId: collection._id }, source: 'buyer_experience' });
  trackAnalytics(req.user._id, 'collection_created', { collectionId: collection._id });
  res.status(201).json({ status: true, data: collection });
});

export const getCollections = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  const result = await paginateResult(ProductCollection, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const getCollectionById = expressAsyncHandler(async (req, res) => {
  const collection = await ProductCollection.findById(req.params.id).populate('products');
  if (!collection) throw new AppError('Collection not found', 404);
  if (!canAccess(req.user, collection.user) && collection.visibility === 'private') throw new AppError('Not authorized', 403);
  res.json({ status: true, data: collection });
});

export const updateCollection = expressAsyncHandler(async (req, res) => {
  const collection = await ProductCollection.findById(req.params.id);
  if (!collection) throw new AppError('Collection not found', 404);
  if (!canAccess(req.user, collection.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, COLLECTION_ALLOWED);
  Object.assign(collection, updates);
  await collection.save();
  logAuditEvent({ userId: req.user._id, action: 'update_collection', category: 'buyer_experience', entityType: 'ProductCollection', entityId: collection._id, newValue: updates });
  emitEvent({ eventType: 'product_collection.updated', userId: req.user._id, data: { collectionId: collection._id }, source: 'buyer_experience' });
  res.json({ status: true, data: collection });
});

export const deleteCollection = expressAsyncHandler(async (req, res) => {
  const collection = await ProductCollection.findById(req.params.id);
  if (!collection) throw new AppError('Collection not found', 404);
  if (!canAccess(req.user, collection.user)) throw new AppError('Not authorized', 403);
  await collection.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_collection', category: 'buyer_experience', entityType: 'ProductCollection', entityId: req.params.id });
  emitEvent({ eventType: 'product_collection.deleted', userId: req.user._id, data: { collectionId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Collection deleted' });
});

export const addProductToCollection = expressAsyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new AppError('productId is required', 400);
  const collection = await ProductCollection.findById(req.params.id);
  if (!collection) throw new AppError('Collection not found', 404);
  if (!canAccess(req.user, collection.user)) throw new AppError('Not authorized', 403);
  if (!collection.products.includes(productId)) {
    collection.products.push(productId);
    await collection.save();
  }
  logAuditEvent({ userId: req.user._id, action: 'add_product_to_collection', category: 'buyer_experience', entityType: 'ProductCollection', entityId: collection._id, newValue: { productId } });
  emitEvent({ eventType: 'product_collection.product_added', userId: req.user._id, data: { collectionId: collection._id, productId }, source: 'buyer_experience' });
  res.json({ status: true, data: collection });
});

export const removeProductFromCollection = expressAsyncHandler(async (req, res) => {
  const { productId } = req.body;
  if (!productId) throw new AppError('productId is required', 400);
  const collection = await ProductCollection.findById(req.params.id);
  if (!collection) throw new AppError('Collection not found', 404);
  if (!canAccess(req.user, collection.user)) throw new AppError('Not authorized', 403);
  collection.products = collection.products.filter(p => p.toString() !== productId);
  await collection.save();
  logAuditEvent({ userId: req.user._id, action: 'remove_product_from_collection', category: 'buyer_experience', entityType: 'ProductCollection', entityId: collection._id, newValue: { productId } });
  emitEvent({ eventType: 'product_collection.product_removed', userId: req.user._id, data: { collectionId: collection._id, productId }, source: 'buyer_experience' });
  res.json({ status: true, data: collection });
});

// ──────────────────────────────────────────────
// 8. SEARCH HISTORY
// ──────────────────────────────────────────────

export const getSearchHistory = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.type) query.type = req.query.type;
  const result = await paginateResult(SearchHistory, query, {
    page: req.query.page,
    limit: parseInt(req.query.limit) || 20,
    sort: 'createdAt',
    direction: 'desc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const clearSearchHistory = expressAsyncHandler(async (req, res) => {
  await SearchHistory.deleteMany({ user: req.user._id });
  res.json({ status: true, message: 'Search history cleared' });
});

export const deleteSearchEntry = expressAsyncHandler(async (req, res) => {
  const entry = await SearchHistory.findOne({ _id: req.params.id, user: req.user._id });
  if (!entry) throw new AppError('Search entry not found', 404);
  await entry.deleteOne();
  res.json({ status: true, message: 'Search entry deleted' });
});

// ──────────────────────────────────────────────
// 9. PROCUREMENT PROJECTS
// ──────────────────────────────────────────────

const PROJECT_ALLOWED = ['name', 'description', 'status', 'rfqs', 'quotations', 'suppliers', 'notes', 'attachments', 'deadline', 'budget', 'currency'];

export const createProject = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, PROJECT_ALLOWED);
  data.user = req.user._id;
  const project = await ProcurementProject.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_procurement_project', category: 'procurement', entityType: 'ProcurementProject', entityId: project._id });
  emitEvent({ eventType: 'procurement.project_created', userId: req.user._id, data: { project: project._id }, source: 'buyer_experience' });
  await notificationService.send({ recipient: req.user._id, type: 'project_created', title: 'Procurement project created', body: `Procurement project "${data.name || 'Untitled'}" has been created`, data: { projectId: project._id }, channels: ['in_app'], link: `/procurement/projects/${project._id}` });
  trackAnalytics(req.user._id, 'project_created', { projectId: project._id });
  res.status(201).json({ status: true, data: project });
});

export const getProjects = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.status) query.status = req.query.status;
  const result = await paginateResult(ProcurementProject, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'createdAt',
    direction: req.query.direction || 'desc',
    populate: ['suppliers'],
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const getProjectById = expressAsyncHandler(async (req, res) => {
  const project = await ProcurementProject.findById(req.params.id).populate('suppliers');
  if (!project) throw new AppError('Project not found', 404);
  if (!canAccess(req.user, project.user)) throw new AppError('Not authorized', 403);
  res.json({ status: true, data: project });
});

export const updateProject = expressAsyncHandler(async (req, res) => {
  const project = await ProcurementProject.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  if (!canAccess(req.user, project.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, PROJECT_ALLOWED);
  Object.assign(project, updates);
  await project.save();
  logAuditEvent({ userId: req.user._id, action: 'update_procurement_project', category: 'procurement', entityType: 'ProcurementProject', entityId: project._id, newValue: updates });
  emitEvent({ eventType: 'procurement.project_updated', userId: req.user._id, data: { projectId: project._id }, source: 'buyer_experience' });
  res.json({ status: true, data: project });
});

export const deleteProject = expressAsyncHandler(async (req, res) => {
  const project = await ProcurementProject.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  if (!canAccess(req.user, project.user)) throw new AppError('Not authorized', 403);
  await project.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_procurement_project', category: 'procurement', entityType: 'ProcurementProject', entityId: req.params.id });
  emitEvent({ eventType: 'procurement.project_deleted', userId: req.user._id, data: { projectId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Project deleted' });
});

// ──────────────────────────────────────────────
// 10. PROCUREMENT CALENDAR
// ──────────────────────────────────────────────

const CALENDAR_ALLOWED = ['title', 'description', 'eventType', 'startDate', 'endDate', 'allDay', 'referenceType', 'referenceId', 'color', 'isCompleted'];

export const createCalendarEvent = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const data = sanitizeBody(req.body, CALENDAR_ALLOWED);
  data.user = req.user._id;
  const event = await ProcurementCalendarEvent.create(data);
  logAuditEvent({ userId: req.user._id, action: 'create_calendar_event', category: 'procurement', entityType: 'ProcurementCalendarEvent', entityId: event._id });
  emitEvent({ eventType: 'calendar_event.created', userId: req.user._id, data: { eventId: event._id }, source: 'buyer_experience' });
  await notificationService.send({ recipient: req.user._id, type: 'calendar_event_created', title: 'Calendar event created', body: `Event "${data.title || 'Untitled'}" has been created`, data: { eventId: event._id }, channels: ['in_app'], link: '/buyer/calendar' });
  res.status(201).json({ status: true, data: event });
});

export const getCalendarEvents = expressAsyncHandler(async (req, res) => {
  const query = { user: req.user._id };
  if (req.query.eventType) query.eventType = req.query.eventType;
  if (req.query.isCompleted !== undefined) query.isCompleted = req.query.isCompleted === 'true';
  if (req.query.startDate || req.query.endDate) {
    query.startDate = {};
    if (req.query.startDate) query.startDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.startDate.$lte = new Date(req.query.endDate);
  }
  const result = await paginateResult(ProcurementCalendarEvent, query, {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort || 'startDate',
    direction: req.query.direction || 'asc',
  });
  res.json({ status: true, data: result.items, pagination: { totalItems: result.totalItems, totalPages: result.totalPages, currentPage: result.currentPage, hasNextPage: result.hasNextPage, hasPreviousPage: result.hasPreviousPage } });
});

export const updateCalendarEvent = expressAsyncHandler(async (req, res) => {
  const event = await ProcurementCalendarEvent.findById(req.params.id);
  if (!event) throw new AppError('Event not found', 404);
  if (!canAccess(req.user, event.user)) throw new AppError('Not authorized', 403);
  const updates = sanitizeBody(req.body, CALENDAR_ALLOWED);
  Object.assign(event, updates);
  await event.save();
  logAuditEvent({ userId: req.user._id, action: 'update_calendar_event', category: 'procurement', entityType: 'ProcurementCalendarEvent', entityId: event._id, newValue: updates });
  emitEvent({ eventType: 'calendar_event.updated', userId: req.user._id, data: { eventId: event._id }, source: 'buyer_experience' });
  res.json({ status: true, data: event });
});

export const deleteCalendarEvent = expressAsyncHandler(async (req, res) => {
  const event = await ProcurementCalendarEvent.findById(req.params.id);
  if (!event) throw new AppError('Event not found', 404);
  if (!canAccess(req.user, event.user)) throw new AppError('Not authorized', 403);
  await event.deleteOne();
  logAuditEvent({ userId: req.user._id, action: 'delete_calendar_event', category: 'procurement', entityType: 'ProcurementCalendarEvent', entityId: req.params.id });
  emitEvent({ eventType: 'calendar_event.deleted', userId: req.user._id, data: { eventId: req.params.id }, source: 'buyer_experience' });
  res.json({ status: true, message: 'Event deleted' });
});

// ──────────────────────────────────────────────
// 11. REPEAT ORDER
// ──────────────────────────────────────────────

export const getOrderTemplate = expressAsyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('items.product', 'name images price sku')
    .populate('vendor', 'name logo');
  if (!order) throw new AppError('Order not found', 404);
  if (!canAccess(req.user, order.user)) throw new AppError('Not authorized', 403);
  const template = {
    vendor: order.vendor,
    items: order.items.map(item => ({
      product: item.product?._id,
      name: item.product?.name,
      sku: item.product?.sku,
      quantity: item.quantity,
      unit: item.unit,
    })),
    shippingAddress: order.shippingAddress,
    notes: `Repeat order from original #${order.orderNumber || order._id}`,
    originalOrder: order._id,
  };
  trackAnalytics(req.user._id, 'order_template_viewed', { orderId: req.params.orderId });
  res.json({ status: true, data: template });
});

// ──────────────────────────────────────────────
// 12. BUYER ANALYTICS
// ──────────────────────────────────────────────

export const getBuyerAnalytics = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const userId = req.user._id;
  const days = parseInt(req.query.days) || 30;
  const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    totalSpent,
    pendingOrders,
    favoriteCount,
    wishlistCount,
    comparisonCount,
    recentSearches,
    recentViews,
    activeProjects,
    upcomingEvents,
  ] = await Promise.all([
    Order.countDocuments({ user: userId }),
    Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), status: { $in: ['delivered', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    Order.countDocuments({ user: userId, status: { $in: ['pending', 'confirmed', 'processing'] } }),
    FavoriteSupplier.countDocuments({ user: userId }),
    WishlistItem.countDocuments({ user: userId }),
    Comparison.countDocuments({ user: userId }),
    SearchHistory.countDocuments({ user: userId, createdAt: { $gte: thirtyDaysAgo } }),
    RecentlyViewed.countDocuments({ user: userId, viewedAt: { $gte: thirtyDaysAgo } }),
    ProcurementProject.countDocuments({ user: userId, status: 'active' }),
    ProcurementCalendarEvent.countDocuments({ user: userId, startDate: { $gte: new Date() }, isCompleted: false }),
  ]);

  emitEvent({ eventType: 'buyer.analytics_viewed', userId: req.user._id, data: {}, source: 'buyer_experience' });

  res.json({
    status: true,
    data: {
      totalOrders,
      totalSpent: totalSpent[0]?.total || 0,
      pendingOrders,
      favoriteCount,
      wishlistCount,
      comparisonCount,
      recentSearches,
      recentViews,
      activeProjects,
      upcomingEvents,
    },
  });
});

// ──────────────────────────────────────────────
// 13. BUYER DASHBOARD
// ──────────────────────────────────────────────

export const getBuyerDashboardData = expressAsyncHandler(async (req, res) => {
  const buyerFeatures = await isFeatureEnabled(FEATURE_BUYER_EXPERIENCE, { userId: req.user._id });
  if (!buyerFeatures) throw new AppError('Buyer experience features are disabled', 403);
  const userId = req.user._id;
  const days = parseInt(req.query.days) || 30;
  const weekDays = parseInt(req.query.weekDays) || 7;
  const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - weekDays * 24 * 60 * 60 * 1000);

  const [
    recentOrders,
    wishlistItems,
    favoriteSuppliers,
    recentViews,
    activeProjects,
    upcomingEvents,
    savedSearches,
  ] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).limit(5).populate('vendor', 'name logo').lean(),
    WishlistItem.find({ user: userId }).sort({ createdAt: -1 }).limit(10).populate('product', 'name images price currency').lean(),
    FavoriteSupplier.find({ user: userId }).sort({ createdAt: -1 }).limit(8).populate('vendor', 'name logo rating').lean(),
    RecentlyViewed.find({ user: userId, viewedAt: { $gte: thirtyDaysAgo } }).sort({ viewedAt: -1 }).limit(10).lean(),
    ProcurementProject.find({ user: userId, status: 'active' }).sort({ updatedAt: -1 }).limit(5).lean(),
    ProcurementCalendarEvent.find({ user: userId, startDate: { $gte: new Date() }, isCompleted: false }).sort({ startDate: 1 }).limit(5).lean(),
    SavedSearch.find({ user: userId }).sort({ updatedAt: -1 }).limit(5).lean(),
  ]);

  const orderCount7d = await Order.countDocuments({ user: userId, createdAt: { $gte: sevenDaysAgo } });
  const viewCount7d = await RecentlyViewed.countDocuments({ user: userId, viewedAt: { $gte: sevenDaysAgo } });

  emitEvent({ eventType: 'buyer.dashboard_viewed', userId: req.user._id, data: {}, source: 'buyer_experience' });

  res.json({
    status: true,
    data: {
      summary: {
        orderCount7d,
        viewCount7d,
        activeProjectCount: activeProjects.length,
        upcomingEventCount: upcomingEvents.length,
      },
      recentOrders,
      wishlistItems,
      favoriteSuppliers,
      recentViews,
      activeProjects,
      upcomingEvents,
      savedSearches,
    },
  });
});
