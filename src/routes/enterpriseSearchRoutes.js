import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { featureFlag } from '../services/featureFlagService.js';
import {
  search, autocomplete, getSuggestions, getPopularSearches,
  getSearchAnalytics, indexDocument, removeDocument, manageSynonyms,
} from '../controllers/enterpriseSearchController.js';

const router = Router();

const ff = featureFlag('enterprise_search');

router.get('/search/:index', protect, ff, search);
router.get('/autocomplete/:index', protect, ff, autocomplete);
router.get('/suggestions', protect, ff, getSuggestions);
router.get('/popular', protect, ff, getPopularSearches);
router.get('/analytics', protect, authorize('admin'), ff, getSearchAnalytics);
router.post('/index/:index', protect, authorize('admin'), ff, indexDocument);
router.delete('/index/:index/:id', protect, authorize('admin'), ff, removeDocument);
router.post('/synonyms/:index', protect, authorize('admin'), ff, manageSynonyms);

export default router;
