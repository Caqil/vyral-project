const BaseS3Provider = require('./base-provider');

/**
 * Vultr Object Storage Provider
 * Provides S3-compatible storage through Vultr's Object Storage service
 */
class VultrStorageProvider extends BaseS3Provider {
  constructor(config) {
    super(config);
    this.name = 'Vultr Object Storage';
    this.type = 'vultr-storage';
  }

  /**
   * Initialize the S3 client with Vultr-specific configuration
   */
  initializeClient() {
    const region = this.config.aws_region || 'ewr1';
    
    const clientConfig = {
      region: region,
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      },
      endpoint: this.config.custom_endpoint || `https://${region}.vultrobjects.com`,
      forcePathStyle: false, // Vultr supports virtual-hosted style
      signatureVersion: 'v4'
    };

    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client(clientConfig);
  }

  /**
   * Generate standard Vultr Object Storage URL
   * @param {string} key - S3 object key
   * @returns {string} Vultr Object Storage URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'ewr1';
    
    if (this.config.force_path_style) {
      return `https://${region}.vultrobjects.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.${region}.vultrobjects.com/${key}`;
    }
  }

  /**
   * Upload file with Vultr-specific optimizations
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

      // Vultr Object Storage specific settings
      if (options.metadata) {
        uploadParams.Metadata = options.metadata;
      }

      // Set ACL - Vultr supports standard S3 ACLs
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Cache control for better CDN performance
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      } else {
        // Default cache control optimized for Vultr's global CDN
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=2592000'; // 30 days for images
        } else if (['css', 'js', 'woff', 'woff2', 'ttf'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=604800'; // 1 week for assets
        } else {
          uploadParams.CacheControl = 'public, max-age=86400'; // 1 day for others
        }
      }

      // Content disposition for download behavior
      if (options.contentDisposition) {
        uploadParams.ContentDisposition = options.contentDisposition;
      }

      const { Upload } = require('@aws-sdk/lib-storage');
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 3, // Optimal for Vultr
        partSize: 1024 * 1024 * 8, // 8MB parts work well with Vultr
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
        region: this.config.aws_region || 'ewr1',
        cdnUrl: this.generateCdnUrl(key) // Vultr includes CDN
      };

    } catch (error) {
      console.error(`❌ Vultr Object Storage upload failed:`, error);
      throw new Error(`Vultr upload failed: ${error.message}`);
    }
  }

  /**
   * Generate CDN URL for Vultr Object Storage
   * @param {string} key - S3 object key
   * @returns {string} CDN URL
   */
  generateCdnUrl(key) {
    // Vultr Object Storage includes integrated CDN
    // If custom CDN domain is configured, use it
    if (this.config.cdn_domain) {
      return `https://${this.config.cdn_domain}/${key}`;
    }
    
    // Otherwise use the standard URL which is CDN-enabled
    return this.generateStandardUrl(key);
  }

  /**
   * Test connection with Vultr-specific validations
   * @returns {Promise<object>} Connection test result
   */
  async testConnection() {
    try {
      // Test basic S3 compatibility
      const baseResult = await super.testConnection();
      
      // Test Vultr-specific features
      const features = {
        cdnEnabled: true, // Vultr includes CDN by default
        supportedRegions: ['ewr1', 'sjc1', 'ams1'],
        maxFileSize: '1TB',
        bandwidth: 'unlimited'
      };

      // Validate region
      const region = this.config.aws_region || 'ewr1';
      if (!features.supportedRegions.includes(region)) {
        console.warn(`⚠️ Region ${region} may not be supported by Vultr Object Storage`);
      }

      return {
        ...baseResult,
        features,
        cdnUrl: this.generateCdnUrl('test-file.jpg'),
        recommendations: this.getVultrRecommendations()
      };

    } catch (error) {
      // Provide helpful error messages for common Vultr issues
      let message = error.message;
      if (error.message.includes('InvalidAccessKeyId')) {
        message = 'Invalid Access Key ID. Please check your Vultr Object Storage credentials.';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        message = 'Invalid Secret Key. Please verify your Vultr Object Storage secret key.';
      } else if (error.message.includes('NoSuchBucket')) {
        message = `Bucket '${this.config.bucket_name}' does not exist in region ${this.config.aws_region || 'ewr1'}.`;
      }
      
      throw new Error(`Vultr Object Storage connection failed: ${message}`);
    }
  }

  /**
   * Get Vultr-specific recommendations
   * @returns {object} Recommendations for optimal usage
   */
  getVultrRecommendations() {
    return {
      regions: {
        'ewr1': 'East Coast US (New Jersey) - Best for North America',
        'sjc1': 'West Coast US (Silicon Valley) - Best for Pacific',
        'ams1': 'Europe (Amsterdam) - Best for Europe/Africa'
      },
      performance: [
        'Use integrated CDN for global content delivery',
        'Optimal file chunk size is 8MB for uploads',
        'Consider region proximity to your users'
      ],
      costs: [
        'No bandwidth charges for first 1TB',
        'Competitive storage pricing',
        'Free CDN included with all plans'
      ]
    };
  }

  /**
   * Get bucket usage statistics (Vultr-specific)
   * @returns {Promise<object>} Usage statistics
   */
  async getBucketUsage() {
    try {
      // List objects to calculate basic usage
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
        region: this.config.aws_region || 'ewr1',
        totalSize: totalSize,
        fileCount: fileCount,
        fileTypes: fileTypes,
        estimatedMonthlyCost: this.estimateMonthlyCost(totalSize),
        cdnEnabled: true
      };

    } catch (error) {
      console.error(`❌ Get Vultr bucket usage failed:`, error);
      throw new Error(`Get bucket usage failed: ${error.message}`);
    }
  }

  /**
   * Estimate monthly cost for Vultr Object Storage
   * @param {number} totalBytes - Total storage in bytes
   * @returns {object} Cost estimation
   */
  estimateMonthlyCost(totalBytes) {
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    
    // Vultr Object Storage pricing (as of 2024)
    const storageRatePerGB = 0.02; // $0.02 per GB per month
    const storageCost = totalGB * storageRatePerGB;
    
    return {
      storageGB: Math.round(totalGB * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      bandwidthCost: 0, // First 1TB free
      totalEstimated: Math.round(storageCost * 100) / 100,
      currency: 'USD',
      notes: [
        'First 1TB bandwidth per month is free',
        'CDN usage included at no extra cost',
        'Pricing may vary by region'
      ]
    };
  }

  /**
   * Get provider-specific information for Vultr
   * @returns {object} Vultr Object Storage provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: this.config.aws_region || 'ewr1',
      endpoint: this.config.custom_endpoint || `https://${this.config.aws_region || 'ewr1'}.vultrobjects.com`,
      supportsAcceleration: false,
      supportsVersioning: false,
      cdnIncluded: true,
      maxFileSize: '1TB',
      supportedRegions: ['ewr1', 'sjc1', 'ams1'],
      features: [
        'S3-compatible API',
        'Integrated global CDN',
        'Unlimited bandwidth (1TB free)',
        'Simple pricing structure',
        'High-performance SSD storage'
      ],
      limitations: [
        'No versioning support',
        'No transfer acceleration',
        'Limited to 3 regions'
      ]
    };
  }

  /**
   * Optimize file for Vultr CDN delivery
   * @param {string} key - Object key
   * @param {object} options - Optimization options
   * @returns {Promise<object>} Optimization result
   */
  async optimizeForCdn(key, options = {}) {
    try {
      // Get current object metadata
      const metadata = await this.getObjectMetadata(key);
      if (!metadata.success) {
        throw new Error('Object not found');
      }

      // Update cache headers for better CDN performance
      const { CopyObjectCommand } = require('@aws-sdk/client-s3');
      const copyParams = {
        Bucket: this.config.bucket_name,
        Key: key,
        CopySource: `${this.config.bucket_name}/${key}`,
        MetadataDirective: 'REPLACE',
        CacheControl: options.cacheControl || 'public, max-age=2592000', // 30 days
        ContentType: metadata.contentType
      };

      // Add CORS headers for web usage
      if (options.enableCors) {
        copyParams.Metadata = {
          ...metadata.metadata,
          'cors-enabled': 'true'
        };
      }

      await this.client.send(new CopyObjectCommand(copyParams));

      return {
        success: true,
        message: 'File optimized for CDN delivery',
        key: key,
        cdnUrl: this.generateCdnUrl(key),
        cacheControl: copyParams.CacheControl
      };

    } catch (error) {
      console.error(`❌ CDN optimization failed:`, error);
      throw new Error(`CDN optimization failed: ${error.message}`);
    }
  }
}

module.exports = VultrStorageProvider;