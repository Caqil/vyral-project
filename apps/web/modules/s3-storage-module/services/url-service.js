const { logError, logInfo, logWarning } = require('../utils/error-handler');

/**
 * URL Service
 * Handles URL generation for different access patterns and providers
 */
class UrlService {
  constructor(config = {}) {
    this.config = config;
    this.urlCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    logInfo('🔗 URL Service initialized');
  }

  /**
   * Generate URL for accessing a file
   * @param {string} key - S3 object key
   * @param {object} options - URL generation options
   * @returns {Promise<string>} Generated URL
   */
  async generateUrl(key, options = {}) {
    try {
      const {
        provider,
        isPrivate = false,
        expiresIn = 3600, // 1 hour default
        variant = null,
        transform = null,
        forceRefresh = false
      } = options;

      // Create cache key
      const cacheKey = this.createCacheKey(key, options);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh && this.urlCache.has(cacheKey)) {
        const cached = this.urlCache.get(cacheKey);
        if (Date.now() < cached.expiresAt) {
          logInfo(`🔗 URL cache hit: ${key}`);
          return cached.url;
        }
        this.urlCache.delete(cacheKey);
      }

      let url;

      if (isPrivate || this.config.private_files_support) {
        // Generate signed URL for private access
        url = await this.generateSignedUrl(provider, key, { expiresIn, ...options });
      } else {
        // Generate public URL
        url = this.generatePublicUrl(provider, key, options);
      }

      // Apply transformations if supported
      if (transform && this.supportsTransformations(provider)) {
        url = this.applyTransformations(url, transform);
      }

      // Cache the URL
      this.cacheUrl(cacheKey, url, expiresIn);

      logInfo(`🔗 Generated URL for ${key}: ${url.substring(0, 50)}...`);
      return url;

    } catch (error) {
      logError('❌ URL generation failed:', error);
      throw new Error(`URL generation failed: ${error.message}`);
    }
  }

  /**
   * Generate public URL
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {object} options - URL options
   * @returns {string} Public URL
   */
  generatePublicUrl(provider, key, options = {}) {
    try {
      // Use provider's public URL generation
      let url = provider.generatePublicUrl(key);

      // Apply variant suffix if requested
      if (options.variant) {
        url = this.applyVariant(url, options.variant);
      }

      // Add query parameters if specified
      if (options.queryParams) {
        url = this.addQueryParams(url, options.queryParams);
      }

      return url;

    } catch (error) {
      logError('❌ Public URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate signed URL for private access
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {object} options - Signed URL options
   * @returns {Promise<string>} Signed URL
   */
  async generateSignedUrl(provider, key, options = {}) {
    try {
      const {
        expiresIn = 3600,
        operation = 'getObject',
        contentType = null,
        responseHeaders = null
      } = options;

      // Use provider's signed URL generation
      const signedUrl = await provider.generateSignedUrl(key, {
        expiresIn,
        operation,
        contentType,
        responseHeaders
      });

      return signedUrl;

    } catch (error) {
      logError('❌ Signed URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate CDN URL if provider supports it
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {object} options - CDN options
   * @returns {string} CDN URL
   */
  generateCdnUrl(provider, key, options = {}) {
    try {
      // Check if provider has CDN URL generation
      if (typeof provider.generateCdnUrl === 'function') {
        return provider.generateCdnUrl(key, options);
      }

      // Use custom CDN domain if configured
      if (this.config.cdn_domain) {
        const cdnBase = this.config.cdn_domain.replace(/\/$/, '');
        return `${cdnBase}/${key}`;
      }

      // Fallback to public URL
      return provider.generatePublicUrl(key);

    } catch (error) {
      logError('❌ CDN URL generation failed:', error);
      return provider.generatePublicUrl(key);
    }
  }

  /**
   * Generate responsive image URLs
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {object} options - Responsive options
   * @returns {object} Responsive URL set
   */
  generateResponsiveUrls(provider, key, options = {}) {
    try {
      const {
        sizes = [300, 600, 900, 1200],
        formats = ['webp', 'jpg'],
        quality = 85
      } = options;

      const urls = {
        original: this.generatePublicUrl(provider, key),
        responsive: {}
      };

      // Generate URLs for different sizes and formats
      for (const size of sizes) {
        urls.responsive[size] = {};
        
        for (const format of formats) {
          const transform = {
            width: size,
            format,
            quality
          };
          
          let url = this.generatePublicUrl(provider, key);
          
          if (this.supportsTransformations(provider)) {
            url = this.applyTransformations(url, transform);
          }
          
          urls.responsive[size][format] = url;
        }
      }

      return urls;

    } catch (error) {
      logError('❌ Responsive URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Apply image transformations to URL
   * @param {string} url - Base URL
   * @param {object} transform - Transformation parameters
   * @returns {string} Transformed URL
   */
  applyTransformations(url, transform) {
    try {
      const {
        width,
        height,
        quality,
        format,
        crop,
        gravity,
        blur,
        sharpen
      } = transform;

      // Different providers handle transformations differently
      const provider = this.getProviderFromUrl(url);
      
      switch (provider) {
        case 'cloudflare-r2':
          return this.applyCloudflareTransforms(url, transform);
        
        case 'aws-s3':
          // AWS S3 doesn't have built-in transformations
          // Would need Lambda@Edge or CloudFront functions
          return url;
        
        default:
          // Generic query parameter approach
          return this.applyGenericTransforms(url, transform);
      }

    } catch (error) {
      logError('❌ Transformation application failed:', error);
      return url;
    }
  }

  /**
   * Apply Cloudflare-specific image transformations
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
    
    return `${url}?${params.toString()}`;
  }

  /**
   * Apply generic transformations using query parameters
   * @param {string} url - Base URL
   * @param {object} transform - Transformation parameters
   * @returns {string} Transformed URL
   */
  applyGenericTransforms(url, transform) {
    const params = new URLSearchParams();
    
    Object.entries(transform).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Apply variant to URL (e.g., thumbnail, medium, large)
   * @param {string} url - Base URL
   * @param {string} variant - Variant name
   * @returns {string} URL with variant
   */
  applyVariant(url, variant) {
    try {
      // Extract file extension and base
      const lastDotIndex = url.lastIndexOf('.');
      if (lastDotIndex === -1) {
        return `${url}-${variant}`;
      }
      
      const base = url.substring(0, lastDotIndex);
      const extension = url.substring(lastDotIndex);
      
      return `${base}-${variant}${extension}`;

    } catch (error) {
      logError('❌ Variant application failed:', error);
      return url;
    }
  }

  /**
   * Add query parameters to URL
   * @param {string} url - Base URL
   * @param {object} params - Query parameters
   * @returns {string} URL with query parameters
   */
  addQueryParams(url, params) {
    try {
      const urlObj = new URL(url);
      
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.append(key, value);
      });
      
      return urlObj.toString();

    } catch (error) {
      logError('❌ Query parameter addition failed:', error);
      return url;
    }
  }

  /**
   * Check if provider supports image transformations
   * @param {object} provider - S3 provider instance
   * @returns {boolean} True if transformations are supported
   */
  supportsTransformations(provider) {
    if (!provider) return false;
    
    // Cloudflare R2 with Workers supports transformations
    if (provider.type === 'cloudflare-r2' && this.config.worker_domain) {
      return true;
    }
    
    // Other providers might support transformations via CDN
    return false;
  }

  /**
   * Get provider type from URL
   * @param {string} url - URL to analyze
   * @returns {string} Provider type
   */
  getProviderFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      if (hostname.includes('amazonaws.com')) return 'aws-s3';
      if (hostname.includes('r2.dev') || hostname.includes('cloudflarestorage.com')) return 'cloudflare-r2';
      if (hostname.includes('digitaloceanspaces.com') || hostname.includes('cdn.digitaloceanspaces.com')) return 'digitalocean-spaces';
      if (hostname.includes('vultrobjects.com')) return 'vultr-storage';
      if (hostname.includes('linodeobjects.com')) return 'linode-storage';
      
      return 'unknown';

    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Create cache key for URL
   * @param {string} key - Object key
   * @param {object} options - URL options
   * @returns {string} Cache key
   */
  createCacheKey(key, options) {
    const cacheOptions = {
      key,
      isPrivate: options.isPrivate,
      variant: options.variant,
      transform: options.transform
    };
    
    return JSON.stringify(cacheOptions);
  }

  /**
   * Cache a URL
   * @param {string} cacheKey - Cache key
   * @param {string} url - URL to cache
   * @param {number} expiresIn - Expiration time in seconds
   */
  cacheUrl(cacheKey, url, expiresIn) {
    const expiresAt = Date.now() + (expiresIn * 1000);
    this.urlCache.set(cacheKey, { url, expiresAt });
    
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
   * Generate download URL with forced download
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {string} filename - Download filename
   * @param {object} options - Additional options
   * @returns {Promise<string>} Download URL
   */
  async generateDownloadUrl(provider, key, filename, options = {}) {
    try {
      const {
        expiresIn = 3600,
        contentType = 'application/octet-stream'
      } = options;

      // For private files or forced downloads, use signed URL
      const responseHeaders = {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': contentType
      };

      const downloadUrl = await provider.generateSignedUrl(key, {
        expiresIn,
        operation: 'getObject',
        responseHeaders
      });

      logInfo(`📥 Generated download URL for: ${filename}`);
      return downloadUrl;

    } catch (error) {
      logError('❌ Download URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate upload URL for direct uploads
   * @param {object} provider - S3 provider instance
   * @param {string} key - Object key
   * @param {object} options - Upload options
   * @returns {Promise<object>} Upload URL and form data
   */
  async generateUploadUrl(provider, key, options = {}) {
    try {
      const {
        expiresIn = 3600,
        contentType = 'application/octet-stream',
        maxFileSize = 10 * 1024 * 1024, // 10MB
        acl = 'public-read'
      } = options;

      // Check if provider supports presigned upload URLs
      if (typeof provider.generatePresignedUploadUrl === 'function') {
        const uploadUrl = await provider.generatePresignedUploadUrl(key, {
          expiresIn,
          contentType,
          maxFileSize
        });

        return {
          url: uploadUrl,
          key,
          method: 'PUT',
          headers: {
            'Content-Type': contentType
          }
        };
      }

      // Fallback to standard signed URL
      const uploadUrl = await provider.generateSignedUrl(key, {
        expiresIn,
        operation: 'putObject',
        contentType
      });

      return {
        url: uploadUrl,
        key,
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        }
      };

    } catch (error) {
      logError('❌ Upload URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Batch generate URLs for multiple files
   * @param {object} provider - S3 provider instance
   * @param {Array} keys - Array of object keys
   * @param {object} options - URL options
   * @returns {Promise<Array>} Array of generated URLs
   */
  async batchGenerateUrls(provider, keys, options = {}) {
    try {
      logInfo(`🔗 Batch generating URLs for ${keys.length} files`);
      
      const urlPromises = keys.map(key => 
        this.generateUrl(key, { provider, ...options })
      );

      const urls = await Promise.all(urlPromises);
      
      logInfo(`✅ Generated ${urls.length} URLs`);
      return urls;

    } catch (error) {
      logError('❌ Batch URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Clear URL cache
   * @param {string} pattern - Optional pattern to match (regex)
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.urlCache.keys()) {
        if (regex.test(key)) {
          this.urlCache.delete(key);
        }
      }
      logInfo(`🗑️ Cleared cache entries matching pattern: ${pattern}`);
    } else {
      this.urlCache.clear();
      logInfo('🗑️ Cleared all URL cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const value of this.urlCache.values()) {
      if (now > value.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.urlCache.size,
      active,
      expired,
      hitRate: this.hitRate || 0
    };
  }

  /**
   * Update configuration
   * @param {object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Clear cache if significant config changes
    if (newConfig.cdn_domain || newConfig.public_url) {
      this.clearCache();
    }
    
    logInfo('⚙️ URL Service configuration updated');
  }

  /**
   * Get service status
   * @returns {object} Service status
   */
  getStatus() {
    return {
      cacheSize: this.urlCache.size,
      cacheStats: this.getCacheStats(),
      config: {
        cdnDomain: this.config.cdn_domain,
        publicUrl: this.config.public_url,
        privateSupport: this.config.private_files_support
      }
    };
  }
}

module.exports = UrlService;