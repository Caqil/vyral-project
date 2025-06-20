import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserService } from '@vyral/core';
import { getPermissionRegistry, PERMISSION_PATTERNS } from '@vyral/core/constants';

const userService = new UserService(process.env.JWT_SECRET!);

export class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Dynamic permission checker that works with module-registered permissions
 */
export class PermissionChecker {
  private static instance: PermissionChecker;
  private permissionRegistry = getPermissionRegistry();

  static getInstance(): PermissionChecker {
    if (!PermissionChecker.instance) {
      PermissionChecker.instance = new PermissionChecker();
    }
    return PermissionChecker.instance;
  }

  /**
   * Check if user has a specific permission (with support for dynamic module permissions)
   */
  async hasPermission(userId: string, permission: string): Promise<boolean> {
    try {
      // Check if permission is public (no auth required)
      if (this.isPublicPermission(permission)) {
        return true;
      }

      // If no userId provided for non-public permission, deny access
      if (!userId) {
        return false;
      }

      const user = await userService.findByIdOrThrow(userId);
      
      // Super admin has all permissions
      if (user.role === 'super_admin') {
        return true;
      }
      
      // Get all permissions for user's role (including module permissions)
      const rolePermissions = this.permissionRegistry.getRolePermissions(user.role);
      
      // Direct permission match
      if (rolePermissions.includes(permission)) {
        return true;
      }
      
      // Pattern-based permission matching
      if (this.matchesPermissionPattern(permission, rolePermissions)) {
        return true;
      }
      
      // Check if user has explicit permission
      const hasExplicitPermission = user.permissions.some(p => 
        p.resource === permission || 
        p.actions.includes(permission)
      );
      
      return hasExplicitPermission;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Check if permission is public (accessible without authentication)
   */
  isPublicPermission(permission: string): boolean {
    return this.permissionRegistry.isPublicPermission(permission);
  }

  /**
   * Pattern-based permission matching for flexible permission checking
   */
  private matchesPermissionPattern(permission: string, rolePermissions: string[]): boolean {
    // Check if any role permission is a pattern that matches the requested permission
    return rolePermissions.some(rolePermission => {
      if (rolePermission.includes('*')) {
        const regex = new RegExp('^' + rolePermission.replace('*', '.*') + '$');
        return regex.test(permission);
      }
      return false;
    });
  }

  /**
   * Require permission - throws error if user doesn't have it
   */
  async requirePermission(userId: string, permission: string): Promise<void> {
    const allowed = await this.hasPermission(userId, permission);
    
    if (!allowed) {
      throw new PermissionError(
        `Access denied. Required permission: ${permission}`,
        403
      );
    }
  }

  /**
   * Check multiple permissions (user needs ALL of them)
   */
  async hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      const allowed = await this.hasPermission(userId, permission);
      if (!allowed) return false;
    }
    return true;
  }

  /**
   * Check multiple permissions (user needs ANY of them)
   */
  async hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
    for (const permission of permissions) {
      const allowed = await this.hasPermission(userId, permission);
      if (allowed) return true;
    }
    return false;
  }

  /**
   * Middleware helper for API routes with dynamic permission checking
   */
  async requirePermissionFromSession(permission: string): Promise<{ userId: string | null }> {
    // Check if permission is public first
    if (this.isPublicPermission(permission)) {
      return { userId: null }; // Public access, no user required
    }

    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      throw new PermissionError('Authentication required', 401);
    }
    
    await this.requirePermission(session.user.id, permission);
    
    return { userId: session.user.id };
  }

  /**
   * Get user's effective permissions (including module permissions)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const user = await userService.findByIdOrThrow(userId);
      
      // Get role permissions (includes module permissions)
      const rolePermissions = this.permissionRegistry.getRolePermissions(user.role);
      
      // Get explicit permissions
      const explicitPermissions = user.permissions.flatMap(p => 
        p.actions.map(action => `${p.resource}.${action}`)
      );
      
      // Combine and deduplicate
      return [...new Set([...rolePermissions, ...explicitPermissions])];
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if user can access a specific module
   */
  async canAccessModule(userId: string, moduleSlug: string): Promise<boolean> {
    // Get module permissions
    const modulePermissions = this.permissionRegistry.getModulePermissions(moduleSlug);
    
    if (modulePermissions.length === 0) {
      return false; // No permissions defined for this module
    }

    // Check if user has any permission for this module
    for (const modulePermission of modulePermissions) {
      const hasAccess = await this.hasPermission(userId, modulePermission.key);
      if (hasAccess) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get accessible modules for a user
   */
  async getAccessibleModules(userId: string): Promise<string[]> {
    const allModules = new Set<string>();
    
    // Get all module permissions
    this.permissionRegistry.getAllPermissions().forEach(permission => {
      if (permission.module) {
        allModules.add(permission.module);
      }
    });

    const accessibleModules: string[] = [];
    
    for (const moduleSlug of allModules) {
      const canAccess = await this.canAccessModule(userId, moduleSlug);
      if (canAccess) {
        accessibleModules.push(moduleSlug);
      }
    }

    return accessibleModules;
  }
}

// Export singleton instance and helper functions
export const permissionChecker = PermissionChecker.getInstance();

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  return permissionChecker.hasPermission(userId, permission);
}

export async function requirePermission(userId: string, permission: string): Promise<void> {
  return permissionChecker.requirePermission(userId, permission);
}

export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  return permissionChecker.hasAllPermissions(userId, permissions);
}

export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  return permissionChecker.hasAnyPermission(userId, permissions);
}

export async function requirePermissionFromSession(permission: string): Promise<{ userId: string | null }> {
  return permissionChecker.requirePermissionFromSession(permission);
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  return permissionChecker.getUserPermissions(userId);
}

export async function canAccessModule(userId: string, moduleSlug: string): Promise<boolean> {
  return permissionChecker.canAccessModule(userId, moduleSlug);
}

export async function getAccessibleModules(userId: string): Promise<string[]> {
  return permissionChecker.getAccessibleModules(userId);
}

// Helper to check if permission requires authentication
export function isPublicPermission(permission: string): boolean {
  return permissionChecker.isPublicPermission(permission);
}