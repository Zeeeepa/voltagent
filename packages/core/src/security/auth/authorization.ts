/**
 * Authorization module for VoltAgent Security Framework
 */

import type {
  AuthorizationConfig,
  AuthorizationResult,
  SecurityContext,
  SecurityError,
  RoleDefinition,
  PermissionDefinition,
} from '../types';

/**
 * Authorization manager for role-based and attribute-based access control
 */
export class AuthorizationManager {
  private config: AuthorizationConfig;
  private roleCache: Map<string, RoleDefinition> = new Map();
  private permissionCache: Map<string, PermissionDefinition> = new Map();

  constructor(config: AuthorizationConfig) {
    this.config = config;
    this.initializeCaches();
  }

  /**
   * Check if a user has the required permissions
   */
  async authorize(
    context: SecurityContext,
    requiredPermissions: string[]
  ): Promise<AuthorizationResult> {
    if (!this.config.enabled) {
      return {
        success: true,
        requiredPermissions,
        userPermissions: ['*'], // All permissions when authorization is disabled
      };
    }

    try {
      const userPermissions = await this.getUserPermissions(context);
      const hasPermission = this.checkPermissions(userPermissions, requiredPermissions, context);

      if (hasPermission) {
        return {
          success: true,
          requiredPermissions,
          userPermissions,
        };
      } else {
        return {
          success: false,
          requiredPermissions,
          userPermissions,
          error: this.createError(
            'INSUFFICIENT_PERMISSIONS',
            `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
            403,
            {
              required: requiredPermissions,
              user: userPermissions,
            }
          ),
        };
      }
    } catch (error) {
      return {
        success: false,
        requiredPermissions,
        error: this.createError(
          'AUTHORIZATION_ERROR',
          'Authorization check failed',
          500,
          { originalError: error }
        ),
      };
    }
  }

  /**
   * Check if a user has a specific role
   */
  hasRole(context: SecurityContext, roleName: string): boolean {
    return context.roles.includes(roleName);
  }

  /**
   * Check if a user has any of the specified roles
   */
  hasAnyRole(context: SecurityContext, roleNames: string[]): boolean {
    return roleNames.some(role => context.roles.includes(role));
  }

  /**
   * Check if a user has all of the specified roles
   */
  hasAllRoles(context: SecurityContext, roleNames: string[]): boolean {
    return roleNames.every(role => context.roles.includes(role));
  }

  /**
   * Get all permissions for a user based on their roles
   */
  async getUserPermissions(context: SecurityContext): Promise<string[]> {
    const permissions = new Set<string>();

    // Add direct permissions from context
    context.permissions.forEach(permission => permissions.add(permission));

    // Add permissions from roles
    for (const roleName of context.roles) {
      const role = this.roleCache.get(roleName);
      if (role) {
        // Add direct role permissions
        role.permissions.forEach(permission => permissions.add(permission));

        // Add inherited permissions from parent roles
        if (role.inherits) {
          const inheritedPermissions = await this.getInheritedPermissions(role.inherits);
          inheritedPermissions.forEach(permission => permissions.add(permission));
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Add a new role definition
   */
  addRole(role: RoleDefinition): void {
    this.roleCache.set(role.name, role);
  }

  /**
   * Add a new permission definition
   */
  addPermission(permission: PermissionDefinition): void {
    this.permissionCache.set(permission.name, permission);
  }

  /**
   * Remove a role definition
   */
  removeRole(roleName: string): void {
    this.roleCache.delete(roleName);
  }

  /**
   * Remove a permission definition
   */
  removePermission(permissionName: string): void {
    this.permissionCache.delete(permissionName);
  }

  /**
   * Get role definition by name
   */
  getRole(roleName: string): RoleDefinition | undefined {
    return this.roleCache.get(roleName);
  }

  /**
   * Get permission definition by name
   */
  getPermission(permissionName: string): PermissionDefinition | undefined {
    return this.permissionCache.get(permissionName);
  }

  /**
   * Get all role definitions
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roleCache.values());
  }

  /**
   * Get all permission definitions
   */
  getAllPermissions(): PermissionDefinition[] {
    return Array.from(this.permissionCache.values());
  }

  /**
   * Validate authorization configuration
   */
  validate(): string[] {
    const errors: string[] = [];

    if (this.config.enabled && !this.config.strategy) {
      errors.push('Authorization strategy must be specified when authorization is enabled');
    }

    // Validate role definitions
    if (this.config.roles) {
      for (const role of this.config.roles) {
        if (!role.name) {
          errors.push('Role name is required');
        }
        if (!role.permissions || role.permissions.length === 0) {
          errors.push(`Role '${role.name}' must have at least one permission`);
        }

        // Check for circular inheritance
        if (role.inherits) {
          const visited = new Set<string>();
          if (this.hasCircularInheritance(role.name, role.inherits, visited)) {
            errors.push(`Role '${role.name}' has circular inheritance`);
          }
        }
      }
    }

    // Validate permission definitions
    if (this.config.permissions) {
      for (const permission of this.config.permissions) {
        if (!permission.name) {
          errors.push('Permission name is required');
        }
      }
    }

    return errors;
  }

  private initializeCaches(): void {
    // Initialize role cache
    if (this.config.roles) {
      for (const role of this.config.roles) {
        this.roleCache.set(role.name, role);
      }
    }

    // Initialize permission cache
    if (this.config.permissions) {
      for (const permission of this.config.permissions) {
        this.permissionCache.set(permission.name, permission);
      }
    }
  }

  private async getInheritedPermissions(parentRoles: string[]): Promise<string[]> {
    const permissions = new Set<string>();

    for (const parentRoleName of parentRoles) {
      const parentRole = this.roleCache.get(parentRoleName);
      if (parentRole) {
        // Add parent role permissions
        parentRole.permissions.forEach(permission => permissions.add(permission));

        // Recursively add inherited permissions
        if (parentRole.inherits) {
          const inheritedPermissions = await this.getInheritedPermissions(parentRole.inherits);
          inheritedPermissions.forEach(permission => permissions.add(permission));
        }
      }
    }

    return Array.from(permissions);
  }

  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    context: SecurityContext
  ): boolean {
    // Check for wildcard permission
    if (userPermissions.includes('*')) {
      return true;
    }

    // Check each required permission
    for (const required of requiredPermissions) {
      if (!this.hasPermission(userPermissions, required, context)) {
        return false;
      }
    }

    return true;
  }

  private hasPermission(
    userPermissions: string[],
    requiredPermission: string,
    context: SecurityContext
  ): boolean {
    // Direct permission match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Check permission definition for resource and action matching
    const permissionDef = this.permissionCache.get(requiredPermission);
    if (permissionDef) {
      // Check if user has permission for the resource and action
      for (const userPerm of userPermissions) {
        const userPermDef = this.permissionCache.get(userPerm);
        if (userPermDef) {
          if (this.permissionMatches(userPermDef, permissionDef, context)) {
            return true;
          }
        }
      }
    }

    // Check for wildcard patterns
    for (const userPerm of userPermissions) {
      if (this.wildcardMatch(userPerm, requiredPermission)) {
        return true;
      }
    }

    return false;
  }

  private permissionMatches(
    userPermission: PermissionDefinition,
    requiredPermission: PermissionDefinition,
    context: SecurityContext
  ): boolean {
    // Check resource match
    if (requiredPermission.resource && userPermission.resource) {
      if (userPermission.resource !== '*' && userPermission.resource !== requiredPermission.resource) {
        return false;
      }
    }

    // Check action match
    if (requiredPermission.actions && userPermission.actions) {
      if (!userPermission.actions.includes('*')) {
        const hasMatchingAction = requiredPermission.actions.some(action =>
          userPermission.actions!.includes(action)
        );
        if (!hasMatchingAction) {
          return false;
        }
      }
    }

    return true;
  }

  private wildcardMatch(pattern: string, text: string): boolean {
    // Simple wildcard matching with * and ?
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }

  private hasCircularInheritance(
    roleName: string,
    parentRoles: string[],
    visited: Set<string>
  ): boolean {
    if (visited.has(roleName)) {
      return true;
    }

    visited.add(roleName);

    for (const parentRoleName of parentRoles) {
      const parentRole = this.roleCache.get(parentRoleName);
      if (parentRole && parentRole.inherits) {
        if (this.hasCircularInheritance(parentRoleName, parentRole.inherits, visited)) {
          return true;
        }
      }
    }

    visited.delete(roleName);
    return false;
  }

  private createError(code: string, message: string, status: number, details?: any): SecurityError {
    const error = new Error(message) as SecurityError;
    error.code = code;
    error.status = status;
    error.details = details;
    return error;
  }
}

/**
 * Permission decorator for method-level authorization
 */
export function RequirePermissions(permissions: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // This would need to be integrated with the actual request context
      // For now, it's a placeholder for the decorator pattern
      const context = this.getSecurityContext?.() as SecurityContext;
      if (context) {
        const authManager = this.getAuthorizationManager?.() as AuthorizationManager;
        if (authManager) {
          const result = await authManager.authorize(context, permissions);
          if (!result.success) {
            throw result.error;
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Role decorator for method-level role checking
 */
export function RequireRoles(roles: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context = this.getSecurityContext?.() as SecurityContext;
      if (context) {
        const authManager = this.getAuthorizationManager?.() as AuthorizationManager;
        if (authManager) {
          const hasRole = authManager.hasAnyRole(context, roles);
          if (!hasRole) {
            const error = new Error(`Access denied. Required roles: ${roles.join(', ')}`) as SecurityError;
            error.code = 'INSUFFICIENT_ROLES';
            error.status = 403;
            throw error;
          }
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

