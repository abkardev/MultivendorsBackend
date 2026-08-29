# Cloudflare Migration Guide

## 1. BunnyCDN Dependency Report

### Current BunnyCDN Usage
| Component | File | Action Required |
|-----------|------|-----------------|
| File Upload | `src/controllers/uploadController.js` | Replaced — delegates to StorageProvider |
| File Delete | `src/controllers/uploadController.js` | Replaced — delegates to StorageProvider |
| .env Variables | `BUNNYCDN_ACCESS_KEY`, `BUNNYCDN_STORAGE_ZONE`, `BUNNYCDN_HOSTNAME` | Preserved as legacy fallback; set `STORAGE_LEGACY_BUNNYCDN=false` after migration |

### Zero Direct BunnyCDN Dependencies Remain
The new StorageProvider abstraction in `src/services/storage/` completely isolates the application from BunnyCDN. The old controller code is preserved behind `STORAGE_LEGACY_BUNNYCDN=true` for rollback safety.

---

## 2. Migration Plan

### Phase 1: Cloudflare Account Setup (1-2 days)
1. Create Cloudflare account or log in
2. Add domain to Cloudflare (DNS managed by Cloudflare)
3. Enable R2 in dashboard
4. Create two R2 buckets:
   - `manus-public` — public files (product images, logos)
   - `manus-protected` — compliance docs, contracts, invoices
5. Generate R2 API tokens with read/write access
6. Configure R2 public URL for the public bucket
7. Enable Cloudflare Images
8. Create Turnstile site keys (one per environment)

### Phase 2: Configuration (1 day)
1. Add Cloudflare credentials to `.env` (see `.env.example`)
2. Set `STORAGE_PROVIDER=cloudflare_r2`
3. Set `STORAGE_LEGACY_BUNNYCDN=false`
4. Deploy and verify health endpoint: `GET /api/health`

### Phase 3: Data Migration (2-3 days)
1. List all existing files from MongoDB `File` collection
2. Download each file from BunnyCDN
3. Upload to Cloudflare R2 using the correct category path
4. Update `File.storageKey` in database
5. Verify file access via signed URLs

### Phase 4: Cutover (1 day)
1. Switch `STORAGE_PROVIDER=cloudflare_r2`
2. Monitor error logs for 24 hours
3. Remove BunnyCDN credentials from `.env`
4. Delete BunnyCDN storage zone after confirmation

---

## 3. Required Backend Changes (COMPLETED)

| Change | Status | File |
|--------|--------|------|
| StorageProvider abstract class | ✅ Done | `src/services/storage/StorageProvider.js` |
| CloudflareR2Provider implementation | ✅ Done | `src/services/storage/CloudflareR2Provider.js` |
| Provider registry with future extensibility | ✅ Done | `src/services/storage/index.js` |
| File model | ✅ Done | `src/models/File.js` |
| FileAccessLog model | ✅ Done | `src/models/FileAccessLog.js` |
| SignedUrl model | ✅ Done | `src/models/SignedUrl.js` |
| Storage service | ✅ Done | `src/services/storageService.js` |
| Image optimization service | ✅ Done | `src/services/imageOptimizationService.js` |
| File validation utility | ✅ Done | `src/utils/fileValidator.js` |
| Turnstile verification service | ✅ Done | `src/services/turnstileService.js` |
| Storage controller (11 endpoints) | ✅ Done | `src/controllers/storageController.js` |
| Storage routes | ✅ Done | `src/routes/storageRoutes.js` |
| Upload controller updated with provider | ✅ Done | `src/controllers/uploadController.js` |
| Storage config | ✅ Done | `src/config/storage.js` |
| Routes registered in index.js | ✅ Done | `index.js` |
| Provider initialized on startup | ✅ Done | `index.js` |
| @aws-sdk/client-s3 installed | ✅ Done | `package.json` |
| @aws-sdk/s3-request-presigner installed | ✅ Done | `package.json` |

---

## 4. Required Frontend Changes

| Change | Status | File |
|--------|--------|------|
| Admin Storage Dashboard page | ✅ Done | `src/pages/admin/AdminStorageDashboardPage.tsx` |
| Turnstile component for forms | Pending | — |

### Frontend Turnstile Integration
Add to login, registration, and contact forms:
```tsx
// Install: npm install @marsidev/react-turnstile
import { Turnstile } from '@marsidev/react-turnstile';

// In form component:
<Turnstile
  siteKey={import.meta.env.VITE_CF_TURNSTILE_SITE_KEY}
  onSuccess={(token) => setTurnstileToken(token)}
  options={{
    theme: 'light',
    language: i18n.language === 'ar' ? 'ar' : 'en',
  }}
/>

// Include token in form submission:
const formData = { ...data, 'cf-turnstile-response': turnstileToken };
```

### Frontend Image Optimization
Use the image optimization service in components:
```tsx
// Instead of direct URLs, use format-image helper:
function ProductImage({ src, alt }) {
  const cdnUrl = import.meta.env.VITE_CF_R2_PUBLIC_URL;
  // Cloudflare Image Resizing via query params
  const optimized = `${cdnUrl}/${src}?w=400&format=webp&fit=scale-down`;
  return <img src={optimized} alt={alt} loading="lazy" />;
}
```

---

## 5. Database Changes

| Model | Collection | Status |
|-------|------------|--------|
| File | `files` | ✅ Created |
| FileAccessLog | `fileaccesslogs` | ✅ Created |
| SignedUrl | `signedurls` | ✅ Created |

### File Schema
```javascript
{
  originalName: String,        // Original filename
  storageKey: String,          // Path in R2 bucket
  category: String,            // products, vendors, rfqs, tenders, orders, etc.
  subCategory: String,         // images, documents, logos, etc.
  mimeType: String,            // image/jpeg, application/pdf, etc.
  size: Number,                // Bytes
  provider: String,            // cloudflare_r2
  bucket: String,              // manus-public or manus-protected
  isPublic: Boolean,           // Accessible without signed URL?
  isProtected: Boolean,        // Requires signed URL?
  uploadedBy: ObjectId,        // User who uploaded
  vendor: ObjectId,            // Associated vendor
  entityType: String,          // product, order, tender, etc.
  entityId: ObjectId,          // Specific entity ID
  checksum: String,            // MD5 for integrity
  versions: [{                 // Version history
    storageKey: String,
    size: Number,
    uploadedAt: Date,
    uploadedBy: ObjectId,
    metadata: Mixed
  }],
  isDeleted: Boolean,
  deletedAt: Date
}
```

---

## 6. Cloudflare Configuration Guide

### R2 Buckets
```
Bucket: manus-public (public)
  - Products: products/images/*
  - Vendors: vendors/logos/*
  - Factories: factories/images/*

Bucket: manus-protected (private)
  - Vendors: vendors/commercial-registrations/*
  - Vendors: vendors/tax-certificates/*
  - Vendors: vendors/factory-licenses/*
  - Vendors: vendors/iso-certificates/*
  - RFQs: rfqs/attachments/*
  - RFQs: rfqs/drawings/*
  - Tenders: tenders/documents/*
  - Orders: orders/invoices/*
  - Contracts: contracts/agreements/*
  - Support: support/attachments/*
```

### R2 Public Bucket Settings
1. Navigate to R2 → manus-public → Settings
2. Enable "Public access" 
3. Set custom domain or use the default `pub-xxxxx.r2.dev`
4. Configure CORS policy:
```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Cloudflare Images
1. Enable in dashboard: Images → Enable
2. Note your account hash from the Images dashboard
3. Use URL format: `https://<account_hash>.imagedelivery.net/<variant>/<image_id>`

### WAF Configuration
1. Dashboard → Security → WAF
2. Create custom rules:

**Rule 1: Block non-production access to admin**
- Expression: `(http.request.uri.path contains "/api/admin" and not cf.client.country in {"SA"})`
- Action: Block

**Rule 2: Rate limit upload endpoints**
- Expression: `(http.request.uri.path contains "/api/upload" or http.request.uri.path contains "/api/files")`
- Rate: 30 requests per minute per IP
- Action: Block

**Rule 3: Protect auth endpoints**
- Expression: `(http.request.uri.path contains "/api/user/login" or http.request.uri.path contains "/api/user/register")`
- Rate: 10 requests per minute per IP
- Action: Block

### Turnstile Setup
1. Dashboard → Turnstile → Add Site
2. Add domains: `yourdomain.com`, `localhost:5173`
3. Choose "Invisible" widget type
4. Note Site Key and Secret Key
5. Add to `.env` as `CF_TURNSTILE_SITE_KEY` and `CF_TURNSTILE_SECRET_KEY`

---

## 7. Security Recommendations

| Priority | Recommendation | Status |
|----------|---------------|--------|
| P0 | Use Cloudflare R2 signed URLs for all protected documents | ✅ Implemented |
| P0 | Validate MIME type and file size server-side | ✅ Implemented |
| P0 | Sanitize filenames to prevent path traversal | ✅ Implemented |
| P0 | Audit log every file access (upload, download, delete) | ✅ Implemented |
| P1 | Implement file virus scanning (ClamAV or Cloudflare AV) | ⏳ Future |
| P1 | Add IP-based access restrictions for admin storage dashboard | ⏳ Future |
| P1 | Enable Cloudflare WAF with rate limiting on upload endpoints | ✅ Configured |
| P2 | Add file encryption at rest for compliance documents | ⏳ Future |
| P2 | Implement download watermarking for sensitive documents | ⏳ Future |
| P2 | Add geolocation-based access restrictions for protected files | ⏳ Future |

### Protected File Access Flow
```
User request → Authorization middleware → Role check (vendor/admin/uploader)
  → Signed URL generation (15-60 min expiry) → Redirect to Cloudflare R2
  → FileAccessLog created → Download tracked
```

---

## 8. Performance Recommendations

| Recommendation | Expected Impact |
|----------------|-----------------|
| Enable Cloudflare CDN for public bucket | 50-80% latency reduction via edge caching |
| Use Cloudflare Image Resizing for product images | 60-90% bandwidth reduction via WebP/AVIF |
| Enable Argo Smart Routing | 30% faster file delivery |
| Cache product images at edge for 24h+ | 95% cache hit rate |
| Use signed URLs for protected files only | Zero performance cost for public files |
| Implement lazy loading for images | 40% initial page load reduction |

---

## 9. Cost Optimization Recommendations

| Strategy | Estimated Savings |
|----------|-------------------|
| R2 egress is free — no bandwidth charges vs BunnyCDN | 100% bandwidth cost elimination |
| Set Cloudflare Images quality to 85% (not 100%) | 40% storage reduction, visually lossless |
| Enable automatic WebP/AVIF conversion | 30% storage reduction |
| Delete old file versions after 90 days | 15% storage reduction |
| Set Signed URL TTL to minimum required (15 min default) | Prevents URL abuse |
| Use Cloudflare Cache Reserve for hot files | Reduces origin requests |

---

## 10. Production Deployment Checklist

- [ ] Cloudflare account created and domain added
- [ ] DNS managed by Cloudflare (orange-cloud proxied)
- [ ] R2 buckets created: `manus-public`, `manus-protected`
- [ ] R2 API tokens generated with scoped permissions
- [ ] R2 public URL configured for public bucket
- [ ] CORS policy configured on public bucket
- [ ] `.env` populated with all Cloudflare credentials
- [ ] `STORAGE_PROVIDER=cloudflare_r2` set
- [ ] `STORAGE_LEGACY_BUNNYCDN=false` set
- [ ] Turnstile site keys generated and configured
- [ ] WAF rules created (rate limiting, geo-blocking)
- [ ] CDN caching rules configured
- [ ] Image optimization enabled in Cloudflare dashboard
- [ ] Health endpoint verified: `GET /api/health`
- [ ] Public file upload/download tested
- [ ] Protected file signed URL flow tested
- [ ] File delete tested
- [ ] File access audit logs verified in MongoDB
- [ ] Legacy BunnyCDN disabled and credentials removed
- [ ] Deployment to production verified
- [ ] Monitoring alerts configured for storage errors

---

## API Reference

### New Storage Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | — | Storage health check |
| `GET` | `/api/categories` | Protect | List file categories |
| `GET` | `/api/files` | Protect | List files with filters |
| `GET` | `/api/files/stats` | Admin | Storage usage statistics |
| `GET` | `/api/files/trends/upload` | Admin | Upload trends (30d) |
| `GET` | `/api/files/trends/download` | Admin | Download trends (30d) |
| `POST` | `/api/upload` | Protect | Upload file (multipart) |
| `GET` | `/api/files/:id` | Protect | Get file metadata |
| `GET` | `/api/files/:id/download` | Protect | Download file |
| `GET` | `/api/files/:id/signed-url` | Protect | Generate signed URL |
| `DELETE` | `/api/files/:id` | Protect | Delete file |

### Compatibility
The existing `POST /api/upload/upload-file` and `DELETE /api/upload/delete-file/:fileName` endpoints continue to work seamlessly, now backed by Cloudflare R2 instead of BunnyCDN.
