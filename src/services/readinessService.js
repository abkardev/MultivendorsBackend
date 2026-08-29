import fs from 'fs';
import path from 'path';

class ReadinessService {
  constructor() {
    this.basePath = process.cwd();
  }

  async assess() {
    const checks = {
      security: await this._assessSecurity(),
      performance: await this._assessPerformance(),
      reliability: await this._assessReliability(),
      testing: await this._assessTesting(),
      deployment: await this._assessDeployment(),
      monitoring: await this._assessMonitoring(),
      documentation: await this._assessDocumentation(),
      scalability: await this._assessScalability(),
      accessibility: await this._assessAccessibility(),
      i18n: await this._assessI18n(),
    };

    const weights = {
      security: 20, performance: 15, reliability: 15, testing: 15,
      deployment: 10, monitoring: 10, documentation: 5, scalability: 5,
      accessibility: 3, i18n: 2,
    };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const overall = Object.entries(checks).reduce(
      (sum, [key, val]) => sum + (val.score * (weights[key] || 5)), 0
    ) / totalWeight;

    const blockers = Object.entries(checks)
      .filter(([, v]) => v.score < 50)
      .flatMap(([k]) => checks[k].blockers || []);

    const recommendations = Object.entries(checks)
      .filter(([, v]) => v.score < 80)
      .flatMap(([k]) => checks[k].recommendations || []);

    return {
      overall: Math.round(overall),
      categories: checks,
      blockers: [...new Set(blockers)],
      recommendations: [...new Set(recommendations)],
      timestamp: new Date().toISOString(),
      grade: overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F',
    };
  }

  async _checkFile(files) {
    return files.some(f => fs.existsSync(path.resolve(this.basePath, f)));
  }

  async _glob(pattern) {
    const parts = pattern.split('/');
    const root = path.resolve(this.basePath, parts[0]);
    if (!fs.existsSync(root)) return [];
    const walk = (dir, idx) => {
      if (idx >= parts.length) return [dir];
      const part = parts[idx];
      if (part === '**') {
        const results = [];
        const recurse = (d, i) => {
          if (i >= parts.length) { results.push(d); return; }
          const p = parts[i];
          if (p === '**') { recurse(d, i + 1); return; }
          try {
            const entries = fs.readdirSync(d);
            for (const e of entries) {
              const full = path.join(d, e);
              const stat = fs.statSync(full);
              if (p.includes('*')) {
                const re = new RegExp('^' + p.replace(/\*/g, '.*') + '$');
                if (re.test(e)) {
                  if (i === parts.length - 1) results.push(full);
                  else if (stat.isDirectory()) recurse(full, i + 1);
                }
              } else if (e === p) {
                if (i === parts.length - 1) results.push(full);
                else if (stat.isDirectory()) recurse(full, i + 1);
              }
              if (stat.isDirectory()) recurse(full, i);
            }
          } catch {}
        };
        recurse(dir, idx);
        return results;
      }
      try {
        const entries = fs.readdirSync(dir);
        for (const e of entries) {
          const full = path.join(dir, e);
          const stat = fs.statSync(full);
          if (part.includes('*')) {
            const re = new RegExp('^' + part.replace(/\*/g, '.*') + '$');
            if (re.test(e)) {
              if (idx === parts.length - 1) return [full];
              if (stat.isDirectory()) return walk(full, idx + 1);
            }
          } else if (e === part) {
            if (idx === parts.length - 1) return [full];
            if (stat.isDirectory()) return walk(full, idx + 1);
          }
        }
      } catch {}
      return [];
    };
    return walk(root, 1);
  }

  _countMatchingLines(filePath, pattern) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const re = new RegExp(pattern, 'g');
      return (content.match(re) || []).length;
    } catch {
      return 0;
    }
  }

  _checkPackageDep(pkg, dep) {
    try {
      const pkgPath = path.resolve(this.basePath, 'package.json');
      const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      return !!(pkgJson.dependencies?.[dep] || pkgJson.devDependencies?.[dep]);
    } catch {
      return false;
    }
  }

  // ─── Security Assessment ────────────────────────────────────────────────────

  async _assessSecurity() {
    const srcMiddlewares = 'src/middlewares';
    const checks = {
      hasAuth: await this._checkFile([`${srcMiddlewares}/auth.js`, `${srcMiddlewares}/auth.ts`, `${srcMiddlewares}/authMiddleware.js`]),
      hasRbac: await this._checkFile([`${srcMiddlewares}/rbacMiddleware.js`, 'src/services/rbacService.js']),
      hasHelmet: this._countMatchingLines(path.resolve(this.basePath, 'index.js'), 'helmet') > 0,
      hasRateLimit: await this._checkFile([`${srcMiddlewares}/rateLimit.js`, `${srcMiddlewares}/securityMiddleware.js`]),
      hasSanitizer: await this._checkFile([`${srcMiddlewares}/sanitizer.js`, 'src/middlewares/errorHandler.js']),
      hasCsrf: this._checkPackageDep('package.json', 'csurf') || this._checkPackageDep('package.json', 'csrf-csrf'),
      hasCors: this._countMatchingLines(path.resolve(this.basePath, 'index.js'), 'cors') > 0,
      hasHsts: this._countMatchingLines(path.resolve(this.basePath, 'index.js'), 'hsts') > 0 ||
        this._countMatchingLines(path.resolve(this.basePath, 'index.js'), 'helmet') > 0,
      hasEncryption: this._checkPackageDep('package.json', 'bcrypt') || this._checkPackageDep('package.json', 'bcryptjs'),
      hasJwt: this._checkPackageDep('package.json', 'jsonwebtoken') || this._checkPackageDep('package.json', 'jose'),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const blockers = [];
    if (!checks.hasCsrf) blockers.push('CSRF protection not implemented — add csurf or csrf-csrf middleware');
    if (!checks.hasSanitizer) blockers.push('Input sanitization middleware not found');
    if (!checks.hasRateLimit) blockers.push('Rate limiting middleware not detected');

    const recommendations = [];
    if (!checks.hasHsts) recommendations.push('Enable HSTS via helmet.hsts()');
    if (!checks.hasEncryption) recommendations.push('Add bcrypt for password hashing');
    if (score < 80) recommendations.push('Complete a full security audit before production launch');

    return { score, checks, blockers, recommendations };
  }

  // ─── Performance Assessment ──────────────────────────────────────────────────

  async _assessPerformance() {
    const checks = {
      hasIndexes: this._countMatchingLines(
        path.resolve(this.basePath, 'src/models'), 'index\\(|index: true|createIndex'
      ) > 3,
      hasCaching: await this._checkFile(['src/services/cacheService.js', 'src/middlewares/cacheMiddleware.js']),
      hasRedisCache: this._checkPackageDep('package.json', 'redis') || this._checkPackageDep('package.json', 'ioredis'),
      hasCompression: this._checkPackageDep('package.json', 'compression'),
      hasLeanQueries: this._countMatchingLines(
        path.resolve(this.basePath, 'src/services'), '\\.lean\\(\\)'
      ) > 0,
      hasPagination: this._countMatchingLines(
        path.resolve(this.basePath, 'src'), 'pagination|skip\\(|limit\\(|pageSize'
      ) > 5,
      hasLazyLoading: await this._checkFile(['../frontend/src/App.tsx']) &&
        this._countMatchingLines(
          path.resolve(this.basePath, '../frontend/src/App.tsx'), 'React\\.lazy|lazy\\(|Suspense'
        ) > 0,
      hasConnectionPooling: this._countMatchingLines(
        path.resolve(this.basePath, 'src/config'), 'pool|maxPoolSize|connectionLimit'
      ) > 0,
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const recommendations = [];
    if (!checks.hasRedisCache) recommendations.push('Implement Redis caching layer for repeated queries');
    if (!checks.hasCompression) recommendations.push('Enable gzip/brotli compression middleware');
    if (score < 80) recommendations.push('Profile API endpoints to identify N+1 query patterns');
    if (checks.hasIndexes) recommendations.push('Run MongoDB explain() on slow queries to validate index usage');

    return { score, checks, blockers: [], recommendations };
  }

  // ─── Reliability Assessment ──────────────────────────────────────────────────

  async _assessReliability() {
    const checks = {
      hasRetryLogic: this._countMatchingLines(
        path.resolve(this.basePath, 'src'), 'retry|retries|maxRetries|retryOptions'
      ) > 0,
      hasDeadLetterQueue: await this._checkFile([
        'src/models/DeadLetter.js', 'src/models/EventDeadLetter.js',
        'src/services/deadLetterService.js'
      ]),
      hasHealthCheck: await this._checkFile([
        'src/routes/healthRoutes.js', 'src/controllers/healthController.js',
        'healthcheck.js'
      ]),
      hasGracefulShutdown: this._countMatchingLines(
        path.resolve(this.basePath, 'index.js'), 'SIGTERM|SIGINT|graceful|shutdown'
      ) > 0,
      hasScheduler: await this._checkFile([
        'src/services/scheduler.js', 'src/schedulers'
      ]) || this._checkPackageDep('package.json', 'node-cron') ||
        this._checkPackageDep('package.json', 'bull'),
      hasCircuitBreaker: this._checkPackageDep('package.json', 'opossum') ||
        this._countMatchingLines(path.resolve(this.basePath, 'src'), 'circuitBreaker|CircuitBreaker') > 0,
      hasErrorBoundary: await this._checkFile([
        '../frontend/src/components/ErrorBoundary.tsx',
        '../frontend/src/components/ErrorBoundary.jsx'
      ]),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const blockers = [];
    if (!checks.hasGracefulShutdown) blockers.push('No graceful shutdown handling — add SIGTERM/SIGINT handlers');
    if (!checks.hasRetryLogic) blockers.push('No retry mechanism — add retry logic for external service calls');

    const recommendations = [];
    if (!checks.hasCircuitBreaker) recommendations.push('Implement circuit breaker pattern for external API calls');
    if (!checks.hasDeadLetterQueue) recommendations.push('Create dead letter queue for failed async operations');

    return { score, checks, blockers, recommendations };
  }

  // ─── Testing Assessment ──────────────────────────────────────────────────────

  async _assessTesting() {
    const testFilesBackend = await this._glob('src/tests/**/*.test.js');
    const testFilesBackend2 = await this._glob('src/tests/**/*.spec.js');
    const allBackendTests = [...testFilesBackend, ...testFilesBackend2];

    const testFilesFrontend = await this._glob('../frontend/src/**/*.test.*');
    const testFilesFrontend2 = await this._glob('../frontend/src/**/*.spec.*');
    const allFrontendTests = [...testFilesFrontend, ...testFilesFrontend2];

    const e2eFiles = await this._glob('e2e/**/*');
    const playwrightConfig = await this._checkFile([
      'e2e/playwright.config.ts', 'e2e/playwright.config.js',
      'playwright.config.ts', 'cypress.config.ts', 'cypress.config.js'
    ]);

    const checks = {
      hasBackendTests: allBackendTests.length > 0,
      hasFrontendTests: allFrontendTests.length > 0,
      hasE2e: playwrightConfig || e2eFiles.length > 0,
      hasCoverageConfig: this._checkPackageDep('package.json', 'jest') ||
        this._checkPackageDep('package.json', 'vitest') ||
        this._checkPackageDep('package.json', 'mocha'),
      hasCiTestJob: await this._checkFile(['.github/workflows/ci.yml', '.github/workflows/test.yml']),
      backendTestCount: allBackendTests.length,
      frontendTestCount: allFrontendTests.length,
    };

    const score = (checks.hasBackendTests ? 25 : 0) +
      (checks.hasFrontendTests ? 25 : 0) +
      (checks.hasE2e ? 25 : 0) +
      (checks.hasCoverageConfig ? 15 : 0) +
      (checks.hasCiTestJob ? 10 : 0);

    const recommendations = [];
    if (!checks.hasE2e) recommendations.push('Set up end-to-end tests with Playwright or Cypress');
    if (!checks.hasBackendTests) recommendations.push('Add backend unit/integration tests');
    if (allBackendTests.length < 10) recommendations.push('Increase backend test coverage to minimum 50+ tests');
    if (!checks.hasCiTestJob) recommendations.push('Add CI test runner job to .github/workflows');

    return { score, checks, blockers: [], recommendations };
  }

  // ─── Deployment Assessment ───────────────────────────────────────────────────

  async _assessDeployment() {
    const checks = {
      hasDockerfile: await this._checkFile(['Dockerfile', 'backend_latest/Dockerfile']),
      hasCompose: await this._checkFile(['docker-compose.yml', 'docker-compose.yaml']),
      hasCiCd: await this._checkFile([
        '.github/workflows/ci.yml', '.github/workflows/deploy.yml',
        '.gitlab-ci.yml', '.circleci/config.yml'
      ]),
      hasHealthEndpoint: await this._checkFile([
        'src/routes/healthRoutes.js', 'healthcheck.js',
        'src/controllers/healthController.js'
      ]),
      hasEnvValidation: await this._checkFile([
        'src/utils/envValidator.js', 'src/config/envValidator.js',
        'src/config/validation.js'
      ]),
      hasNonRootUser: fs.existsSync(path.resolve(this.basePath, 'Dockerfile')) &&
        this._countMatchingLines(path.resolve(this.basePath, 'Dockerfile'), 'USER') > 0,
      hasMultiStageBuild: fs.existsSync(path.resolve(this.basePath, 'Dockerfile')) &&
        this._countMatchingLines(path.resolve(this.basePath, 'Dockerfile'), 'FROM.*AS\\s+') > 0,
      hasVersionTag: await this._checkFile(['package.json']),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const blockers = [];
    if (!checks.hasCiCd) blockers.push('No CI/CD pipeline configured — set up GitHub Actions or equivalent');
    if (!checks.hasEnvValidation) blockers.push('No environment variable validation — add env validator');

    const recommendations = [];
    if (!checks.hasMultiStageBuild) recommendations.push('Convert Dockerfile to multi-stage build');
    if (!checks.hasNonRootUser) recommendations.push('Run container as non-root user in Dockerfile');

    return { score, checks, blockers, recommendations };
  }

  // ─── Monitoring Assessment ───────────────────────────────────────────────────

  async _assessMonitoring() {
    const checks = {
      hasMetricsEndpoint: await this._checkFile([
        'src/routes/metricsRoutes.js', 'src/controllers/monitoringController.js'
      ]),
      hasStructuredLogging: this._checkPackageDep('package.json', 'pino') ||
        this._checkPackageDep('package.json', 'winston') ||
        this._checkPackageDep('package.json', 'bunyan'),
      hasHealthCheck: true,
      hasAlerts: await this._checkFile([
        'src/services/monitoringService.js', 'src/services/alertService.js',
        'src/services/notificationService.js'
      ]),
      hasCorrelationId: this._countMatchingLines(
        path.resolve(this.basePath, 'src/middlewares'), 'correlationId|correlation-id|X-Correlation-ID'
      ) > 0,
      hasLogRotation: this._countMatchingLines(
        path.resolve(this.basePath, 'src'), 'logRotation|rotate|logrotate'
      ) > 0,
      hasPerformanceMetrics: this._checkPackageDep('package.json', 'prom-client') ||
        this._checkPackageDep('package.json', 'prometheus'),
      hasDistributedTracing: this._checkPackageDep('package.json', 'opentelemetry') ||
        this._checkPackageDep('package.json', 'dd-trace') ||
        this._checkPackageDep('package.json', 'elastic-apm-node'),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const blockers = [];
    if (!checks.hasStructuredLogging) blockers.push('No structured logging library — add pino or winston');
    if (!checks.hasMetricsEndpoint) blockers.push('No metrics endpoint — expose Prometheus metrics');

    const recommendations = [];
    if (!checks.hasCorrelationId) recommendations.push('Add correlation ID middleware to trace requests across services');
    if (!checks.hasDistributedTracing) recommendations.push('Implement distributed tracing with OpenTelemetry');
    if (!checks.hasPerformanceMetrics) recommendations.push('Expose Prometheus metrics for API performance monitoring');

    return { score, checks, blockers, recommendations };
  }

  // ─── Documentation Assessment ────────────────────────────────────────────────

  async _assessDocumentation() {
    const checks = {
      hasApiDocs: await this._checkFile([
        'src/routes/swaggerRoutes.js', 'src/swagger',
        'docs/api/openapi-spec.md'
      ]) || this._checkPackageDep('package.json', 'swagger-jsdoc'),
      hasReadme: await this._checkFile(['README.md']),
      hasArchitectureDoc: await this._checkFile([
        'ARCHITECTURE.md', 'docs/architecture.md', 'docs/ARCHITECTURE.md'
      ]),
      hasDeploymentGuide: await this._checkFile([
        'DEPLOYMENT.md', 'docs/deployment.md', 'docs/deployment-guide.md'
      ]),
      hasSecurityGuide: await this._checkFile([
        'SECURITY.md', 'docs/security.md', 'docs/security-guide.md'
      ]),
      hasChangelog: await this._checkFile(['CHANGELOG.md', 'CHANGES.md']),
      hasContributingGuide: await this._checkFile(['CONTRIBUTING.md']),
      hasPostmanCollection: await this._checkFile([
        'postman_collection.json', 'docs/api/postman_collection.json'
      ]),
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const recommendations = [];
    if (!checks.hasApiDocs) recommendations.push('Generate OpenAPI 3.1 specification and expose via Swagger UI');
    if (!checks.hasArchitectureDoc) recommendations.push('Create architecture documentation with C4 diagrams');
    if (!checks.hasDeploymentGuide) recommendations.push('Write deployment guide with environment variable reference');
    if (!checks.hasSecurityGuide) recommendations.push('Create security guide covering auth, encryption, headers');
    if (!checks.hasContributingGuide) recommendations.push('Add CONTRIBUTING.md for onboarding new developers');

    return { score, checks, blockers: [], recommendations };
  }

  // ─── Scalability Assessment ──────────────────────────────────────────────────

  async _assessScalability() {
    const hasIndexes = this._countMatchingLines(
      path.resolve(this.basePath, 'src/models'), 'index: true|createIndex\\('
    ) > 5;

    const hasPagination = this._countMatchingLines(
      path.resolve(this.basePath, 'src'), 'skip\\(|limit\\(|page=|pageSize=|pagination'
    ) > 10;

    const hasCaching = await this._checkFile([
      'src/services/cacheService.js', 'src/middlewares/cacheMiddleware.js'
    ]);

    const hasLazyLoading = await this._checkFile(['../frontend/src/App.tsx']) &&
      this._countMatchingLines(
        path.resolve(this.basePath, '../frontend/src/App.tsx'), 'React\\.lazy|lazy\\(|Suspense'
      ) > 0;

    const hasCodeSplitting = this._countMatchingLines(
      path.resolve(this.basePath, '../frontend'), 'import\\(|dynamic\\(|split'
    ) > 5;

    const hasHorizontalScaling = this._countMatchingLines(
      path.resolve(this.basePath, 'index.js'), 'cluster|worker|fork'
    ) > 0 || await this._checkFile(['docker-compose.yml']) &&
      this._countMatchingLines(path.resolve(this.basePath, 'docker-compose.yml'), 'replicas:') > 0;

    const hasDatabaseReplication = this._countMatchingLines(
      path.resolve(this.basePath, 'src/config'), 'replicaSet|replica|readPreference|secondaryPreferred'
    ) > 0;

    const checks = {
      hasIndexes,
      hasPagination,
      hasCaching,
      hasLazyLoading,
      hasCodeSplitting,
      hasHorizontalScaling,
      hasDatabaseReplication,
    };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const recommendations = [];
    if (!hasHorizontalScaling) recommendations.push('Configure horizontal scaling with cluster module or container orchestration');
    if (!hasDatabaseReplication) recommendations.push('Set up database read replicas for reporting queries');
    if (!hasCaching) recommendations.push('Implement Redis caching for frequently accessed data');
    if (score < 70) recommendations.push('Review MongoDB index usage with explain() and add missing indexes');

    return { score, checks, blockers: [], recommendations };
  }

  // ─── Accessibility Assessment ────────────────────────────────────────────────

  async _assessAccessibility() {
    const frontendSrc = path.resolve(this.basePath, '../frontend/src');

    const hasRtl = await this._checkFile(['../frontend/src/i18n/ar.json']) ||
      this._countMatchingLines(frontendSrc, 'rtl|dir=\"rtl\"|direction.*rtl') > 0;

    const hasI18nLibrary = this._checkPackageDep('../frontend/package.json', 'react-i18next') ||
      this._checkPackageDep('../frontend/package.json', 'react-intl') ||
      this._checkPackageDep('../frontend/package.json', 'i18next');

    const hasAriaLabels = this._countMatchingLines(frontendSrc, 'aria-label|aria-labelledby') > 10;

    const hasFocusManagement = this._countMatchingLines(
      frontendSrc, 'useRef\\(\\)|focus\\(\\)|tabIndex|onKeyDown|aria-'
    ) > 10;

    const hasAltText = this._countMatchingLines(frontendSrc, 'alt=\\s*[\\{|\\\"|\\\']') > 15;

    const hasColorContrast = this._countMatchingLines(
      frontendSrc, 'text-contrast|contrast|accessible|sr-only'
    ) > 0;

    const hasSkipNavigation = this._countMatchingLines(frontendSrc, 'skip.*nav|skip.*content|#main-content') > 0;

    const checks = { hasRtl, hasI18nLibrary, hasAriaLabels, hasFocusManagement, hasAltText, hasColorContrast, hasSkipNavigation };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const recommendations = [];
    if (!hasSkipNavigation) recommendations.push('Add skip-to-content link for keyboard navigation');
    if (!hasColorContrast) recommendations.push('Ensure minimum WCAG AA color contrast ratios');
    if (score < 70) recommendations.push('Run Lighthouse accessibility audit and fix identified issues');

    return { score, checks, blockers: [], recommendations };
  }

  // ─── Internationalization Assessment ─────────────────────────────────────────

  async _assessI18n() {
    const i18nDir = path.resolve(this.basePath, '../frontend/src/i18n');
    const hasI18nDir = fs.existsSync(i18nDir);

    let localeFiles = [];
    if (hasI18nDir) {
      try {
        localeFiles = fs.readdirSync(i18nDir).filter(f => f.endsWith('.json') || f.endsWith('.js') || f.endsWith('.ts'));
      } catch { localeFiles = []; }
    }

    const hasMultiLanguage = localeFiles.length >= 2;

    const hasRtlSupport = localeFiles.some(f =>
      f.includes('ar') || f.includes('he') || f.includes('fa') || f.includes('ur')
    ) || this._countMatchingLines(
      path.resolve(this.basePath, '../frontend/src'), 'rtl|direction.*rtl'
    ) > 0;

    const hasNumberFormatting = this._countMatchingLines(
      path.resolve(this.basePath, '../frontend/src'),
      'Intl\\.NumberFormat|toLocaleString|formatNumber|numberFormat'
    ) > 0;

    const hasDateFormatting = this._countMatchingLines(
      path.resolve(this.basePath, '../frontend/src'),
      'Intl\\.DateTimeFormat|toLocaleDateString|formatDate|dateFormat'
    ) > 0;

    const hasLocaleDetection = this._countMatchingLines(
      path.resolve(this.basePath, '../frontend/src'),
      'navigator\\.language|accept-language|locale|i18n\\.language|i18n\\.changeLanguage'
    ) > 0;

    const checks = { hasMultiLanguage, hasRtlSupport, hasNumberFormatting, hasDateFormatting, hasLocaleDetection, localeCount: localeFiles.length };

    const passed = Object.values(checks).filter(Boolean).length;
    const total = Object.values(checks).length;
    const score = Math.round((passed / total) * 100);

    const recommendations = [];
    if (!hasMultiLanguage) recommendations.push('Add at least one additional locale (e.g., Arabic for RTL support)');
    if (!hasRtlSupport && hasMultiLanguage) recommendations.push('Implement RTL layout support for Arabic/Hebrew locales');
    if (!hasLocaleDetection) recommendations.push('Implement automatic locale detection from browser settings');
    if (score < 80) recommendations.push('Create i18n validation script to catch missing translation keys');

    return { score, checks, blockers: [], recommendations };
  }
}

export const readinessService = new ReadinessService();
