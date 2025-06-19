import { z } from 'zod';
import { BaseEntity } from './core';

export interface ModuleManifest {
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  email?: string;
  website?: string;
  license: string;
  
  // Compatibility
  compatibility: {
    vyralVersion: string;
    nodeVersion: string;
  };
  
  // Dependencies
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // Classification
  category: 'social' | 'ecommerce' | 'seo' | 'analytics' | 'content' | 'utility' | 'security';
  tags: string[];
  
  // Assets
  icon?: string;
  screenshots?: string[];
  
  // Module capabilities
  features: ModuleFeature[];
  permissions: string[];
  
  // API endpoints this module provides
  apiRoutes?: ModuleRoute[];
  
  // Database changes
  dbMigrations?: string[];
  
  // Event hooks
  hooks: ModuleHook[];
  
  // Installation requirements
  requirements?: {
    plugins?: string[];
    modules?: string[];
    services?: string[];
    memory?: string;
    storage?: string;
  };
  
  // Configuration schema
  settings?: ModuleSetting[];
  defaultConfig?: Record<string, any>;
  
  // Lifecycle
  main: string; // Entry point file
  uninstallScript?: string;
  
  // Module metadata
  price?: number;
  purchaseUrl?: string;
  supportUrl?: string;
  documentationUrl?: string;
}

export interface ModuleFeature {
  name: string;
  description: string;
  enabled: boolean;
  required?: boolean;
  config?: Record<string, any>;
}

export interface ModuleRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: string;
  middleware?: string[];
  permissions?: string[];
  description?: string;
}

export interface ModuleHook {
  event: string;
  handler: string;
  priority?: number;
  async?: boolean;
}

export interface ModuleSetting {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'file' | 'json';
  label: string;
  description?: string;
  default?: any;
  required?: boolean;
  options?: Array<{ label: string; value: any }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  group?: string;
  dependsOn?: string;
}

export interface Module extends BaseEntity {
  manifest: ModuleManifest;
  status: 'installing' | 'installed' | 'active' | 'inactive' | 'error' | 'updating';
  installPath: string;
  configValues: Record<string, any>;
  
  // Installation info
  installedAt: Date;
  installedBy: string;
  activatedAt?: Date;
  
  // Error handling
  lastError?: string;
  errorCount: number;
  
  // Updates
  updateAvailable?: string;
  lastCheckedForUpdates?: Date;
  
  // Usage stats
  usageStats?: {
    apiCalls: number;
    lastUsed?: Date;
    activeUsers: number;
  };
}

// Validation schemas
export const ModuleManifestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string().min(10).max(500),
  author: z.string().min(1).max(100),
  license: z.string().min(1),
  compatibility: z.object({
    vyralVersion: z.string(),
    nodeVersion: z.string()
  }),
  category: z.enum(['social', 'ecommerce', 'seo', 'analytics', 'content', 'utility', 'security']),
  tags: z.array(z.string()),
  main: z.string().min(1)
});

export const ModuleSchema = z.object({
  manifest: ModuleManifestSchema,
  status: z.enum(['installing', 'installed', 'active', 'inactive', 'error', 'updating']),
  installPath: z.string(),
  configValues: z.record(z.any()),
  installedBy: z.string()
});