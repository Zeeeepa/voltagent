/**
 * Database Security Manager
 * 
 * Comprehensive security framework with access control,
 * encryption, and audit logging
 */

import * as crypto from 'crypto';
import type {
  SecurityConfig,
  AccessControlConfig,
} from '../types';

import type {
  ISecurityManager,
  SecurityPolicy,
} from '../interfaces';

/**
 * Security manager implementation
 */
export class SecurityManager implements ISecurityManager {
  private config: SecurityConfig;
  private auditLog: Array<{
    timestamp: Date;
    operation: string;
    user: string;
    resource: string;
    success: boolean;
    details?: any;
  }> = [];

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableRowLevelSecurity: config?.enableRowLevelSecurity ?? false,
      encryptionKey: config?.encryptionKey,
      auditLogging: config?.auditLogging ?? true,
      accessControl: {
        enableRBAC: config?.accessControl?.enableRBAC ?? false,
        defaultRole: config?.accessControl?.defaultRole ?? 'user',
        roles: config?.accessControl?.roles ?? {},
      },
    };
  }

  /**
   * Validate access for an operation
   */
  async validateAccess(operation: string, resource: string, user: string): Promise<boolean> {
    if (!this.config.accessControl.enableRBAC) {
      return true; // No access control enabled
    }

    try {
      // Get user role (this would typically come from a user service)
      const userRole = this.getUserRole(user);
      const allowedOperations = this.config.accessControl.roles[userRole] || [];

      const hasAccess = allowedOperations.includes(operation) || allowedOperations.includes('*');

      // Log the access attempt
      if (this.config.auditLogging) {
        await this.auditLog(operation, user, resource, hasAccess ? 'granted' : 'denied');
      }

      return hasAccess;
    } catch (error) {
      // Log the error and deny access
      if (this.config.auditLogging) {
        await this.auditLog(operation, user, resource, `error: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: any): Promise<string> {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.config.encryptionKey);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm,
    });
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(encryptedData: string): Promise<any> {
    if (!this.config.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    try {
      const { encrypted, iv, authTag, algorithm } = JSON.parse(encryptedData);
      
      const decipher = crypto.createDecipher(algorithm, this.config.encryptionKey);
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Log audit events
   */
  async auditLog(operation: string, user: string, resource: string, details?: any): Promise<void> {
    if (!this.config.auditLogging) {
      return;
    }

    const logEntry = {
      timestamp: new Date(),
      operation,
      user,
      resource,
      success: typeof details === 'string' ? !details.startsWith('error:') : true,
      details,
    };

    this.auditLog.push(logEntry);

    // In a real implementation, this would be persisted to a secure audit log
    console.log('[AUDIT]', JSON.stringify(logEntry));

    // Limit in-memory audit log size
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Set up row-level security policy
   */
  async setupRowLevelSecurity(table: string, policy: SecurityPolicy): Promise<void> {
    if (!this.config.enableRowLevelSecurity) {
      throw new Error('Row-level security is not enabled');
    }

    // This would typically execute SQL to create RLS policies
    // Implementation depends on the database provider
    console.log(`Setting up RLS policy for table ${table}:`, policy);
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit = 100): Array<any> {
    return this.auditLog.slice(-limit);
  }

  /**
   * Hash password securely
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    
    return JSON.stringify({
      salt: salt.toString('hex'),
      hash: hash.toString('hex'),
    });
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const { salt, hash } = JSON.parse(hashedPassword);
      const saltBuffer = Buffer.from(salt, 'hex');
      const hashBuffer = Buffer.from(hash, 'hex');
      
      const computedHash = crypto.pbkdf2Sync(password, saltBuffer, 100000, 64, 'sha512');
      
      return crypto.timingSafeEqual(hashBuffer, computedHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Sanitize SQL input to prevent injection
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    // Basic SQL injection prevention
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, ''); // Remove block comment end
  }

  // Private methods

  private getUserRole(user: string): string {
    // In a real implementation, this would query a user service or database
    // For now, return the default role
    return this.config.accessControl.defaultRole;
  }
}

