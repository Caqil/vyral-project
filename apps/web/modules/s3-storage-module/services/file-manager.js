const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const mimeTypes = require('mime-types');
const { logError, logInfo, logWarning } = require('../utils/error-handler');

/**
 * File Manager Service
 * Handles file processing, optimization, and path generation
 */
class FileManager {
  constructor(config = {}) {
    this.config = config;
    this.imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'];
    this.videoFormats = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
    this.audioFormats = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'];
    this.documentFormats = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
    this.archiveFormats = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];
    
    logInfo('📁 File Manager initialized');
  }

  /**
   * Generate S3 path for a file
   * @param {object} file - File object
   * @returns {string} S3 path
   */
  generateS3Path(file) {
    try {
      const originalName = file.originalName || file.name || 'unknown';
      const extension = path.extname(originalName).toLowerCase();
      const baseName = path.basename(originalName, extension);
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      const safeBaseName = this.sanitizeFilename(baseName);
      const filename = `${safeBaseName}-${timestamp}-${randomString}${extension}`;
      
      // Generate folder structure based on configuration
      const folderPath = this.generateFolderPath(file);
      
      return folderPath ? `${folderPath}/${filename}` : filename;
      
    } catch (error) {
      logError('❌ S3 path generation failed:', error);
      // Fallback to timestamp-based name
      const timestamp = Date.now();
      const randomString = crypto.randomBytes(4).toString('hex');
      return `files/${timestamp}-${randomString}.bin`;
    }
  }

  /**
   * Generate S3 path from local file path
   * @param {string} localPath - Local file path
   * @returns {string} S3 path
   */
  generateS3PathFromLocal(localPath) {
    try {
      const filename = path.basename(localPath);
      const extension = path.extname(filename).toLowerCase();
      const baseName = path.basename(filename, extension);
      
      // Extract date from file path or use current date
      const folderPath = this.generateFolderPath({
        type: this.getFileTypeFromExtension(extension.slice(1))
      });
      
      // Keep original filename but ensure it's safe
      const safeFilename = this.sanitizeFilename(filename);
      
      return folderPath ? `${folderPath}/${safeFilename}` : safeFilename;
      
    } catch (error) {
      logError('❌ S3 path generation from local failed:', error);
      return `migrated/${path.basename(localPath)}`;
    }
  }

  /**
   * Generate folder path based on configuration
   * @param {object} file - File object
   * @returns {string} Folder path
   */
  generateFolderPath(file = {}) {
    const folderStructure = this.config.folder_structure || 'date-based';
    const now = new Date();
    
    switch (folderStructure) {
      case 'flat':
        return '';
      
      case 'date-based':
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}/${month}`;
      
      case 'type-based':
        const fileType = this.getFileType(file);
        return fileType;
      
      case 'user-based':
        const userId = file.uploadedBy || 'anonymous';
        return `users/${userId}`;
      
      case 'custom':
        return this.parseCustomPattern(this.config.custom_folder_pattern || '{year}/{month}/', file);
      
      default:
        return 'files';
    }
  }

  /**
   * Parse custom folder pattern
   * @param {string} pattern - Folder pattern
   * @param {object} file - File object
   * @returns {string} Parsed folder path
   */
  parseCustomPattern(pattern, file = {}) {
    const now = new Date();
    const replacements = {
      '{year}': now.getFullYear(),
      '{month}': String(now.getMonth() + 1).padStart(2, '0'),
      '{day}': String(now.getDate()).padStart(2, '0'),
      '{type}': this.getFileType(file),
      '{userId}': file.uploadedBy || 'anonymous',
      '{timestamp}': now.getTime()
    };
    
    let result = pattern;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    
    return result.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Sanitize filename for safe storage
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Get file type from file object
   * @param {object} file - File object
   * @returns {string} File type
   */
  getFileType(file) {
    if (file.mimeType) {
      if (file.mimeType.startsWith('image/')) return 'images';
      if (file.mimeType.startsWith('video/')) return 'videos';
      if (file.mimeType.startsWith('audio/')) return 'audio';
    }
    
    const extension = this.getFileExtension(file.originalName || file.name || '').toLowerCase();
    return this.getFileTypeFromExtension(extension);
  }

  /**
   * Get file type from extension
   * @param {string} extension - File extension
   * @returns {string} File type
   */
  getFileTypeFromExtension(extension) {
    if (this.imageFormats.includes(extension)) return 'images';
    if (this.videoFormats.includes(extension)) return 'videos';
    if (this.audioFormats.includes(extension)) return 'audio';
    if (this.documentFormats.includes(extension)) return 'documents';
    if (this.archiveFormats.includes(extension)) return 'archives';
    return 'files';
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension without dot
   */
  getFileExtension(filename) {
    return path.extname(filename).slice(1).toLowerCase();
  }

  /**
   * Check if file is an image
   * @param {object} file - File object
   * @returns {boolean} True if file is an image
   */
  isImage(file) {
    if (file.mimeType && file.mimeType.startsWith('image/')) {
      return true;
    }
    
    const extension = this.getFileExtension(file.originalName || file.name || '');
    return this.imageFormats.includes(extension);
  }

  /**
   * Check if file is a video
   * @param {object} file - File object
   * @returns {boolean} True if file is a video
   */
  isVideo(file) {
    if (file.mimeType && file.mimeType.startsWith('video/')) {
      return true;
    }
    
    const extension = this.getFileExtension(file.originalName || file.name || '');
    return this.videoFormats.includes(extension);
  }

  /**
   * Optimize image file
   * @param {Buffer} imageData - Image data buffer
   * @param {object} options - Optimization options
   * @returns {Promise<Buffer>} Optimized image data
   */
  async optimizeImage(imageData, options = {}) {
    try {
      const {
        quality = 85,
        maxWidth = 2048,
        maxHeight = 2048,
        format = null,
        progressive = true
      } = options;

      logInfo(`🎨 Optimizing image with quality: ${quality}, max dimensions: ${maxWidth}x${maxHeight}`);

      let pipeline = sharp(imageData);
      
      // Get image metadata
      const metadata = await pipeline.metadata();
      logInfo(`📐 Original image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

      // Resize if necessary
      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true
        });
        logInfo(`📏 Resizing image to fit within ${maxWidth}x${maxHeight}`);
      }

      // Apply format-specific optimizations
      const targetFormat = format || metadata.format;
      switch (targetFormat) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality,
            progressive,
            mozjpeg: true
          });
          break;
        
        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive,
            compressionLevel: 8,
            adaptiveFiltering: true
          });
          break;
        
        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6
          });
          break;
        
        case 'avif':
          pipeline = pipeline.avif({
            quality,
            effort: 4
          });
          break;
        
        default:
          // Keep original format
          break;
      }

      const optimizedData = await pipeline.toBuffer();
      
      const originalSize = imageData.length;
      const optimizedSize = optimizedData.length;
      const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
      
      logInfo(`✨ Image optimized: ${this.formatBytes(originalSize)} → ${this.formatBytes(optimizedSize)} (${savings}% savings)`);
      
      return optimizedData;

    } catch (error) {
      logError('❌ Image optimization failed:', error);
      logWarning('⚠️ Returning original image data');
      return imageData;
    }
  }

  /**
   * Get cache control header for file type
   * @param {string} key - File key/path
   * @returns {string} Cache control header
   */
  getCacheControl(key) {
    const extension = this.getFileExtension(key);
    
    // Image files - long cache
    if (this.imageFormats.includes(extension)) {
      return 'public, max-age=31536000, immutable'; // 1 year
    }
    
    // CSS/JS files - medium cache
    if (['css', 'js'].includes(extension)) {
      return 'public, max-age=2592000'; // 30 days
    }
    
    // Font files - long cache
    if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(extension)) {
      return 'public, max-age=31536000'; // 1 year
    }
    
    // Video files - long cache
    if (this.videoFormats.includes(extension)) {
      return 'public, max-age=604800'; // 1 week
    }
    
    // Audio files - medium cache
    if (this.audioFormats.includes(extension)) {
      return 'public, max-age=259200'; // 3 days
    }
    
    // Document files - short cache
    if (this.documentFormats.includes(extension)) {
      return 'public, max-age=86400'; // 1 day
    }
    
    // Default cache
    return 'public, max-age=3600'; // 1 hour
  }

  /**
   * Generate thumbnail for image
   * @param {Buffer} imageData - Original image data
   * @param {object} options - Thumbnail options
   * @returns {Promise<Buffer>} Thumbnail data
   */
  async generateThumbnail(imageData, options = {}) {
    try {
      const {
        width = 150,
        height = 150,
        quality = 80,
        format = 'jpeg'
      } = options;

      logInfo(`🖼️ Generating thumbnail: ${width}x${height}`);

      const thumbnailData = await sharp(imageData)
        .resize(width, height, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality })
        .toBuffer();

      logInfo(`✅ Thumbnail generated: ${this.formatBytes(thumbnailData.length)}`);
      return thumbnailData;

    } catch (error) {
      logError('❌ Thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   * @param {object} file - File object
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  validateFile(file, options = {}) {
    const errors = [];
    const warnings = [];
    
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedExtensions = null,
      allowedMimeTypes = null,
      maxDimensions = null
    } = options;

    // Check file size
    const fileSize = file.size || (file.buffer && file.buffer.length) || 0;
    if (fileSize > maxSize) {
      errors.push(`File size ${this.formatBytes(fileSize)} exceeds maximum ${this.formatBytes(maxSize)}`);
    }

    // Check file extension
    const extension = this.getFileExtension(file.originalName || file.name || '');
    if (allowedExtensions && !allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed`);
    }

    // Check MIME type
    if (allowedMimeTypes && file.mimeType && !allowedMimeTypes.includes(file.mimeType)) {
      errors.push(`File type '${file.mimeType}' is not allowed`);
    }

    // Validate MIME type against extension
    if (file.mimeType && extension) {
      const expectedMimeType = mimeTypes.lookup(extension);
      if (expectedMimeType && file.mimeType !== expectedMimeType) {
        warnings.push(`MIME type '${file.mimeType}' doesn't match extension '${extension}'`);
      }
    }

    // Check for suspicious file patterns
    if (this.isExecutableFile(extension)) {
      errors.push(`Executable files are not allowed: ${extension}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if file extension is executable
   * @param {string} extension - File extension
   * @returns {boolean} True if executable
   */
  isExecutableFile(extension) {
    const executableExtensions = [
      'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
      'app', 'deb', 'pkg', 'rpm', 'dmg', 'sh', 'run'
    ];
    return executableExtensions.includes(extension.toLowerCase());
  }

  /**
   * Get file information
   * @param {object} file - File object
   * @returns {object} File information
   */
  getFileInfo(file) {
    const extension = this.getFileExtension(file.originalName || file.name || '');
    const fileType = this.getFileTypeFromExtension(extension);
    const mimeType = file.mimeType || mimeTypes.lookup(extension) || 'application/octet-stream';
    
    return {
      originalName: file.originalName || file.name,
      extension,
      fileType,
      mimeType,
      size: file.size || (file.buffer && file.buffer.length) || 0,
      isImage: this.isImage(file),
      isVideo: this.isVideo(file),
      cacheControl: this.getCacheControl(file.originalName || file.name || '')
    };
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update configuration
   * @param {object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logInfo('⚙️ File Manager configuration updated');
  }

  /**
   * Get supported file formats
   * @returns {object} Supported formats by type
   */
  getSupportedFormats() {
    return {
      images: this.imageFormats,
      videos: this.videoFormats,
      audio: this.audioFormats,
      documents: this.documentFormats,
      archives: this.archiveFormats
    };
  }

  /**
   * Create multiple image variants
   * @param {Buffer} imageData - Original image data
   * @param {Array} variants - Array of variant configurations
   * @returns {Promise<object>} Map of variant buffers
   */
  async createImageVariants(imageData, variants = []) {
    try {
      const results = {};
      
      for (const variant of variants) {
        const {
          name,
          width,
          height,
          quality = 85,
          format = 'jpeg'
        } = variant;
        
        logInfo(`🖼️ Creating variant: ${name} (${width}x${height})`);
        
        let pipeline = sharp(imageData);
        
        if (width || height) {
          pipeline = pipeline.resize(width, height, {
            fit: 'cover',
            position: 'center'
          });
        }
        
        switch (format) {
          case 'jpeg':
          case 'jpg':
            pipeline = pipeline.jpeg({ quality });
            break;
          case 'png':
            pipeline = pipeline.png({ quality });
            break;
          case 'webp':
            pipeline = pipeline.webp({ quality });
            break;
        }
        
        results[name] = await pipeline.toBuffer();
      }
      
      logInfo(`✅ Created ${Object.keys(results).length} image variants`);
      return results;
      
    } catch (error) {
      logError('❌ Image variant creation failed:', error);
      throw error;
    }
  }
}

module.exports = FileManager;