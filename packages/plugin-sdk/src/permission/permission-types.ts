
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  scope: PermissionScope;
  dependencies?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isDefault: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
}

export enum PermissionScope {
  GLOBAL = 'global',
  PLUGIN = 'plugin',
  RESOURCE = 'resource',
  USER = 'user'
}

export interface PermissionContext {
  user: User;
  resource?: any;
  resourceType?: string;
  resourceId?: string;
  pluginId?: string;
  action: string;
  data?: any;
}

export interface PermissionCheck {
  permission: string;
  context: PermissionContext;
  granted: boolean;
  reason?: string;
  timestamp: Date;
}

export interface PermissionRule {
  id: string;
  permission: string;
  condition: (context: PermissionContext) => boolean | Promise<boolean>;
  priority: number;
  description: string;
}
