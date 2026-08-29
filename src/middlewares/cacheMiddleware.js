const cacheControl = (maxAge = 300) => (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
    res.set('ETag', `"${Date.now().toString(36)}"`);
  }
  next();
};

export default cacheControl;
