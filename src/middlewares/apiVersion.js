/**
 * API Versioning Middleware
 * Prepares API versioning support for future v2 endpoints
 */
export function apiVersion(version) {
  return (req, res, next) => {
    req.apiVersion = version;
    
    // Set version in response header
    res.setHeader('X-API-Version', version);
    
    // Check if client requested a specific version via Accept header
    const acceptVersion = req.headers['accept-version'];
    if (acceptVersion && acceptVersion !== version) {
      // For now, just warn. In future, could route to different handlers
      req.requestedVersion = acceptVersion;
    }
    
    next();
  };
}

/**
 * Route version resolver - for future v1/v2 coexistence
 * Usage: router.use('/api', apiVersionResolver);
 */
export function apiVersionResolver(req, res, next) {
  // Default to v1
  req.apiVersion = req.apiVersion || 'v1';
  next();
}

/**
 * Get versioned route path
 */
export function v(version, path) {
  return `/api/${version}${path}`;
}

// Version constants
export const VERSIONS = {
  V1: 'v1',
  V2: 'v2',
};
