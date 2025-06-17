/**
 * String utility functions for the core package
 */

export interface SlugifyOptions {
  lowercase?: boolean;
  strict?: boolean;
  separator?: string;
  maxLength?: number;
}

export interface TruncateOptions {
  length: number;
  suffix?: string;
  preserveWords?: boolean;
}

/**
 * Convert text to URL-friendly slug
 */
export function slugify(text: string, options: SlugifyOptions = {}): string {
  const { 
    lowercase = true, 
    strict = true, 
    separator = '-',
    maxLength 
  } = options;

  let result = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, strict ? '' : '_') // Remove special chars
    .replace(/[\s_-]+/g, separator) // Replace spaces and underscores with separator
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, 'g'), ''); // Trim separators

  if (lowercase) {
    result = result.toLowerCase();
  }

  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength).replace(new RegExp(`\\${separator}[^\\${separator}]*$`), '');
  }

  return result;
}

/**
 * Convert string to camelCase
 */
export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
}

/**
 * Convert string to PascalCase
 */
export function pascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase())
    .replace(/\s+/g, '');
}

/**
 * Convert string to kebab-case
 */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert string to snake_case
 */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Capitalize first letter of string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str
    .split(/\s+/)
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Truncate string to specified length
 */
export function truncate(text: string, options: TruncateOptions): string {
  const { length, suffix = '...', preserveWords = true } = options;

  if (text.length <= length) {
    return text;
  }

  let truncated = text.substring(0, length - suffix.length);

  if (preserveWords) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return truncated + suffix;
}

/**
 * Extract plain text from HTML string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Extract excerpt from content
 */
export function excerpt(content: string, wordLimit: number = 50): string {
  const plainText = stripHtml(content);
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  
  if (words.length <= wordLimit) {
    return plainText;
  }
  
  return words.slice(0, wordLimit).join(' ') + '...';
}

/**
 * Generate random string
 */
export function randomString(length: number = 8, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
}

/**
 * Generate URL-safe random string
 */
export function generateId(length: number = 8): string {
  return randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'\/]/g, (match) => htmlEscapes[match]);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(html: string): string {
  const htmlUnescapes: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/'
  };

  return html.replace(/&(?:amp|lt|gt|quot|#x27|#x2F);/g, (match) => htmlUnescapes[match]);
}

/**
 * Check if string is valid email
 */
export function isEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if string is valid URL
 */
export function isUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Generate reading time estimate
 */
export function readingTime(content: string, wordsPerMinute: number = 200): number {
  const plainText = stripHtml(content);
  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Format reading time as human-readable string
 */
export function formatReadingTime(content: string, wordsPerMinute: number = 200): string {
  const minutes = readingTime(content, wordsPerMinute);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Format count with pluralization
 */
export function formatCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}