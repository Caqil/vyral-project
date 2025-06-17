import { z } from 'zod';
import { BaseEntity, Metadata } from './core';

// Plugin Status
export const PluginStatus = {
  INACTIVE: 'inactive',
  ACTIVE: 'active',
  ERROR: 'error',
  UPDATING: 'updating',
  INSTALLING: 'installing'
} as const;

export type PluginStatusType = typeof PluginStatus[keyof typeof PluginStatus];

// Plugin Types
export interface Plugin extends BaseEntity {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords: string[];
  status: PluginStatusType;
  isRequired: boolean;
  configPath: string;
  mainFile: string;
  vyralVersion: string;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  hooks: string[];
  adminPages: PluginAdminPage[];
  routes: PluginRoute[];
  settings: PluginSetting[];
  assets: PluginAsset[];
  permissions: string[];
  translations: Record<string, Record<string, string>>;
  installSource: 'registry' | 'upload' | 'git' | 'local';
  installPath: string;
  activatedAt?: Date;
  lastUpdate?: Date;
  updateAvailable?: string;
  errorMessage?: string;
  metadata: Metadata;
}

export interface PluginAdminPage {
  title: string;
  slug: string;
  component: string;
  icon?: string;
  parent?: string;
  permission?: string;
  order?: number;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export interface PluginRoute {
  path: string;
  component: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  middleware?: string[];
  permission?: string;
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export interface PluginSetting {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'file' | 'color' | 'date' | 'json';
  default?: any;
  options?: Array<{ label: string; value: any }>;
  required?: boolean;
  description?: string;
  validation?: Record<string, any>;
  group?: string;
  section?: string;
  order?: number;
  conditional?: {
    field: string;
    value: any;
    operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains';
  };
}

export interface PluginAsset {
  type: 'css' | 'js';
  file: string;
  condition?: string;
  priority?: number;
  async?: boolean;
  defer?: boolean;
  integrity?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  vyralVersion: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  hooks?: string[];
  adminPages?: PluginAdminPage[];
  routes?: PluginRoute[];
  settings?: PluginSetting[];
  assets?: PluginAsset[];
  permissions?: string[];
  translations?: Record<string, Record<string, string>>;
  files?: string[];
  main?: string;
  scripts?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
}

export interface PluginRegistry {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  downloadUrl: string;
  downloadCount: number;
  rating: number;
  ratingCount: number;
  size: number;
  lastUpdated: Date;
  tags: string[];
  screenshots: string[];
  compatibility: string[];
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
    breaking?: boolean;
  }>;
  verified: boolean;
  featured: boolean;
  category: string;
  subcategory?: string;
  minVyralVersion: string;
  maxVyralVersion?: string;
}

export interface PluginInstallation {
  pluginId: string;
  source: 'registry' | 'upload' | 'git' | 'local';
  version: string;
  installPath: string;
  installedAt: Date;
  installedBy: string;
  config: PluginManifest;
  files: Array<{
    path: string;
    size: number;
    hash: string;
  }>;
  dependencies: string[];
  postInstallSteps?: Array<{
    type: 'migration' | 'seed' | 'permission' | 'config';
    description: string;
    completed: boolean;
    completedAt?: Date;
  }>;
}

export interface PluginHookRegistration {
  pluginId: string;
  hookName: string;
  callback: string;
  priority: number;
  conditions?: Record<string, any>;
  enabled: boolean;
}

export interface PluginEvent {
  pluginId: string;
  event: string;
  data: any;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export interface PluginLog {
  pluginId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  timestamp: Date;
  context?: string;
}

export interface PluginCache {
  pluginId: string;
  key: string;
  value: any;
  ttl: number;
  tags: string[];
  expiresAt: Date;
  createdAt: Date;
}

export interface PluginAnalytics {
  pluginId: string;
  metric: string;
  value: number;
  dimensions?: Record<string, string>;
  timestamp: Date;
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

// Validation Schemas
export const PluginSettingSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'textarea', 'number', 'boolean', 'select', 'file', 'color', 'date', 'json']),
  default: z.any().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.any()
  })).optional(),
  required: z.boolean().optional(),
  description: z.string().optional(),
  validation: z.record(z.any()).optional(),
  group: z.string().optional(),
  section: z.string().optional(),
  order: z.number().optional(),
  conditional: z.object({
    field: z.string(),
    value: z.any(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains']).optional()
  }).optional()
});

export const PluginAdminPageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  component: z.string().min(1),
  icon: z.string().optional(),
  parent: z.string().optional(),
  permission: z.string().optional(),
  order: z.number().optional()
});

export const PluginRouteSchema = z.object({
  path: z.string().min(1),
  component: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  middleware: z.array(z.string()).optional(),
  permission: z.string().optional(),
  rateLimit: z.object({
    windowMs: z.number(),
    max: z.number()
  }).optional()
});

export const PluginAssetSchema = z.object({
  type: z.enum(['css', 'js']),
  file: z.string().min(1),
  condition: z.string().optional(),
  priority: z.number().optional(),
  async: z.boolean().optional(),
  defer: z.boolean().optional(),
  integrity: z.string().optional(),
  crossorigin: z.enum(['anonymous', 'use-credentials']).optional()
});

export const PluginManifestSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Plugin name must be lowercase with hyphens'),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[\w\d\-+.]+)?$/, 'Version must follow semver format'),
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
  adminPages: z.array(PluginAdminPageSchema).optional(),
  routes: z.array(PluginRouteSchema).optional(),
  settings: z.array(PluginSettingSchema).optional(),
  assets: z.array(PluginAssetSchema).optional(),
  permissions: z.array(z.string()).optional(),
  translations: z.record(z.record(z.string())).optional(),
  files: z.array(z.string()).optional(),
  main: z.string().optional(),
  scripts: z.record(z.string()).optional(),
  engines: z.object({
    node: z.string().optional(),
    npm: z.string().optional()
  }).optional()
});

export const PluginSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()),
  status: z.enum(['inactive', 'active', 'error', 'updating', 'installing']),
  isRequired: z.boolean().default(false),
  configPath: z.string(),
  mainFile: z.string(),
  vyralVersion: z.string(),
  dependencies: z.record(z.string()),
  peerDependencies: z.record(z.string()),
  hooks: z.array(z.string()),
  adminPages: z.array(PluginAdminPageSchema),
  routes: z.array(PluginRouteSchema),
  settings: z.array(PluginSettingSchema),
  assets: z.array(PluginAssetSchema),
  permissions: z.array(z.string()),
  translations: z.record(z.record(z.string())),
  installSource: z.enum(['registry', 'upload', 'git', 'local']),
  installPath: z.string(),
  activatedAt: z.date().optional(),
  lastUpdate: z.date().optional(),
  updateAvailable: z.string().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

// Export type guards and utilities
export const isPluginActive = (plugin: Plugin): boolean => plugin.status === PluginStatus.ACTIVE;
export const isPluginInstalled = (plugin: Plugin): boolean => 
  plugin.status !== PluginStatus.INSTALLING && !!plugin.installPath;
export const hasPluginError = (plugin: Plugin): boolean => plugin.status === PluginStatus.ERROR;
export const canActivatePlugin = (plugin: Plugin): boolean => 
  plugin.status === PluginStatus.INACTIVE && !plugin.errorMessage;
export const canDeactivatePlugin = (plugin: Plugin): boolean => 
  plugin.status === PluginStatus.ACTIVE && !plugin.isRequired;