const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { fileTypeFromBuffer } = require('file-type');
const { logError, logInfo, logWarning } = require('./error-handler');

/**
 * File utility functions for S3 Storage Module
 */

/**
 * Get file information from file object or path
 * @param {object|string} fileOrPath - File object or file path
 * @returns {object} File information
 */
function getFileInfo(fileOrPath) {
  try {
    const info = {
      name: null,
      originalName: null,
      extension: null,
      mimeType: null,
      size: null,
      type: null,
      isValid: false
    };

    if (typeof fileOrPath === 'string') {
      // File path
      info.name = path.basename(fileOrPath);
      info.originalName = info.name;
      info.extension = getFileExtension(info.name);
      
      if (fs.existsSync(fileOrPath)) {
        const stats = fs.statSync(fileOrPath);
        info.size = stats.size;
        info.isValid = true;
      }
    } else if (fileOrPath && typeof fileOrPath === 'object') {
      // File object
      info.name = fileOrPath.name || fileOrPath.originalname || fileOrPath.filename;
      info.originalName = fileOrPath.originalname || fileOrPath.originalName || info.name;
      info.extension = getFileExtension(info.originalName || info.name || '');
      info.mimeType = fileOrPath.mimetype || fileOrPath.mimeType;
      info.size = fileOrPath.size;
      info.isValid = !!(info.name && info.size);
    }

    info.type = getFileTypeFromExtension(info.extension);
    
    return info;
  } catch (error) {
    logError('❌ Get file info failed:', error);
    return {
      name: null,
      originalName: null,
      extension: null,
      mimeType: null,
      size: null,
      type: 'unknown',
      isValid: false
    };
  }
}

/**
 * Get file extension from filename
 * @param {string} filename - Filename
 * @returns {string} File extension (lowercase, without dot)
 */
function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) {
    return '';
  }
  
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Get file type category from extension
 * @param {string} extension - File extension
 * @returns {string} File type category
 */
function getFileTypeFromExtension(extension) {
  if (!extension) return 'unknown';
  
  const ext = extension.toLowerCase();
  
  const typeMap = {
    // Images
    images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico', 'avif', 'heic', 'heif'],
    // Videos
    videos: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v', '3gp', 'ogv'],
    // Audio
    audio: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus'],
    // Documents
    documents: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp'],
    // Archives
    archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'],
    // Code
    code: ['js', 'css', 'html', 'json', 'xml', 'yml', 'yaml', 'php', 'py', 'rb', 'java', 'cpp', 'c'],
    // Fonts
    fonts: ['woff', 'woff2', 'ttf', 'otf', 'eot']
  };
  
  for (const [type, extensions] of Object.entries(typeMap)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }
  
  return 'other';
}

/**
 * Check if file is an image
 * @param {object|string} fileOrExtension - File object or extension
 * @returns {boolean} True if file is an image
 */
function isImage(fileOrExtension) {
  const extension = typeof fileOrExtension === 'string' 
    ? fileOrExtension 
    : getFileExtension(getFileInfo(fileOrExtension).name || '');
    
  return getFileTypeFromExtension(extension) === 'images';
}

/**
 * Check if file is a video
 * @param {object|string} fileOrExtension - File object or extension
 * @returns {boolean} True if file is a video
 */
function isVideo(fileOrExtension) {
  const extension = typeof fileOrExtension === 'string' 
    ? fileOrExtension 
    : getFileExtension(getFileInfo(fileOrExtension).name || '');
    
  return getFileTypeFromExtension(extension) === 'videos';
}

/**
 * Check if file extension is dangerous/executable
 * @param {string} extension - File extension
 * @returns {boolean} True if extension is dangerous
 */
function isDangerousExtension(extension) {
  const dangerousExtensions = [
    'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
    'app', 'deb', 'pkg', 'rpm', 'dmg', 'sh', 'run', 'msi', 'ps1',
    'php', 'jsp', 'asp', 'aspx', 'py', 'rb', 'pl', 'cgi'
  ];
  
  return dangerousExtensions.includes(extension.toLowerCase());
}

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @param {object} options - Sanitization options
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename, options = {}) {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }
  
  const {
    replaceSpaces = true,
    maxLength = 255,
    preserveCase = false,
    removeSpecialChars = true
  } = options;
  
  let sanitized = filename;
  
  // Replace or remove special characters
  if (removeSpecialChars) {
    sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '');
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
  }
  
  // Replace spaces
  if (replaceSpaces) {
    sanitized = sanitized.replace(/\s+/g, '_');
  }
  
  // Remove multiple underscores/dashes
  sanitized = sanitized.replace(/[_-]+/g, '_');
  
  // Remove leading/trailing underscores and dots
  sanitized = sanitized.replace(/^[._-]+|[._-]+$/g, '');
  
  // Convert to lowercase unless preserving case
  if (!preserveCase) {
    sanitized = sanitized.toLowerCase();
  }
  
  // Truncate if too long
  if (sanitized.length > maxLength) {
    const extension = getFileExtension(sanitized);
    const baseName = sanitized.slice(0, sanitized.lastIndexOf('.'));
    const maxBaseName = maxLength - extension.length - 1;
    sanitized = baseName.slice(0, maxBaseName) + '.' + extension;
  }
  
  // Ensure filename is not empty
  if (!sanitized || sanitized === '.') {
    sanitized = 'untitled';
  }
  
  return sanitized;
}

/**
 * Generate unique filename
 * @param {string} originalFilename - Original filename
 * @param {object} options - Generation options
 * @returns {string} Unique filename
 */
function generateUniqueFilename(originalFilename, options = {}) {
  const {
    prefix = '',
    suffix = '',
    includeTimestamp = true,
    includeHash = true,
    hashLength = 8
  } = options;
  
  const fileInfo = getFileInfo({ name: originalFilename });
  const baseName = path.basename(fileInfo.name || 'file', '.' + fileInfo.extension);
  const extension = fileInfo.extension;
  
  // Sanitize base name
  const cleanBaseName = sanitizeFilename(baseName, { preserveCase: false });
  
  // Build unique parts
  const parts = [];
  
  if (prefix) {
    parts.push(prefix);
  }
  
  parts.push(cleanBaseName);
  
  if (includeTimestamp) {
    parts.push(Date.now().toString());
  }
  
  if (includeHash) {
    const hash = crypto.randomBytes(Math.ceil(hashLength / 2))
      .toString('hex')
      .slice(0, hashLength);
    parts.push(hash);
  }
  
  if (suffix) {
    parts.push(suffix);
  }
  
  const uniqueName = parts.join('-');
  return extension ? `${uniqueName}.${extension}` : uniqueName;
}

/**
 * Calculate file hash
 * @param {Buffer|string} fileData - File data or file path
 * @param {string} algorithm - Hash algorithm (default: sha256)
 * @returns {Promise<string>} File hash
 */
async function calculateFileHash(fileData, algorithm = 'sha256') {
  try {
    const hash = crypto.createHash(algorithm);
    
    if (Buffer.isBuffer(fileData)) {
      hash.update(fileData);
    } else if (typeof fileData === 'string') {
      // Assume it's a file path
      const readStream = fs.createReadStream(fileData);
      await new Promise((resolve, reject) => {
        readStream.on('data', chunk => hash.update(chunk));
        readStream.on('end', resolve);
        readStream.on('error', reject);
      });
    } else {
      throw new Error('Invalid file data type');
    }
    
    return hash.digest('hex');
  } catch (error) {
    logError('❌ Calculate file hash failed:', error);
    throw error;
  }
}

/**
 * Detect file type from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<object>} File type information
 */
async function detectFileType(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer');
    }
    
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (fileType) {
      return {
        extension: fileType.ext,
        mimeType: fileType.mime,
        detected: true
      };
    }
    
    return {
      extension: null,
      mimeType: null,
      detected: false
    };
  } catch (error) {
    logError('❌ Detect file type failed:', error);
    return {
      extension: null,
      mimeType: null,
      detected: false,
      error: error.message
    };
  }
}

/**
 * Validate file against criteria
 * @param {object} file - File object
 * @param {object} criteria - Validation criteria
 * @returns {object} Validation result
 */
function validateFile(file, criteria = {}) {
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  const fileInfo = getFileInfo(file);
  
  if (!fileInfo.isValid) {
    result.valid = false;
    result.errors.push('Invalid file object');
    return result;
  }
  
  // Size validation
  if (criteria.maxSize && fileInfo.size > criteria.maxSize) {
    result.valid = false;
    result.errors.push(`File size ${formatFileSize(fileInfo.size)} exceeds maximum ${formatFileSize(criteria.maxSize)}`);
  }
  
  if (criteria.minSize && fileInfo.size < criteria.minSize) {
    result.valid = false;
    result.errors.push(`File size ${formatFileSize(fileInfo.size)} is below minimum ${formatFileSize(criteria.minSize)}`);
  }
  
  // Extension validation
  if (criteria.allowedExtensions && Array.isArray(criteria.allowedExtensions)) {
    if (!criteria.allowedExtensions.includes(fileInfo.extension)) {
      result.valid = false;
      result.errors.push(`File extension '${fileInfo.extension}' is not allowed`);
    }
  }
  
  if (criteria.blockedExtensions && Array.isArray(criteria.blockedExtensions)) {
    if (criteria.blockedExtensions.includes(fileInfo.extension)) {
      result.valid = false;
      result.errors.push(`File extension '${fileInfo.extension}' is blocked`);
    }
  }
  
  // MIME type validation
  if (criteria.allowedMimeTypes && Array.isArray(criteria.allowedMimeTypes)) {
    if (fileInfo.mimeType && !criteria.allowedMimeTypes.includes(fileInfo.mimeType)) {
      result.valid = false;
      result.errors.push(`MIME type '${fileInfo.mimeType}' is not allowed`);
    }
  }
  
  // Security checks
  if (isDangerousExtension(fileInfo.extension)) {
    result.valid = false;
    result.errors.push(`Executable files are not allowed: ${fileInfo.extension}`);
  }
  
  // Filename validation
  if (fileInfo.originalName && fileInfo.originalName.length > 255) {
    result.warnings.push('Filename is very long and will be truncated');
  }
  
  return result;
}

/**
 * Format file size to human readable string
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Parse file size string to bytes
 * @param {string} sizeStr - Size string (e.g., "10MB", "1.5GB")
 * @returns {number} Size in bytes
 */
function parseFileSize(sizeStr) {
  if (typeof sizeStr === 'number') {
    return sizeStr;
  }
  
  if (typeof sizeStr !== 'string') {
    return 0;
  }
  
  const units = {
    'b': 1,
    'bytes': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024,
    'tb': 1024 * 1024 * 1024 * 1024
  };
  
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)$/);
  if (!match) {
    return parseInt(sizeStr) || 0;
  }
  
  const [, number, unit] = match;
  const multiplier = units[unit] || 1;
  
  return Math.floor(parseFloat(number) * multiplier);
}

/**
 * Get file stats from file path
 * @param {string} filePath - File path
 * @returns {Promise<object>} File stats
 */
async function getFileStats(filePath) {
  try {
    const stats = await promisify(fs.stat)(filePath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      mode: stats.mode,
      uid: stats.uid,
      gid: stats.gid
    };
  } catch (error) {
    logError('❌ Get file stats failed:', error);
    throw error;
  }
}

/**
 * Create file from buffer
 * @param {Buffer} buffer - File buffer
 * @param {string} filePath - Output file path
 * @returns {Promise<void>}
 */
async function createFileFromBuffer(buffer, filePath) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await promisify(fs.mkdir)(dir, { recursive: true });
    
    // Write file
    await promisify(fs.writeFile)(filePath, buffer);
    
    logInfo(`📁 File created: ${filePath}`);
  } catch (error) {
    logError('❌ Create file from buffer failed:', error);
    throw error;
  }
}

/**
 * Read file to buffer
 * @param {string} filePath - File path
 * @returns {Promise<Buffer>} File buffer
 */
async function readFileToBuffer(filePath) {
  try {
    const buffer = await promisify(fs.readFile)(filePath);
    return buffer;
  } catch (error) {
    logError('❌ Read file to buffer failed:', error);
    throw error;
  }
}

/**
 * Copy file
 * @param {string} source - Source file path
 * @param {string} destination - Destination file path
 * @returns {Promise<void>}
 */
async function copyFile(source, destination) {
  try {
    // Ensure destination directory exists
    const dir = path.dirname(destination);
    await promisify(fs.mkdir)(dir, { recursive: true });
    
    // Copy file
    await promisify(fs.copyFile)(source, destination);
    
    logInfo(`📋 File copied: ${source} → ${destination}`);
  } catch (error) {
    logError('❌ Copy file failed:', error);
    throw error;
  }
}

/**
 * Delete file safely
 * @param {string} filePath - File path
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteFile(filePath) {
  try {
    await promisify(fs.unlink)(filePath);
    logInfo(`🗑️ File deleted: ${filePath}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logWarning(`⚠️ File not found: ${filePath}`);
      return false;
    }
    logError('❌ Delete file failed:', error);
    throw error;
  }
}

/**
 * Check if file exists
 * @param {string} filePath - File path
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(filePath) {
  try {
    await promisify(fs.access)(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get temporary directory path
 * @returns {string} Temporary directory path
 */
function getTempDir() {
  return require('os').tmpdir();
}

/**
 * Create temporary file
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension
 * @returns {string} Temporary file path
 */
function createTempFile(prefix = 'temp', extension = 'tmp') {
  const tempDir = getTempDir();
  const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
  return path.join(tempDir, filename);
}

module.exports = {
  getFileInfo,
  getFileExtension,
  getFileTypeFromExtension,
  isImage,
  isVideo,
  isDangerousExtension,
  sanitizeFilename,
  generateUniqueFilename,
  calculateFileHash,
  detectFileType,
  validateFile,
  formatFileSize,
  parseFileSize,
  getFileStats,
  createFileFromBuffer,
  readFileToBuffer,
  copyFile,
  deleteFile,
  fileExists,
  getTempDir,
  createTempFile
};