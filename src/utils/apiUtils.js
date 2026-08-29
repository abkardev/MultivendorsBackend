import { AppError } from '../middlewares/errorHandler.js';

/**
 * Standardized API response helpers
 * All responses follow the format: { status: true/false, data, message, ... }
 */

// Success responses
export const sendSuccess = (res, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({ status: true, data });
};

export const created = (res, data = {}) => sendSuccess(res, data, 201);

export const updated = (res, data = {}) => sendSuccess(res, data, 200);

export const deleted = (res, data = {}) => sendSuccess(res, data, 200);

export const sendNoContent = (res) => res.status(204).send();

// Paginated response
export const sendPaginated = (res, data, total, page, limit) => {
  return res.status(200).json({
    status: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
  });
};

// Error responses
export const badRequest = (res, message = 'Bad request', details = null) => {
  const response = { status: false, message };
  if (details) response.details = details;
  return res.status(400).json(response);
};

export const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({ status: false, message });
};

export const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({ status: false, message });
};

export const notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({ status: false, message });
};

export const validationError = (res, message = 'Validation failed', details = null) => {
  const response = { status: false, message };
  if (details) response.details = details;
  return res.status(422).json(response);
};

export const internalError = (res, message = 'Internal server error') => {
  return res.status(500).json({ status: false, message });
};

// Error response (generic, for backward compatibility)
export const sendError = (res, message, statusCode = 500, details = null) => {
  const response = { status: false, message };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
};

// Standardized error throw helpers
export const throwBadRequest = (message) => { throw new AppError(message, 400); };
export const throwUnauthorized = (message) => { throw new AppError(message, 401); };
export const throwForbidden = (message) => { throw new AppError(message, 403); };
export const throwNotFound = (message) => { throw new AppError(message, 404); };
export const throwConflict = (message) => { throw new AppError(message, 409); };
