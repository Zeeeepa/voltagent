/**
 * Core security types and interfaces for VoltAgent Security Framework
 */

export interface SecurityConfig {
  /** Authentication configuration */
  auth: AuthConfig;
  /** Authorization configuration */
  authorization: AuthorizationConfig;
  /** CORS configuration */
  cors: CorsConfig;
  /** Security headers configuration */
  headers: SecurityHeadersConfig;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
  /** Request validation configuration */
  validation: ValidationConfig;
}

export interface AuthConfig {
  /** Enable/disable authentication */
  enabled: boolean;
  /** Supported authentication methods */
  methods: AuthMethod[];
  /** JWT configuration */
  jwt?: JwtConfig;
  /** API key configuration */
  apiKey?: ApiKeyConfig;
  /** OAuth configuration */
  oauth?: OAuthConfig;
}

export interface AuthorizationConfig {
  /** Enable/disable authorization */
  enabled: boolean;
  /** Authorization strategy */
  strategy: 'rbac' | 'abac' | 'custom';
  /** Default roles */
  defaultRoles?: string[];
  /** Role definitions */
  roles?: RoleDefinition[];
  /** Permission definitions */
  permissions?: PermissionDefinition[];
}

export interface CorsConfig {
  /** Allowed origins */
  origin: string | string[] | boolean;
  /** Allowed methods */
  methods: string[];
  /** Allowed headers */
  allowedHeaders: string[];
  /** Exposed headers */
  exposedHeaders?: string[];
  /** Credentials support */
  credentials?: boolean;
  /** Max age for preflight cache */
  maxAge?: number;
}

export interface SecurityHeadersConfig {
  /** Content Security Policy */
  contentSecurityPolicy?: string | boolean;
  /** X-Frame-Options */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | string;
  /** X-Content-Type-Options */
  contentTypeOptions?: boolean;
  /** Referrer Policy */
  referrerPolicy?: string;
  /** Strict Transport Security */
  strictTransportSecurity?: string | boolean;
  /** X-XSS-Protection */
  xssProtection?: boolean;
}

export interface RateLimitConfig {
  /** Maximum requests per window */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Rate limit message */
  message?: string;
  /** Skip successful requests */
  skipSuccessfulRequests?: boolean;
  /** Skip failed requests */
  skipFailedRequests?: boolean;
}

export interface ValidationConfig {
  /** Enable request body validation */
  body: boolean;
  /** Enable query parameter validation */
  query: boolean;
  /** Enable header validation */
  headers: boolean;
  /** Maximum request body size */
  maxBodySize?: number;
  /** Allowed content types */
  allowedContentTypes?: string[];
}

export interface JwtConfig {
  /** JWT secret or public key */
  secret: string;
  /** JWT algorithm */
  algorithm?: string;
  /** Token expiration time */
  expiresIn?: string | number;
  /** Token issuer */
  issuer?: string;
  /** Token audience */
  audience?: string;
  /** Header name for JWT token */
  header?: string;
  /** Query parameter name for JWT token */
  queryParam?: string;
  /** Cookie name for JWT token */
  cookie?: string;
}

export interface ApiKeyConfig {
  /** Header name for API key */
  header: string;
  /** Query parameter name for API key */
  queryParam?: string;
  /** Valid API keys or validation function */
  keys: string[] | ((key: string) => Promise<boolean> | boolean);
  /** API key prefix */
  prefix?: string;
}

export interface OAuthConfig {
  /** OAuth provider configurations */
  providers: Record<string, OAuthProvider>;
  /** Default redirect URI */
  redirectUri?: string;
  /** OAuth state parameter validation */
  validateState?: boolean;
}

export interface OAuthProvider {
  /** Client ID */
  clientId: string;
  /** Client secret */
  clientSecret: string;
  /** Authorization URL */
  authUrl: string;
  /** Token URL */
  tokenUrl: string;
  /** User info URL */
  userInfoUrl?: string;
  /** OAuth scopes */
  scopes?: string[];
}

export interface RoleDefinition {
  /** Role name */
  name: string;
  /** Role description */
  description?: string;
  /** Role permissions */
  permissions: string[];
  /** Parent roles */
  inherits?: string[];
}

export interface PermissionDefinition {
  /** Permission name */
  name: string;
  /** Permission description */
  description?: string;
  /** Resource this permission applies to */
  resource?: string;
  /** Actions this permission allows */
  actions?: string[];
}

export interface SecurityContext {
  /** Authenticated user information */
  user?: UserInfo;
  /** User roles */
  roles: string[];
  /** User permissions */
  permissions: string[];
  /** Authentication method used */
  authMethod?: AuthMethod;
  /** Request metadata */
  request: RequestMetadata;
}

export interface UserInfo {
  /** User ID */
  id: string;
  /** Username */
  username?: string;
  /** Email address */
  email?: string;
  /** Display name */
  name?: string;
  /** Additional user data */
  metadata?: Record<string, any>;
}

export interface RequestMetadata {
  /** Request IP address */
  ip: string;
  /** User agent */
  userAgent?: string;
  /** Request timestamp */
  timestamp: Date;
  /** Request ID */
  requestId?: string;
  /** Additional request data */
  metadata?: Record<string, any>;
}

export type AuthMethod = 'jwt' | 'apikey' | 'oauth' | 'basic' | 'custom';

export interface SecurityError extends Error {
  /** Error code */
  code: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: Record<string, any>;
}

export interface AuthenticationResult {
  /** Authentication success */
  success: boolean;
  /** User information if authenticated */
  user?: UserInfo;
  /** Error if authentication failed */
  error?: SecurityError;
  /** Authentication method used */
  method?: AuthMethod;
}

export interface AuthorizationResult {
  /** Authorization success */
  success: boolean;
  /** Required permissions that were checked */
  requiredPermissions?: string[];
  /** User permissions that were found */
  userPermissions?: string[];
  /** Error if authorization failed */
  error?: SecurityError;
}

export interface SecurityMiddlewareOptions {
  /** Security configuration */
  config: Partial<SecurityConfig>;
  /** Custom authentication handler */
  authenticate?: (context: any) => Promise<AuthenticationResult>;
  /** Custom authorization handler */
  authorize?: (context: SecurityContext, permissions: string[]) => Promise<AuthorizationResult>;
  /** Custom error handler */
  onError?: (error: SecurityError, context: any) => Promise<any>;
}

