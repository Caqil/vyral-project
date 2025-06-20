const BaseS3Provider = require('./base-provider');

/**
 * AWS S3 Provider
 * Provides full S3 functionality with AWS-specific features
 */
class AwsS3Provider extends BaseS3Provider {
  constructor(config) {
    super(config);
    this.name = 'Amazon S3';
    this.type = 'aws-s3';
  }

  /**
   * Initialize the S3 client with AWS-specific configuration
   */
  initializeClient() {
    const clientConfig = {
      region: this.config.aws_region || 'us-east-1',
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      }
    };

    // Enable S3 Transfer Acceleration if configured
    if (this.config.enable_acceleration) {
      clientConfig.useAccelerateEndpoint = true;
    }

    // Force path style if specified (unusual for AWS S3)
    if (this.config.force_path_style) {
      clientConfig.forcePathStyle = true;
    }

    // Set custom endpoint if provided (for S3-compatible services)
    if (this.config.custom_endpoint) {
      clientConfig.endpoint = this.config.custom_endpoint;
    }

    const { S3Client } = require('@aws-sdk/client-s3');
    this.client = new S3Client(clientConfig);
  }

  /**
   * Generate standard AWS S3 URL
   * @param {string} key - S3 object key
   * @returns {string} AWS S3 URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'us-east-1';
    
    // Handle US East 1 special case
    if (region === 'us-east-1') {
      if (this.config.force_path_style) {
        return `https://s3.amazonaws.com/${bucket}/${key}`;
      } else {
        return `https://${bucket}.s3.amazonaws.com/${key}`;
      }
    }

    // Other regions
    if (this.config.force_path_style) {
      return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  /**
   * Upload file with AWS S3 specific options
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

      // AWS S3 specific storage class
      if (options.storageClass) {
        uploadParams.StorageClass = options.storageClass;
      } else {
        // Default to Standard storage class
        uploadParams.StorageClass = 'STANDARD';
      }

      // Server-side encryption
      if (this.config.enable_encryption || options.encrypt) {
        uploadParams.ServerSideEncryption = 'AES256';
      }

      // AWS S3 specific metadata
      if (options.metadata) {
        uploadParams.Metadata = options.metadata;
      }

      // Set ACL based on configuration
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      } else {
        uploadParams.ACL = 'private';
      }

      // Cache control for better performance
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      } else {
        // Default cache control for different file types
        const fileExtension = key.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=31536000'; // 1 year
        } else if (['css', 'js'].includes(fileExtension)) {
          uploadParams.CacheControl = 'public, max-age=604800'; // 1 week
        } else {
          uploadParams.CacheControl = 'public, max-age=86400'; // 1 day
        }
      }

      // Tagging for organization and cost allocation
      if (options.tags || this.config.default_tags) {
        const tags = { ...this.config.default_tags, ...options.tags };
        const tagString = Object.entries(tags)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        if (tagString) {
          uploadParams.Tagging = tagString;
        }
      }

      // Use the base class upload method with AWS-specific params
      const { Upload } = require('@aws-sdk/lib-storage');
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 4,
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
        storageClass: uploadParams.StorageClass,
        region: this.config.aws_region
      };

    } catch (error) {
      console.error(`❌ AWS S3 upload failed:`, error);
      throw new Error(`AWS S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Get AWS S3 specific object metadata including storage class and encryption
   * @param {string} key - S3 object key
   * @returns {Promise<object>} Enhanced object metadata
   */
  async getObjectMetadata(key) {
    try {
      const { HeadObjectCommand } = require('@aws-sdk/client-s3');
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket_name,
        Key: key
      });

      const result = await this.client.send(command);

      return {
        success: true,
        key: key,
        size: result.ContentLength,
        lastModified: result.LastModified,
        etag: result.ETag,
        contentType: result.ContentType,
        metadata: result.Metadata || {},
        bucket: this.config.bucket_name,
        // AWS S3 specific fields
        storageClass: result.StorageClass,
        serverSideEncryption: result.ServerSideEncryption,
        versionId: result.VersionId,
        cacheControl: result.CacheControl,
        contentEncoding: result.ContentEncoding,
        expires: result.Expires
      };

    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return { success: false, error: 'Object not found' };
      }
      throw new Error(`Get AWS S3 object metadata failed: ${error.message}`);
    }
  }

  /**
   * Create a presigned URL for uploads (useful for direct browser uploads)
   * @param {string} key - S3 object key
   * @param {object} options - Presigned URL options
   * @returns {Promise<string>} Presigned upload URL
   */
  async generatePresignedUploadUrl(key, options = {}) {
    try {
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { PutObjectCommand } = require('@aws-sdk/client-s3');

      const {
        expiresIn = 3600, // 1 hour
        contentType = 'application/octet-stream',
        maxFileSize = null
      } = options;

      const command = new PutObjectCommand({
        Bucket: this.config.bucket_name,
        Key: key,
        ContentType: contentType,
        ACL: options.isPublic !== false ? 'public-read' : 'private'
      });

      // Add conditions for security
      const conditions = [];
      if (maxFileSize) {
        conditions.push(['content-length-range', 0, maxFileSize]);
      }

      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn: expiresIn
      });

      return signedUrl;

    } catch (error) {
      console.error(`❌ AWS S3 presigned upload URL generation failed:`, error);
      throw new Error(`Presigned upload URL generation failed: ${error.message}`);
    }
  }

  /**
   * Enable versioning on the bucket (if permissions allow)
   * @returns {Promise<object>} Result of versioning operation
   */
  async enableVersioning() {
    try {
      const { PutBucketVersioningCommand } = require('@aws-sdk/client-s3');
      const command = new PutBucketVersioningCommand({
        Bucket: this.config.bucket_name,
        VersioningConfiguration: {
          Status: 'Enabled'
        }
      });

      await this.client.send(command);

      return {
        success: true,
        message: 'Versioning enabled on bucket',
        bucket: this.config.bucket_name
      };

    } catch (error) {
      console.error(`❌ Enable versioning failed:`, error);
      throw new Error(`Enable versioning failed: ${error.message}`);
    }
  }

  /**
   * Set bucket CORS configuration for web uploads
   * @param {object} corsRules - CORS rules
   * @returns {Promise<object>} Result of CORS operation
   */
  async setBucketCors(corsRules = null) {
    try {
      const { PutBucketCorsCommand } = require('@aws-sdk/client-s3');
      
      const defaultRules = corsRules || [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag'],
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
        message: 'CORS configuration set on bucket',
        bucket: this.config.bucket_name
      };

    } catch (error) {
      console.error(`❌ Set bucket CORS failed:`, error);
      throw new Error(`Set bucket CORS failed: ${error.message}`);
    }
  }

  /**
   * Get provider-specific information
   * @returns {object} AWS S3 provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: this.config.aws_region,
      endpoint: this.config.custom_endpoint,
      supportsAcceleration: true,
      supportsVersioning: true,
      accelerationEnabled: this.config.enable_acceleration,
      encryptionEnabled: this.config.enable_encryption,
      storageClasses: [
        'STANDARD',
        'STANDARD_IA',
        'ONEZONE_IA',
        'REDUCED_REDUNDANCY',
        'GLACIER',
        'DEEP_ARCHIVE',
        'INTELLIGENT_TIERING'
      ],
      maxFileSize: 5 * 1024 * 1024 * 1024 * 1024, // 5TB
      multipartThreshold: 5 * 1024 * 1024 // 5MB
    };
  }

  /**
   * Test AWS S3 specific features
   * @returns {Promise<object>} Extended test results
   */
  async testConnection() {
    try {
      // First run the base connection test
      const baseResult = await super.testConnection();
      
      // Test additional AWS features
      const features = {
        acceleration: false,
        versioning: false,
        encryption: false
      };

      // Test if acceleration is available (requires specific endpoint)
      if (this.config.enable_acceleration) {
        try {
          const { GetBucketAccelerateConfigurationCommand } = require('@aws-sdk/client-s3');
          const command = new GetBucketAccelerateConfigurationCommand({
            Bucket: this.config.bucket_name
          });
          await this.client.send(command);
          features.acceleration = true;
        } catch (error) {
          // Acceleration not available or not configured
        }
      }

      // Test versioning capability
      try {
        const { GetBucketVersioningCommand } = require('@aws-sdk/client-s3');
        const command = new GetBucketVersioningCommand({
          Bucket: this.config.bucket_name
        });
        const result = await this.client.send(command);
        features.versioning = result.Status === 'Enabled';
      } catch (error) {
        // Versioning check failed
      }

      return {
        ...baseResult,
        features,
        accelerationEndpoint: this.config.enable_acceleration ? 
          `https://${this.config.bucket_name}.s3-accelerate.amazonaws.com` : null
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = AwsS3Provider;