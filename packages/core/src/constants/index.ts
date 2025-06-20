// Base system constants
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 10,
  maxLimit: 100
} as const;

export const CACHE_KEYS = {
  POST: (id: string) => `post:${id}`,
  POST_LIST: (params: string) => `posts:${params}`,
  CATEGORY: (id: string) => `category:${id}`,
  TAG: (id: string) => `tag:${id}`,
  USER: (id: string) => `user:${id}`,
  SETTINGS: 'settings',
  NAVIGATION: (location: string) => `navigation:${location}`,
  PERMISSIONS: 'permissions:registry'
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400 // 24 hours
} as const;

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 10,
  ALLOWED_EXTENSIONS: [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z',
    'mp3', 'wav', 'ogg',
    'mp4', 'avi', 'mov', 'wmv', 'flv'
  ]
} as const;

export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 400 },
  large: { width: 1200, height: 800 },
  xl: { width: 1920, height: 1080 }
} as const;

// Core system permissions that are always available
export const CORE_PERMISSIONS = {
  // Content permissions
  'content.create': 'Create content',
  'content.read': 'Read content',
  'content.update': 'Update content',
  'content.delete': 'Delete content',
  'content.publish': 'Publish content',
  
  // User permissions
  'users.create': 'Create users',
  'users.read': 'Read users',
  'users.update': 'Update users',
  'users.delete': 'Delete users',
  
  // Media permissions
  'media.upload': 'Upload media',
  'media.delete': 'Delete media',
  'media.manage': 'Manage media library',
  
  // System permissions
  'settings.read': 'Read settings',
  'settings.update': 'Update settings',
  'system.backup': 'Create backups',
  
  // Module management permissions
  'modules.install': 'Install modules',
  'modules.uninstall': 'Uninstall modules',
  'modules.configure': 'Configure modules',
  'modules.view': 'View module information',
  'modules.manage': 'Full module management',
  
  // API permissions
  'api.read': 'Read API access',
  'api.write': 'Write API access',
  'api.admin': 'Administrative API access'
} as const;

// Base role permissions using core permissions only
export const BASE_ROLE_PERMISSIONS = {
  super_admin: Object.keys(CORE_PERMISSIONS),
  
  admin: [
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
    'users.create', 'users.read', 'users.update', 'users.delete',
    'media.upload', 'media.delete', 'media.manage',
    'settings.read', 'settings.update',
    'modules.install', 'modules.uninstall', 'modules.configure', 'modules.view', 'modules.manage',
    'api.read', 'api.write', 'api.admin'
  ],
  
  editor: [
    'content.create', 'content.read', 'content.update', 'content.delete', 'content.publish',
    'users.read',
    'media.upload', 'media.delete', 'media.manage',
    'modules.view',
    'api.read', 'api.write'
  ],
  
  author: [
    'content.create', 'content.read', 'content.update', 'content.publish',
    'media.upload',
    'api.read'
  ],
  
  contributor: [
    'content.create', 'content.read', 'content.update',
    'media.upload',
    'api.read'
  ],
  
  subscriber: [
    'content.read'
  ]
} as const;

// Permission types for better organization
export const PERMISSION_TYPES = {
  CORE: 'core',
  MODULE: 'module',
  PUBLIC: 'public',
  CUSTOM: 'custom'
} as const;

// Permission levels for hierarchical checking
export const PERMISSION_LEVELS = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  ADMIN: 3,
  SUPER: 4
} as const;

// Permission patterns for pattern matching
export const PERMISSION_PATTERNS = {
  // Public access patterns - no auth required
  PUBLIC: [
    'public.*',
    '*.read',
    '*.callback',
    '*.init'
  ],
  
  // User access patterns - basic auth required
  USER: [
    '*.authenticate',
    '*.refresh',
    '*.disconnect'
  ],
  
  // Admin access patterns - admin role required
  ADMIN: [
    '*.admin',
    '*.manage',
    '*.configure',
    '*.install',
    '*.uninstall'
  ]
} as const;

// Dynamic permission registry interface
export interface PermissionDefinition {
  key: string;
  description: string;
  type: keyof typeof PERMISSION_TYPES;
  level: keyof typeof PERMISSION_LEVELS;
  module?: string;
  pattern?: string;
  public?: boolean;
}

export interface ModulePermissionSet {
  moduleSlug: string;
  permissions: PermissionDefinition[];
  defaultRolePermissions?: {
    [role: string]: string[];
  };
}

// Permission registry class for dynamic permission management
export class PermissionRegistry {
  private static instance: PermissionRegistry;
  private permissions: Map<string, PermissionDefinition> = new Map();
  private modulePermissions: Map<string, ModulePermissionSet> = new Map();

  private constructor() {
    this.initializeCorePermissions();
  }

  static getInstance(): PermissionRegistry {
    if (!PermissionRegistry.instance) {
      PermissionRegistry.instance = new PermissionRegistry();
    }
    return PermissionRegistry.instance;
  }

  private initializeCorePermissions() {
    Object.entries(CORE_PERMISSIONS).forEach(([key, description]) => {
      this.permissions.set(key, {
        key,
        description,
        type: 'CORE',
        level: this.inferPermissionLevel(key)
      });
    });
  }

  private inferPermissionLevel(permission: string): keyof typeof PERMISSION_LEVELS {
    if (permission.includes('admin') || permission.includes('manage')) return 'ADMIN';
    if (permission.includes('create') || permission.includes('update') || permission.includes('delete')) return 'WRITE';
    if (permission.includes('read') || permission.includes('view')) return 'READ';
    return 'NONE';
  }

  // Register permissions from a module
  registerModulePermissions(modulePermissionSet: ModulePermissionSet): void {
    this.modulePermissions.set(modulePermissionSet.moduleSlug, modulePermissionSet);
    
    modulePermissionSet.permissions.forEach(permission => {
      this.permissions.set(permission.key, {
        ...permission,
        module: modulePermissionSet.moduleSlug
      });
    });
  }

  // Unregister permissions when module is uninstalled
  unregisterModulePermissions(moduleSlug: string): void {
    const modulePermissionSet = this.modulePermissions.get(moduleSlug);
    if (modulePermissionSet) {
      modulePermissionSet.permissions.forEach(permission => {
        this.permissions.delete(permission.key);
      });
      this.modulePermissions.delete(moduleSlug);
    }
  }

  // Get all permissions
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissions.values());
  }

  // Get permissions for a specific module
  getModulePermissions(moduleSlug: string): PermissionDefinition[] {
    const modulePermissionSet = this.modulePermissions.get(moduleSlug);
    return modulePermissionSet ? modulePermissionSet.permissions : [];
  }

  // Check if permission exists
  hasPermission(permissionKey: string): boolean {
    return this.permissions.has(permissionKey);
  }

  // Get permission definition
  getPermission(permissionKey: string): PermissionDefinition | undefined {
    return this.permissions.get(permissionKey);
  }

  // Check if permission is public (no auth required)
  isPublicPermission(permissionKey: string): boolean {
    const permission = this.permissions.get(permissionKey);
    if (permission?.public) return true;

    // Check against public patterns
    return PERMISSION_PATTERNS.PUBLIC.some(pattern => 
      this.matchesPattern(permissionKey, pattern)
    );
  }

  // Pattern matching for permissions
  private matchesPattern(permission: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return regex.test(permission);
  }

  // Get effective permissions for a role (including module permissions)
  getRolePermissions(role: string): string[] {
    const basePermissions = BASE_ROLE_PERMISSIONS[role as keyof typeof BASE_ROLE_PERMISSIONS] || [];
    const modulePermissions: string[] = [];

    // Collect module permissions for this role
    this.modulePermissions.forEach(modulePermissionSet => {
      if (modulePermissionSet.defaultRolePermissions?.[role]) {
        modulePermissions.push(...modulePermissionSet.defaultRolePermissions[role]);
      }
    });

    return [...basePermissions, ...modulePermissions];
  }
}

// Helper function to get the permission registry
export function getPermissionRegistry(): PermissionRegistry {
  return PermissionRegistry.getInstance();
}

// Example usage for modules to register permissions
export function createModulePermissions(
  moduleSlug: string,
  permissions: Omit<PermissionDefinition, 'module'>[]
): ModulePermissionSet {
  return {
    moduleSlug,
    permissions: permissions.map(p => ({ ...p, module: moduleSlug })),
    defaultRolePermissions: {
      admin: permissions.filter(p => !p.public).map(p => p.key),
      editor: permissions.filter(p => p.level !== 'ADMIN').map(p => p.key),
      author: permissions.filter(p => p.level === 'READ' || p.level === 'WRITE').map(p => p.key),
      subscriber: permissions.filter(p => p.level === 'READ').map(p => p.key)
    }
  };
}