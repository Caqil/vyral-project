const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const {
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} = require('@aws-sdk/client-s3');

/**
 * Base S3 Provider Class
 * All S3-compatible storage providers should extend this class
 */
class BaseS3Provider {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.name = 'Base S3 Provider';
    this.type = config.providerType || 'unknown';
    
    // Initialize the S3 client
    this.initializeClient();
  }

  /**
   * Initialize the S3 client with provider-specific configuration
   */
  initializeClient() {
    const clientConfig = {
      region: this.config.aws_region || 'us-east-1',
      credentials: {
        accessKeyId: this.config.aws_access_key_id,
        secretAccessKey: this.config.aws_secret_access_key
      }
    };

    // Add endpoint for non-AWS providers
    if (this.config.custom_endpoint) {
      clientConfig.endpoint = this.config.custom_endpoint;
    }

    // Force path style for providers that require it
    if (this.config.force_path_style) {
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
  }

  /**
   * Test connection to the S3 provider
   * @returns {Promise<object>} Connection test result
   */
  async testConnection() {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket_name,
        Key: 'connection-test-' + Date.now()
      });

      // This will throw an error if the bucket doesn't exist or credentials are invalid
      // We expect a 404 for the object, but that means the bucket is accessible
      await this.client.send(command);
      
      return {
        success: true,
        message: 'Connection successful',
        provider: this.name,
        bucket: this.config.bucket_name,
        region: this.config.aws_region
      };
    } catch (error) {
      // 404 is expected for our test object, but means bucket is accessible
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return {
          success: true,
          message: 'Connection successful',
          provider: this.name,
          bucket: this.config.bucket_name,
          region: this.config.aws_region
        };
      }

      // Handle specific error types
      let message = 'Connection failed';
      if (error.name === 'NoSuchBucket') {
        message = `Bucket '${this.config.bucket_name}' does not exist`;
      } else if (error.name === 'InvalidAccessKeyId') {
        message = 'Invalid access key ID';
      } else if (error.name === 'SignatureDoesNotMatch') {
        message = 'Invalid secret access key';
      } else if (error.name === 'AccessDenied') {
        message = 'Access denied - check your permissions';
      } else if (error.message) {
        message = error.message;
      }

      throw new Error(`${this.name} connection failed: ${message}`);
    }
  }

  /**
   * Upload a file to S3 storage
   * @param {Buffer|Stream} fileData - File data to upload
   * @param {string} key - S3 object key (file path)
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

      // Add metadata if provided
      if (options.metadata) {
        uploadParams.Metadata = options.metadata;
      }

      // Set ACL if specified
      if (options.isPublic !== false) {
        uploadParams.ACL = 'public-read';
      }

      // Add cache control headers
      if (options.cacheControl) {
        uploadParams.CacheControl = options.cacheControl;
      }

      // Use multipart upload for large files
      const upload = new Upload({
        client: this.client,
        params: uploadParams,
        queueSize: 4, // Optional: configure concurrent uploads
        partSize: 1024 * 1024 * 5, // Optional: 5MB parts
        leavePartsOnError: false
      });

      // Track upload progress if callback provided
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
        provider: this.type
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${this.name}:`, error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3 storage
   * @param {string} key - S3 object key to delete
   * @returns {Promise<object>} Delete result
   */
  async deleteFile(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket_name,
        Key: key
      });

      const result = await this.client.send(command);

      return {
        success: true,
        key: key,
        bucket: this.config.bucket_name,
        deleted: true,
        provider: this.type
      };

    } catch (error) {
      console.error(`❌ Delete failed for ${this.name}:`, error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Generate a signed URL for private file access
   * @param {string} key - S3 object key
   * @param {object} options - URL generation options
   * @returns {Promise<string>} Signed URL
   */
  async generateSignedUrl(key, options = {}) {
    try {
      const {
        expiresIn = 3600, // 1 hour default
        operation = 'getObject'
      } = options;

      let command;
      switch (operation) {
        case 'getObject':
          command = new GetObjectCommand({
            Bucket: this.config.bucket_name,
            Key: key
          });
          break;
        case 'putObject':
          command = new PutObjectCommand({
            Bucket: this.config.bucket_name,
            Key: key,
            ContentType: options.contentType
          });
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const signedUrl = await getSignedUrl(this.client, command, {
        expiresIn: expiresIn
      });

      return signedUrl;

    } catch (error) {
      console.error(`❌ Signed URL generation failed for ${this.name}:`, error);
      throw new Error(`Signed URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate public URL for a file
   * @param {string} key - S3 object key
   * @returns {string} Public URL
   */
  generatePublicUrl(key) {
    // Use custom public URL if configured (for CDN)
    if (this.config.public_url) {
      const baseUrl = this.config.public_url.replace(/\/$/, '');
      return `${baseUrl}/${key}`;
    }

    // Generate standard S3 URL
    return this.generateStandardUrl(key);
  }

  /**
   * Generate standard S3 URL (to be overridden by specific providers)
   * @param {string} key - S3 object key
   * @returns {string} Standard S3 URL
   */
  generateStandardUrl(key) {
    const bucket = this.config.bucket_name;
    const region = this.config.aws_region || 'us-east-1';
    
    if (this.config.force_path_style) {
      return `https://s3.${region}.amazonaws.com/${bucket}/${key}`;
    } else {
      return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  /**
   * List objects in the bucket
   * @param {object} options - List options
   * @returns {Promise<object>} List result
   */
  async listObjects(options = {}) {
    try {
      const {
        prefix = '',
        maxKeys = 1000,
        continuationToken = null
      } = options;

      const command = new ListObjectsV2Command({
        Bucket: this.config.bucket_name,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken
      });

      const result = await this.client.send(command);

      return {
        success: true,
        objects: result.Contents || [],
        isTruncated: result.IsTruncated || false,
        nextContinuationToken: result.NextContinuationToken,
        keyCount: result.KeyCount || 0,
        bucket: this.config.bucket_name
      };

    } catch (error) {
      console.error(`❌ List objects failed for ${this.name}:`, error);
      throw new Error(`List objects failed: ${error.message}`);
    }
  }

  /**
   * Check if an object exists
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} True if object exists
   */
  async objectExists(key) {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket_name,
        Key: key
      });

      await this.client.send(command);
      return true;

    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get object metadata
   * @param {string} key - S3 object key
   * @returns {Promise<object>} Object metadata
   */
  async getObjectMetadata(key) {
    try {
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
        bucket: this.config.bucket_name
      };

    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return { success: false, error: 'Object not found' };
      }
      throw new Error(`Get object metadata failed: ${error.message}`);
    }
  }

  /**
   * Update configuration
   * @param {object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.initializeClient();
  }

  /**
   * Get provider information
   * @returns {object} Provider info
   */
  getProviderInfo() {
    return {
      name: this.name,
      type: this.type,
      bucket: this.config.bucket_name,
      region: this.config.aws_region,
      endpoint: this.config.custom_endpoint,
      supportsAcceleration: false,
      supportsVersioning: false
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.client) {
      // The AWS SDK v3 client doesn't need explicit cleanup
      this.client = null;
    }
  }
}

module.exports = BaseS3Provider;