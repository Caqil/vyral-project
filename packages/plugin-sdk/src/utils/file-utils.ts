/**
 * Enhanced file utility functions for the core package
 * Extends the existing file.ts with additional utilities
 */

import { UPLOAD_LIMITS } from '@vyral/core';
import { createHash } from 'crypto';
import { extname, basename } from 'path';

export interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
  requireExtension?: boolean;
}

export interface FileInfo {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  hash: string;
  path?: string;
  url?: string;
}

export interface ImageInfo extends FileInfo {
  width: number;
  height: number;
  aspectRatio: number;
  isPortrait: boolean;
  isLandscape: boolean;
}

export interface FileUploadResult {
  success: boolean;
  file?: FileInfo;
  error?: string;
  warnings?: string[];
}

export interface FileSizeLimit {
  bytes: number;
  readable: string;
}

/**
 * Validate uploaded file
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  options: FileValidationOptions = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const maxSize = options.maxSize || UPLOAD_LIMITS.MAX_FILE_SIZE;
  const allowedExtensions = options.allowedExtensions || UPLOAD_LIMITS.ALLOWED_EXTENSIONS;
  const requireExtension = options.requireExtension ?? true;

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${humanFileSize(file.size)} exceeds maximum allowed size of ${humanFileSize(maxSize)}`);
  }

  // Check if file is empty
  if (file.size === 0) {
    errors.push('File is empty');
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (requireExtension && !extension) {
    errors.push('File must have an extension');
  }

  if (extension && !allowedExtensions.includes(extension as typeof UPLOAD_LIMITS.ALLOWED_EXTENSIONS[number])) {
    errors.push(`File extension '${extension}' is not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Check MIME type if provided
  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
    errors.push(`MIME type '${file.type}' is not allowed`);
  }

  // Validate filename
  if (!isValidFilename(file.name)) {
    errors.push('Filename contains invalid characters');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get file extension without dot
 */
export function getFileExtension(filename: string): string {
  return extname(filename).slice(1).toLowerCase();
}

/**
 * Get filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  return basename(filename, extname(filename));
}

/**
 * Generate file hash from buffer
 */
export function generateFileHash(buffer: Buffer, algorithm: string = 'md5'): string {
  return createHash(algorithm).update(buffer).digest('hex');
}

/**
 * Generate unique filename with timestamp and hash
 */
export function generateUniqueFilename(originalName: string, hash?: string): string {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const hashPart = hash ? `-${hash.substring(0, 8)}` : '';
  
  return `${timestamp}-${randomString}${hashPart}.${extension}`;
}

/**
 * Generate safe filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '') // Remove invalid chars
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[._-]+|[._-]+$/g, ''); // Trim dots, underscores, and hyphens
}

/**
 * Check if filename is valid
 */
export function isValidFilename(filename: string): boolean {
  if (!filename || filename.length === 0) return false;
  if (filename.length > 255) return false;
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(filename)) return false;
  
  // Check for reserved names (Windows)
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) return false;
  
  return true;
}

/**
 * Convert bytes to human readable format
 */
export function humanFileSize(bytes: number, si: boolean = false): string {
  const threshold = si ? 1000 : 1024;
  const units = si 
    ? ['B', 'kB', 'MB', 'GB', 'TB', 'PB'] 
    : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    
  if (Math.abs(bytes) < threshold) {
    return bytes + ' ' + units[0];
  }
  
  let unitIndex = 0;
  let size = bytes;
  
  do {
    size /= threshold;
    unitIndex++;
  } while (Math.abs(size) >= threshold && unitIndex < units.length - 1);
  
  return Math.round(size * 100) / 100 + ' ' + units[unitIndex];
}

/**
 * Parse human readable file size to bytes
 */
export function parseFileSize(size: string): number {
  const units: Record<string, number> = {
    'b': 1,
    'byte': 1,
    'bytes': 1,
    'kb': 1024,
    'kib': 1024,
    'mb': 1024 ** 2,
    'mib': 1024 ** 2,
    'gb': 1024 ** 3,
    'gib': 1024 ** 3,
    'tb': 1024 ** 4,
    'tib': 1024 ** 4,
  };

  const match = size.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.round(value * (units[unit] || 1));
}

/**
 * Get image dimensions from file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Get detailed image information
 */
export async function getImageInfo(file: File): Promise<ImageInfo> {
  const dimensions = await getImageDimensions(file);
  const aspectRatio = dimensions.width / dimensions.height;
  
  return {
    filename: file.name,
    originalName: file.name,
    size: file.size,
    mimeType: file.type,
    extension: getFileExtension(file.name),
    hash: '', // Would need to be calculated from buffer
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio,
    isPortrait: aspectRatio < 1,
    isLandscape: aspectRatio > 1,
  };
}

/**
 * Check if file is an image
 */
export function isImage(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'];
  const extension = getFileExtension(filename);
  return imageExtensions.includes(extension);
}

/**
 * Check if file is a video
 */
export function isVideo(filename: string): boolean {
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
  const extension = getFileExtension(filename);
  return videoExtensions.includes(extension);
}

/**
 * Check if file is an audio
 */
export function isAudio(filename: string): boolean {
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a'];
  const extension = getFileExtension(filename);
  return audioExtensions.includes(extension);
}

/**
 * Check if file is a document
 */
export function isDocument(filename: string): boolean {
  const docExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages'];
  const extension = getFileExtension(filename);
  return docExtensions.includes(extension);
}

/**
 * Check if file is a spreadsheet
 */
export function isSpreadsheet(filename: string): boolean {
  const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods', 'numbers'];
  const extension = getFileExtension(filename);
  return spreadsheetExtensions.includes(extension);
}

/**
 * Check if file is a presentation
 */
export function isPresentation(filename: string): boolean {
  const presentationExtensions = ['ppt', 'pptx', 'odp', 'key'];
  const extension = getFileExtension(filename);
  return presentationExtensions.includes(extension);
}

/**
 * Get file type category
 */
export function getFileCategory(filename: string): string {
  if (isImage(filename)) return 'image';
  if (isVideo(filename)) return 'video';
  if (isAudio(filename)) return 'audio';
  if (isDocument(filename)) return 'document';
  if (isSpreadsheet(filename)) return 'spreadsheet';
  if (isPresentation(filename)) return 'presentation';
  return 'other';
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const extension = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    
    // Videos
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'ogg': 'audio/ogg',
    'wma': 'audio/x-ms-wma',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    
    // Spreadsheets
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'csv': 'text/csv',
    
    // Presentations
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    
    // Code
    'js': 'text/javascript',
    'css': 'text/css',
    'html': 'text/html',
    'json': 'application/json',
    'xml': 'application/xml',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}

/**
 * Create file size limits object
 */
export function createFileSizeLimit(bytes: number): FileSizeLimit {
  return {
    bytes,
    readable: humanFileSize(bytes)
  };
}

/**
 * Get common file size limits
 */
export const FILE_SIZE_LIMITS = {
  TINY: createFileSizeLimit(100 * 1024), // 100KB
  SMALL: createFileSizeLimit(1024 * 1024), // 1MB
  MEDIUM: createFileSizeLimit(5 * 1024 * 1024), // 5MB
  LARGE: createFileSizeLimit(10 * 1024 * 1024), // 10MB
  XLARGE: createFileSizeLimit(50 * 1024 * 1024), // 50MB
  XXLARGE: createFileSizeLimit(100 * 1024 * 1024), // 100MB
} as const;

/**
 * File upload progress tracker
 */
export class FileUploadTracker {
  private progress: number = 0;
  private loaded: number = 0;
  private total: number = 0;
  private startTime: number = 0;
  private callbacks: Array<(progress: number, speed?: number) => void> = [];
  
  start(total: number): void {
    this.total = total;
    this.startTime = Date.now();
    this.progress = 0;
    this.loaded = 0;
  }
  
  update(loaded: number): void {
    this.loaded = loaded;
    this.progress = this.total > 0 ? (loaded / this.total) * 100 : 0;
    
    const elapsed = Date.now() - this.startTime;
    const speed = elapsed > 0 ? loaded / (elapsed / 1000) : 0;
    
    this.callbacks.forEach(callback => callback(this.progress, speed));
  }
  
  onProgress(callback: (progress: number, speed?: number) => void): void {
    this.callbacks.push(callback);
  }
  
  getProgress(): number {
    return this.progress;
  }
  
  getSpeed(): number {
    const elapsed = Date.now() - this.startTime;
    return elapsed > 0 ? this.loaded / (elapsed / 1000) : 0;
  }
  
  getRemainingTime(): number {
    const speed = this.getSpeed();
    const remaining = this.total - this.loaded;
    return speed > 0 ? remaining / speed : 0;
  }
}