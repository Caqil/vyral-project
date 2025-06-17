import { z } from 'zod';
import { ReactNode, ComponentType } from 'react';

// Plugin configuration schema
export const PluginConfigSchema = z.object({
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

// Plugin metadata
export interface PluginMetadata {
  id: string;
  config: PluginConfig;
  status: 'active' | 'inactive' | 'error';
  installedAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  errorMessage?: string;
  dependencies: string[];
  dependents: string[];
}

// Plugin instance
export interface PluginInstance {
  id: string;
  config: PluginConfig;
  instance: any;
  hooks: Map<string, Function[]>;
  routes: Map<string, any>;
  adminPages: Map<string, any>;
  settings: Map<string, any>;
  assets: Array<{ type: string; file: string; options?: any }>;
  components: Map<string, ComponentType<any>>;
  status: 'loaded' | 'activated' | 'deactivated' | 'error';
  errorMessage?: string;
}

// Plugin registry entry
export interface PluginRegistryEntry {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  downloadUrl: string;
  size: number;
  rating: number;
  downloads: number;
  lastUpdated: Date;
  tags: string[];
  screenshots: string[];
  compatibility: string[];
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
  }>;
}

// Plugin installation options
export interface PluginInstallOptions {
  source: 'registry' | 'upload' | 'git' | 'local';
  url?: string;
  file?: File;
  overwrite?: boolean;
  activate?: boolean;
}

// Plugin context
export interface PluginContext {
  pluginId: string;
  config: PluginConfig;
  api: PluginAPI;
  storage: PluginStorage;
  logger: PluginLogger;
  events: PluginEvents;
  utils: PluginUtils;
}

// Plugin API interface
export interface PluginAPI {
  // Core services
  getPostService(): any;
  getUserService(): any;
  getCategoryService(): any;
  getTagService(): any;
  getMediaService(): any;
  getCommentService(): any;
  getSettingService(): any;
  
  // Plugin management
  getPlugin(id: string): PluginInstance | null;
  isPluginActive(id: string): boolean;
  getPluginSetting(key: string, defaultValue?: any): any;
  setPluginSetting(key: string, value: any): Promise<void>;
  
  // Database access
  getDatabase(): any;
  query(collection: string, filter?: any, options?: any): Promise<any>;
  
  // HTTP client
  request(url: string, options?: RequestInit): Promise<Response>;
  
  // File system
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  
  // Cache
  cache: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
  };
}

// Plugin storage interface
export interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

// Plugin logger interface
export interface PluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// Plugin events interface
export interface PluginEvents {
  emit(event: string, ...args: any[]): void;
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
  once(event: string, listener: Function): void;
}

// Plugin utilities interface
export interface PluginUtils {
  createId(): string;
  slugify(text: string): string;
  formatDate(date: Date, format?: string): string;
  parseDate(date: string): Date;
  sanitizeHtml(html: string): string;
  validateEmail(email: string): boolean;
  hash(data: string): string;
  encrypt(data: string, key: string): string;
  decrypt(data: string, key: string): string;
}
