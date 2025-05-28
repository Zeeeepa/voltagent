/**
 * Example: Integrating VoltAgent Security Framework with the existing server
 */

import { Hono } from 'hono';
import { OpenAPIHono } from '@hono/zod-openapi';
import {
  createSecurityMiddleware,
  createQuickSecuritySetup,
  requirePermissions,
  requireRoles,
  getSecurityContext,
  getCurrentUser,
  type SecurityConfig,
} from '../index';

/**
 * Example 1: Basic security setup with API keys
 */
export function createBasicSecureServer() {
  const app = new OpenAPIHono();

  // Create security configuration
  const securityConfig = createQuickSecuritySetup({
    apiKeys: [
      'volt_test_key_123456789',
      'volt_prod_key_987654321',
    ],
    enableRateLimit: true,
    corsOrigin: ['http://localhost:3000', 'https://app.example.com'],
  });

  // Apply security middleware globally
  app.use('/*', createSecurityMiddleware({ config: securityConfig }));

  // Public endpoint (no additional security)
  app.get('/health', (c) => {
    return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Protected endpoint requiring authentication
  app.get('/agents', (c) => {
    const user = getCurrentUser(c);
    return c.json({
      message: 'Agents list',
      user: user?.username,
      timestamp: new Date().toISOString(),
    });
  });

  // Admin-only endpoint
  app.get('/admin/stats', requireRoles(['admin']), (c) => {
    return c.json({
      message: 'Admin statistics',
      stats: { totalUsers: 100, activeAgents: 25 },
    });
  });

  return app;
}

/**
 * Example 2: Enterprise security setup with JWT and RBAC
 */
export function createEnterpriseSecureServer() {
  const app = new OpenAPIHono();

  // Advanced security configuration
  const securityConfig: SecurityConfig = {
    auth: {
      enabled: true,
      methods: ['jwt', 'apikey'],
      jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
        algorithm: 'HS256',
        expiresIn: '8h',
        header: 'Authorization',
        issuer: 'voltagent-api',
        audience: 'voltagent-clients',
      },
      apiKey: {
        header: 'X-API-Key',
        queryParam: 'api_key',
        keys: [
          'volt_enterprise_key_abc123',
          'volt_service_key_def456',
        ],
      },
    },
    authorization: {
      enabled: true,
      strategy: 'rbac',
      defaultRoles: ['user'],
      roles: [
        {
          name: 'admin',
          description: 'System administrator',
          permissions: ['*'],
        },
        {
          name: 'agent_manager',
          description: 'Can manage agents',
          permissions: ['agents:read', 'agents:write', 'agents:execute'],
        },
        {
          name: 'user',
          description: 'Regular user',
          permissions: ['agents:read', 'agents:execute'],
        },
        {
          name: 'readonly',
          description: 'Read-only access',
          permissions: ['agents:read'],
        },
      ],
      permissions: [
        {
          name: 'agents:read',
          description: 'Read agent information',
          resource: 'agents',
          actions: ['GET'],
        },
        {
          name: 'agents:write',
          description: 'Create and update agents',
          resource: 'agents',
          actions: ['POST', 'PUT', 'PATCH'],
        },
        {
          name: 'agents:execute',
          description: 'Execute agent operations',
          resource: 'agents',
          actions: ['POST'],
        },
        {
          name: 'agents:delete',
          description: 'Delete agents',
          resource: 'agents',
          actions: ['DELETE'],
        },
      ],
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true,
      maxAge: 86400,
    },
    headers: {
      contentSecurityPolicy: "default-src 'self'; script-src 'self'",
      frameOptions: 'DENY',
      contentTypeOptions: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      strictTransportSecurity: 'max-age=31536000; includeSubDomains',
      xssProtection: true,
    },
    rateLimit: {
      max: 1000,
      windowMs: 15 * 60 * 1000, // 15 minutes
      message: 'Rate limit exceeded. Please try again later.',
    },
    validation: {
      body: true,
      query: true,
      headers: true,
      maxBodySize: 10 * 1024 * 1024, // 10MB
      allowedContentTypes: [
        'application/json',
        'application/x-www-form-urlencoded',
      ],
    },
  };

  // Apply security middleware
  app.use('/*', createSecurityMiddleware({ config: securityConfig }));

  // Public endpoints
  app.get('/health', (c) => {
    return c.json({ status: 'healthy' });
  });

  app.get('/version', (c) => {
    return c.json({ version: '1.0.0', security: 'enabled' });
  });

  // Protected endpoints with permission-based access
  app.get('/agents', requirePermissions(['agents:read']), (c) => {
    const securityContext = getSecurityContext(c);
    return c.json({
      agents: [
        { id: '1', name: 'Agent 1', status: 'active' },
        { id: '2', name: 'Agent 2', status: 'inactive' },
      ],
      user: securityContext?.user?.username,
      permissions: securityContext?.permissions,
    });
  });

  app.post('/agents', requirePermissions(['agents:write']), async (c) => {
    const body = await c.req.json();
    const user = getCurrentUser(c);
    
    // Simulate agent creation
    const newAgent = {
      id: Date.now().toString(),
      name: body.name,
      status: 'active',
      createdBy: user?.username,
      createdAt: new Date().toISOString(),
    };

    return c.json(newAgent, 201);
  });

  app.post('/agents/:id/execute', requirePermissions(['agents:execute']), async (c) => {
    const agentId = c.req.param('id');
    const body = await c.req.json();
    const user = getCurrentUser(c);

    // Simulate agent execution
    return c.json({
      agentId,
      task: body.task,
      status: 'executing',
      executedBy: user?.username,
      timestamp: new Date().toISOString(),
    });
  });

  app.delete('/agents/:id', requirePermissions(['agents:delete']), (c) => {
    const agentId = c.req.param('id');
    return c.json({ message: `Agent ${agentId} deleted` });
  });

  // Admin-only endpoints
  app.get('/admin/users', requireRoles(['admin']), (c) => {
    return c.json({
      users: [
        { id: '1', username: 'admin', role: 'admin' },
        { id: '2', username: 'user1', role: 'user' },
      ],
    });
  });

  app.get('/admin/security/config', requireRoles(['admin']), (c) => {
    return c.json({
      authMethods: securityConfig.auth.methods,
      authorizationEnabled: securityConfig.authorization.enabled,
      rateLimitMax: securityConfig.rateLimit?.max,
      corsOrigin: securityConfig.cors.origin,
    });
  });

  // Manager-level endpoints
  app.get('/manage/agents', requireRoles(['admin', 'agent_manager']), (c) => {
    return c.json({
      message: 'Agent management interface',
      totalAgents: 10,
      activeAgents: 7,
    });
  });

  return app;
}

/**
 * Example 3: Custom authentication handler
 */
export function createCustomAuthServer() {
  const app = new OpenAPIHono();

  const securityConfig = createQuickSecuritySetup({
    apiKeys: ['custom_key_123'],
  });

  // Custom authentication handler
  const customAuthHandler = async (context: any) => {
    // Custom authentication logic
    const customToken = context.req.header('x-custom-auth');
    
    if (!customToken) {
      return {
        success: false,
        error: {
          code: 'MISSING_CUSTOM_TOKEN',
          message: 'Custom authentication token required',
          status: 401,
        },
      };
    }

    // Validate custom token (example)
    if (customToken === 'valid-custom-token') {
      return {
        success: true,
        user: {
          id: 'custom-user-1',
          username: 'custom_user',
          email: 'user@custom.com',
          metadata: { authMethod: 'custom' },
        },
        method: 'custom' as const,
      };
    }

    return {
      success: false,
      error: {
        code: 'INVALID_CUSTOM_TOKEN',
        message: 'Invalid custom authentication token',
        status: 401,
      },
    };
  };

  // Apply security middleware with custom auth
  app.use('/*', createSecurityMiddleware({
    config: securityConfig,
    authenticate: customAuthHandler,
  }));

  app.get('/custom-protected', (c) => {
    const user = getCurrentUser(c);
    return c.json({
      message: 'Custom authentication successful',
      user: user?.username,
      authMethod: user?.metadata?.authMethod,
    });
  });

  return app;
}

/**
 * Example 4: Environment-based configuration
 */
export function createEnvironmentConfiguredServer() {
  const app = new OpenAPIHono();

  // Load configuration from environment variables
  const securityConfig = createQuickSecuritySetup({
    apiKeys: process.env.VOLTAGENT_API_KEYS?.split(',') || [],
    jwtSecret: process.env.VOLTAGENT_JWT_SECRET,
    corsOrigin: process.env.VOLTAGENT_CORS_ORIGIN?.split(',') || '*',
    enableRateLimit: process.env.VOLTAGENT_RATE_LIMIT_ENABLED === 'true',
  });

  app.use('/*', createSecurityMiddleware({ config: securityConfig }));

  app.get('/env-config', (c) => {
    return c.json({
      message: 'Environment-configured security',
      authEnabled: securityConfig.auth.enabled,
      authMethods: securityConfig.auth.methods,
      corsOrigin: securityConfig.cors.origin,
    });
  });

  return app;
}

/**
 * Example usage in existing VoltAgent server
 */
export function integrateWithExistingServer(existingApp: Hono) {
  // Add security middleware to existing app
  const securityConfig = createQuickSecuritySetup({
    apiKeys: ['existing_app_key_123'],
    enableRateLimit: true,
  });

  // Apply security to all routes
  existingApp.use('/*', createSecurityMiddleware({ config: securityConfig }));

  // Add security-aware routes
  existingApp.get('/secure/status', requirePermissions(['read']), (c) => {
    const user = getCurrentUser(c);
    return c.json({
      message: 'Secure status endpoint',
      user: user?.username,
      timestamp: new Date().toISOString(),
    });
  });

  return existingApp;
}

