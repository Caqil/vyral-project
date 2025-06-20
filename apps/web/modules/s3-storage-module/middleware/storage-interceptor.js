const { logInfo, logError, logWarning } = require('../utils/error-handler');
const { validateFile } = require('../utils/file-utils');
const { getMimeTypeInfo } = require('../utils/mime-helper');

/**
 * S3 Storage Module - Storage Interceptor Middleware
 * Intercepts file operations and redirects them to S3 storage
 */

class StorageInterceptor {
  constructor(s3Module) {
    this.s3Module = s3Module;
    this.config = s3Module.config;
    
    // Track intercepted operations
    this.stats = {
      intercepted: 0,
      bypassed: 0,
      errors: 0,
      lastActivity: null
    };
    
    logInfo('🛡️ Storage Interceptor initialized');
  }

  /**
   * Middleware function to intercept file operations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  intercept() {
    return async (req, res, next) => {
      try {
        // Skip if S3 is not configured
        if (!this.s3Module.isInitialized || !this.s3Module.activeProvider) {
          return next();
        }

        // Attach S3 module to request for use in routes
        req.s3Module = this.s3Module;

        // Intercept specific operations based on route
        await this.interceptRoute(req, res, next);

      } catch (error) {
        logError('❌ Storage interceptor error:', error);
        this.stats.errors++;
        next(error);
      }
    };
  }

  /**
   * Intercept specific routes
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async interceptRoute(req, res, next) {
    const path = req.path;
    const method = req.method;

    // Track activity
    this.stats.lastActivity = new Date().toISOString();

    // Intercept file upload routes
    if (this.isUploadRoute(path, method)) {
      return this.interceptUpload(req, res, next);
    }

    // Intercept file access routes
    if (this.isFileAccessRoute(path, method)) {
      return this.interceptFileAccess(req, res, next);
    }

    // Intercept file deletion routes
    if (this.isDeleteRoute(path, method)) {
      return this.interceptDelete(req, res, next);
    }

    // No interception needed
    next();
  }

  /**
   * Check if route is an upload route
   * @param {string} path - Request path
   * @param {string} method - HTTP method
   * @returns {boolean} True if upload route
   */
  isUploadRoute(path, method) {
    const uploadPaths = [
      '/api/media/upload',
      '/api/files/upload',
      '/upload',
      '/media/upload'
    ];

    return method === 'POST' && uploadPaths.some(uploadPath => 
      path.startsWith(uploadPath) || path.includes('upload')
    );
  }

  /**
   * Check if route is a file access route
   * @param {string} path - Request path
   * @param {string} method - HTTP method
   * @returns {boolean} True if file access route
   */
  isFileAccessRoute(path, method) {
    const accessPaths = [
      '/uploads/',
      '/media/',
      '/files/',
      '/static/'
    ];

    return method === 'GET' && accessPaths.some(accessPath => 
      path.startsWith(accessPath)
    );
  }

  /**
   * Check if route is a delete route
   * @param {string} path - Request path
   * @param {string} method - HTTP method
   * @returns {boolean} True if delete route
   */
  isDeleteRoute(path, method) {
    const deletePaths = [
      '/api/media/',
      '/api/files/'
    ];

    return method === 'DELETE' && deletePaths.some(deletePath => 
      path.startsWith(deletePath)
    );
  }

  /**
   * Intercept upload operations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async interceptUpload(req, res, next) {
    try {
      logInfo(`📤 Intercepting upload: ${req.path}`);
      this.stats.intercepted++;

      // Add S3-specific headers
      res.setHeader('X-Storage-Provider', this.s3Module.activeProvider.type);
      res.setHeader('X-Storage-Intercepted', 'true');

      // Pre-process upload data
      req.s3UploadOptions = await this.prepareUploadOptions(req);

      // Continue to upload handler
      next();

    } catch (error) {
      logError('❌ Upload interception failed:', error);
      this.stats.errors++;
      next(error);
    }
  }

  /**
   * Intercept file access operations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async interceptFileAccess(req, res, next) {
    try {
      logInfo(`📥 Intercepting file access: ${req.path}`);

      // Extract file path from request
      const filePath = this.extractFilePath(req.path);
      
      // Check if file exists in S3
      const s3Key = this.convertPathToS3Key(filePath);
      
      if (s3Key) {
        const exists = await this.s3Module.activeProvider.objectExists(s3Key);
        
        if (exists) {
          // Redirect to S3 URL
          return this.redirectToS3(req, res, s3Key);
        }
      }

      // File not in S3, continue with local serving
      this.stats.bypassed++;
      next();

    } catch (error) {
      logError('❌ File access interception failed:', error);
      this.stats.errors++;
      next();
    }
  }

  /**
   * Intercept delete operations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next function
   */
  async interceptDelete(req, res, next) {
    try {
      logInfo(`🗑️ Intercepting delete: ${req.path}`);
      this.stats.intercepted++;

      // Add S3 deletion context
      req.s3DeleteContext = {
        provider: this.s3Module.activeProvider.type,
        backupEnabled: this.config.backup_before_delete || false,
        timestamp: new Date().toISOString()
      };

      // Continue to delete handler
      next();

    } catch (error) {
      logError('❌ Delete interception failed:', error);
      this.stats.errors++;
      next(error);
    }
  }

  /**
   * Prepare upload options for S3
   * @param {object} req - Express request object
   * @returns {Promise<object>} Upload options
   */
  async prepareUploadOptions(req) {
    try {
      const options = {
        provider: this.s3Module.activeProvider.type,
        optimization: {
          enabled: this.config.auto_optimize_images || false,
          quality: this.config.image_quality || 85,
          maxWidth: this.config.max_image_width || 2048,
          maxHeight: this.config.max_image_height || 2048
        },
        folder: {
          structure: this.config.folder_structure || 'date-based',
          customPattern: this.config.custom_folder_pattern
        },
        security: {
          validateMimeType: true,
          checkFileSignature: true,
          quarantineSuspicious: this.config.quarantine_suspicious_files || false
        },
        backup: {
          enabled: this.config.backup_to_secondary || false,
          provider: this.config.secondary_provider
        }
      };

      // Add user context if available
      if (req.user) {
        options.user = {
          id: req.user.id,
          role: req.user.role,
          permissions: req.user.permissions
        };
      }

      return options;

    } catch (error) {
      logError('❌ Prepare upload options failed:', error);
      return {};
    }
  }

  /**
   * Extract file path from request path
   * @param {string} requestPath - Request path
   * @returns {string} Cleaned file path
   */
  extractFilePath(requestPath) {
    // Remove common prefixes
    const prefixes = ['/uploads/', '/media/', '/files/', '/static/'];
    
    for (const prefix of prefixes) {
      if (requestPath.startsWith(prefix)) {
        return requestPath.substring(prefix.length);
      }
    }
    
    return requestPath;
  }

  /**
   * Convert local file path to S3 key
   * @param {string} filePath - Local file path
   * @returns {string|null} S3 key or null
   */
  convertPathToS3Key(filePath) {
    try {
      // Remove query parameters
      const cleanPath = filePath.split('?')[0];
      
      // Normalize path separators
      const normalizedPath = cleanPath.replace(/\\/g, '/');
      
      // Remove leading slashes
      return normalizedPath.replace(/^\/+/, '');

    } catch (error) {
      logError('❌ Convert path to S3 key failed:', error);
      return null;
    }
  }

  /**
   * Redirect request to S3 URL
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {string} s3Key - S3 object key
   */
  async redirectToS3(req, res, s3Key) {
    try {
      logInfo(`🔀 Redirecting to S3: ${s3Key}`);

      // Generate S3 URL
      const s3Url = await this.s3Module.urlService.generateUrl(s3Key, {
        provider: this.s3Module.activeProvider,
        isPrivate: false
      });

      // Set appropriate headers
      res.setHeader('X-Storage-Provider', this.s3Module.activeProvider.type);
      res.setHeader('X-Storage-Redirected', 'true');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache

      // Redirect to S3 URL
      res.redirect(302, s3Url);

      this.stats.intercepted++;

    } catch (error) {
      logError('❌ S3 redirect failed:', error);
      
      // Fall back to local serving
      res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File not available in S3 storage'
      });
    }
  }

  /**
   * Add CORS headers for S3 operations
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  addCorsHeaders(req, res) {
    if (this.config.enable_cors) {
      res.setHeader('Access-Control-Allow-Origin', this.config.cors_origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }
  }

  /**
   * Handle OPTIONS requests for CORS
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  handleCorsPreFlight() {
    return (req, res, next) => {
      if (req.method === 'OPTIONS') {
        this.addCorsHeaders(req, res);
        res.status(200).end();
        return;
      }
      next();
    };
  }

  /**
   * Validate request before processing
   * @param {object} req - Express request object
   * @returns {object} Validation result
   */
  validateRequest(req) {
    const errors = [];
    const warnings = [];

    // Check content type for uploads
    if (req.method === 'POST' && req.path.includes('upload')) {
      if (!req.is('multipart/form-data')) {
        errors.push('Invalid content type for file upload');
      }
    }

    // Check file size limits
    if (req.headers['content-length']) {
      const contentLength = parseInt(req.headers['content-length']);
      const maxSize = this.config.max_file_size || 50 * 1024 * 1024;
      
      if (contentLength > maxSize) {
        errors.push(`Request size exceeds maximum allowed size of ${maxSize} bytes`);
      }
    }

    // Check rate limiting
    if (this.config.enable_rate_limiting) {
      const rateLimitResult = this.checkRateLimit(req);
      if (!rateLimitResult.allowed) {
        errors.push('Rate limit exceeded');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check rate limiting for requests
   * @param {object} req - Express request object
   * @returns {object} Rate limit result
   */
  checkRateLimit(req) {
    // Simple rate limiting implementation
    // In production, use a proper rate limiting library like express-rate-limit
    
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    if (!this.rateLimitStore) {
      this.rateLimitStore = new Map();
    }

    const requests = this.rateLimitStore.get(key) || [];
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.min(...validRequests) + windowMs
      };
    }

    validRequests.push(now);
    this.rateLimitStore.set(key, validRequests);

    return {
      allowed: true,
      remaining: maxRequests - validRequests.length,
      resetTime: now + windowMs
    };
  }

  /**
   * Get interceptor statistics
   * @returns {object} Statistics
   */
  getStats() {
    return {
      ...this.stats,
      provider: this.s3Module.activeProvider?.type || 'none',
      enabled: this.s3Module.isInitialized,
      uptime: this.getUptime()
    };
  }

  /**
   * Get interceptor uptime
   * @returns {string} Formatted uptime
   */
  getUptime() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      intercepted: 0,
      bypassed: 0,
      errors: 0,
      lastActivity: null
    };
    
    logInfo('📊 Storage interceptor stats reset');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.rateLimitStore) {
      this.rateLimitStore.clear();
    }
    
    logInfo('🧹 Storage interceptor cleanup completed');
  }
}

module.exports = StorageInterceptor;