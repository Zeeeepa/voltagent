/**
 * Security middleware for VoltAgent Security Framework
 */

import type { Context, Next } from 'hono';
import type {
  SecurityConfig,
  SecurityContext,
  SecurityMiddlewareOptions,
  SecurityError,
  UserInfo,
  RequestMetadata,
} from '../types';
import { AuthenticationManager, type AuthContext } from '../auth';
import { AuthorizationManager } from '../auth/authorization';
import { DEFAULT_SECURITY_CONFIG, mergeSecurityConfig } from '../config';

/**
 * Main security middleware factory
 */
export function createSecurityMiddleware(options: SecurityMiddlewareOptions) {
  const config = mergeSecurityConfig(DEFAULT_SECURITY_CONFIG, options.config);
  const authManager = new AuthenticationManager(config.auth);
  const authzManager = new AuthorizationManager(config.authorization);

  return async (c: Context, next: Next) => {
    try {
      // Create request metadata
      const requestMetadata: RequestMetadata = {
        ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
        userAgent: c.req.header('user-agent'),
        timestamp: new Date(),
        requestId: c.req.header('x-request-id') || generateRequestId(),
      };

      // Apply security headers
      applySecurityHeaders(c, config.headers);

      // Apply CORS if configured
      if (config.cors) {
        applyCors(c, config.cors);
      }

      // Validate request
      if (config.validation) {
        await validateRequest(c, config.validation);
      }

      // Authenticate request
      const authContext: AuthContext = {
        headers: Object.fromEntries(
          Object.entries(c.req.header()).map(([key, value]) => [key.toLowerCase(), value])
        ),
        query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
        cookies: {}, // Hono doesn't have built-in cookie parsing, would need additional setup
        metadata: { requestId: requestMetadata.requestId },
      };

      let authResult;
      if (options.authenticate) {
        authResult = await options.authenticate(c);
      } else {
        authResult = await authManager.authenticate(authContext);
      }

      if (!authResult.success) {
        if (options.onError) {
          return await options.onError(authResult.error!, c);
        }
        return c.json({ error: authResult.error!.message }, authResult.error!.status);
      }

      // Create security context
      const securityContext: SecurityContext = {
        user: authResult.user,
        roles: authResult.user?.metadata?.roles || config.authorization.defaultRoles || ['user'],
        permissions: authResult.user?.metadata?.permissions || [],
        authMethod: authResult.method,
        request: requestMetadata,
      };

      // Store security context in request context
      c.set('securityContext', securityContext);
      c.set('authManager', authManager);
      c.set('authzManager', authzManager);

      await next();
    } catch (error) {
      if (options.onError && error instanceof Error) {
        const securityError = error as SecurityError;
        return await options.onError(securityError, c);
      }
      
      console.error('Security middleware error:', error);
      return c.json({ error: 'Internal security error' }, 500);
    }
  };
}

/**
 * Authorization middleware factory
 */
export function requirePermissions(permissions: string[]) {
  return async (c: Context, next: Next) => {
    const securityContext = c.get('securityContext') as SecurityContext;
    const authzManager = c.get('authzManager') as AuthorizationManager;

    if (!securityContext || !authzManager) {
      return c.json({ error: 'Security context not found' }, 500);
    }

    const authzResult = await authzManager.authorize(securityContext, permissions);
    if (!authzResult.success) {
      return c.json({ error: authzResult.error!.message }, authzResult.error!.status);
    }

    await next();
  };
}

/**
 * Role-based authorization middleware factory
 */
export function requireRoles(roles: string[]) {
  return async (c: Context, next: Next) => {
    const securityContext = c.get('securityContext') as SecurityContext;
    const authzManager = c.get('authzManager') as AuthorizationManager;

    if (!securityContext || !authzManager) {
      return c.json({ error: 'Security context not found' }, 500);
    }

    const hasRole = authzManager.hasAnyRole(securityContext, roles);
    if (!hasRole) {
      return c.json(
        { error: `Access denied. Required roles: ${roles.join(', ')}` },
        403
      );
    }

    await next();
  };
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(config: SecurityConfig['rateLimit']) {
  if (!config) {
    return async (c: Context, next: Next) => await next();
  }

  const requests = new Map<string, { count: number; resetTime: number }>();

  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Get or create request count for this IP
    let requestData = requests.get(ip);
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now + config.windowMs };
      requests.set(ip, requestData);
    }

    // Check rate limit
    if (requestData.count >= config.max) {
      return c.json(
        { error: config.message || 'Too many requests' },
        429,
        {
          'Retry-After': Math.ceil((requestData.resetTime - now) / 1000).toString(),
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(requestData.resetTime / 1000).toString(),
        }
      );
    }

    // Increment request count
    requestData.count++;

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.max.toString());
    c.header('X-RateLimit-Remaining', (config.max - requestData.count).toString());
    c.header('X-RateLimit-Reset', Math.ceil(requestData.resetTime / 1000).toString());

    await next();
  };
}

/**
 * Apply security headers to response
 */
function applySecurityHeaders(c: Context, config: SecurityConfig['headers']) {
  if (config.contentSecurityPolicy) {
    const csp = typeof config.contentSecurityPolicy === 'string' 
      ? config.contentSecurityPolicy 
      : "default-src 'self'";
    c.header('Content-Security-Policy', csp);
  }

  if (config.frameOptions) {
    c.header('X-Frame-Options', config.frameOptions);
  }

  if (config.contentTypeOptions) {
    c.header('X-Content-Type-Options', 'nosniff');
  }

  if (config.referrerPolicy) {
    c.header('Referrer-Policy', config.referrerPolicy);
  }

  if (config.strictTransportSecurity) {
    const hsts = typeof config.strictTransportSecurity === 'string'
      ? config.strictTransportSecurity
      : 'max-age=31536000; includeSubDomains';
    c.header('Strict-Transport-Security', hsts);
  }

  if (config.xssProtection) {
    c.header('X-XSS-Protection', '1; mode=block');
  }

  // Additional security headers
  c.header('X-Powered-By', 'VoltAgent'); // Custom header
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Download-Options', 'noopen');
  c.header('X-Permitted-Cross-Domain-Policies', 'none');
}

/**
 * Apply CORS headers
 */
function applyCors(c: Context, config: SecurityConfig['cors']) {
  const origin = c.req.header('origin');
  
  // Handle origin
  if (config.origin === true || config.origin === '*') {
    c.header('Access-Control-Allow-Origin', '*');
  } else if (typeof config.origin === 'string') {
    c.header('Access-Control-Allow-Origin', config.origin);
  } else if (Array.isArray(config.origin) && origin) {
    if (config.origin.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
    }
  }

  // Handle methods
  if (config.methods && config.methods.length > 0) {
    c.header('Access-Control-Allow-Methods', config.methods.join(', '));
  }

  // Handle headers
  if (config.allowedHeaders && config.allowedHeaders.length > 0) {
    c.header('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  }

  // Handle exposed headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    c.header('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }

  // Handle credentials
  if (config.credentials) {
    c.header('Access-Control-Allow-Credentials', 'true');
  }

  // Handle max age
  if (config.maxAge) {
    c.header('Access-Control-Max-Age', config.maxAge.toString());
  }
}

/**
 * Validate request according to configuration
 */
async function validateRequest(c: Context, config: SecurityConfig['validation']) {
  // Validate content type
  if (config.allowedContentTypes && config.allowedContentTypes.length > 0) {
    const contentType = c.req.header('content-type');
    if (contentType) {
      const baseContentType = contentType.split(';')[0].trim();
      if (!config.allowedContentTypes.includes(baseContentType)) {
        throw createSecurityError(
          'INVALID_CONTENT_TYPE',
          `Content type '${baseContentType}' is not allowed`,
          415
        );
      }
    }
  }

  // Validate body size
  if (config.maxBodySize) {
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength, 10) > config.maxBodySize) {
      throw createSecurityError(
        'BODY_TOO_LARGE',
        `Request body size exceeds maximum allowed size of ${config.maxBodySize} bytes`,
        413
      );
    }
  }

  // Additional validation can be added here
  // - Query parameter validation
  // - Header validation
  // - Body content validation
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a security error
 */
function createSecurityError(code: string, message: string, status: number, details?: any): SecurityError {
  const error = new Error(message) as SecurityError;
  error.code = code;
  error.status = status;
  error.details = details;
  return error;
}

/**
 * Get security context from Hono context
 */
export function getSecurityContext(c: Context): SecurityContext | undefined {
  return c.get('securityContext');
}

/**
 * Get current user from security context
 */
export function getCurrentUser(c: Context): UserInfo | undefined {
  const securityContext = getSecurityContext(c);
  return securityContext?.user;
}

/**
 * Check if current user has permission
 */
export async function hasPermission(c: Context, permission: string): Promise<boolean> {
  const securityContext = getSecurityContext(c);
  const authzManager = c.get('authzManager') as AuthorizationManager;
  
  if (!securityContext || !authzManager) {
    return false;
  }

  const result = await authzManager.authorize(securityContext, [permission]);
  return result.success;
}

/**
 * Check if current user has role
 */
export function hasRole(c: Context, role: string): boolean {
  const securityContext = getSecurityContext(c);
  const authzManager = c.get('authzManager') as AuthorizationManager;
  
  if (!securityContext || !authzManager) {
    return false;
  }

  return authzManager.hasRole(securityContext, role);
}

