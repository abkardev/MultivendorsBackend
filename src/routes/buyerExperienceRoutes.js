import { Router } from 'express';
import { protect } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  createComparison, getComparisons, getComparisonById, deleteComparison,
  addToComparison, removeFromComparison,
  followSupplier, unfollowSupplier, getFavoriteSuppliers, updateSupplierNotifications,
  createSavedSearch, getSavedSearches, updateSavedSearch, deleteSavedSearch,
  createSavedFilter, getSavedFilters, updateSavedFilter, deleteSavedFilter,
  trackView, getRecentlyViewed, clearRecentlyViewed, removeRecentlyViewed,
  createFolder, getFolders, updateFolder, deleteFolder,
  addToWishlist, removeFromWishlist, getWishlistItems,
  createCollection, getCollections, getCollectionById, updateCollection, deleteCollection,
  addProductToCollection, removeProductFromCollection,
  getSearchHistory, clearSearchHistory, deleteSearchEntry,
  createProject, getProjects, getProjectById, updateProject, deleteProject,
  createCalendarEvent, getCalendarEvents, updateCalendarEvent, deleteCalendarEvent,
  getOrderTemplate,
  getBuyerAnalytics,
  getBuyerDashboardData,
} from '../controllers/buyerExperienceController.js';

const router = Router();

// All routes require auth
router.use(protect);

// Feature flag for buyer experience — applied to all mutation routes
router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return featureFlag('buyer_experience')(req, res, next);
  }
  next();
});

// ── Comparisons ──
router.get('/comparisons', getComparisons);
router.post('/comparisons', createComparison);
router.get('/comparisons/:id', getComparisonById);
router.delete('/comparisons/:id', deleteComparison);
router.post('/comparisons/:id/items', addToComparison);
router.delete('/comparisons/:id/items', removeFromComparison);

// ── Favorite Suppliers ──
router.get('/favorite-suppliers', getFavoriteSuppliers);
router.post('/favorite-suppliers', followSupplier);
router.delete('/favorite-suppliers/:vendorId', unfollowSupplier);
router.patch('/favorite-suppliers/:vendorId/notifications', updateSupplierNotifications);

// ── Saved Searches ──
router.get('/saved-searches', getSavedSearches);
router.post('/saved-searches', createSavedSearch);
router.put('/saved-searches/:id', updateSavedSearch);
router.delete('/saved-searches/:id', deleteSavedSearch);

// ── Saved Filters ──
router.get('/saved-filters', getSavedFilters);
router.post('/saved-filters', createSavedFilter);
router.put('/saved-filters/:id', updateSavedFilter);
router.delete('/saved-filters/:id', deleteSavedFilter);

// ── Recently Viewed ──
router.get('/recently-viewed', getRecentlyViewed);
router.post('/recently-viewed', trackView);
router.delete('/recently-viewed', clearRecentlyViewed);
router.delete('/recently-viewed/:id', removeRecentlyViewed);

// ── Multi-Wishlist Folders ──
router.get('/wishlist/folders', getFolders);
router.post('/wishlist/folders', createFolder);
router.put('/wishlist/folders/:id', updateFolder);
router.delete('/wishlist/folders/:id', deleteFolder);

// ── Wishlist Items ──
router.get('/wishlist/items', getWishlistItems);
router.post('/wishlist/items', addToWishlist);
router.delete('/wishlist/items/:id', removeFromWishlist);

// ── Product Collections ──
router.get('/collections', getCollections);
router.post('/collections', createCollection);
router.get('/collections/:id', getCollectionById);
router.put('/collections/:id', updateCollection);
router.delete('/collections/:id', deleteCollection);
router.post('/collections/:id/products', addProductToCollection);
router.delete('/collections/:id/products', removeProductFromCollection);

// ── Search History ──
router.get('/search-history', getSearchHistory);
router.delete('/search-history', clearSearchHistory);
router.delete('/search-history/:id', deleteSearchEntry);

// ── Procurement Projects ──
router.get('/procurement-projects', getProjects);
router.post('/procurement-projects', createProject);
router.get('/procurement-projects/:id', getProjectById);
router.put('/procurement-projects/:id', updateProject);
router.delete('/procurement-projects/:id', deleteProject);

// ── Procurement Calendar ──
router.get('/calendar', getCalendarEvents);
router.post('/calendar', createCalendarEvent);
router.put('/calendar/:id', updateCalendarEvent);
router.delete('/calendar/:id', deleteCalendarEvent);

// ── Repeat Order ──
router.get('/repeat-order/:orderId', getOrderTemplate);

// ── Analytics & Dashboard ──
router.get('/analytics', getBuyerAnalytics);
router.get('/dashboard', getBuyerDashboardData);

export default router;
