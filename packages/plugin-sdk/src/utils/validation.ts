import { z } from 'zod';
import { PluginConfig, PluginConfigSchema } from '../types';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
}

export function validatePluginConfig(config: unknown): ValidationResult<PluginConfig> {
  try {
    const result = PluginConfigSchema.parse(config);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof z.ZodError ? error : new z.ZodError([])
    };
  }
}

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof z.ZodError ? error : new z.ZodError([])
    };
  }
}

export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): ValidationResult<T> => validateSchema(schema, data);
}

// Common validation schemas
export const EmailSchema = z.string().email();
export const UrlSchema = z.string().url();
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/);
export const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

// packages/plugin-sdk/src/utils/string-utils.ts
export function slugify(text: string, options: { lowercase?: boolean; strict?: boolean } = {}): string {
  const { lowercase = true, strict = true } = options;

  let result = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, strict ? '' : '_') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens

  if (lowercase) {
    result = result.toLowerCase();
  }

  return result;
}

export function camelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => 
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '');
}

export function pascalCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
    .replace(/\s+/g, '');
}

export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

export function truncate(text: string, length: number, suffix: string = '...'): string {
  if (text.length <= length) return text;
  return text.slice(0, length - suffix.length) + suffix;
}

export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => map[char]);
}

export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };

  return text.replace(/&(amp|lt|gt|quot|#39);/g, entity => map[entity]);
}

export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
