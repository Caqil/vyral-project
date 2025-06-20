const { logInfo, logError, logWarning } = require('../utils/error-handler');
const { validateFile } = require('../utils/file-utils');
const { getMimeTypeInfo, detectMimeTypeFromBuffer } = require('../utils/mime-helper');

/**
 * S3 Storage Module - Media Upload Hook
 * Handles media upload hooks for S3 storage integration
 */

class MediaUploadHook {
  constructor(s3Module) {
    this.s3Module = s3Module;
    this.config = s3Module.config;
    
    // Hook priorities (lower numbers execute first)
    this.beforeUploadPriority = 10;
    this.afterUploadPriority = 10;
    
    logInfo('🪝 Media Upload Hook initialized');
  }

  /**
   * Hook: Before file upload
   * Processes and validates files before uploading to S3
   * @param {object} uploadData - Upload data
   * @returns {Promise<object>} Modified upload data
   */
  async beforeUpload(uploadData) {
    try {
      logInfo(`🔄 Processing before upload: ${uploadData.filename || 'unknown'}`);
      
      // Skip if S3 is not configured or disabled
      if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
        logInfo('📁 S3 not configured, skipping hook');
        return uploadData;
      }

      // Validate file data
      if (!uploadData.file && !uploadData.buffer) {
        throw new Error('No file data provided');
      }

      // Enhanced file validation
      const validationResult = await this.validateFileForS3(uploadData);
      if (!validationResult.valid) {
        throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Process file buffer
      const fileBuffer = uploadData.buffer || uploadData.file.buffer;
      if (!fileBuffer) {
        throw new Error('No file buffer available');
      }

      // Detect and validate MIME type
      const mimeInfo = await this.detectAndValidateMimeType(fileBuffer, uploadData);
      uploadData.mimeType = mimeInfo.mimeType;
      uploadData.detectedMimeType = mimeInfo.detectedMimeType;

      // Optimize image if enabled
      if (this.config.auto_optimize_images && mimeInfo.isImage) {
        uploadData = await this.optimizeImage(uploadData, fileBuffer);
      }

      // Generate S3 path
      uploadData.s3Path = this.s3Module.fileManager.generateS3Path({
        originalName: uploadData.filename || uploadData.originalName,
        mimeType: uploadData.mimeType,
        uploadedBy: uploadData.uploadedBy || 'anonymous',
        type: mimeInfo.category
      });

      // Add S3-specific metadata
      uploadData.s3Metadata = {
        originalMimeType: uploadData.mimeType,
        detectedMimeType: mimeInfo.detectedMimeType,
        fileCategory: mimeInfo.category,
        optimized: uploadData.optimized || false,
        uploadedVia: 'vyral-cms-s3-module',
        uploadTimestamp: new Date().toISOString()
      };

      // Set cache control headers
      uploadData.cacheControl = this.s3Module.fileManager.getCacheControl(uploadData.s3Path);

      logInfo(`✅ Before upload processing completed: ${uploadData.s3Path}`);
      return uploadData;

    } catch (error) {
      logError('❌ Before upload hook failed:', error);
      
      // Add error details to upload data
      uploadData.s3Error = {
        stage: 'before-upload',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      throw error;
    }
  }

  /**
   * Hook: After file upload
   * Handles post-upload processing and S3 storage
   * @param {object} uploadResult - Upload result
   * @returns {Promise<object>} Modified upload result
   */
  async afterUpload(uploadResult) {
    try {
      logInfo(`🔄 Processing after upload: ${uploadResult.filename || 'unknown'}`);
      
      // Skip if S3 is not configured
      if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
        logInfo('📁 S3 not configured, skipping S3 upload');
        return uploadResult;
      }

      // Check if file was successfully uploaded locally first
      if (!uploadResult.success || uploadResult.error) {
        logWarning('⚠️ Local upload failed, skipping S3 upload');
        return uploadResult;
      }

      // Upload to S3
      const s3UploadResult = await this.uploadToS3(uploadResult);
      
      // Merge S3 results with upload result
      uploadResult = {
        ...uploadResult,
        ...s3UploadResult,
        s3: {
          uploaded: s3UploadResult.success,
          url: s3UploadResult.url,
          key: s3UploadResult.key,
          provider: s3UploadResult.provider,
          backup: s3UploadResult.backup || false
        }
      };

      // Generate additional URLs if needed
      if (s3UploadResult.success) {
        uploadResult.urls = await this.generateAdditionalUrls(s3UploadResult.key);
      }

      // Clean up local file if configured
      if (this.config.delete_local_after_s3 && s3UploadResult.success) {
        await this.cleanupLocalFile(uploadResult);
      }

      // Update analytics
      if (this.config.enable_analytics) {
        await this.recordUploadAnalytics(uploadResult);
      }

      logInfo(`✅ After upload processing completed: ${uploadResult.s3?.url || 'N/A'}`);
      return uploadResult;

    } catch (error) {
      logError('❌ After upload hook failed:', error);
      
      // Add S3 error info but don't fail the entire upload
      uploadResult.s3Error = {
        stage: 'after-upload',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Return the result even if S3 upload failed
      return uploadResult;
    }
  }

  /**
   * Validate file for S3 upload
   * @param {object} uploadData - Upload data
   * @returns {Promise<object>} Validation result
   */
  async validateFileForS3(uploadData) {
    try {
      const fileInfo = {
        name: uploadData.filename || uploadData.originalName,
        size: uploadData.size || (uploadData.buffer && uploadData.buffer.length),
        mimeType: uploadData.mimeType
      };

      // Get validation criteria from config
      const criteria = {
        maxSize: this.config.max_file_size || 50 * 1024 * 1024, // 50MB default
        allowedExtensions: this.config.allowed_extensions || null,
        blockedExtensions: this.config.blocked_extensions || null,
        allowedMimeTypes: this.config.allowed_mime_types || null
      };

      const validation = validateFile(fileInfo, criteria);
      
      // Additional S3-specific validations
      if (fileInfo.size > 5 * 1024 * 1024 * 1024 * 1024) { // 5TB S3 limit
        validation.valid = false;
        validation.errors.push('File exceeds S3 maximum size limit of 5TB');
      }

      return validation;

    } catch (error) {
      logError('❌ S3 file validation failed:', error);
      return {
        valid: false,
        errors: ['File validation failed: ' + error.message],
        warnings: []
      };
    }
  }

  /**
   * Detect and validate MIME type
   * @param {Buffer} fileBuffer - File buffer
   * @param {object} uploadData - Upload data
   * @returns {Promise<object>} MIME type information
   */
  async detectAndValidateMimeType(fileBuffer, uploadData) {
    try {
      const extension = uploadData.filename ? 
        uploadData.filename.split('.').pop()?.toLowerCase() : null;
      
      // Detect MIME type from buffer
      const detectedMimeType = detectMimeTypeFromBuffer(fileBuffer, extension);
      
      // Use provided MIME type or detected one
      const finalMimeType = uploadData.mimeType || detectedMimeType;
      
      // Get MIME type info
      const mimeInfo = getMimeTypeInfo(finalMimeType);
      
      // Warn if declared and detected MIME types don't match
      if (uploadData.mimeType && detectedMimeType !== uploadData.mimeType) {
        logWarning(`⚠️ MIME type mismatch: declared=${uploadData.mimeType}, detected=${detectedMimeType}`);
      }

      return {
        ...mimeInfo,
        detectedMimeType,
        declaredMimeType: uploadData.mimeType
      };

    } catch (error) {
      logError('❌ MIME type detection failed:', error);
      return {
        mimeType: 'application/octet-stream',
        detectedMimeType: 'application/octet-stream',
        category: 'other',
        isImage: false,
        isSafe: false
      };
    }
  }

  /**
   * Optimize image for S3 upload
   * @param {object} uploadData - Upload data
   * @param {Buffer} fileBuffer - Original file buffer
   * @returns {Promise<object>} Updated upload data
   */
  async optimizeImage(uploadData, fileBuffer) {
    try {
      logInfo(`🎨 Optimizing image: ${uploadData.filename}`);
      
      const optimizedBuffer = await this.s3Module.fileManager.optimizeImage(fileBuffer, {
        quality: this.config.image_quality || 85,
        maxWidth: this.config.max_image_width || 2048,
        maxHeight: this.config.max_image_height || 2048
      });

      // Update upload data with optimized buffer
      uploadData.buffer = optimizedBuffer;
      uploadData.size = optimizedBuffer.length;
      uploadData.optimized = true;
      
      const originalSize = fileBuffer.length;
      const optimizedSize = optimizedBuffer.length;
      const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
      
      uploadData.optimization = {
        originalSize,
        optimizedSize,
        savings: `${savings}%`,
        timestamp: new Date().toISOString()
      };

      logInfo(`✨ Image optimized: ${originalSize} → ${optimizedSize} bytes (${savings}% savings)`);
      return uploadData;

    } catch (error) {
      logError('❌ Image optimization failed:', error);
      logWarning('⚠️ Continuing with original image');
      
      // Return original data if optimization fails
      uploadData.optimized = false;
      uploadData.optimization = {
        failed: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      return uploadData;
    }
  }

  /**
   * Upload file to S3
   * @param {object} uploadResult - Local upload result
   * @returns {Promise<object>} S3 upload result
   */
  async uploadToS3(uploadResult) {
    try {
      // Prepare upload data for S3 service
      const s3UploadData = {
        file: uploadResult.file,
        buffer: uploadResult.buffer,
        filename: uploadResult.filename,
        originalName: uploadResult.originalName,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        uploadedBy: uploadResult.uploadedBy,
        isPublic: uploadResult.isPublic !== false,
        s3Path: uploadResult.s3Path,
        cacheControl: uploadResult.cacheControl,
        metadata: uploadResult.s3Metadata || {}
      };

      // Upload using S3 storage service
      const result = await this.s3Module.storageService.uploadFile(s3UploadData);
      
      return {
        success: true,
        url: result.url,
        key: result.key,
        size: result.size,
        provider: result.provider,
        backup: result.backup,
        etag: result.etag
      };

    } catch (error) {
      logError('❌ S3 upload failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate additional URLs (CDN, thumbnails, etc.)
   * @param {string} s3Key - S3 object key
   * @returns {Promise<object>} Additional URLs
   */
  async generateAdditionalUrls(s3Key) {
    try {
      const urls = {
        public: await this.s3Module.urlService.generateUrl(s3Key, {
          provider: this.s3Module.activeProvider,
          isPrivate: false
        })
      };

      // Generate CDN URL if available
      if (this.s3Module.activeProvider.generateCdnUrl) {
        urls.cdn = this.s3Module.activeProvider.generateCdnUrl(s3Key);
      }

      // Generate download URL
      urls.download = await this.s3Module.urlService.generateDownloadUrl(
        this.s3Module.activeProvider,
        s3Key,
        s3Key.split('/').pop() // filename
      );

      return urls;

    } catch (error) {
      logError('❌ Generate additional URLs failed:', error);
      return {};
    }
  }

  /**
   * Clean up local file after S3 upload
   * @param {object} uploadResult - Upload result
   * @returns {Promise<void>}
   */
  async cleanupLocalFile(uploadResult) {
    try {
      if (uploadResult.localPath && this.config.delete_local_after_s3) {
        const fs = require('fs').promises;
        await fs.unlink(uploadResult.localPath);
        logInfo(`🗑️ Local file cleaned up: ${uploadResult.localPath}`);
      }
    } catch (error) {
      logWarning('⚠️ Failed to clean up local file:', error);
    }
  }

  /**
   * Record upload analytics
   * @param {object} uploadResult - Upload result
   * @returns {Promise<void>}
   */
  async recordUploadAnalytics(uploadResult) {
    try {
      const analytics = {
        timestamp: new Date().toISOString(),
        filename: uploadResult.filename,
        size: uploadResult.size,
        mimeType: uploadResult.mimeType,
        s3Provider: uploadResult.s3?.provider,
        optimized: uploadResult.optimized || false,
        uploadedBy: uploadResult.uploadedBy,
        success: uploadResult.s3?.uploaded || false
      };

      // Log analytics (implementation depends on your analytics system)
      logInfo(`📊 Upload analytics: ${JSON.stringify(analytics)}`);

    } catch (error) {
      logWarning('⚠️ Failed to record analytics:', error);
    }
  }

  /**
   * Handle upload error
   * @param {Error} error - Upload error
   * @param {object} uploadData - Upload data
   * @returns {object} Error response
   */
  handleUploadError(error, uploadData) {
    logError('❌ Upload error handled:', error);
    
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'UPLOAD_ERROR',
        stage: 's3-upload',
        filename: uploadData.filename,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get hook configuration
   * @returns {object} Hook configuration
   */
  getHookConfig() {
    return {
      name: 'MediaUploadHook',
      version: '1.0.0',
      hooks: [
        {
          name: 'media:before-upload',
          handler: this.beforeUpload.bind(this),
          priority: this.beforeUploadPriority
        },
        {
          name: 'media:after-upload',
          handler: this.afterUpload.bind(this),
          priority: this.afterUploadPriority
        }
      ],
      config: {
        enabled: this.s3Module.isInitialized,
        provider: this.s3Module.activeProvider?.type || 'none'
      }
    };
  }
}

module.exports = MediaUploadHook;