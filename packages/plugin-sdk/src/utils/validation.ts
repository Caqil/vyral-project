import { ValidationError } from '@vyral/core';
import { z } from 'zod';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
}

export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      throw new ValidationError('Validation failed', formattedErrors);
    }
    throw error;
  }
}

export function validatePartialData<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown
): Partial<z.infer<z.ZodObject<T>>> {
  try {
    return schema.partial().parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      throw new ValidationError('Validation failed', formattedErrors);
    }
    throw error;
  }
}

// Plugin config validation schemas
const PluginConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Plugin name must be lowercase with hyphens'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must follow semver format'),
  description: z.string().min(1).max(500),
  author: z.string().min(1),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  vyralVersion: z.string().regex(/^[\^~]?\d+\.\d+\.\d+$/, 'Invalid Vyral version constraint'),
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  hooks: z.array(z.string()).optional(),
  routes: z.array(z.object({
    path: z.string(),
    component: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    middleware: z.array(z.string()).optional(),
    permission: z.string().optional()
  })).optional(),
  adminPages: z.array(z.object({
    title: z.string(),
    slug: z.string(),
    component: z.string(),
    icon: z.string().optional(),
    parent: z.string().optional(),
    permission: z.string().optional(),
    order: z.number().optional()
  })).optional(),
  settings: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'textarea', 'number', 'boolean', 'select', 'file', 'color', 'date']),
    default: z.any().optional(),
    options: z.array(z.object({
      label: z.string(),
      value: z.any()
    })).optional(),
    required: z.boolean().optional(),
    description: z.string().optional(),
    validation: z.record(z.any()).optional(),
    group: z.string().optional()
  })).optional(),
  assets: z.array(z.object({
    type: z.enum(['css', 'js']),
    file: z.string(),
    condition: z.string().optional(),
    priority: z.number().optional(),
    async: z.boolean().optional(),
    defer: z.boolean().optional()
  })).optional(),
  permissions: z.array(z.string()).optional(),
  translations: z.record(z.record(z.string())).optional()
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

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
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
export const emailSchema = z.string().email('Invalid email address');
export const urlSchema = z.string().url('Invalid URL');
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format');
export const EmailSchema = z.string().email();
export const UrlSchema = z.string().url();
export const SlugSchema = z.string().regex(/^[a-z0-9-]+$/);
export const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);