const BaseS3Provider = require('./base-provider');

/**
 * DigitalOcean Spaces Provider
 * Provides S3-compatible storage through DigitalOcean Spaces with integrated CDN
 */
class DigitalOceanSpacesProvider extends BaseS3Provider {
  constructor(config) {
    super(config);
    this.name = 'DigitalOcean Spaces';
    this.type = 'digitalocean-spaces';
  }

  /**
   * Initialize the S3 client with DigitalOcean Spaces-specific configuration
   */
  initializeClient() {
    const region = this.config.aws_region || 'nyc3';
    
    const clientConfig = {
      region: region,
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      },
      endpoint: this.config.custom_endpoint || `https://${region}.digitaloceanspaces.com`,
      forcePathStyle: false, // Spaces supports virtual-hosted style
      signatureVersion: 'v4'
    };

    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client(clientConfig);
  }

  /**
   * Generate standard DigitalOcean Spaces URL
   * @param {string} key - S3 object key
   * @returns {string} DigitalOcean Spaces URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'nyc3';
    
    if (this.config.force_path_style) {
      return `https://${region}.digitaloceanspaces.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.${region}.digitaloceanspaces.com/${key}`;
    }
  }

  /**
   * Generate CDN URL for DigitalOcean Spaces
   * @param {string} key - S3 object key
   * @returns {string} CDN URL
   */
  generateCdnUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'nyc3';
    
    // Use custom CDN domain if configured
    if (this.config.cdn_domain) {
      return `https://${this.config.cdn_domain}/${key}`;
    }
    
    // Use DigitalOcean CDN endpoint if enabled
    if (this.config.enable_cdn !== false) {
      return `https://${bucket}.${region}.cdn.digitaloceanspaces.com/${key}`;
    }
    
    // Fallback to standard URL
    return this.generateStandardUrl(key);
  }

  /**
   * Generate public URL using CDN when available
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  generatePublicUrl(key) {
    // Use custom public URL if configured
    if (this.config.public_url) {
      const baseUrl = this.config.public_url.replace(/\/$/, '');
      return `${baseUrl}/${key}`;
    }

    // Use CDN URL by default for better performance
    return this.generateCdnUrl(key);
  }

  /**
   * Upload file with DigitalOcean Spaces-specific optimizations
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

      // DigitalOcean Spaces specific metadata
      if (options.metadata) {
        uploadParams.Metadata = {
          ...options.metadata,
          'do-spaces-uploaded-via': 'vyral-cms',
          'do-spaces-upload-timestamp': new Date().toISOString()
        };
      }

      // Set ACL for public/private access
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Cache control optimized for DigitalOcean CDN
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      } else {
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=2592000'; // 30 days for images
        } else if (['css', 'js', 'woff', 'woff2', 'ttf'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=604800'; // 1 week for assets
        } else if (['pdf', 'doc', 'docx'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=259200'; // 3 days for documents
        } else {
          uploadParams.CacheControl = 'public, max-age=86400'; // 1 day for others
        }
      }

      // Content disposition for download behavior
      if (options.contentDisposition) {
        uploadParams.ContentDisposition = options.contentDisposition;
      }

      // Content encoding for compression
      if (options.contentEncoding) {
        uploadParams.ContentEncoding = options.contentEncoding;
      }

      const { Upload } = require('@aws-sdk/lib-storage');
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 3, // Optimal for DigitalOcean
        partSize: 1024 * 1024 * 6, // 6MB parts work well
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
        region: this.config.aws_region || 'nyc3',
        cdnUrl: this.generateCdnUrl(key),
        standardUrl: this.generateStandardUrl(key)
      };

    } catch (error) {
      console.error(`❌ DigitalOcean Spaces upload failed:`, error);
      throw new Error(`DigitalOcean Spaces upload failed: ${error.message}`);
    }
  }

  /**
   * Test connection with DigitalOcean-specific validations
   * @returns {Promise<object>} Connection test result
   */
  async testConnection() {
    try {
      // Test basic S3 compatibility
      const baseResult = await super.testConnection();
      
      // Test DigitalOcean-specific features
      const region = this.config.aws_region || 'nyc3';
      const features = {
        cdnEnabled: this.config.enable_cdn !== false,
        supportedRegions: ['nyc1', 'nyc2', 'nyc3', 'ams2', 'ams3', 'sgp1', 'lon1', 'fra1', 'tor1', 'sfo2', 'sfo3', 'blr1'],
        maxFileSize: '5GB',
        multipartUpload: true,
        corsSupport: true
      };

      // Validate region
      if (!features.supportedRegions.includes(region)) {
        console.warn(`⚠️ Region ${region} may not be supported by DigitalOcean Spaces`);
      }

      // Test CDN accessibility if enabled
      let cdnAccessible = false;
      if (this.config.enable_cdn !== false) {
        try {
          const cdnUrl = this.generateCdnUrl('test-file');
          cdnAccessible = true;
        } catch (error) {
          console.warn('⚠️ CDN URL generation failed');
        }
      }

      return {
        ...baseResult,
        features,
        cdnAccessible,
        cdnUrl: this.generateCdnUrl('test-file.jpg'),
        recommendations: this.getDigitalOceanRecommendations()
      };

    } catch (error) {
      // Provide helpful error messages for common DigitalOcean issues
      let message = error.message;
      if (error.message.includes('InvalidAccessKeyId')) {
        message = 'Invalid Access Key. Please check your DigitalOcean Spaces API key.';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        message = 'Invalid Secret Key. Please verify your DigitalOcean Spaces secret key.';
      } else if (error.message.includes('NoSuchBucket')) {
        message = `Space '${this.config.bucket_name}' does not exist in region ${this.config.aws_region || 'nyc3'}.`;
      }
      
      throw new Error(`DigitalOcean Spaces connection failed: ${message}`);
    }
  }

  /**
   * Get DigitalOcean-specific recommendations
   * @returns {object} Recommendations for optimal Spaces usage
   */
  getDigitalOceanRecommendations() {
    return {
      regions: {
        'nyc1': 'New York 1 - Legacy datacenter',
        'nyc2': 'New York 2 - Legacy datacenter', 
        'nyc3': 'New York 3 - Recommended for North America East',
        'ams2': 'Amsterdam 2 - Legacy datacenter',
        'ams3': 'Amsterdam 3 - Recommended for Europe',
        'sgp1': 'Singapore 1 - Recommended for Asia Pacific',
        'lon1': 'London 1 - Recommended for UK/Europe',
        'fra1': 'Frankfurt 1 - Recommended for Central Europe',
        'tor1': 'Toronto 1 - Recommended for Canada',
        'sfo2': 'San Francisco 2 - Legacy datacenter',
        'sfo3': 'San Francisco 3 - Recommended for North America West',
        'blr1': 'Bangalore 1 - Recommended for India'
      },
      performance: [
        'Enable CDN for global content delivery',
        'Use appropriate cache headers for different file types',
        'Consider region proximity to your users',
        'Optimize file sizes before upload'
      ],
      costs: [
        'Storage pricing is competitive with major providers',
        'CDN bandwidth included up to certain limits',
        'Consider using Spaces for static website hosting'
      ],
      integration: [
        'Works well with DigitalOcean Droplets',
        'Can be used for App Platform static assets',
        'Integrates with DigitalOcean Load Balancers'
      ]
    };
  }

  /**
   * Get Space usage statistics and analytics
   * @returns {Promise<object>} Usage statistics
   */
  async getSpaceUsage() {
    try {
      // List objects to calculate usage
      const listResult = await this.listObjects({ maxKeys: 1000 });
      
      let totalSize = 0;
      let fileCount = 0;
      const fileTypes = {};
      const sizeDistribution = {
        small: 0,    // < 1MB
        medium: 0,   // 1MB - 10MB
        large: 0,    // 10MB - 100MB
        xlarge: 0    // > 100MB
      };

      for (const object of listResult.objects) {
        const size = object.Size || 0;
        totalSize += size;
        fileCount++;
        
        // Track file types
        const extension = object.Key.split('.').pop()?.toLowerCase();
        if (extension) {
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        }

        // Track size distribution
        const sizeMB = size / (1024 * 1024);
        if (sizeMB < 1) sizeDistribution.small++;
        else if (sizeMB < 10) sizeDistribution.medium++;
        else if (sizeMB < 100) sizeDistribution.large++;
        else sizeDistribution.xlarge++;
      }

      return {
        success: true,
        space: this.config.bucket_name,
        region: this.config.aws_region || 'nyc3',
        totalSize: totalSize,
        fileCount: fileCount,
        fileTypes: fileTypes,
        sizeDistribution: sizeDistribution,
        estimatedMonthlyCost: this.estimateSpacesCost(totalSize),
        cdnEnabled: this.config.enable_cdn !== false,
        recommendations: this.getUsageRecommendations(totalSize, fileCount)
      };

    } catch (error) {
      console.error(`❌ Get DigitalOcean Spaces usage failed:`, error);
      throw new Error(`Get Space usage failed: ${error.message}`);
    }
  }

  /**
   * Estimate monthly cost for DigitalOcean Spaces
   * @param {number} totalBytes - Total storage in bytes
   * @returns {object} Cost estimation
   */
  estimateSpacesCost(totalBytes) {
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    
    // DigitalOcean Spaces pricing (as of 2024)
    const basePrice = 5; // $5/month for first 250GB
    const additionalRatePerGB = 0.02; // $0.02 per GB over 250GB
    const cdnBandwidthLimit = 1024; // 1TB CDN bandwidth included
    
    let storageCost = basePrice;
    if (totalGB > 250) {
      storageCost += (totalGB - 250) * additionalRatePerGB;
    }
    
    return {
      storageGB: Math.round(totalGB * 100) / 100,
      baseAllowance: '250GB included',
      storageCost: Math.round(storageCost * 100) / 100,
      cdnBandwidth: `${cdnBandwidthLimit}GB included`,
      additionalBandwidthRate: '$0.01 per GB',
      totalEstimated: Math.round(storageCost * 100) / 100,
      currency: 'USD',
      notes: [
        'First 250GB storage included in base price',
        '1TB CDN bandwidth included',
        'Competitive pricing for additional storage and bandwidth'
      ]
    };
  }

  /**
   * Get usage-based recommendations
   * @param {number} totalSize - Total size in bytes
   * @param {number} fileCount - Number of files
   * @returns {string[]} Array of recommendations
   */
  getUsageRecommendations(totalSize, fileCount) {
    const recommendations = [];
    const totalGB = totalSize / (1024 * 1024 * 1024);
    
    if (totalGB > 250) {
      recommendations.push('Consider optimizing large files to reduce storage costs');
    }
    
    if (fileCount > 10000) {
      recommendations.push('Large number of files detected - consider organizing with folders');
    }
    
    recommendations.push('Enable CDN for better global performance');
    recommendations.push('Set appropriate cache headers for different file types');
    recommendations.push('Consider using Space for static website hosting');
    
    return recommendations;
  }

  /**
   * Configure CORS for web uploads
   * @param {object} corsRules - Custom CORS rules (optional)
   * @returns {Promise<object>} CORS configuration result
   */
  async configureSpaceCors(corsRules = null) {
    try {
      const { PutBucketCorsCommand } = require('@aws-sdk/client-s3');
      
      const defaultRules = corsRules || [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: ['*'], // Restrict this in production
          ExposeHeaders: ['ETag', 'x-amz-request-id'],
          MaxAgeSeconds: 3000
        }
      ];

      const command = new PutBucketCorsCommand({
        Bucket: this.config.bucket_name,
        CORSConfiguration: {
          CORSRules: defaultRules
        }
      });

      await this.client.send(command);

      return {
        success: true,
        message: 'CORS configuration set on Space',
        space: this.config.bucket_name,
        rules: defaultRules
      };

    } catch (error) {
      console.error(`❌ Configure Space CORS failed:`, error);
      throw new Error(`Configure Space CORS failed: ${error.message}`);
    }
  }

  /**
   * Get provider-specific information for DigitalOcean Spaces
   * @returns {object} Spaces provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: this.config.aws_region || 'nyc3',
      endpoint: this.config.custom_endpoint || `https://${this.config.aws_region || 'nyc3'}.digitaloceanspaces.com`,
      supportsAcceleration: false,
      supportsVersioning: false,
      cdnIncluded: true,
      maxFileSize: '5GB',
      supportedRegions: ['nyc1', 'nyc2', 'nyc3', 'ams2', 'ams3', 'sgp1', 'lon1', 'fra1', 'tor1', 'sfo2', 'sfo3', 'blr1'],
      features: [
        'S3-compatible API',
        'Integrated CDN',
        'CORS support',
        'Static website hosting',
        'Multipart uploads',
        '99.9% uptime SLA'
      ],
      integrations: [
        'DigitalOcean Droplets',
        'DigitalOcean App Platform',
        'DigitalOcean Load Balancers',
        'DigitalOcean Kubernetes'
      ],
      pricing: {
        basePrice: '$5/month',
        storageIncluded: '250GB',
        bandwidthIncluded: '1TB CDN',
        additionalStorage: '$0.02/GB',
        additionalBandwidth: '$0.01/GB'
      }
    };
  }

  /**
   * Optimize files for DigitalOcean CDN
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

      // Update with CDN-optimized headers
      const { CopyObjectCommand } = require('@aws-sdk/client-s3');
      const copyParams = {
        Bucket: this.config.bucket_name,
        Key: key,
        CopySource: `${this.config.bucket_name}/${key}`,
        MetadataDirective: 'REPLACE',
        CacheControl: options.cacheControl || 'public, max-age=2592000', // 30 days
        ContentType: metadata.contentType
      };

      // Add optimization metadata
      copyParams.Metadata = {
        ...metadata.metadata,
        'do-cdn-optimized': 'true',
        'do-optimization-timestamp': new Date().toISOString()
      };

      await this.client.send(new CopyObjectCommand(copyParams));

      return {
        success: true,
        message: 'File optimized for DigitalOcean CDN',
        key: key,
        cdnUrl: this.generateCdnUrl(key),
        standardUrl: this.generateStandardUrl(key),
        cacheControl: copyParams.CacheControl
      };

    } catch (error) {
      console.error(`❌ CDN optimization failed:`, error);
      throw new Error(`CDN optimization failed: ${error.message}`);
    }
  }
}

module.exports = DigitalOceanSpacesProvider;