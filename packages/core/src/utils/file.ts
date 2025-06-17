import { createHash } from 'crypto';
import { UPLOAD_LIMITS } from '../constants';

export interface FileValidationOptions {
  maxSize?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

export interface FileInfo {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  extension: string;
  hash: string;
}

export function validateFile(
  file: { name: string; size: number; type: string },
  options: FileValidationOptions = {}
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const maxSize = options.maxSize || UPLOAD_LIMITS.MAX_FILE_SIZE;
  const allowedExtensions = options.allowedExtensions || UPLOAD_LIMITS.ALLOWED_EXTENSIONS;

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum allowed size of ${maxSize} bytes`);
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (!allowedExtensions.includes(extension as typeof UPLOAD_LIMITS.ALLOWED_EXTENSIONS[number])) {
    errors.push(`File extension '${extension}' is not allowed`);
  }

  // Check MIME type if provided
  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
    errors.push(`MIME type '${file.type}' is not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateFileHash(buffer: Buffer): string {
  return createHash('md5').update(buffer).digest('hex');
}

export function generateUniqueFilename(originalName: string, hash?: string): string {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const hashPart = hash ? `-${hash.substring(0, 8)}` : '';
  
  return `${timestamp}-${randomString}${hashPart}.${extension}`;
}

export function humanFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
}