/**
 * VoltAgent Security Framework
 * 
 * A comprehensive, unified security system providing:
 * - Authentication (JWT, API Keys, OAuth)
 * - Authorization (RBAC, ABAC)
 * - Request validation and sanitization
 * - Security headers and CORS
 * - Rate limiting
 * - Security middleware for Hono framework
 */

// Core types and interfaces
export type {
  SecurityConfig,
  AuthConfig,
  AuthorizationConfig,
  CorsConfig,
  SecurityHeadersConfig,
  RateLimitConfig,
  ValidationConfig,
  JwtConfig,
  ApiKeyConfig,
  OAuthConfig,
  OAuthProvider,
  RoleDefinition,
  PermissionDefinition,
  SecurityContext,
  UserInfo,
  RequestMetadata,
  AuthMethod,
  SecurityError,
  AuthenticationResult,
  AuthorizationResult,
  SecurityMiddlewareOptions,
} from './types';

// Configuration management
export {
  DEFAULT_SECURITY_CONFIG,
  SecurityConfigBuilder,
  createSecurityConfig,
  mergeSecurityConfig,
  validateSecurityConfig,
  loadSecurityConfigFromEnv,
} from './config';

// Authentication providers and manager
export {
  AuthenticationManager,
  JwtAuthProvider,
  ApiKeyAuthProvider,
  OAuthAuthProvider,
  type AuthProvider,
  type AuthContext,
} from './auth';

// Authorization manager and decorators
export {
  AuthorizationManager,
  RequirePermissions,
  RequireRoles,
} from './auth/authorization';

// Security middleware
export {
  createSecurityMiddleware,
  requirePermissions,
  requireRoles,
  createRateLimitMiddleware,
  getSecurityContext,
  getCurrentUser,
  hasPermission,
  hasRole,
} from './middleware';

// Validation and sanitization
export {
  InputSanitizer,
  RequestValidator,
  SchemaValidator,
  CommonSchemas,
  type SanitizeOptions,
  type ValidationSchema,
  type ValidationResult,
} from './validation';

/**
 * Quick setup function for common security configurations
 */
export function createQuickSecuritySetup(options: {
  apiKeys?: string[];
  jwtSecret?: string;
  corsOrigin?: string | string[];
  enableRateLimit?: boolean;
}) {
  const builder = createSecurityConfig();

  // Configure API key authentication if provided
  if (options.apiKeys && options.apiKeys.length > 0) {
    builder.withApiKey({
      header: 'X-API-Key',
      queryParam: 'api_key',
      keys: options.apiKeys,
    });
  }

  // Configure JWT authentication if provided
  if (options.jwtSecret) {
    builder.withJWT({
      secret: options.jwtSecret,
      algorithm: 'HS256',
      expiresIn: '1h',
      header: 'Authorization',
    });
  }

  // Configure CORS if provided
  if (options.corsOrigin) {
    builder.cors({
      origin: options.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: false,
    });
  }

  // Configure rate limiting if enabled
  if (options.enableRateLimit) {
    builder.rateLimit({
      max: 100,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Too many requests, please try again later',
    });
  }

  return builder.build();
}

/**
 * Create a basic security middleware with sensible defaults
 */
export function createBasicSecurityMiddleware(apiKeys: string[]) {
  const config = createQuickSecuritySetup({
    apiKeys,
    enableRateLimit: true,
    corsOrigin: '*',
  });

  return createSecurityMiddleware({
    config,
  });
}

/**
 * Create an enterprise security middleware with advanced features
 */
export function createEnterpriseSecurityMiddleware(options: {
  apiKeys?: string[];
  jwtSecret?: string;
  corsOrigin?: string | string[];
  customRoles?: RoleDefinition[];
  customPermissions?: PermissionDefinition[];
}) {
  const builder = createSecurityConfig();

  // Configure authentication
  if (options.apiKeys) {
    builder.withApiKey({
      header: 'X-API-Key',
      queryParam: 'api_key',
      keys: options.apiKeys,
    });
  }

  if (options.jwtSecret) {
    builder.withJWT({
      secret: options.jwtSecret,
      algorithm: 'HS256',
      expiresIn: '8h',
      header: 'Authorization',
    });
  }

  // Configure authorization with custom roles and permissions
  builder.authorization({
    enabled: true,
    strategy: 'rbac',
    roles: options.customRoles,
    permissions: options.customPermissions,
  });

  // Configure CORS
  builder.cors({
    origin: options.corsOrigin || false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  });

  // Configure strict security headers
  builder.headers({
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    frameOptions: 'DENY',
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
    xssProtection: true,
  });

  // Configure rate limiting
  builder.rateLimit({
    max: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Rate limit exceeded',
  });

  // Configure strict validation
  builder.validation({
    body: true,
    query: true,
    headers: true,
    maxBodySize: 50 * 1024 * 1024, // 50MB
    allowedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
    ],
  });

  const config = builder.build();

  return createSecurityMiddleware({
    config,
  });
}

/**
 * Security framework version
 */
export const SECURITY_FRAMEWORK_VERSION = '1.0.0';

/**
 * Security framework information
 */
export const SECURITY_FRAMEWORK_INFO = {
  name: 'VoltAgent Security Framework',
  version: SECURITY_FRAMEWORK_VERSION,
  description: 'Unified security system for VoltAgent applications',
  features: [
    'Multi-method authentication (JWT, API Keys, OAuth)',
    'Role-based and attribute-based authorization',
    'Request validation and sanitization',
    'Security headers and CORS management',
    'Rate limiting and DDoS protection',
    'Comprehensive security middleware',
    'TypeScript support with full type safety',
    'Hono framework integration',
    'Environment-based configuration',
    'Extensible and customizable',
  ],
  author: 'VoltAgent Security Team',
  license: 'MIT',
};

