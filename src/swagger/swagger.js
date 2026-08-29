import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Manus Marketplace API',
      version: '1.0.0',
      description: 'Comprehensive B2B Marketplace API for enterprise procurement',
      contact: {
        name: 'API Support',
        email: 'support@manus.com',
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || 'http://localhost:9000',
        description: process.env.NODE_ENV || 'development',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token from /api/user/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'boolean', example: false },
            message: { type: 'string' },
            correlationId: { type: 'string' },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            status: { type: 'boolean' },
            data: { type: 'object' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNextPage: { type: 'boolean' },
                hasPreviousPage: { type: 'boolean' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['buyer', 'vendor', 'admin', 'super_admin'] },
            phone: { type: 'string' },
            isActive: { type: 'boolean' },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'object', properties: { en: { type: 'string' }, ar: { type: 'string' } } },
            description: { type: 'object', properties: { en: { type: 'string' }, ar: { type: 'string' } } },
            price: { type: 'number' },
            currency: { type: 'string' },
            category: { type: 'string' },
            vendor: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            stock: { type: 'integer' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            orderNumber: { type: 'string' },
            user: { type: 'string' },
            vendor: { type: 'string' },
            items: { type: 'array', items: { type: 'object' } },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
            paymentStatus: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            order: { type: 'string' },
            buyer: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string' },
            method: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Users', description: 'User management endpoints' },
      { name: 'Vendors', description: 'Vendor management endpoints' },
      { name: 'Products', description: 'Product catalog endpoints' },
      { name: 'Categories', description: 'Category management' },
      { name: 'Orders', description: 'Order management endpoints' },
      { name: 'Payments', description: 'Payment processing endpoints' },
      { name: 'Escrow', description: 'Escrow management endpoints' },
      { name: 'Shipments', description: 'Shipment tracking endpoints' },
      { name: 'RFQ', description: 'Request for Quotation endpoints' },
      { name: 'Support', description: 'Support ticket endpoints' },
      { name: 'Notifications', description: 'Notification endpoints' },
      { name: 'Reviews', description: 'Product review endpoints' },
      { name: 'Wishlist', description: 'Wishlist management' },
      { name: 'Procurement', description: 'Procurement management' },
      { name: 'Tenders', description: 'Tender management' },
      { name: 'Wallet', description: 'Wallet and transactions' },
      { name: 'Subscriptions', description: 'Subscription management' },
      { name: 'AI', description: 'AI-powered features' },
      { name: 'Verification', description: 'Verification endpoints' },
      { name: 'Translation', description: 'Translation service' },
      { name: 'Webhooks', description: 'Webhook endpoints' },
      { name: 'Admin', description: 'Admin-only endpoints' },
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Metrics', description: 'System metrics endpoints' },
    ],
    paths: {
      '/api/user/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } }, required: ['email', 'password'] } } } },
          responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
        },
      },
      '/api/user/register': {
        post: {
          tags: ['Authentication'],
          summary: 'User registration',
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' }, phone: { type: 'string' } }, required: ['name', 'email', 'password'] } } } },
          responses: { '201': { description: 'User created' }, '400': { description: 'Validation error' } },
        },
      },
      '/api/user/profile': {
        get: {
          tags: ['Users'],
          summary: 'Get user profile',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'User profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }, '401': { description: 'Unauthorized' } },
        },
      },
      '/api/product': {
        get: {
          tags: ['Products'],
          summary: 'List products',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'sort', in: 'query', schema: { type: 'string', default: 'createdAt' } },
            { name: 'direction', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          ],
          responses: { '200': { description: 'Paginated product list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } } },
        },
        post: {
          tags: ['Products'],
          summary: 'Create product',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
          responses: { '201': { description: 'Product created' } },
        },
      },
      '/api/order': {
        get: {
          tags: ['Orders'],
          summary: 'List user orders',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12 } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Paginated order list' } },
        },
        post: {
          tags: ['Orders'],
          summary: 'Create order',
          security: [{ bearerAuth: [] }],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array' }, shippingAddress: { type: 'object' } } } } } },
          responses: { '201': { description: 'Order created' } },
        },
      },
      '/api/payment': {
        get: {
          tags: ['Payments'],
          summary: 'List payments',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Payment list' } },
        },
      },
      '/api/escrow': {
        get: {
          tags: ['Escrow'],
          summary: 'List escrows',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Escrow list' } },
        },
      },
      '/api/support': {
        get: {
          tags: ['Support'],
          summary: 'List support tickets',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Ticket list' } },
        },
        post: {
          tags: ['Support'],
          summary: 'Create support ticket',
          security: [{ bearerAuth: [] }],
          responses: { '201': { description: 'Ticket created' } },
        },
      },
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Basic health check',
          responses: { '200': { description: 'Service is healthy' } },
        },
      },
      '/api/live': {
        get: {
          tags: ['Health'],
          summary: 'Liveness probe',
          responses: { '200': { description: 'Service is alive' } },
        },
      },
      '/api/ready': {
        get: {
          tags: ['Health'],
          summary: 'Readiness probe',
          responses: { '200': { description: 'Service is ready' }, '503': { description: 'Service not ready' } },
        },
      },
      '/api/metrics': {
        get: {
          tags: ['Metrics'],
          summary: 'System metrics snapshot',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Metrics snapshot' } },
        },
      },
      '/api/webhooks/stripe': {
        post: {
          tags: ['Webhooks'],
          summary: 'Stripe webhook handler',
          responses: { '200': { description: 'Webhook processed' } },
        },
      },
      '/api/admin/deployment/readiness': {
        get: {
          tags: ['Admin'],
          summary: 'Deployment readiness check',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Readiness report' } },
        },
      },
      '/api/admin/deployment/checklist': {
        get: {
          tags: ['Admin'],
          summary: 'Production deployment checklist',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Checklist' } },
        },
      },
      '/api/admin/feature-flags': {
        get: {
          tags: ['Admin'],
          summary: 'List feature flags',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Feature flags' } },
        },
        post: {
          tags: ['Admin'],
          summary: 'Create/update feature flag',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Flag updated' } },
        },
      },
      '/api/translate': {
        get: {
          tags: ['Translation'],
          summary: 'Translate text',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Translation result' } },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
