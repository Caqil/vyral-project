const mimeTypes = require('mime-types');
const { logError, logWarning } = require('./error-handler');

/**
 * MIME type helper utilities for S3 Storage Module
 */

// Common MIME types mapping
const COMMON_MIME_TYPES = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  'svg': 'image/svg+xml',
  'bmp': 'image/bmp',
  'ico': 'image/x-icon',
  'tiff': 'image/tiff',
  'avif': 'image/avif',
  'heic': 'image/heic',
  'heif': 'image/heif',
  
  // Videos
  'mp4': 'video/mp4',
  'avi': 'video/x-msvideo',
  'mov': 'video/quicktime',
  'wmv': 'video/x-ms-wmv',
  'flv': 'video/x-flv',
  'webm': 'video/webm',
  'mkv': 'video/x-matroska',
  'm4v': 'video/x-m4v',
  '3gp': 'video/3gpp',
  'ogv': 'video/ogg',
  
  // Audio
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav',
  'ogg': 'audio/ogg',
  'aac': 'audio/aac',
  'flac': 'audio/flac',
  'm4a': 'audio/x-m4a',
  'wma': 'audio/x-ms-wma',
  'opus': 'audio/opus',
  
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'txt': 'text/plain',
  'rtf': 'application/rtf',
  'odt': 'application/vnd.oasis.opendocument.text',
  'ods': 'application/vnd.oasis.opendocument.spreadsheet',
  'odp': 'application/vnd.oasis.opendocument.presentation',
  
  // Archives
  'zip': 'application/zip',
  'rar': 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  'tar': 'application/x-tar',
  'gz': 'application/gzip',
  'bz2': 'application/x-bzip2',
  'xz': 'application/x-xz',
  
  // Code
  'js': 'application/javascript',
  'css': 'text/css',
  'html': 'text/html',
  'htm': 'text/html',
  'json': 'application/json',
  'xml': 'application/xml',
  'yml': 'application/x-yaml',
  'yaml': 'application/x-yaml',
  
  // Fonts
  'woff': 'font/woff',
  'woff2': 'font/woff2',
  'ttf': 'font/ttf',
  'otf': 'font/otf',
  'eot': 'application/vnd.ms-fontobject'
};

// MIME type categories
const MIME_CATEGORIES = {
  image: /^image\//,
  video: /^video\//,
  audio: /^audio\//,
  text: /^text\//,
  application: /^application\//,
  font: /^font\//
};

// Safe MIME types for web display
const SAFE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/x-icon',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'text/plain',
  'text/html',
  'text/css',
  'application/json',
  'application/pdf'
];

// Dangerous MIME types that should be blocked or handled carefully
const DANGEROUS_MIME_TYPES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-winexe',
  'application/x-apple-diskimage',
  'application/vnd.microsoft.portable-executable',
  'application/x-dosexec',
  'application/octet-stream' // Potentially dangerous
];

/**
 * Get MIME type from file extension
 * @param {string} extension - File extension (with or without dot)
 * @returns {string} MIME type
 */
function getMimeType(extension) {
  if (!extension || typeof extension !== 'string') {
    return 'application/octet-stream';
  }
  
  // Remove leading dot if present
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  const lowerExt = ext.toLowerCase();
  
  // Check our common types first
  if (COMMON_MIME_TYPES[lowerExt]) {
    return COMMON_MIME_TYPES[lowerExt];
  }
  
  // Fall back to mime-types library
  const mimeType = mimeTypes.lookup(lowerExt);
  return mimeType || 'application/octet-stream';
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string|null} File extension or null if not found
 */
function getExtensionFromMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return null;
  }
  
  // Check our common types first
  for (const [ext, mime] of Object.entries(COMMON_MIME_TYPES)) {
    if (mime === mimeType.toLowerCase()) {
      return ext;
    }
  }
  
  // Fall back to mime-types library
  const extension = mimeTypes.extension(mimeType);
  return extension || null;
}

/**
 * Validate MIME type format
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} True if valid MIME type format
 */
function isValidMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }
  
  // Basic MIME type format: type/subtype
  const mimePattern = /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
  return mimePattern.test(mimeType);
}

/**
 * Get MIME type category
 * @param {string} mimeType - MIME type
 * @returns {string} Category name
 */
function getMimeCategory(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'unknown';
  }
  
  const lowerMime = mimeType.toLowerCase();
  
  for (const [category, pattern] of Object.entries(MIME_CATEGORIES)) {
    if (pattern.test(lowerMime)) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Check if MIME type is for an image
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if image
 */
function isImageMimeType(mimeType) {
  return getMimeCategory(mimeType) === 'image';
}

/**
 * Check if MIME type is for a video
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if video
 */
function isVideoMimeType(mimeType) {
  return getMimeCategory(mimeType) === 'video';
}

/**
 * Check if MIME type is for audio
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if audio
 */
function isAudioMimeType(mimeType) {
  return getMimeCategory(mimeType) === 'audio';
}

/**
 * Check if MIME type is safe for web display
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if safe
 */
function isSafeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }
  
  return SAFE_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Check if MIME type is potentially dangerous
 * @param {string} mimeType - MIME type
 * @returns {boolean} True if dangerous
 */
function isDangerousMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return false;
  }
  
  return DANGEROUS_MIME_TYPES.includes(mimeType.toLowerCase());
}

/**
 * Detect MIME type from file buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} fallbackExtension - Fallback extension if detection fails
 * @returns {string} Detected MIME type
 */
function detectMimeTypeFromBuffer(buffer, fallbackExtension = null) {
  if (!Buffer.isBuffer(buffer)) {
    return getMimeType(fallbackExtension);
  }
  
  try {
    // Check file signatures (magic numbers)
    const signatures = {
      // Images
      [Buffer.from([0xFF, 0xD8, 0xFF])]: 'image/jpeg',
      [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])]: 'image/png',
      [Buffer.from([0x47, 0x49, 0x46, 0x38])]: 'image/gif',
      [Buffer.from([0x52, 0x49, 0x46, 0x46])]: 'image/webp', // RIFF container, need further check
      [Buffer.from([0x42, 0x4D])]: 'image/bmp',
      
      // Documents
      [Buffer.from([0x25, 0x50, 0x44, 0x46])]: 'application/pdf', // %PDF
      [Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1])]: 'application/msword', // OLE compound
      [Buffer.from([0x50, 0x4B, 0x03, 0x04])]: 'application/zip', // ZIP/Office documents
      
      // Archives
      [Buffer.from([0x1F, 0x8B])]: 'application/gzip',
      [Buffer.from([0x42, 0x5A, 0x68])]: 'application/x-bzip2',
      [Buffer.from([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])]: 'application/x-7z-compressed',
      
      // Videos
      [Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])]: 'video/mp4',
      [Buffer.from([0x1A, 0x45, 0xDF, 0xA3])]: 'video/webm',
      
      // Audio
      [Buffer.from([0x49, 0x44, 0x33])]: 'audio/mpeg', // ID3
      [Buffer.from([0xFF, 0xFB])]: 'audio/mpeg', // MP3
      [Buffer.from([0x52, 0x49, 0x46, 0x46])]: 'audio/wav' // RIFF, need further check
    };
    
    // Check each signature
    for (const [signature, mimeType] of Object.entries(signatures)) {
      if (buffer.length >= signature.length) {
        const bufferStart = buffer.slice(0, signature.length);
        if (bufferStart.equals(signature)) {
          return mimeType;
        }
      }
    }
    
    // Special cases that need more complex detection
    if (buffer.length >= 12) {
      const riffHeader = buffer.slice(0, 4);
      const format = buffer.slice(8, 12);
      
      if (riffHeader.equals(Buffer.from([0x52, 0x49, 0x46, 0x46]))) { // RIFF
        if (format.equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))) { // WEBP
          return 'image/webp';
        }
        if (format.equals(Buffer.from([0x57, 0x41, 0x56, 0x45]))) { // WAVE
          return 'audio/wav';
        }
      }
    }
    
    // If no signature matched, fall back to extension
    return getMimeType(fallbackExtension);
    
  } catch (error) {
    logError('❌ MIME type detection from buffer failed:', error);
    return getMimeType(fallbackExtension);
  }
}

/**
 * Validate MIME type against file extension
 * @param {string} mimeType - MIME type
 * @param {string} extension - File extension
 * @returns {object} Validation result
 */
function validateMimeTypeExtension(mimeType, extension) {
  const result = {
    valid: true,
    consistent: true,
    warnings: []
  };
  
  if (!isValidMimeType(mimeType)) {
    result.valid = false;
    result.warnings.push('Invalid MIME type format');
    return result;
  }
  
  const expectedMimeType = getMimeType(extension);
  const expectedExtension = getExtensionFromMimeType(mimeType);
  
  if (mimeType.toLowerCase() !== expectedMimeType.toLowerCase()) {
    result.consistent = false;
    result.warnings.push(`MIME type '${mimeType}' doesn't match extension '${extension}' (expected '${expectedMimeType}')`);
  }
  
  if (expectedExtension && extension.toLowerCase() !== expectedExtension.toLowerCase()) {
    result.consistent = false;
    result.warnings.push(`Extension '${extension}' doesn't match MIME type '${mimeType}' (expected '${expectedExtension}')`);
  }
  
  return result;
}

/**
 * Get content type header with charset
 * @param {string} mimeType - MIME type
 * @param {string} charset - Character encoding (default: utf-8 for text types)
 * @returns {string} Content-Type header value
 */
function getContentTypeHeader(mimeType, charset = null) {
  if (!mimeType) {
    return 'application/octet-stream';
  }
  
  // Add charset for text types
  if (mimeType.startsWith('text/') || 
      mimeType === 'application/json' || 
      mimeType === 'application/xml' ||
      mimeType === 'application/javascript') {
    const defaultCharset = charset || 'utf-8';
    return `${mimeType}; charset=${defaultCharset}`;
  }
  
  return mimeType;
}

/**
 * Get recommended file extensions for a MIME type
 * @param {string} mimeType - MIME type
 * @returns {string[]} Array of recommended extensions
 */
function getRecommendedExtensions(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return [];
  }
  
  const extensions = [];
  const lowerMime = mimeType.toLowerCase();
  
  // Find all extensions that match this MIME type
  for (const [ext, mime] of Object.entries(COMMON_MIME_TYPES)) {
    if (mime === lowerMime) {
      extensions.push(ext);
    }
  }
  
  // Add primary extension from mime-types library
  const primaryExt = mimeTypes.extension(mimeType);
  if (primaryExt && !extensions.includes(primaryExt)) {
    extensions.unshift(primaryExt); // Add to beginning as primary
  }
  
  return extensions;
}

/**
 * Sanitize MIME type
 * @param {string} mimeType - MIME type to sanitize
 * @returns {string} Sanitized MIME type
 */
function sanitizeMimeType(mimeType) {
  if (!mimeType || typeof mimeType !== 'string') {
    return 'application/octet-stream';
  }
  
  // Remove any parameters and normalize
  const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
  
  // Validate format
  if (!isValidMimeType(cleanMime)) {
    logWarning(`⚠️ Invalid MIME type format: ${mimeType}`);
    return 'application/octet-stream';
  }
  
  // Check if it's a known dangerous type
  if (isDangerousMimeType(cleanMime)) {
    logWarning(`⚠️ Dangerous MIME type detected: ${cleanMime}`);
    return 'application/octet-stream';
  }
  
  return cleanMime;
}

/**
 * Get MIME type info with metadata
 * @param {string} mimeType - MIME type
 * @returns {object} MIME type information
 */
function getMimeTypeInfo(mimeType) {
  const sanitized = sanitizeMimeType(mimeType);
  
  return {
    mimeType: sanitized,
    category: getMimeCategory(sanitized),
    isImage: isImageMimeType(sanitized),
    isVideo: isVideoMimeType(sanitized),
    isAudio: isAudioMimeType(sanitized),
    isSafe: isSafeMimeType(sanitized),
    isDangerous: isDangerousMimeType(sanitized),
    extensions: getRecommendedExtensions(sanitized),
    contentType: getContentTypeHeader(sanitized)
  };
}

module.exports = {
  getMimeType,
  getExtensionFromMimeType,
  isValidMimeType,
  getMimeCategory,
  isImageMimeType,
  isVideoMimeType,
  isAudioMimeType,
  isSafeMimeType,
  isDangerousMimeType,
  detectMimeTypeFromBuffer,
  validateMimeTypeExtension,
  getContentTypeHeader,
  getRecommendedExtensions,
  sanitizeMimeType,
  getMimeTypeInfo,
  
  // Constants
  COMMON_MIME_TYPES,
  SAFE_MIME_TYPES,
  DANGEROUS_MIME_TYPES,
  MIME_CATEGORIES
};