const { logInfo, logError, logWarning } = require('../utils/error-handler');

/**
 * S3 Storage Module - URL Generation Hook
 * Handles URL generation hooks for S3 storage integration
 */

class UrlGenerationHook {
  constructor(s3Module) {
    this.s3Module = s3Module;
    this.config = s3Module.config;
    
    // Hook priority (lower numbers execute first)
    this.priority = 10;
    
    // URL cache for performance
    this.urlCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    logInfo('🪝 URL Generation Hook initialized');
  }

  /**
   * Hook: Generate URL for media files
   * Intercepts URL generation and provides S3 URLs when appropriate
   * @param {object} urlData - URL generation data
   * @returns {Promise<object>} Modified URL data
   */
  async generateUrl(urlData) {
    try {
      logInfo(`🔗 Generating URL for: ${urlData.filename || urlData.key || 'unknown'}`);
      
      // Skip if S3 is not configured
      if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
        logInfo('📁 S3 not configured, using original URL');
        return urlData;
      }

      // Validate URL data
      if (!urlData.s3Key && !urlData.filename && !urlData.path) {
        logWarning('⚠️ Insufficient data for S3 URL generation');
        return urlData;
      }

      // Determine S3 key
      const s3Key = this.extractS3Key(urlData);
      if (!s3Key) {
        logInfo('📁 No S3 key available, using original URL');
        return urlData;
      }

      // Check cache first
      const cacheKey = this.createCacheKey(s3Key, urlData);
      const cachedUrl = this.getCachedUrl(cacheKey);
      if (cachedUrl && !urlData.forceRefresh) {
        urlData.url = cachedUrl;
        logInfo(`🔗 URL cache hit: ${s3Key}`);
        return urlData;
      }

      // Generate S3 URL based on requirements
      const s3Url = await this.generateS3Url(s3Key, urlData);
      
      // Cache the generated URL
      this.cacheUrl(cacheKey, s3Url, urlData.cacheTime);

      // Update URL data
      urlData.url = s3Url;
      urlData.s3Key = s3Key;
      urlData.provider = this.s3Module.activeProvider.type;
      urlData.generated = true;
      urlData.timestamp = new Date().toISOString();

      // Generate additional URLs if requested
      if (urlData.includeVariants) {
        urlData.variants = await this.generateVariantUrls(s3Key, urlData);
      }

      logInfo(`✅ S3 URL generated: ${s3Url.substring(0, 50)}...`);
      return urlData;

    } catch (error) {
      logError('❌ URL generation hook failed:', error);
      
      // Add error details but return original data
      urlData.s3Error = {
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      return urlData;
    }
  }

  /**
   * Extract S3 key from URL data
   * @param {object} urlData - URL generation data
   * @returns {string|null} S3 key
   */
  extractS3Key(urlData) {
    // Direct S3 key
    if (urlData.s3Key) {
      return urlData.s3Key;
    }

    // Extract from file path
    if (urlData.path) {
      // Remove leading slash and convert to S3 key format
      return urlData.path.replace(/^\/+/, '');
    }

    // Generate from filename if available
    if (urlData.filename && urlData.uploadDate) {
      return this.s3Module.fileManager.generateS3Path({
        originalName: urlData.filename,
        uploadedBy: urlData.uploadedBy
      });
    }

    // Try to extract from existing URL
    if (urlData.url) {
      return this.extractS3KeyFromUrl(urlData.url);
    }

    return null;
  }

  /**
   * Extract S3 key from existing URL
   * @param {string} url - Existing URL
   * @returns {string|null} S3 key
   */
  extractS3KeyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Remove leading slash and bucket name if present
      let key = pathname.replace(/^\/+/, '');
      
      // Remove bucket name if it appears at the start
      const bucketName = this.s3Module.activeProvider?.config?.bucket_name;
      if (bucketName && key.startsWith(bucketName + '/')) {
        key = key.substring(bucketName.length + 1);
      }
      
      return key || null;

    } catch (error) {
      logWarning('⚠️ Failed to extract S3 key from URL:', error);
      return null;
    }
  }

  /**
   * Generate S3 URL based on requirements
   * @param {string} s3Key - S3 object key
   * @param {object} urlData - URL generation data
   * @returns {Promise<string>} Generated URL
   */
  async generateS3Url(s3Key, urlData) {
    const {
      isPrivate = false,
      expiresIn = null,
      operation = 'getObject',
      responseHeaders = null,
      transform = null
    } = urlData;

    // Generate URL using URL service
    const url = await this.s3Module.urlService.generateUrl(s3Key, {
      provider: this.s3Module.activeProvider,
      isPrivate,
      expiresIn: expiresIn || (isPrivate ? this.config.signed_url_expiry * 60 : null),
      operation,
      responseHeaders,
      transform,
      skipStats: true // Don't count URL generation hook as download
    });

    // Apply transformations if supported
    if (transform && this.supportsTransformations()) {
      return this.applyTransformations(url, transform);
    }

    return url;
  }

  /**
   * Generate variant URLs (thumbnails, different sizes)
   * @param {string} s3Key - S3 object key
   * @param {object} urlData - URL generation data
   * @returns {Promise<object>} Variant URLs
   */
  async generateVariantUrls(s3Key, urlData) {
    try {
      const variants = {};
      
      // Only generate variants for images
      if (!this.isImageFile(s3Key)) {
        return variants;
      }

      // Standard variant sizes
      const variantSizes = [
        { name: 'thumbnail', width: 150, height: 150 },
        { name: 'small', width: 300, height: 300 },
        { name: 'medium', width: 600, height: 400 },
        { name: 'large', width: 1200, height: 800 }
      ];

      for (const variant of variantSizes) {
        try {
          const variantKey = this.generateVariantKey(s3Key, variant.name);
          
          // Check if variant exists
          const exists = await this.s3Module.activeProvider.objectExists(variantKey);
          if (exists) {
            variants[variant.name] = await this.generateS3Url(variantKey, urlData);
          } else if (this.supportsTransformations()) {
            // Generate on-the-fly transformation URL
            variants[variant.name] = await this.generateS3Url(s3Key, {
              ...urlData,
              transform: {
                width: variant.width,
                height: variant.height,
                crop: 'cover'
              }
            });
          }
        } catch (error) {
          logWarning(`⚠️ Failed to generate ${variant.name} variant URL:`, error);
        }
      }

      return variants;

    } catch (error) {
      logError('❌ Generate variant URLs failed:', error);
      return {};
    }
  }

  /**
   * Generate variant key for file
   * @param {string} originalKey - Original S3 key
   * @param {string} variantName - Variant name
   * @returns {string} Variant key
   */
  generateVariantKey(originalKey, variantName) {
    const lastDotIndex = originalKey.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return `${originalKey}-${variantName}`;
    }
    
    const base = originalKey.substring(0, lastDotIndex);
    const extension = originalKey.substring(lastDotIndex);
    
    return `${base}-${variantName}${extension}`;
  }

  /**
   * Check if provider supports image transformations
   * @returns {boolean} True if transformations are supported
   */
  supportsTransformations() {
    // Cloudflare R2 with Workers supports transformations
    if (this.s3Module.activeProvider?.type === 'cloudflare-r2' && this.config.worker_domain) {
      return true;
    }
    
    return false;
  }

  /**
   * Apply transformations to URL
   * @param {string} url - Base URL
   * @param {object} transform - Transformation parameters
   * @returns {string} Transformed URL
   */
  applyTransformations(url, transform) {
    try {
      const provider = this.s3Module.activeProvider?.type;
      
      switch (provider) {
        case 'cloudflare-r2':
          return this.applyCloudflareTransforms(url, transform);
        
        default:
          // No transformations supported, return original URL
          return url;
      }

    } catch (error) {
      logWarning('⚠️ Apply transformations failed:', error);
      return url;
    }
  }

  /**
   * Apply Cloudflare-specific transformations
   * @param {string} url - Base URL
   * @param {object} transform - Transformation parameters
   * @returns {string} Transformed URL
   */
  applyCloudflareTransforms(url, transform) {
    const params = new URLSearchParams();
    
    if (transform.width) params.append('w', transform.width);
    if (transform.height) params.append('h', transform.height);
    if (transform.quality) params.append('q', transform.quality);
    if (transform.format) params.append('f', transform.format);
    if (transform.crop) params.append('fit', transform.crop);
    if (transform.gravity) params.append('gravity', transform.gravity);
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Check if file is an image
   * @param {string} key - File key
   * @returns {boolean} True if image
   */
  isImageFile(key) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const extension = key.split('.').pop()?.toLowerCase();
    return imageExtensions.includes(extension);
  }

  /**
   * Create cache key for URL
   * @param {string} s3Key - S3 object key
   * @param {object} urlData - URL generation data
   * @returns {string} Cache key
   */
  createCacheKey(s3Key, urlData) {
    const cacheData = {
      key: s3Key,
      isPrivate: urlData.isPrivate || false,
      expiresIn: urlData.expiresIn,
      transform: urlData.transform,
      operation: urlData.operation
    };
    
    return JSON.stringify(cacheData);
  }

  /**
   * Get cached URL
   * @param {string} cacheKey - Cache key
   * @returns {string|null} Cached URL or null
   */
  getCachedUrl(cacheKey) {
    const cached = this.urlCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.urlCache.delete(cacheKey);
      return null;
    }

    return cached.url;
  }

  /**
   * Cache URL
   * @param {string} cacheKey - Cache key
   * @param {string} url - URL to cache
   * @param {number} customTtl - Custom TTL in seconds
   */
  cacheUrl(cacheKey, url, customTtl = null) {
    const ttl = customTtl ? customTtl * 1000 : this.cacheTimeout;
    const expiresAt = Date.now() + ttl;
    
    this.urlCache.set(cacheKey, {
      url,
      expiresAt,
      createdAt: Date.now()
    });
    
    // Clean up expired entries periodically
    this.cleanupExpiredCache();
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    
    for (const [key, value] of this.urlCache.entries()) {
      if (now > value.expiresAt) {
        this.urlCache.delete(key);
      }
    }
  }

  /**
   * Generate download URL with proper headers
   * @param {string} s3Key - S3 object key
   * @param {string} filename - Download filename
   * @param {object} options - Additional options
   * @returns {Promise<string>} Download URL
   */
  async generateDownloadUrl(s3Key, filename, options = {}) {
    try {
      const {
        expiresIn = 3600,
        contentType = 'application/octet-stream'
      } = options;

      return await this.s3Module.urlService.generateDownloadUrl(
        this.s3Module.activeProvider,
        s3Key,
        filename,
        { expiresIn, contentType }
      );

    } catch (error) {
      logError('❌ Generate download URL failed:', error);
      throw error;
    }
  }

  /**
   * Generate responsive image URLs
   * @param {string} s3Key - S3 object key
   * @param {object} options - Responsive options
   * @returns {Promise<object>} Responsive URL set
   */
  async generateResponsiveUrls(s3Key, options = {}) {
    try {
      if (!this.isImageFile(s3Key)) {
        throw new Error('Responsive URLs only available for images');
      }

      return await this.s3Module.urlService.generateResponsiveUrls(
        this.s3Module.activeProvider,
        s3Key,
        options
      );

    } catch (error) {
      logError('❌ Generate responsive URLs failed:', error);
      throw error;
    }
  }

  /**
   * Handle URL generation error
   * @param {Error} error - URL generation error
   * @param {object} urlData - URL data
   * @returns {object} Error response
   */
  handleUrlError(error, urlData) {
    logError('❌ URL generation error handled:', error);
    
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'URL_GENERATION_ERROR',
        key: urlData.s3Key,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Get URL statistics
   * @returns {object} URL generation statistics
   */
  getUrlStatistics() {
    return {
      cacheSize: this.urlCache.size,
      cacheHits: this.cacheHits || 0,
      cacheMisses: this.cacheMisses || 0,
      urlsGenerated: this.urlsGenerated || 0,
      errors: this.urlErrors || 0
    };
  }

  /**
   * Clear URL cache
   * @param {string} pattern - Optional pattern to match
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.urlCache.keys()) {
        if (regex.test(key)) {
          this.urlCache.delete(key);
        }
      }
    } else {
      this.urlCache.clear();
    }
    
    logInfo(`🗑️ URL cache cleared${pattern ? ` (pattern: ${pattern})` : ''}`);
  }

  /**
   * Get hook configuration
   * @returns {object} Hook configuration
   */
  getHookConfig() {
    return {
      name: 'UrlGenerationHook',
      version: '1.0.0',
      hooks: [
        {
          name: 'url:generate',
          handler: this.generateUrl.bind(this),
          priority: this.priority
        }
      ],
      config: {
        enabled: this.s3Module.isInitialized,
        provider: this.s3Module.activeProvider?.type || 'none',
        cacheEnabled: true,
        transformationsSupported: this.supportsTransformations()
      }
    };
  }
}

module.exports = UrlGenerationHook;