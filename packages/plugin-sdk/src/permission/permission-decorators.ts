
import { PermissionManager } from './permission-manager';

export function RequirePermission(permission: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = (this as any).context || this;
      const userId = context.user?.id || context.userId;
      
      if (!userId) {
        throw new Error('User context required for permission check');
      }

      const permissionManager = context.permissionManager || context.getPermissionManager?.();
      if (!permissionManager) {
        throw new Error('Permission manager not available');
      }

      const hasPermission = await permissionManager.checkPermission(userId, permission, {
        action: propertyKey,
        pluginId: context.pluginId
      });

      if (!hasPermission) {
        throw new Error(`Permission denied: ${permission}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export function RequireAnyPermission(permissions: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
     const context = (this as any).context || this;
      const userId = context.user?.id || context.userId;
      
      if (!userId) {
        throw new Error('User context required for permission check');
      }

      const permissionManager = context.permissionManager || context.getPermissionManager?.();
      if (!permissionManager) {
        throw new Error('Permission manager not available');
      }

      const hasPermission = await permissionManager.hasAnyPermission(userId, permissions, {
        action: propertyKey,
        pluginId: context.pluginId
      });

      if (!hasPermission) {
        throw new Error(`Permission denied. Required one of: ${permissions.join(', ')}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

export function RequireAllPermissions(permissions: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = (this as any).context || this;
      const userId = context.user?.id || context.userId;
      
      if (!userId) {
        throw new Error('User context required for permission check');
      }

      const permissionManager = context.permissionManager || context.getPermissionManager?.();
      if (!permissionManager) {
        throw new Error('Permission manager not available');
      }

      const hasPermissions = await permissionManager.hasAllPermissions(userId, permissions, {
        action: propertyKey,
        pluginId: context.pluginId
      });

      if (!hasPermissions) {
        throw new Error(`Permission denied. Required all of: ${permissions.join(', ')}`);
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}