const BaseS3Provider = require('./base-provider');

/**
 * Cloudflare R2 Provider
 * Provides S3-compatible storage through Cloudflare R2 with zero egress fees
 */
class CloudflareR2Provider extends BaseS3Provider {
  constructor(config) {
    super(config);
    this.name = 'Cloudflare R2';
    this.type = 'cloudflare-r2';
  }

  /**
   * Initialize the S3 client with Cloudflare R2-specific configuration
   */
  initializeClient() {
    // Cloudflare R2 requires account-specific endpoint
    const accountId = this.config.cloudflare_account_id || this.config.account_id;
    if (!accountId) {
      throw new Error('Cloudflare Account ID is required for R2 storage');
    }

    const clientConfig = {
      region: 'auto', // R2 uses 'auto' region
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      },
      endpoint: this.config.custom_endpoint || `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: false, // R2 supports virtual-hosted style
      signatureVersion: 'v4'
    };

    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client(clientConfig);
  }

  /**
   * Generate standard Cloudflare R2 URL
   * @param {string} key - S3 object key
   * @returns {string} Cloudflare R2 URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const accountId = this.config.cloudflare_account_id || this.config.account_id;
    
    if (this.config.force_path_style) {
      return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;
    }
  }

  /**
   * Generate public URL using custom domain or R2.dev subdomain
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  generatePublicUrl(key) {
    // Use custom domain if configured
    if (this.config.public_url) {
      const baseUrl = this.config.public_url.replace(/\/$/, '');
      return `${baseUrl}/${key}`;
    }

    // Use R2.dev subdomain if configured
    if (this.config.r2_dev_subdomain) {
      return `https://${this.config.r2_dev_subdomain}.r2.dev/${key}`;
    }

    // Fallback to standard R2 URL (requires authentication)
    return this.generateStandardUrl(key);
  }

  /**
   * Upload file with Cloudflare R2-specific optimizations
   * @param {Buffer|Stream} fileData - File data to upload
   * @param {string} key - S3 object key
   * @param {object} options - Upload options
   * @returns {Promise<object>} Upload result
   */
  async uploadFile(fileData, key, options = {}) {
    try {
      const uploadParams = {
        Bucket: this.config.bucket_name,
        Key: key,
        Body: fileData,
        ContentType: options.contentType || 'application/octet-stream'
      };

      // R2-specific metadata
      if (options.metadata) {
        uploadParams.Metadata = {
          ...options.metadata,
          'r2-uploaded-via': 'vyral-cms',
          'r2-upload-timestamp': new Date().toISOString()
        };
      }

      // Set ACL - R2 supports standard S3 ACLs but public access requires custom domain
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Cache control optimized for Cloudflare CDN
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      } else {
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=31536000, immutable'; // 1 year for images
        } else if (['css', 'js', 'woff', 'woff2', 'ttf'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=2592000'; // 30 days for assets
        } else if (['pdf', 'doc', 'docx', 'zip'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=604800'; // 1 week for documents
        } else {
          uploadParams.CacheControl = 'public, max-age=86400'; // 1 day for others
        }
      }

      // Content encoding for better compression
      if (options.contentEncoding) {
        uploadParams.ContentEncoding = options.contentEncoding;
      }

      // Custom headers for R2
      if (options.customHeaders) {
        Object.assign(uploadParams, options.customHeaders);
      }

      const { Upload } = require('@aws-sdk/lib-storage');
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 4, // R2 handles concurrent uploads well
        partSize: 1024 * 1024 * 5, // 5MB parts
        leavePartsOnError: false
      });

      // Track upload progress
      if (options.onProgress) {
        upload.on('httpUploadProgress', (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          options.onProgress(percentage, progress);
        });
      }

      const result = await upload.done();

      return {
        success: true,
        url: this.generatePublicUrl(key),
        key: key,
        bucket: this.config.bucket_name,
        etag: result.ETag,
        location: result.Location,
        size: fileData.length || fileData.size,
        provider: this.type,
        region: 'auto',
        r2DevUrl: this.config.r2_dev_subdomain ? 
          `https://${this.config.r2_dev_subdomain}.r2.dev/${key}` : null,
        zeroEgressCost: true // R2's key advantage
      };

    } catch (error) {
      console.error(`❌ Cloudflare R2 upload failed:`, error);
      throw new Error(`Cloudflare R2 upload failed: ${error.message}`);
    }
  }

  /**
   * Test connection with Cloudflare R2-specific validations
   * @returns {Promise<object>} Connection test result
   */
  async testConnection() {
    try {
      // Validate account ID
      const accountId = this.config.cloudflare_account_id || this.config.account_id;
      if (!accountId) {
        throw new Error('Cloudflare Account ID is required for R2 storage');
      }

      // Test basic S3 compatibility
      const baseResult = await super.testConnection();
      
      // Test R2-specific features
      const features = {
        zeroEgressFees: true,
        globalEdgeNetwork: true,
        s3Compatible: true,
        maxFileSize: '5TB',
        supportedOperations: [
          'GET', 'PUT', 'DELETE', 'HEAD', 'LIST',
          'Multipart Upload', 'Copy Object'
        ]
      };

      // Check if custom domain is configured
      const customDomainConfigured = !!(this.config.public_url || this.config.r2_dev_subdomain);

      return {
        ...baseResult,
        accountId: accountId,
        features,
        customDomainConfigured,
        r2DevSubdomain: this.config.r2_dev_subdomain,
        publicUrl: this.config.public_url,
        recommendations: this.getR2Recommendations()
      };

    } catch (error) {
      // Provide helpful error messages for common R2 issues
      let message = error.message;
      if (error.message.includes('InvalidAccessKeyId')) {
        message = 'Invalid R2 API Token. Please check your Cloudflare R2 credentials.';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        message = 'Invalid R2 API Secret. Please verify your Cloudflare R2 secret key.';
      } else if (error.message.includes('NoSuchBucket')) {
        message = `R2 bucket '${this.config.bucket_name}' does not exist. Please create it in the Cloudflare dashboard.`;
      } else if (error.message.includes('Account ID')) {
        message = 'Cloudflare Account ID is required. Find it in your Cloudflare dashboard.';
      }
      
      throw new Error(`Cloudflare R2 connection failed: ${message}`);
    }
  }

  /**
   * Get Cloudflare R2-specific recommendations
   * @returns {object} Recommendations for optimal R2 usage
   */
  getR2Recommendations() {
    return {
      setup: [
        'Configure a custom domain for public file access',
        'Set up R2.dev subdomain for easy testing',
        'Enable Cloudflare CDN for optimal performance'
      ],
      performance: [
        'Use Cloudflare Workers for advanced file processing',
        'Leverage global edge network for fast delivery',
        'Implement cache headers for better CDN performance'
      ],
      costs: [
        'Zero egress fees - major cost advantage',
        'Pay only for storage and operations',
        'Consider using Workers for data transformation'
      ],
      security: [
        'Use Cloudflare Access for private file protection',
        'Implement signed URLs for sensitive content',
        'Consider using Cloudflare WAF for additional security'
      ]
    };
  }

  /**
   * Create a Worker URL for file processing
   * @param {string} key - Object key
   * @param {object} transformations - Image transformation options
   * @returns {string} Worker URL with transformations
   */
  generateWorkerUrl(key, transformations = {}) {
    if (!this.config.worker_domain) {
      return this.generatePublicUrl(key);
    }

    const baseUrl = `https://${this.config.worker_domain}`;
    const params = new URLSearchParams();

    // Add transformation parameters
    if (transformations.width) params.append('w', transformations.width);
    if (transformations.height) params.append('h', transformations.height);
    if (transformations.quality) params.append('q', transformations.quality);
    if (transformations.format) params.append('f', transformations.format);

    const queryString = params.toString();
    return queryString ? `${baseUrl}/${key}?${queryString}` : `${baseUrl}/${key}`;
  }

  /**
   * Get R2 bucket analytics (if available through Cloudflare API)
   * @returns {Promise<object>} Analytics data
   */
  async getBucketAnalytics() {
    try {
      // This would require Cloudflare API integration
      // For now, return basic bucket information
      const listResult = await this.listObjects({ maxKeys: 1000 });
      
      let totalSize = 0;
      let fileCount = 0;
      const fileTypes = {};

      for (const object of listResult.objects) {
        totalSize += object.Size || 0;
        fileCount++;
        
        const extension = object.Key.split('.').pop()?.toLowerCase();
        if (extension) {
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        }
      }

      return {
        success: true,
        bucket: this.config.bucket_name,
        totalSize: totalSize,
        fileCount: fileCount,
        fileTypes: fileTypes,
        estimatedMonthlyCost: this.estimateR2Cost(totalSize, fileCount),
        egressCost: 0, // Always zero with R2
        note: 'Full analytics require Cloudflare API integration'
      };

    } catch (error) {
      console.error(`❌ Get R2 bucket analytics failed:`, error);
      throw new Error(`Get bucket analytics failed: ${error.message}`);
    }
  }

  /**
   * Estimate monthly cost for Cloudflare R2
   * @param {number} totalBytes - Total storage in bytes
   * @param {number} operations - Number of operations
   * @returns {object} Cost estimation
   */
  estimateR2Cost(totalBytes, operations = 0) {
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    
    // R2 pricing (as of 2024)
    const storageRatePerGB = 0.015; // $0.015 per GB per month
    const operationRatePer1000 = 0.0036; // $0.0036 per 1000 operations
    
    const storageCost = totalGB * storageRatePerGB;
    const operationCost = (operations / 1000) * operationRatePer1000;
    
    return {
      storageGB: Math.round(totalGB * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      operationCount: operations,
      operationCost: Math.round(operationCost * 100) / 100,
      egressCost: 0, // Zero egress fees
      totalEstimated: Math.round((storageCost + operationCost) * 100) / 100,
      currency: 'USD',
      advantages: [
        'Zero egress fees (major cost saver)',
        'No bandwidth charges',
        'Lower storage costs than AWS S3'
      ]
    };
  }

  /**
   * Get provider-specific information for Cloudflare R2
   * @returns {object} R2 provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: 'auto',
      endpoint: this.config.custom_endpoint,
      accountId: this.config.cloudflare_account_id || this.config.account_id,
      supportsAcceleration: false, // Built into Cloudflare network
      supportsVersioning: false,
      zeroEgressFees: true,
      maxFileSize: '5TB',
      globalNetwork: true,
      features: [
        'S3-compatible API',
        'Zero egress fees',
        'Global edge network',
        'Cloudflare Workers integration',
        'Custom domain support',
        'R2.dev subdomain'
      ],
      integrations: [
        'Cloudflare Workers',
        'Cloudflare CDN',
        'Cloudflare Access',
        'Cloudflare Stream (for videos)'
      ],
      limitations: [
        'No versioning support',
        'Custom domain required for public access',
        'Newer service with evolving features'
      ]
    };
  }

  /**
   * Optimize object for Cloudflare CDN
   * @param {string} key - Object key
   * @param {object} options - Optimization options
   * @returns {Promise<object>} Optimization result
   */
  async optimizeForCloudflare(key, options = {}) {
    try {
      // Get current object metadata
      const metadata = await this.getObjectMetadata(key);
      if (!metadata.success) {
        throw new Error('Object not found');
      }

      // Update with Cloudflare-optimized headers
      const { CopyObjectCommand } = require('@aws-sdk/client-s3');
      const copyParams = {
        Bucket: this.config.bucket_name,
        Key: key,
        CopySource: `${this.config.bucket_name}/${key}`,
        MetadataDirective: 'REPLACE',
        CacheControl: options.cacheControl || 'public, max-age=31536000, immutable',
        ContentType: metadata.contentType
      };

      // Add Cloudflare-specific metadata
      copyParams.Metadata = {
        ...metadata.metadata,
        'cf-optimized': 'true',
        'cf-optimization-timestamp': new Date().toISOString()
      };

      await this.client.send(new CopyObjectCommand(copyParams));

      return {
        success: true,
        message: 'Object optimized for Cloudflare CDN',
        key: key,
        publicUrl: this.generatePublicUrl(key),
        workerUrl: this.generateWorkerUrl(key),
        cacheControl: copyParams.CacheControl
      };

    } catch (error) {
      console.error(`❌ Cloudflare optimization failed:`, error);
      throw new Error(`Cloudflare optimization failed: ${error.message}`);
    }
  }
}

module.exports = CloudflareR2Provider;