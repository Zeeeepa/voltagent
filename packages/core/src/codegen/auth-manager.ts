/**
 * Codegen Authentication Manager
 * Handles secure token storage, validation, and organization management
 */

import { createHash, createCipher, createDecipher } from 'crypto';
import NodeCache from 'node-cache';
import { AuthenticationInfo, CodegenConfig } from './types';

export interface AuthConfig {
  /** Encryption key for secure credential storage */
  encryptionKey?: string;
  /** Token validation interval in milliseconds */
  validationInterval?: number;
  /** Enable audit logging */
  enableAuditLog?: boolean;
  /** Audit log file path */
  auditLogPath?: string;
}

export interface StoredCredentials {
  /** Encrypted token */
  encryptedToken: string;
  /** Organization ID */
  orgId: string;
  /** Token creation timestamp */
  createdAt: string;
  /** Token expiration timestamp */
  expiresAt?: string;
  /** Token metadata */
  metadata?: Record<string, any>;
}

export interface AuthEvent {
  /** Event type */
  type: 'login' | 'logout' | 'validation' | 'refresh' | 'error';
  /** Event timestamp */
  timestamp: string;
  /** Organization ID */
  orgId: string;
  /** Event details */
  details: Record<string, any>;
  /** Success status */
  success: boolean;
}

export class CodegenAuthManager {
  private cache: NodeCache;
  private config: Required<AuthConfig>;
  private auditLog: AuthEvent[] = [];
  private validationTimer?: NodeJS.Timeout;

  constructor(config: AuthConfig = {}) {
    this.config = {
      encryptionKey: config.encryptionKey || this.generateEncryptionKey(),
      validationInterval: config.validationInterval || 300000, // 5 minutes
      enableAuditLog: config.enableAuditLog || true,
      auditLogPath: config.auditLogPath || './codegen-auth.log'
    };

    // Initialize cache for token validation results
    this.cache = new NodeCache({
      stdTTL: 300, // 5 minutes
      checkperiod: 60 // Check for expired keys every minute
    });

    // Start periodic token validation
    this.startTokenValidation();
  }

  /**
   * Generate a secure encryption key
   */
  private generateEncryptionKey(): string {
    return createHash('sha256')
      .update(Date.now().toString() + Math.random().toString())
      .digest('hex');
  }

  /**
   * Encrypt sensitive data
   */
  private encrypt(data: string): string {
    try {
      const cipher = createCipher('aes-256-cbc', this.config.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      this.logAuthEvent('error', '', { 
        action: 'encrypt', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, false);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  private decrypt(encryptedData: string): string {
    try {
      const decipher = createDecipher('aes-256-cbc', this.config.encryptionKey);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logAuthEvent('error', '', { 
        action: 'decrypt', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, false);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store credentials securely
   */
  storeCredentials(orgId: string, token: string, expiresAt?: string): StoredCredentials {
    try {
      const encryptedToken = this.encrypt(token);
      const credentials: StoredCredentials = {
        encryptedToken,
        orgId,
        createdAt: new Date().toISOString(),
        expiresAt,
        metadata: {
          tokenHash: createHash('sha256').update(token).digest('hex').substring(0, 8)
        }
      };

      // Store in cache for quick access
      this.cache.set(`creds:${orgId}`, credentials);

      this.logAuthEvent('login', orgId, { 
        action: 'store_credentials',
        tokenHash: credentials.metadata?.tokenHash 
      }, true);

      return credentials;
    } catch (error) {
      this.logAuthEvent('error', orgId, { 
        action: 'store_credentials', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, false);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt credentials
   */
  getCredentials(orgId: string): { token: string; credentials: StoredCredentials } | null {
    try {
      const credentials = this.cache.get<StoredCredentials>(`creds:${orgId}`);
      if (!credentials) {
        return null;
      }

      // Check if token is expired
      if (credentials.expiresAt && new Date(credentials.expiresAt) < new Date()) {
        this.removeCredentials(orgId);
        this.logAuthEvent('error', orgId, { 
          action: 'get_credentials', 
          error: 'Token expired' 
        }, false);
        return null;
      }

      const token = this.decrypt(credentials.encryptedToken);
      return { token, credentials };
    } catch (error) {
      this.logAuthEvent('error', orgId, { 
        action: 'get_credentials', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, false);
      return null;
    }
  }

  /**
   * Remove stored credentials
   */
  removeCredentials(orgId: string): void {
    this.cache.del(`creds:${orgId}`);
    this.cache.del(`validation:${orgId}`);
    
    this.logAuthEvent('logout', orgId, { 
      action: 'remove_credentials' 
    }, true);
  }

  /**
   * Validate token format
   */
  validateTokenFormat(token: string): boolean {
    // Basic token format validation
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check minimum length
    if (token.length < 10) {
      return false;
    }

    // Check for common token patterns (adjust based on actual Codegen token format)
    const tokenPattern = /^[a-zA-Z0-9_-]+$/;
    return tokenPattern.test(token);
  }

  /**
   * Validate organization ID format
   */
  validateOrgIdFormat(orgId: string): boolean {
    if (!orgId || typeof orgId !== 'string') {
      return false;
    }

    // Check minimum length
    if (orgId.length < 3) {
      return false;
    }

    // Check for valid characters (adjust based on actual Codegen org ID format)
    const orgIdPattern = /^[a-zA-Z0-9_-]+$/;
    return orgIdPattern.test(orgId);
  }

  /**
   * Cache authentication validation result
   */
  cacheValidationResult(orgId: string, authInfo: AuthenticationInfo): void {
    this.cache.set(`validation:${orgId}`, authInfo, 300); // Cache for 5 minutes
    
    this.logAuthEvent('validation', orgId, { 
      action: 'cache_validation',
      valid: authInfo.valid,
      quota: authInfo.quota 
    }, authInfo.valid);
  }

  /**
   * Get cached validation result
   */
  getCachedValidationResult(orgId: string): AuthenticationInfo | null {
    return this.cache.get<AuthenticationInfo>(`validation:${orgId}`) || null;
  }

  /**
   * Check if organization context should be switched
   */
  shouldSwitchOrganization(currentOrgId: string, newOrgId: string): boolean {
    if (currentOrgId === newOrgId) {
      return false;
    }

    // Check if we have valid credentials for the new organization
    const newCredentials = this.getCredentials(newOrgId);
    return newCredentials !== null;
  }

  /**
   * Get organization permissions
   */
  getOrganizationPermissions(orgId: string): {
    canCreateTasks: boolean;
    canAccessRepositories: boolean;
    canCreatePRs: boolean;
    quotaRemaining: number;
  } {
    const validation = this.getCachedValidationResult(orgId);
    
    if (!validation || !validation.valid) {
      return {
        canCreateTasks: false,
        canAccessRepositories: false,
        canCreatePRs: false,
        quotaRemaining: 0
      };
    }

    const quotaRemaining = validation.quota 
      ? validation.quota.limit - validation.quota.used 
      : 0;

    return {
      canCreateTasks: quotaRemaining > 0,
      canAccessRepositories: true,
      canCreatePRs: quotaRemaining > 0,
      quotaRemaining
    };
  }

  /**
   * Monitor quota usage
   */
  getQuotaUsage(orgId: string): {
    used: number;
    limit: number;
    percentage: number;
    resetAt?: string;
  } | null {
    const validation = this.getCachedValidationResult(orgId);
    
    if (!validation?.quota) {
      return null;
    }

    return {
      used: validation.quota.used,
      limit: validation.quota.limit,
      percentage: (validation.quota.used / validation.quota.limit) * 100,
      resetAt: validation.quota.resetAt
    };
  }

  /**
   * Start periodic token validation
   */
  private startTokenValidation(): void {
    this.validationTimer = setInterval(() => {
      this.validateStoredTokens();
    }, this.config.validationInterval);
  }

  /**
   * Validate all stored tokens
   */
  private async validateStoredTokens(): Promise<void> {
    const keys = this.cache.keys().filter(key => key.startsWith('creds:'));
    
    for (const key of keys) {
      const orgId = key.replace('creds:', '');
      const credentials = this.getCredentials(orgId);
      
      if (credentials) {
        // Here you would typically make an API call to validate the token
        // For now, we'll just check expiration
        if (credentials.credentials.expiresAt && 
            new Date(credentials.credentials.expiresAt) < new Date()) {
          this.removeCredentials(orgId);
        }
      }
    }
  }

  /**
   * Log authentication events
   */
  private logAuthEvent(
    type: AuthEvent['type'], 
    orgId: string, 
    details: Record<string, any>, 
    success: boolean
  ): void {
    if (!this.config.enableAuditLog) {
      return;
    }

    const event: AuthEvent = {
      type,
      timestamp: new Date().toISOString(),
      orgId,
      details,
      success
    };

    this.auditLog.push(event);

    // Keep only last 1000 events in memory
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth] ${type.toUpperCase()} - ${orgId} - ${success ? 'SUCCESS' : 'FAILURE'}`, details);
    }
  }

  /**
   * Get authentication audit log
   */
  getAuditLog(orgId?: string, limit: number = 100): AuthEvent[] {
    let events = this.auditLog;
    
    if (orgId) {
      events = events.filter(event => event.orgId === orgId);
    }

    return events.slice(-limit);
  }

  /**
   * Get authentication health status
   */
  getHealthStatus(): {
    activeOrganizations: number;
    cachedValidations: number;
    auditLogSize: number;
    validationInterval: number;
  } {
    const credsKeys = this.cache.keys().filter(key => key.startsWith('creds:'));
    const validationKeys = this.cache.keys().filter(key => key.startsWith('validation:'));

    return {
      activeOrganizations: credsKeys.length,
      cachedValidations: validationKeys.length,
      auditLogSize: this.auditLog.length,
      validationInterval: this.config.validationInterval
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
    }
    
    this.cache.close();
    this.auditLog = [];
  }
}

