import Idempotency from '../models/Idempotency.js';

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const idempotency = (options = {}) => {
  return async (req, res, next) => {
    // Only apply to mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const key = req.headers['idempotency-key'];
    if (!key) {
      // For financial operations, require idempotency key
      if (options.require) {
        return res.status(400).json({ 
          status: false, 
          message: 'Idempotency-Key header is required for this operation' 
        });
      }
      return next();
    }

    // Validate key format
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) {
      return res.status(400).json({ 
        status: false, 
        message: 'Idempotency-Key must be between 8 and 128 characters' 
      });
    }

    try {
      const existing = await Idempotency.findOne({ key, method: req.method, path: req.originalUrl });

      if (existing) {
        // Key already used - return cached response
        return res.status(existing.statusCode).json(existing.responseBody);
      }

      // Store the original res.json to capture the response
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        // Store the response for future idempotent requests
        Idempotency.create({
          key,
          method: req.method,
          path: req.originalUrl,
          userId: req.user?._id,
          statusCode: res.statusCode,
          responseBody: body,
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL),
        }).catch(err => console.error('Failed to store idempotency key:', err.message));

        return originalJson(body);
      };

      next();
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key - another request just processed this
        return res.status(409).json({ 
          status: false, 
          message: 'This request is already being processed' 
        });
      }
      next(err);
    }
  };
};
