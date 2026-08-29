import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger/swagger.js';
import { getLogger } from '../services/logger.js';

const router = Router();

const logger = getLogger('api');

// Swagger UI - only in dev or for authorized admins
router.use('/api-docs', (req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
  const swaggerEnabled = process.env.SWAGGER_ENABLED !== 'false';
  
  if (!swaggerEnabled) {
    return res.status(404).json({ status: false, message: 'API documentation is disabled' });
  }
  
  if (!isDev && !isAdmin) {
    return res.status(403).json({ status: false, message: 'API documentation requires admin access' });
  }
  
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Manus API Documentation',
}));

// Raw JSON spec endpoint
router.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

export default router;
