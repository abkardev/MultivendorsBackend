import { STORAGE_CONFIG } from '../config/storage.js';

class ImageOptimizationService {
  constructor() {
    this.enabled = STORAGE_CONFIG.cloudflare.images.enabled;
    this.accountHash = STORAGE_CONFIG.cloudflare.images.accountHash;
    this.defaultQuality = STORAGE_CONFIG.cloudflare.images.defaultQuality;
    this.formats = STORAGE_CONFIG.cloudflare.images.formats;
  }

  getOptimizedUrl(originalUrl, options = {}) {
    if (!this.enabled || !originalUrl) return originalUrl;

    const { width, height, quality = this.defaultQuality, format, fit = 'scale-down' } = options;

    if (!originalUrl.includes('cloudflare')) return originalUrl;

    const params = new URLSearchParams();
    if (width) params.set('w', width);
    if (height) params.set('h', height);
    if (quality) params.set('q', quality);
    if (format && this.formats.includes(format)) params.set('format', format);
    if (fit) params.set('fit', fit);

    const separator = originalUrl.includes('?') ? '&' : '?';
    return `${originalUrl}${separator}${params.toString()}`;
  }

  getProductThumbnail(url) {
    return this.getOptimizedUrl(url, { width: 300, height: 300, format: 'webp' });
  }

  getProductMedium(url) {
    return this.getOptimizedUrl(url, { width: 600, height: 600, format: 'webp' });
  }

  getProductLarge(url) {
    return this.getOptimizedUrl(url, { width: 1200, format: 'webp' });
  }

  getVendorLogo(url) {
    return this.getOptimizedUrl(url, { width: 200, height: 200, format: 'webp' });
  }

  getBannerImage(url) {
    return this.getOptimizedUrl(url, { width: 1920, format: 'webp', quality: 80 });
  }

  getFactoryImage(url) {
    return this.getOptimizedUrl(url, { width: 800, format: 'webp', quality: 85 });
  }
}

export const imageOptimizationService = new ImageOptimizationService();
export default imageOptimizationService;
