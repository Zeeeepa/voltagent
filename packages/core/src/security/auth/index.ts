/**
 * Authentication module for VoltAgent Security Framework
 */

import type {
  AuthConfig,
  AuthenticationResult,
  UserInfo,
  AuthMethod,
  SecurityError,
  JwtConfig,
  ApiKeyConfig,
  OAuthConfig,
} from '../types';

/**
 * Base authentication provider interface
 */
export interface AuthProvider {
  /** Authentication method name */
  method: AuthMethod;
  /** Authenticate a request */
  authenticate(context: AuthContext): Promise<AuthenticationResult>;
  /** Validate provider configuration */
  validate(): string[];
}

/**
 * Authentication context
 */
export interface AuthContext {
  /** Request headers */
  headers: Record<string, string>;
  /** Query parameters */
  query: Record<string, string>;
  /** Cookies */
  cookies?: Record<string, string>;
  /** Request body */
  body?: any;
  /** Request metadata */
  metadata?: Record<string, any>;
}

/**
 * JWT Authentication Provider
 */
export class JwtAuthProvider implements AuthProvider {
  method: AuthMethod = 'jwt';
  private config: JwtConfig;

  constructor(config: JwtConfig) {
    this.config = config;
  }

  async authenticate(context: AuthContext): Promise<AuthenticationResult> {
    try {
      const token = this.extractToken(context);
      if (!token) {
        return {
          success: false,
          error: this.createError('MISSING_TOKEN', 'JWT token is required', 401),
        };
      }

      const payload = await this.verifyToken(token);
      const user = this.extractUserFromPayload(payload);

      return {
        success: true,
        user,
        method: 'jwt',
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('INVALID_TOKEN', 'Invalid JWT token', 401, { originalError: error }),
      };
    }
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.config.secret) {
      errors.push('JWT secret is required');
    }
    return errors;
  }

  private extractToken(context: AuthContext): string | null {
    // Try header first
    if (this.config.header) {
      const headerValue = context.headers[this.config.header.toLowerCase()];
      if (headerValue) {
        // Handle "Bearer <token>" format
        if (headerValue.startsWith('Bearer ')) {
          return headerValue.substring(7);
        }
        return headerValue;
      }
    }

    // Try query parameter
    if (this.config.queryParam && context.query[this.config.queryParam]) {
      return context.query[this.config.queryParam];
    }

    // Try cookie
    if (this.config.cookie && context.cookies?.[this.config.cookie]) {
      return context.cookies[this.config.cookie];
    }

    return null;
  }

  private async verifyToken(token: string): Promise<any> {
    // This is a simplified JWT verification
    // In a real implementation, you would use a proper JWT library like 'jsonwebtoken'
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }

      // Check issuer
      if (this.config.issuer && payload.iss !== this.config.issuer) {
        throw new Error('Invalid issuer');
      }

      // Check audience
      if (this.config.audience && payload.aud !== this.config.audience) {
        throw new Error('Invalid audience');
      }

      return payload;
    } catch (error) {
      throw new Error(`JWT verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractUserFromPayload(payload: any): UserInfo {
    return {
      id: payload.sub || payload.userId || payload.id,
      username: payload.username || payload.preferred_username,
      email: payload.email,
      name: payload.name || payload.displayName,
      metadata: {
        ...payload,
        // Remove sensitive fields
        iat: undefined,
        exp: undefined,
        aud: undefined,
        iss: undefined,
      },
    };
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
 * API Key Authentication Provider
 */
export class ApiKeyAuthProvider implements AuthProvider {
  method: AuthMethod = 'apikey';
  private config: ApiKeyConfig;

  constructor(config: ApiKeyConfig) {
    this.config = config;
  }

  async authenticate(context: AuthContext): Promise<AuthenticationResult> {
    try {
      const apiKey = this.extractApiKey(context);
      if (!apiKey) {
        return {
          success: false,
          error: this.createError('MISSING_API_KEY', 'API key is required', 401),
        };
      }

      const isValid = await this.validateApiKey(apiKey);
      if (!isValid) {
        return {
          success: false,
          error: this.createError('INVALID_API_KEY', 'Invalid API key', 401),
        };
      }

      // Create a basic user object for API key authentication
      const user: UserInfo = {
        id: `apikey:${this.hashApiKey(apiKey)}`,
        username: `apikey_user_${this.hashApiKey(apiKey).substring(0, 8)}`,
        metadata: {
          authMethod: 'apikey',
          keyPrefix: this.config.prefix,
        },
      };

      return {
        success: true,
        user,
        method: 'apikey',
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('AUTH_ERROR', 'Authentication failed', 500, { originalError: error }),
      };
    }
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.config.header && !this.config.queryParam) {
      errors.push('API key header or query parameter must be specified');
    }
    if (!this.config.keys) {
      errors.push('API keys must be configured');
    }
    return errors;
  }

  private extractApiKey(context: AuthContext): string | null {
    // Try header first
    if (this.config.header) {
      const headerValue = context.headers[this.config.header.toLowerCase()];
      if (headerValue) {
        // Remove prefix if configured
        if (this.config.prefix && headerValue.startsWith(this.config.prefix)) {
          return headerValue.substring(this.config.prefix.length).trim();
        }
        return headerValue;
      }
    }

    // Try query parameter
    if (this.config.queryParam && context.query[this.config.queryParam]) {
      const queryValue = context.query[this.config.queryParam];
      // Remove prefix if configured
      if (this.config.prefix && queryValue.startsWith(this.config.prefix)) {
        return queryValue.substring(this.config.prefix.length).trim();
      }
      return queryValue;
    }

    return null;
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    if (typeof this.config.keys === 'function') {
      return await this.config.keys(apiKey);
    }

    if (Array.isArray(this.config.keys)) {
      return this.config.keys.includes(apiKey);
    }

    return false;
  }

  private hashApiKey(apiKey: string): string {
    // Simple hash for user ID generation (not cryptographically secure)
    let hash = 0;
    for (let i = 0; i < apiKey.length; i++) {
      const char = apiKey.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
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
 * OAuth Authentication Provider
 */
export class OAuthAuthProvider implements AuthProvider {
  method: AuthMethod = 'oauth';
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  async authenticate(context: AuthContext): Promise<AuthenticationResult> {
    try {
      // OAuth authentication typically involves redirects and token exchange
      // This is a simplified implementation for demonstration
      const accessToken = this.extractAccessToken(context);
      if (!accessToken) {
        return {
          success: false,
          error: this.createError('MISSING_ACCESS_TOKEN', 'OAuth access token is required', 401),
        };
      }

      // In a real implementation, you would validate the token with the OAuth provider
      const user = await this.getUserFromToken(accessToken);

      return {
        success: true,
        user,
        method: 'oauth',
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('OAUTH_ERROR', 'OAuth authentication failed', 401, { originalError: error }),
      };
    }
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.config.providers || Object.keys(this.config.providers).length === 0) {
      errors.push('At least one OAuth provider must be configured');
    }

    for (const [name, provider] of Object.entries(this.config.providers)) {
      if (!provider.clientId) {
        errors.push(`OAuth provider '${name}' missing client ID`);
      }
      if (!provider.clientSecret) {
        errors.push(`OAuth provider '${name}' missing client secret`);
      }
      if (!provider.authUrl) {
        errors.push(`OAuth provider '${name}' missing auth URL`);
      }
      if (!provider.tokenUrl) {
        errors.push(`OAuth provider '${name}' missing token URL`);
      }
    }

    return errors;
  }

  private extractAccessToken(context: AuthContext): string | null {
    // Try Authorization header
    const authHeader = context.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try query parameter
    if (context.query['access_token']) {
      return context.query['access_token'];
    }

    return null;
  }

  private async getUserFromToken(accessToken: string): Promise<UserInfo> {
    // This is a placeholder implementation
    // In a real implementation, you would make an API call to the OAuth provider
    // to get user information using the access token
    return {
      id: 'oauth_user_id',
      username: 'oauth_user',
      email: 'user@example.com',
      name: 'OAuth User',
      metadata: {
        authMethod: 'oauth',
        accessToken: accessToken.substring(0, 10) + '...', // Truncated for security
      },
    };
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
 * Authentication manager that coordinates multiple auth providers
 */
export class AuthenticationManager {
  private providers: Map<AuthMethod, AuthProvider> = new Map();
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
    this.initializeProviders();
  }

  /**
   * Authenticate a request using configured providers
   */
  async authenticate(context: AuthContext): Promise<AuthenticationResult> {
    if (!this.config.enabled) {
      // Authentication disabled, create anonymous user
      return {
        success: true,
        user: {
          id: 'anonymous',
          username: 'anonymous',
        },
        method: 'custom',
      };
    }

    const errors: SecurityError[] = [];

    // Try each configured authentication method
    for (const method of this.config.methods) {
      const provider = this.providers.get(method);
      if (!provider) {
        continue;
      }

      const result = await provider.authenticate(context);
      if (result.success) {
        return result;
      }

      if (result.error) {
        errors.push(result.error);
      }
    }

    // All authentication methods failed
    return {
      success: false,
      error: this.createError(
        'AUTH_FAILED',
        'Authentication failed for all configured methods',
        401,
        { attempts: errors }
      ),
    };
  }

  /**
   * Validate all provider configurations
   */
  validate(): string[] {
    const errors: string[] = [];

    if (this.config.enabled && this.config.methods.length === 0) {
      errors.push('At least one authentication method must be configured when authentication is enabled');
    }

    for (const provider of this.providers.values()) {
      errors.push(...provider.validate());
    }

    return errors;
  }

  private initializeProviders(): void {
    // Initialize JWT provider
    if (this.config.methods.includes('jwt') && this.config.jwt) {
      this.providers.set('jwt', new JwtAuthProvider(this.config.jwt));
    }

    // Initialize API key provider
    if (this.config.methods.includes('apikey') && this.config.apiKey) {
      this.providers.set('apikey', new ApiKeyAuthProvider(this.config.apiKey));
    }

    // Initialize OAuth provider
    if (this.config.methods.includes('oauth') && this.config.oauth) {
      this.providers.set('oauth', new OAuthAuthProvider(this.config.oauth));
    }
  }

  private createError(code: string, message: string, status: number, details?: any): SecurityError {
    const error = new Error(message) as SecurityError;
    error.code = code;
    error.status = status;
    error.details = details;
    return error;
  }
}

export { AuthContext, AuthProvider };

