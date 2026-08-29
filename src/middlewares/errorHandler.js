import { getLogger } from '../services/logger.js';
import mongoose from 'mongoose';

const logger = getLogger('api');
const securityLogger = getLogger('security');

export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = false;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ err: reason, promise }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

export const notFound = (req, _res, next) => {
  next(new AppError(`Route not found: ${req.originalUrl}`, 404));
};

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;

  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
  }

  if (err.code === 11000) {
    statusCode = 409;
  }

  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
  }

  const errorContext = {
    correlationId: req.correlationId,
    userId: req.user?._id,
    route: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error({ err, ...errorContext }, err.message);

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      securityLogger.warn(errorContext, 'Authentication error');
    }
  } else if (statusCode >= 400) {
    logger.warn({ ...errorContext, message: err.message }, 'Client error');
  }

  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;

  res.status(statusCode).json({
    status: false,
    message,
    correlationId: req.correlationId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
