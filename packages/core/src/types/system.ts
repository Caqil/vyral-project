import { z } from 'zod';
import { BaseEntity, Metadata } from './core';

export interface Setting extends BaseEntity {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  group: string;
  label: string;
  description?: string;
  isPublic: boolean;
  isAutoload: boolean;
  validation?: Record<string, any>;
  metadata: Metadata;
}

export interface Navigation extends BaseEntity {
  name: string;
  slug: string;
  items: NavigationItem[];
  location: string;
  isActive: boolean;
  metadata: Metadata;
}

export interface NavigationItem {
  id: string;
  label: string;
  url: string;
  type: 'page' | 'post' | 'category' | 'tag' | 'custom' | 'external';
  target: '_self' | '_blank';
  cssClass?: string;
  order: number;
  parent?: string;
  children?: NavigationItem[];
  conditions?: {
    loggedIn?: boolean;
    roles?: string[];
    permissions?: string[];
  };
}

export interface Activity extends BaseEntity {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  description: string;
  ip: string;
  userAgent: string;
  metadata: Metadata;
}

export interface Backup extends BaseEntity {
  name: string;
  type: 'full' | 'database' | 'files';
  size: number;
  path: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata: Metadata;
}

export interface CacheEntry extends BaseEntity {
  key: string;
  value: any;
  ttl: number;
  tags: string[];
  expiresAt: Date;
}

// Validation Schemas
export const SettingSchema = z.object({
  key: z.string().min(1),
  value: z.any(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  group: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().default(false),
  isAutoload: z.boolean().default(false),
  validation: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

export const NavigationItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  url: z.string(),
  type: z.enum(['page', 'post', 'category', 'tag', 'custom', 'external']),
  target: z.enum(['_self', '_blank']).default('_self'),
  cssClass: z.string().optional(),
  order: z.number().default(0),
  parent: z.string().optional(),
  children: z.array(z.lazy(() => NavigationItemSchema)).optional(),
  conditions: z.object({
    loggedIn: z.boolean().optional(),
    roles: z.array(z.string()).optional(),
    permissions: z.array(z.string()).optional()
  }).optional()
});

export const NavigationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  items: z.array(NavigationItemSchema),
  location: z.string().min(1),
  isActive: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});
