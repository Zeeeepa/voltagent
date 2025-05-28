/**
 * Security configuration management for VoltAgent Security Framework
 */

import type { SecurityConfig, AuthMethod } from '../types';

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  auth: {
    enabled: true,
    methods: ['apikey'] as AuthMethod[],
    apiKey: {
      header: 'X-API-Key',
      queryParam: 'api_key',
      keys: [], // Must be configured by user
    },
  },
  authorization: {
    enabled: true,
    strategy: 'rbac',
    defaultRoles: ['user'],
    roles: [
      {
        name: 'admin',
        description: 'Administrator with full access',
        permissions: ['*'],
      },
      {
        name: 'user',
        description: 'Regular user with limited access',
        permissions: ['read', 'execute'],
      },
      {
        name: 'readonly',
        description: 'Read-only access',
        permissions: ['read'],
      },
    ],
    permissions: [
      {
        name: 'read',
        description: 'Read access to resources',
        actions: ['GET'],
      },
      {
        name: 'write',
        description: 'Write access to resources',
        actions: ['POST', 'PUT', 'PATCH'],
      },
      {
        name: 'delete',
        description: 'Delete access to resources',
        actions: ['DELETE'],
      },
      {
        name: 'execute',
        description: 'Execute agent operations',
        actions: ['POST'],
        resource: 'agents',
      },
      {
        name: '*',
        description: 'Full access to all resources',
        actions: ['*'],
      },
    ],
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['Content-Length', 'X-Request-ID'],
    credentials: false,
    maxAge: 86400, // 24 hours
  },
  headers: {
    contentSecurityPolicy: "default-src 'self'",
    frameOptions: 'DENY',
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xssProtection: true,
  },
  rateLimit: {
    max: 100, // 100 requests
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },
  validation: {
    body: true,
    query: true,
    headers: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
    ],
  },
};

/**
 * Security configuration builder for fluent configuration
 */
export class SecurityConfigBuilder {
  private config: Partial<SecurityConfig> = {};

  /**
   * Set authentication configuration
   */
  auth(authConfig: Partial<SecurityConfig['auth']>): this {
    this.config.auth = { ...this.config.auth, ...authConfig };
    return this;
  }

  /**
   * Enable JWT authentication
   */
  withJWT(jwtConfig: NonNullable<SecurityConfig['auth']['jwt']>): this {
    if (!this.config.auth) this.config.auth = { enabled: true, methods: [] };
    this.config.auth.jwt = jwtConfig;
    if (!this.config.auth.methods.includes('jwt')) {
      this.config.auth.methods.push('jwt');
    }
    return this;
  }

  /**
   * Enable API key authentication
   */
  withApiKey(apiKeyConfig: NonNullable<SecurityConfig['auth']['apiKey']>): this {
    if (!this.config.auth) this.config.auth = { enabled: true, methods: [] };
    this.config.auth.apiKey = apiKeyConfig;
    if (!this.config.auth.methods.includes('apikey')) {
      this.config.auth.methods.push('apikey');
    }
    return this;
  }

  /**
   * Enable OAuth authentication
   */
  withOAuth(oauthConfig: NonNullable<SecurityConfig['auth']['oauth']>): this {
    if (!this.config.auth) this.config.auth = { enabled: true, methods: [] };
    this.config.auth.oauth = oauthConfig;
    if (!this.config.auth.methods.includes('oauth')) {
      this.config.auth.methods.push('oauth');
    }
    return this;
  }

  /**
   * Set authorization configuration
   */
  authorization(authzConfig: Partial<SecurityConfig['authorization']>): this {
    this.config.authorization = { ...this.config.authorization, ...authzConfig };
    return this;
  }

  /**
   * Set CORS configuration
   */
  cors(corsConfig: Partial<SecurityConfig['cors']>): this {
    this.config.cors = { ...this.config.cors, ...corsConfig };
    return this;
  }

  /**
   * Set security headers configuration
   */
  headers(headersConfig: Partial<SecurityConfig['headers']>): this {
    this.config.headers = { ...this.config.headers, ...headersConfig };
    return this;
  }

  /**
   * Set rate limiting configuration
   */
  rateLimit(rateLimitConfig: SecurityConfig['rateLimit']): this {
    this.config.rateLimit = rateLimitConfig;
    return this;
  }

  /**
   * Set validation configuration
   */
  validation(validationConfig: Partial<SecurityConfig['validation']>): this {
    this.config.validation = { ...this.config.validation, ...validationConfig };
    return this;
  }

  /**
   * Build the final security configuration
   */
  build(): SecurityConfig {
    return mergeSecurityConfig(DEFAULT_SECURITY_CONFIG, this.config);
  }
}

/**
 * Create a new security configuration builder
 */
export function createSecurityConfig(): SecurityConfigBuilder {
  return new SecurityConfigBuilder();
}

/**
 * Merge security configurations with deep merge
 */
export function mergeSecurityConfig(
  base: SecurityConfig,
  override: Partial<SecurityConfig>
): SecurityConfig {
  const merged = { ...base };

  if (override.auth) {
    merged.auth = { ...merged.auth, ...override.auth };
    if (override.auth.jwt) {
      merged.auth.jwt = { ...merged.auth.jwt, ...override.auth.jwt };
    }
    if (override.auth.apiKey) {
      merged.auth.apiKey = { ...merged.auth.apiKey, ...override.auth.apiKey };
    }
    if (override.auth.oauth) {
      merged.auth.oauth = { ...merged.auth.oauth, ...override.auth.oauth };
    }
  }

  if (override.authorization) {
    merged.authorization = { ...merged.authorization, ...override.authorization };
    if (override.authorization.roles) {
      merged.authorization.roles = override.authorization.roles;
    }
    if (override.authorization.permissions) {
      merged.authorization.permissions = override.authorization.permissions;
    }
  }

  if (override.cors) {
    merged.cors = { ...merged.cors, ...override.cors };
  }

  if (override.headers) {
    merged.headers = { ...merged.headers, ...override.headers };
  }

  if (override.rateLimit) {
    merged.rateLimit = override.rateLimit;
  }

  if (override.validation) {
    merged.validation = { ...merged.validation, ...override.validation };
  }

  return merged;
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(config: SecurityConfig): string[] {
  const errors: string[] = [];

  // Validate authentication configuration
  if (config.auth.enabled) {
    if (!config.auth.methods || config.auth.methods.length === 0) {
      errors.push('At least one authentication method must be specified when auth is enabled');
    }

    if (config.auth.methods.includes('jwt') && !config.auth.jwt) {
      errors.push('JWT configuration is required when JWT authentication is enabled');
    }

    if (config.auth.methods.includes('apikey') && !config.auth.apiKey) {
      errors.push('API key configuration is required when API key authentication is enabled');
    }

    if (config.auth.methods.includes('oauth') && !config.auth.oauth) {
      errors.push('OAuth configuration is required when OAuth authentication is enabled');
    }

    // Validate JWT configuration
    if (config.auth.jwt && !config.auth.jwt.secret) {
      errors.push('JWT secret is required');
    }

    // Validate API key configuration
    if (config.auth.apiKey) {
      if (!config.auth.apiKey.header && !config.auth.apiKey.queryParam) {
        errors.push('API key header or query parameter must be specified');
      }
      if (!config.auth.apiKey.keys || (Array.isArray(config.auth.apiKey.keys) && config.auth.apiKey.keys.length === 0)) {
        errors.push('API keys must be configured');
      }
    }
  }

  // Validate authorization configuration
  if (config.authorization.enabled) {
    if (!config.authorization.strategy) {
      errors.push('Authorization strategy must be specified when authorization is enabled');
    }
  }

  // Validate CORS configuration
  if (!config.cors.origin) {
    errors.push('CORS origin must be specified');
  }

  if (!config.cors.methods || config.cors.methods.length === 0) {
    errors.push('CORS methods must be specified');
  }

  // Validate rate limiting configuration
  if (config.rateLimit) {
    if (config.rateLimit.max <= 0) {
      errors.push('Rate limit max must be greater than 0');
    }
    if (config.rateLimit.windowMs <= 0) {
      errors.push('Rate limit window must be greater than 0');
    }
  }

  return errors;
}

/**
 * Environment-based configuration loader
 */
export function loadSecurityConfigFromEnv(): Partial<SecurityConfig> {
  const config: Partial<SecurityConfig> = {};

  // Load authentication configuration from environment
  if (process.env.VOLTAGENT_AUTH_ENABLED) {
    config.auth = {
      enabled: process.env.VOLTAGENT_AUTH_ENABLED === 'true',
      methods: (process.env.VOLTAGENT_AUTH_METHODS?.split(',') as AuthMethod[]) || ['apikey'],
    };

    // JWT configuration
    if (process.env.VOLTAGENT_JWT_SECRET) {
      config.auth.jwt = {
        secret: process.env.VOLTAGENT_JWT_SECRET,
        algorithm: process.env.VOLTAGENT_JWT_ALGORITHM || 'HS256',
        expiresIn: process.env.VOLTAGENT_JWT_EXPIRES_IN || '1h',
        issuer: process.env.VOLTAGENT_JWT_ISSUER,
        audience: process.env.VOLTAGENT_JWT_AUDIENCE,
        header: process.env.VOLTAGENT_JWT_HEADER || 'Authorization',
      };
    }

    // API key configuration
    if (process.env.VOLTAGENT_API_KEYS) {
      config.auth.apiKey = {
        header: process.env.VOLTAGENT_API_KEY_HEADER || 'X-API-Key',
        queryParam: process.env.VOLTAGENT_API_KEY_QUERY || 'api_key',
        keys: process.env.VOLTAGENT_API_KEYS.split(','),
        prefix: process.env.VOLTAGENT_API_KEY_PREFIX,
      };
    }
  }

  // Load CORS configuration from environment
  if (process.env.VOLTAGENT_CORS_ORIGIN) {
    config.cors = {
      origin: process.env.VOLTAGENT_CORS_ORIGIN === '*' ? '*' : process.env.VOLTAGENT_CORS_ORIGIN.split(','),
      methods: process.env.VOLTAGENT_CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: process.env.VOLTAGENT_CORS_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: process.env.VOLTAGENT_CORS_CREDENTIALS === 'true',
    };
  }

  // Load rate limiting configuration from environment
  if (process.env.VOLTAGENT_RATE_LIMIT_MAX) {
    config.rateLimit = {
      max: parseInt(process.env.VOLTAGENT_RATE_LIMIT_MAX, 10),
      windowMs: parseInt(process.env.VOLTAGENT_RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes default
      message: process.env.VOLTAGENT_RATE_LIMIT_MESSAGE || 'Too many requests, please try again later',
    };
  }

  return config;
}

