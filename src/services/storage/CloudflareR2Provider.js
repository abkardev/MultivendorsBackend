import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { Readable } from 'stream';
import { STORAGE_CONFIG, SIGNED_URL_EXPIRY } from '../../config/storage.js';
import { StorageProvider } from './StorageProvider.js';

export class CloudflareR2Provider extends StorageProvider {
  constructor() {
    super(STORAGE_CONFIG.cloudflare.r2);
    this.name = 'cloudflare_r2';
    this.publicBucket = STORAGE_CONFIG.cloudflare.r2.publicBucket;
    this.protectedBucket = STORAGE_CONFIG.cloudflare.r2.protectedBucket;
    this.publicUrl = STORAGE_CONFIG.cloudflare.r2.publicUrl;
    this.accountId = STORAGE_CONFIG.cloudflare.accountId;

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: STORAGE_CONFIG.cloudflare.r2.accessKeyId,
        secretAccessKey: STORAGE_CONFIG.cloudflare.r2.secretAccessKey,
      },
    });
  }

  _getBucket(isPublic) {
    return isPublic ? this.publicBucket : this.protectedBucket;
  }

  _buildKey(category, filename) {
    const catConfig = this.getCategoryConfig(category);
    return `${catConfig.path}/${Date.now()}-${filename}`;
  }

  async upload(filePath, destPath, options = {}) {
    const isPublic = options.isPublic !== undefined ? options.isPublic : false;
    const bucket = this._getBucket(isPublic);
    const contentType = options.contentType || 'application/octet-stream';
    const metadata = options.metadata || {};

    const fileStream = createReadStream(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: destPath,
      Body: fileStream,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    try { await unlink(filePath); } catch (_) { /* ignore */ }

    return {
      key: destPath,
      bucket,
      url: isPublic ? `${this.publicUrl}/${destPath}` : undefined,
      size: options.size,
      contentType,
    };
  }

  async uploadBuffer(buffer, destPath, options = {}) {
    const isPublic = options.isPublic !== undefined ? options.isPublic : false;
    const bucket = this._getBucket(isPublic);
    const contentType = options.contentType || 'application/octet-stream';
    const metadata = options.metadata || {};

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: destPath,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    await this.client.send(command);

    return {
      key: destPath,
      bucket,
      url: isPublic ? `${this.publicUrl}/${destPath}` : undefined,
      size: buffer.length,
      contentType,
    };
  }

  async download(filePath) {
    const bucket = this._getBucket(false);
    const command = new GetObjectCommand({ Bucket: bucket, Key: filePath });
    const response = await this.client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return { data: Buffer.concat(chunks), contentType: response.ContentType, metadata: response.Metadata };
  }

  async delete(filePath) {
    const isPublic = filePath.startsWith('products/images') || filePath.startsWith('vendors/logos') || filePath.startsWith('factories/images');
    const bucket = this._getBucket(isPublic);
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: filePath });
    await this.client.send(command);
    return { key: filePath, deleted: true };
  }

  async getSignedUrl(filePath, expiresIn = SIGNED_URL_EXPIRY.default) {
    const isPublic = filePath.startsWith('products/images') || filePath.startsWith('vendors/logos') || filePath.startsWith('factories/images');
    const bucket = this._getBucket(isPublic);

    if (isPublic) {
      return { url: `${this.publicUrl}/${filePath}`, expiresAt: null };
    }

    const command = new GetObjectCommand({ Bucket: bucket, Key: filePath });
    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }

  async list(prefix) {
    const results = [];
    for (const bucket of [this.publicBucket, this.protectedBucket]) {
      const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
      const response = await this.client.send(command);
      if (response.Contents) {
        for (const obj of response.Contents) {
          results.push({ key: obj.Key, size: obj.Size, lastModified: obj.LastModified, bucket });
        }
      }
    }
    return results;
  }

  async exists(filePath) {
    const isPublic = filePath.startsWith('products/images') || filePath.startsWith('vendors/logos');
    const bucket = this._getBucket(isPublic);
    try {
      const command = new HeadObjectCommand({ Bucket: bucket, Key: filePath });
      await this.client.send(command);
      return true;
    } catch { return false; }
  }

  async getMetadata(filePath) {
    const isPublic = filePath.startsWith('products/images') || filePath.startsWith('vendors/logos');
    const bucket = this._getBucket(isPublic);
    const command = new HeadObjectCommand({ Bucket: bucket, Key: filePath });
    const response = await this.client.send(command);
    return {
      size: response.ContentLength,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata,
      etag: response.ETag,
    };
  }

  async copy(sourcePath, destPath) {
    const sourceIsPublic = sourcePath.startsWith('products/images');
    const destIsPublic = destPath.startsWith('products/images');
    const sourceBucket = this._getBucket(sourceIsPublic);
    const destBucket = this._getBucket(destIsPublic);

    const command = new CopyObjectCommand({
      CopySource: `/${sourceBucket}/${sourcePath}`,
      Bucket: destBucket,
      Key: destPath,
    });
    await this.client.send(command);
    return { key: destPath };
  }

  async getPublicUrl(filePath) {
    if (!this.publicUrl) return null;
    return `${this.publicUrl}/${filePath}`;
  }

  async healthCheck() {
    try {
      await this.client.send(new ListObjectsV2Command({
        Bucket: this.publicBucket,
        MaxKeys: 1,
      }));
      return { provider: this.name, status: 'healthy' };
    } catch (err) {
      return { provider: this.name, status: 'unhealthy', error: err.message };
    }
  }
}
