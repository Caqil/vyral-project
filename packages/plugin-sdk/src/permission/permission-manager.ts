
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { Permission, PermissionCheck, PermissionContext, PermissionRule, Role, User } from './permission-types';

export class PermissionManager extends EventEmitter {
  private permissions: Map<string, Permission> = new Map();
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private rules: Map<string, PermissionRule[]> = new Map();
  private database: any;
  private logger: Logger;

  constructor(database: any) {
    super();
    this.database = database;
    this.logger = new Logger('PermissionManager');
  }

  // Permission management
  public async registerPermission(permission: Omit<Permission, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      const fullPermission: Permission = {
        ...permission,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.permissions.set(permission.id, fullPermission);
      
      // Save to database
      const collection = this.database.collection('permissions');
      await collection.updateOne(
        { id: permission.id },
        { $set: fullPermission },
        { upsert: true }
      );

      this.logger.debug(`Registered permission: ${permission.id}`);
      this.emit('permission-registered', fullPermission);
    } catch (error) {
      this.logger.error(`Error registering permission ${permission.id}:`, error);
      throw error;
    }
  }

  public async unregisterPermission(permissionId: string): Promise<void> {
    try {
      this.permissions.delete(permissionId);
      
      // Remove from database
      const collection = this.database.collection('permissions');
      await collection.deleteOne({ id: permissionId });

      // Remove from all roles
      for (const role of this.roles.values()) {
        if (role.permissions.includes(permissionId)) {
          role.permissions = role.permissions.filter(p => p !== permissionId);
          await this.updateRole(role.id, { permissions: role.permissions });
        }
      }

      this.logger.debug(`Unregistered permission: ${permissionId}`);
      this.emit('permission-unregistered', permissionId);
    } catch (error) {
      this.logger.error(`Error unregistering permission ${permissionId}:`, error);
      throw error;
    }
  }

  // Role management
  public async createRole(roleData: Omit<Role, 'createdAt' | 'updatedAt'>): Promise<Role> {
    try {
      const role: Role = {
        ...roleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.roles.set(role.id, role);
      
      // Save to database
      const collection = this.database.collection('roles');
      await collection.insertOne(role);

      this.logger.debug(`Created role: ${role.id}`);
      this.emit('role-created', role);
      return role;
    } catch (error) {
      this.logger.error(`Error creating role ${roleData.id}:`, error);
      throw error;
    }
  }

  public async updateRole(roleId: string, updates: Partial<Role>): Promise<void> {
    try {
      const role = this.roles.get(roleId);
      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      const updatedRole = {
        ...role,
        ...updates,
        updatedAt: new Date()
      };

      this.roles.set(roleId, updatedRole);
      
      // Update in database
      const collection = this.database.collection('roles');
      await collection.updateOne(
        { id: roleId },
        { $set: updates }
      );

      this.logger.debug(`Updated role: ${roleId}`);
      this.emit('role-updated', updatedRole);
    } catch (error) {
      this.logger.error(`Error updating role ${roleId}:`, error);
      throw error;
    }
  }

  // User permission checking
  public async checkPermission(userId: string, permission: string, context?: Partial<PermissionContext>): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user || !user.isActive) {
        return false;
      }

      const fullContext: PermissionContext = {
        user,
        action: 'check',
        ...context
      };

      // Check direct user permissions
      if (user.permissions.includes(permission)) {
        await this.logPermissionCheck({
          permission,
          context: fullContext,
          granted: true,
          reason: 'Direct user permission',
          timestamp: new Date()
        });
        return true;
      }

      // Check role-based permissions
      for (const roleId of user.roles) {
        const role = this.roles.get(roleId);
        if (role && role.permissions.includes(permission)) {
          await this.logPermissionCheck({
            permission,
            context: fullContext,
            granted: true,
            reason: `Role permission: ${role.name}`,
            timestamp: new Date()
          });
          return true;
        }
      }

      // Check custom rules
      const rules = this.rules.get(permission) || [];
      for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
        try {
          const result = await rule.condition(fullContext);
          if (result) {
            await this.logPermissionCheck({
              permission,
              context: fullContext,
              granted: true,
              reason: `Custom rule: ${rule.description}`,
              timestamp: new Date()
            });
            return true;
          }
        } catch (error) {
          this.logger.error(`Error evaluating permission rule ${rule.id}:`, error);
        }
      }

      await this.logPermissionCheck({
        permission,
        context: fullContext,
        granted: false,
        reason: 'No matching permissions found',
        timestamp: new Date()
      });

      return false;
    } catch (error) {
      this.logger.error(`Error checking permission ${permission} for user ${userId}:`, error);
      return false;
    }
  }

  public async hasAnyPermission(userId: string, permissions: string[], context?: Partial<PermissionContext>): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.checkPermission(userId, permission, context)) {
        return true;
      }
    }
    return false;
  }

  public async hasAllPermissions(userId: string, permissions: string[], context?: Partial<PermissionContext>): Promise<boolean> {
    for (const permission of permissions) {
      if (!await this.checkPermission(userId, permission, context)) {
        return false;
      }
    }
    return true;
  }

  // Custom rule management
  public addPermissionRule(permission: string, rule: Omit<PermissionRule, 'id'>): string {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullRule: PermissionRule = {
      ...rule,
      id: ruleId
    };

    if (!this.rules.has(permission)) {
      this.rules.set(permission, []);
    }

    this.rules.get(permission)!.push(fullRule);
    this.logger.debug(`Added permission rule for ${permission}: ${ruleId}`);
    
    return ruleId;
  }

  public removePermissionRule(permission: string, ruleId: string): boolean {
    const rules = this.rules.get(permission);
    if (!rules) return false;

    const index = rules.findIndex(rule => rule.id === ruleId);
    if (index === -1) return false;

    rules.splice(index, 1);
    this.logger.debug(`Removed permission rule: ${ruleId}`);
    return true;
  }

  // User management helpers
  public async getUser(userId: string): Promise<User | null> {
    try {
      let user = this.users.get(userId);
      
      if (!user) {
        const collection = this.database.collection('users');
        const userData = await collection.findOne({ id: userId });
        if (userData) {
          user = userData as User;
          this.users.set(userId, user);
        }
      }

      return user || null;
    } catch (error) {
      this.logger.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  public async grantPermissionToUser(userId: string, permission: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      if (!user.permissions.includes(permission)) {
        user.permissions.push(permission);
        
        // Update in database
        const collection = this.database.collection('users');
        await collection.updateOne(
          { id: userId },
          { $addToSet: { permissions: permission } }
        );

        this.users.set(userId, user);
        this.logger.debug(`Granted permission ${permission} to user ${userId}`);
        this.emit('permission-granted', { userId, permission });
      }
    } catch (error) {
      this.logger.error(`Error granting permission ${permission} to user ${userId}:`, error);
      throw error;
    }
  }

  public async revokePermissionFromUser(userId: string, permission: string): Promise<void> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      user.permissions = user.permissions.filter(p => p !== permission);
      
      // Update in database
      const collection = this.database.collection('users');
      await collection.updateOne(
        { id: userId },
        { $pull: { permissions: permission } }
      );

      this.users.set(userId, user);
      this.logger.debug(`Revoked permission ${permission} from user ${userId}`);
      this.emit('permission-revoked', { userId, permission });
    } catch (error) {
      this.logger.error(`Error revoking permission ${permission} from user ${userId}:`, error);
      throw error;
    }
  }

  // Utility methods
  public async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    const permissions = new Set<string>(user.permissions);

    // Add role permissions
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (role) {
        role.permissions.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }

  public getPermission(permissionId: string): Permission | null {
    return this.permissions.get(permissionId) || null;
  }

  public getRole(roleId: string): Role | null {
    return this.roles.get(roleId) || null;
  }

  public getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values());
  }

  public getAllRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  private async logPermissionCheck(check: PermissionCheck): Promise<void> {
    try {
      const collection = this.database.collection('permission_logs');
      await collection.insertOne(check);
    } catch (error) {
      this.logger.error('Error logging permission check:', error);
    }
  }

  // Initialize default permissions and roles
  public async initialize(): Promise<void> {
    try {
      await this.loadPermissions();
      await this.loadRoles();
      await this.createDefaultRoles();
      this.logger.info('Permission manager initialized');
    } catch (error) {
      this.logger.error('Error initializing permission manager:', error);
      throw error;
    }
  }

  private async loadPermissions(): Promise<void> {
    try {
      const collection = this.database.collection('permissions');
      const permissions = await collection.find({}).toArray();
      
      permissions.forEach((permission: Permission) => {
        this.permissions.set(permission.id, permission);
      });

      this.logger.debug(`Loaded ${permissions.length} permissions`);
    } catch (error) {
      this.logger.error('Error loading permissions:', error);
    }
  }

  private async loadRoles(): Promise<void> {
    try {
      const collection = this.database.collection('roles');
      const roles = await collection.find({}).toArray();
      
      roles.forEach((role: Role) => {
        this.roles.set(role.id, role);
      });

      this.logger.debug(`Loaded ${roles.length} roles`);
    } catch (error) {
      this.logger.error('Error loading roles:', error);
    }
  }

  private async createDefaultRoles(): Promise<void> {
    // Create admin role if it doesn't exist
    if (!this.roles.has('admin')) {
      await this.createRole({
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: Array.from(this.permissions.keys()),
        isDefault: false,
        isSystem: true
      });
    }

    // Create user role if it doesn't exist
    if (!this.roles.has('user')) {
      await this.createRole({
        id: 'user',
        name: 'User',
        description: 'Basic user access',
        permissions: ['content:read', 'profile:edit'],
        isDefault: true,
        isSystem: true
      });
    }
  }
}
