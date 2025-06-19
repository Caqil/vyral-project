import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { UserService } from '@vyral/core';
import { ROLE_PERMISSIONS } from '@vyral/core/constants';

const userService = new UserService(process.env.JWT_SECRET!);

export class PermissionError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string, 
  permission: string
): Promise<boolean> {
  try {
    const user = await userService.findByIdOrThrow(userId);
    
    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return true;
    }
    
    // Check if user's role has this permission
    const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] as string[];
    if (rolePermissions.includes(permission)) {
      return true;
    }
    
    // Check if user has explicit permission
    const hasExplicitPermission = user.permissions.some(p => 
      p.resource === permission || 
      p.actions.includes(permission)
    );
    
    return hasExplicitPermission;
  } catch (error) {
    return false;
  }
}

/**
 * Require permission - throws error if user doesn't have it
 */
export async function requirePermission(
  userId: string, 
  permission: string
): Promise<void> {
  const allowed = await hasPermission(userId, permission);
  
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
export async function hasAllPermissions(
  userId: string, 
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    const allowed = await hasPermission(userId, permission);
    if (!allowed) return false;
  }
  return true;
}

/**
 * Check multiple permissions (user needs ANY of them)  
 */
export async function hasAnyPermission(
  userId: string, 
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    const allowed = await hasPermission(userId, permission);
    if (allowed) return true;
  }
  return false;
}

/**
 * Middleware helper for API routes
 */
export async function requirePermissionFromSession(
  permission: string
): Promise<{ userId: string }> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    throw new PermissionError('Authentication required', 401);
  }
  
  await requirePermission(session.user.id, permission);
  
  return { userId: session.user.id };
}

/**
 * Check if user can perform action on resource
 */
export async function canAccessResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string
): Promise<boolean> {
  try {
    const user = await userService.findByIdOrThrow(userId);
    
    // Super admin can access everything
    if (user.role === 'super_admin') {
      return true;
    }
    
    // Check if user owns the resource
    if (resourceType === 'post' || resourceType === 'media') {
      // You'd implement resource ownership check here
      // For now, returning true if user is author or above
      return ['admin', 'editor', 'author'].includes(user.role);
    }
    
    // Check role-based access
    const permission = `${resourceType}.${action}`;
    return await hasPermission(userId, permission);
  } catch (error) {
    return false;
  }
}

/**
 * Get user's effective permissions
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const user = await userService.findByIdOrThrow(userId);
    
    // Get role permissions
    const rolePermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];
    
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