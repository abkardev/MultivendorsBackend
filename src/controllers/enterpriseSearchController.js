import { enterpriseSearchService } from '../services/enterpriseSearchService.js';

export const search = async (req, res) => {
  try {
    const results = await enterpriseSearchService.search(
      req.params.index || 'products',
      req.query.q,
      {
        filters: req.query.filters ? JSON.parse(req.query.filters) : {},
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort: req.query.sort,
        facets: req.query.facets ? req.query.facets.split(',') : undefined,
        locale: req.headers['x-locale'],
        userId: req.user?._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        sessionId: req.headers['x-session-id'],
      },
    );
    res.json({ status: true, data: results });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const autocomplete = async (req, res) => {
  try {
    const results = await enterpriseSearchService.autocomplete(
      req.params.index || 'products',
      req.query.q,
      { limit: parseInt(req.query.limit) || 10 },
    );
    res.json({ status: true, data: results });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const suggestions = await enterpriseSearchService.getSuggestions(req.query.q, {
      limit: parseInt(req.query.limit) || 5,
    });
    res.json({ status: true, data: suggestions });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getPopularSearches = async (req, res) => {
  try {
    const popular = await enterpriseSearchService.getPopularSearches(parseInt(req.query.limit) || 10);
    res.json({ status: true, data: popular });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const getSearchAnalytics = async (req, res) => {
  try {
    const analytics = await enterpriseSearchService.getSearchAnalytics(req.query);
    res.json({ status: true, data: analytics });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const indexDocument = async (req, res) => {
  try {
    await enterpriseSearchService.indexDocument(req.params.index, req.body);
    res.json({ status: true, message: 'Document indexed' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const removeDocument = async (req, res) => {
  try {
    await enterpriseSearchService.removeDocument(req.params.index, req.params.id);
    res.json({ status: true, message: 'Document removed' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const manageSynonyms = async (req, res) => {
  try {
    await enterpriseSearchService.manageSynonyms(req.params.index, req.body.synonyms);
    res.json({ status: true, message: 'Synonyms updated' });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
