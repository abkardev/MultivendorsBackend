const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_SORT = 'createdAt';
const DEFAULT_DIRECTION = 'desc';

// ============================================================
// Pagination helpers
// ============================================================

export const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (query, defaultSort = `-${DEFAULT_SORT}`) => {
  const sortField = query.sort || defaultSort;
  const sortOrder = sortField.startsWith('-') ? -1 : 1;
  const sortKey = sortField.replace(/^-/, '');
  return { [sortKey]: sortOrder };
};

export const parseFilters = (query, allowedFields = []) => {
  const filters = {};
  for (const field of allowedFields) {
    if (query[field] !== undefined) filters[field] = query[field];
  }
  if (query.search) filters.$text = { $search: query.search };
  if (query.status) filters.status = query.status;
  if (query.isActive !== undefined) filters.isActive = query.isActive === 'true';
  return filters;
};

// ============================================================
// Legacy pagination API (backward compatible)
// ============================================================

export function paginate(query, options = {}) {
  const page = Math.max(1, parseInt(options.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(options.limit) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  const sortField = options.sort || DEFAULT_SORT;
  const sortDirection = options.direction === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  if (options.search) {
    const searchRegex = new RegExp(options.search, 'i');
    const searchFields = options.searchFields || ['name', 'title', 'description'];
    query.$or = searchFields.map(field => ({ [field]: searchRegex }));
  }

  if (options.filters && typeof options.filters === 'object') {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query[key] = value;
      }
    });
  }

  return { query, page, limit, skip, sort };
}

export async function paginateResult(model, query, options = {}) {
  const { query: q, page, limit, skip, sort } = paginate(query, options);
  const pipeline = model.find(q).sort(sort).skip(skip).limit(limit);

  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => pipeline.populate(p));
    } else {
      pipeline.populate(options.populate);
    }
  }

  if (options.select) {
    pipeline.select(typeof options.select === 'string' ? options.select.split(',').join(' ') : options.select);
  }

  const [items, totalItems] = await Promise.all([
    pipeline.exec(),
    model.countDocuments(q),
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    totalItems,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ============================================================
// New unified paginated query builder
// ============================================================

export const buildPaginatedQuery = async (model, query = {}, options = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, options.defaultSort);
  const filters = parseFilters(query, options.allowedFields || []);
  const [data, total] = await Promise.all([
    model.find(filters).sort(sort).skip(skip).limit(limit).lean().select(options.select || ''),
    model.countDocuments(filters),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasMore: page * limit < total } };
};
