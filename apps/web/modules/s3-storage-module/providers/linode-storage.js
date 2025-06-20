const BaseS3Provider = require('./base-provider');

/**
 * Linode Object Storage Provider
 * Provides S3-compatible storage through Linode Object Storage
 */
class LinodeStorageProvider extends BaseS3Provider {
  constructor(config) {
    super(config);
    this.name = 'Linode Object Storage';
    this.type = 'linode-storage';
  }

  /**
   * Initialize the S3 client with Linode-specific configuration
   */
  initializeClient() {
    const region = this.config.aws_region || 'us-east-1';
    
    const clientConfig = {
      region: region,
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      },
      endpoint: this.config.custom_endpoint || `https://${region}.linodeobjects.com`,
      forcePathStyle: false, // Linode supports virtual-hosted style
      signatureVersion: 'v4'
    };

    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client(clientConfig);
  }

  /**
   * Generate standard Linode Object Storage URL
   * @param {string} key - S3 object key
   * @returns {string} Linode Object Storage URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'us-east-1';
    
    if (this.config.force_path_style) {
      return `https://${region}.linodeobjects.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.${region}.linodeobjects.com/${key}`;
    }
  }

  /**
   * Upload file with Linode-specific optimizations
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

      // Linode Object Storage specific metadata
      if (options.metadata) {
        uploadParams.Metadata = {
          ...options.metadata,
          'linode-uploaded-via': 'vyral-cms',
          'linode-upload-timestamp': new Date().toISOString()
        };
      }

      // Set ACL for public/private access
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Cache control optimized for Linode's infrastructure
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      } else {
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=2592000'; // 30 days for images
        } else if (['css', 'js', 'woff', 'woff2', 'ttf'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=604800'; // 1 week for assets
        } else if (['pdf', 'doc', 'docx', 'zip'].includes(fileExtension)) {
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
        queueSize: 3, // Optimal for Linode
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
        region: this.config.aws_region || 'us-east-1'
      };

    } catch (error) {
      console.error(`❌ Linode Object Storage upload failed:`, error);
      throw new Error(`Linode Object Storage upload failed: ${error.message}`);
    }
  }

  /**
   * Test connection with Linode-specific validations
   * @returns {Promise<object>} Connection test result
   */
  async testConnection() {
    try {
      // Test basic S3 compatibility
      const baseResult = await super.testConnection();
      
      // Test Linode-specific features
      const region = this.config.aws_region || 'us-east-1';
      const features = {
        supportedRegions: [
          'us-east-1',      // Newark, NJ
          'eu-central-1',   // Frankfurt, DE
          'ap-south-1',     // Singapore, SG
          'us-southeast-1'  // Atlanta, GA
        ],
        maxFileSize: '5GB',
        multipartUpload: true,
        corsSupport: true,
        s3Compatible: true
      };

      // Validate region
      if (!features.supportedRegions.includes(region)) {
        console.warn(`⚠️ Region ${region} may not be supported by Linode Object Storage`);
      }

      return {
        ...baseResult,
        features,
        recommendations: this.getLinodeRecommendations(),
        regionInfo: this.getRegionInfo(region)
      };

    } catch (error) {
      // Provide helpful error messages for common Linode issues
      let message = error.message;
      if (error.message.includes('InvalidAccessKeyId')) {
        message = 'Invalid Access Key. Please check your Linode Object Storage access key.';
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        message = 'Invalid Secret Key. Please verify your Linode Object Storage secret key.';
      } else if (error.message.includes('NoSuchBucket')) {
        message = `Bucket '${this.config.bucket_name}' does not exist in region ${this.config.aws_region || 'us-east-1'}.`;
      }
      
      throw new Error(`Linode Object Storage connection failed: ${message}`);
    }
  }

  /**
   * Get region information
   * @param {string} region - Region code
   * @returns {object} Region information
   */
  getRegionInfo(region) {
    const regionInfo = {
      'us-east-1': {
        name: 'Newark, NJ',
        continent: 'North America',
        description: 'East Coast US - Best for North America East Coast',
        latency: {
          'North America East': 'Low',
          'North America West': 'Medium',
          'Europe': 'Medium',
          'Asia': 'High'
        }
      },
      'eu-central-1': {
        name: 'Frankfurt, DE',
        continent: 'Europe',
        description: 'Central Europe - Best for Europe and Middle East',
        latency: {
          'Europe': 'Low',
          'Middle East': 'Low',
          'North America': 'Medium',
          'Asia': 'Medium'
        }
      },
      'ap-south-1': {
        name: 'Singapore, SG',
        continent: 'Asia Pacific',
        description: 'Southeast Asia - Best for Asia Pacific region',
        latency: {
          'Asia Pacific': 'Low',
          'Australia': 'Low',
          'Europe': 'Medium',
          'North America': 'High'
        }
      },
      'us-southeast-1': {
        name: 'Atlanta, GA',
        continent: 'North America',
        description: 'Southeast US - Best for US Southeast and Central regions',
        latency: {
          'North America South': 'Low',
          'North America Central': 'Low',
          'North America East': 'Medium',
          'Europe': 'Medium'
        }
      }
    };

    return regionInfo[region] || { name: 'Unknown Region', description: 'Region information not available' };
  }

  /**
   * Get Linode-specific recommendations
   * @returns {object} Recommendations for optimal Linode usage
   */
  getLinodeRecommendations() {
    return {
      setup: [
        'Choose region closest to your users for better performance',
        'Enable CORS if uploading from web browsers',
        'Use appropriate ACLs for public/private content'
      ],
      performance: [
        'Use multipart uploads for files larger than 100MB',
        'Set appropriate cache headers for different content types',
        'Consider using Linode NodeBalancers for high availability'
      ],
      costs: [
        'Competitive pricing with no hidden fees',
        'Outbound transfer included up to limits',
        'Consider data transfer costs for global applications'
      ],
      integration: [
        'Works well with Linode Compute Instances',
        'Can be used with Linode Kubernetes Engine',
        'Integrates with Linode Cloud Firewall'
      ],
      security: [
        'Use IAM-style access controls when available',
        'Implement signed URLs for sensitive content',
        'Consider encryption for sensitive data'
      ]
    };
  }

  /**
   * Get bucket usage statistics
   * @returns {Promise<object>} Usage statistics
   */
  async getBucketUsage() {
    try {
      // List objects to calculate usage
      const listResult = await this.listObjects({ maxKeys: 1000 });
      
      let totalSize = 0;
      let fileCount = 0;
      const fileTypes = {};
      const uploadTrends = {};

      for (const object of listResult.objects) {
        const size = object.Size || 0;
        totalSize += size;
        fileCount++;
        
        // Track file types
        const extension = object.Key.split('.').pop()?.toLowerCase();
        if (extension) {
          fileTypes[extension] = (fileTypes[extension] || 0) + 1;
        }

        // Track upload trends (by month)
        if (object.LastModified) {
          const monthKey = object.LastModified.toISOString().substring(0, 7); // YYYY-MM
          uploadTrends[monthKey] = (uploadTrends[monthKey] || 0) + 1;
        }
      }

      return {
        success: true,
        bucket: this.config.bucket_name,
        region: this.config.aws_region || 'us-east-1',
        totalSize: totalSize,
        fileCount: fileCount,
        fileTypes: fileTypes,
        uploadTrends: uploadTrends,
        estimatedMonthlyCost: this.estimateLinodeCost(totalSize),
        recommendations: this.getUsageOptimizations(totalSize, fileCount)
      };

    } catch (error) {
      console.error(`❌ Get Linode bucket usage failed:`, error);
      throw new Error(`Get bucket usage failed: ${error.message}`);
    }
  }

  /**
   * Estimate monthly cost for Linode Object Storage
   * @param {number} totalBytes - Total storage in bytes
   * @returns {object} Cost estimation
   */
  estimateLinodeCost(totalBytes) {
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    
    // Linode Object Storage pricing (as of 2024)
    const storageRatePerGB = 0.02; // $0.02 per GB per month
    const transferRatePerGB = 0.005; // $0.005 per GB outbound transfer
    const includeTransferGB = 1024; // 1TB included with Linode services
    
    const storageCost = totalGB * storageRatePerGB;
    
    return {
      storageGB: Math.round(totalGB * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      includedTransfer: `${includeTransferGB}GB included with Linode services`,
      additionalTransferRate: `$${transferRatePerGB} per GB`,
      totalEstimated: Math.round(storageCost * 100) / 100,
      currency: 'USD',
      notes: [
        'Storage pricing is competitive with major providers',
        'Outbound transfer included with other Linode services',
        'No charges for inbound transfer',
        'Simple, transparent pricing structure'
      ]
    };
  }

  /**
   * Get usage-based optimization recommendations
   * @param {number} totalSize - Total size in bytes
   * @param {number} fileCount - Number of files
   * @returns {string[]} Array of optimization recommendations
   */
  getUsageOptimizations(totalSize, fileCount) {
    const recommendations = [];
    const totalMB = totalSize / (1024 * 1024);
    const avgFileSize = fileCount > 0 ? totalMB / fileCount : 0;
    
    if (avgFileSize > 100) {
      recommendations.push('Consider compressing large files to reduce storage costs');
    }
    
    if (fileCount > 5000) {
      recommendations.push('Large number of files - consider organizing with logical folder structure');
    }
    
    if (totalMB > 10240) { // 10GB
      recommendations.push('Significant storage usage - monitor costs and consider lifecycle policies');
    }
    
    recommendations.push('Set appropriate cache headers to reduce bandwidth usage');
    recommendations.push('Use CORS configuration for secure web uploads');
    recommendations.push('Consider using signed URLs for sensitive content');
    
    return recommendations;
  }

  /**
   * Configure bucket for optimal web usage
   * @param {object} options - Configuration options
   * @returns {Promise<object>} Configuration result
   */
  async configureForWeb(options = {}) {
    try {
      const results = {
        cors: false,
        policy: false,
        website: false
      };

      // Configure CORS for web uploads
      if (options.enableCors !== false) {
        try {
          const { PutBucketCorsCommand } = require('@aws-sdk/client-s3');
          const corsRules = options.corsRules || [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: options.allowedOrigins || ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3000
            }
          ];

          const command = new PutBucketCorsCommand({
            Bucket: this.config.bucket_name,
            CORSConfiguration: { CORSRules: corsRules }
          });

          await this.client.send(command);
          results.cors = true;
        } catch (error) {
          console.warn('⚠️ CORS configuration failed:', error.message);
        }
      }

      // Configure bucket policy for public access (if requested)
      if (options.enablePublicRead) {
        try {
          const { PutBucketPolicyCommand } = require('@aws-sdk/client-s3');
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadGetObject',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: `arn:aws:s3:::${this.config.bucket_name}/*`
              }
            ]
          };

          const command = new PutBucketPolicyCommand({
            Bucket: this.config.bucket_name,
            Policy: JSON.stringify(policy)
          });

          await this.client.send(command);
          results.policy = true;
        } catch (error) {
          console.warn('⚠️ Bucket policy configuration failed:', error.message);
        }
      }

      return {
        success: true,
        message: 'Bucket configured for web usage',
        bucket: this.config.bucket_name,
        configurations: results,
        publicUrl: this.generatePublicUrl('example-file.jpg')
      };

    } catch (error) {
      console.error(`❌ Web configuration failed:`, error);
      throw new Error(`Web configuration failed: ${error.message}`);
    }
  }

  /**
   * Get provider-specific information for Linode Object Storage
   * @returns {object} Linode provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: this.config.aws_region || 'us-east-1',
      endpoint: this.config.custom_endpoint || `https://${this.config.aws_region || 'us-east-1'}.linodeobjects.com`,
      supportsAcceleration: false,
      supportsVersioning: false,
      maxFileSize: '5GB',
      supportedRegions: ['us-east-1', 'eu-central-1', 'ap-south-1', 'us-southeast-1'],
      features: [
        'S3-compatible API',
        'CORS support',
        'Bucket policies',
        'Multipart uploads',
        'Object-level permissions',
        'Transfer acceleration via global network'
      ],
      integrations: [
        'Linode Compute Instances',
        'Linode Kubernetes Engine',
        'Linode NodeBalancers',
        'Linode Cloud Firewall'
      ],
      pricing: {
        storage: '$0.02/GB/month',
        transfer: '$0.005/GB (1TB included with services)',
        requests: 'Included',
        multipartUploads: 'Included'
      },
      advantages: [
        'Competitive pricing',
        'Simple pricing structure',
        'Global presence',
        'Strong SLA guarantees',
        'Excellent customer support'
      ]
    };
  }

  /**
   * Perform health check on the bucket
   * @returns {Promise<object>} Health check result
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test basic connectivity
      const basicTest = await super.testConnection();
      
      // Test upload performance
      const testData = Buffer.from('health-check-test-data');
      const testKey = `health-check-${Date.now()}.txt`;
      
      const uploadStart = Date.now();
      await this.uploadFile(testData, testKey, { isPublic: false });
      const uploadTime = Date.now() - uploadStart;
      
      // Test download performance
      const downloadStart = Date.now();
      const metadata = await this.getObjectMetadata(testKey);
      const downloadTime = Date.now() - downloadStart;
      
      // Cleanup test file
      await this.deleteFile(testKey);
      
      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        provider: this.name,
        bucket: this.config.bucket_name,
        region: this.config.aws_region || 'us-east-1',
        performance: {
          totalTime: `${totalTime}ms`,
          uploadTime: `${uploadTime}ms`,
          downloadTime: `${downloadTime}ms`
        },
        connectivity: basicTest.success,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = LinodeStorageProvider;