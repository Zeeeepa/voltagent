# VoltAgent Security Framework

A comprehensive, unified security system for VoltAgent applications providing authentication, authorization, validation, and security middleware.

## 🔐 Features

- **Multi-Method Authentication**: JWT, API Keys, OAuth support
- **Role-Based Access Control (RBAC)**: Flexible role and permission system
- **Request Validation**: Input sanitization and schema validation
- **Security Headers**: Comprehensive security headers management
- **CORS Management**: Configurable cross-origin resource sharing
- **Rate Limiting**: DDoS protection and request throttling
- **TypeScript Support**: Full type safety and IntelliSense
- **Hono Integration**: Seamless middleware integration
- **Environment Configuration**: Easy setup via environment variables

## 🚀 Quick Start

### Basic Setup

```typescript
import { createBasicSecurityMiddleware } from '@voltagent/core';
import { Hono } from 'hono';

const app = new Hono();

// Apply basic security with API key authentication
app.use('/*', createBasicSecurityMiddleware([
  'your-api-key-1',
  'your-api-key-2'
]));

app.get('/protected', (c) => {
  return c.json({ message: 'This endpoint is protected!' });
});
```

### Advanced Setup

```typescript
import {
  createSecurityConfig,
  createSecurityMiddleware,
  requirePermissions,
  requireRoles
} from '@voltagent/core';

// Create advanced security configuration
const securityConfig = createSecurityConfig()
  .withJWT({
    secret: 'your-jwt-secret',
    expiresIn: '1h'
  })
  .withApiKey({
    header: 'X-API-Key',
    keys: ['api-key-1', 'api-key-2']
  })
  .cors({
    origin: ['https://app.example.com'],
    credentials: true
  })
  .rateLimit({
    max: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  })
  .build();

// Apply security middleware
app.use('/*', createSecurityMiddleware({ config: securityConfig }));

// Protected routes with permissions
app.get('/agents', requirePermissions(['agents:read']), (c) => {
  return c.json({ agents: [] });
});

app.post('/agents', requirePermissions(['agents:write']), (c) => {
  return c.json({ message: 'Agent created' });
});

// Admin-only routes
app.get('/admin', requireRoles(['admin']), (c) => {
  return c.json({ message: 'Admin panel' });
});
```

## 📖 Configuration

### Environment Variables

```bash
# Authentication
VOLTAGENT_AUTH_ENABLED=true
VOLTAGENT_AUTH_METHODS=jwt,apikey
VOLTAGENT_JWT_SECRET=your-super-secret-key
VOLTAGENT_API_KEYS=key1,key2,key3

# CORS
VOLTAGENT_CORS_ORIGIN=https://app.example.com,http://localhost:3000
VOLTAGENT_CORS_CREDENTIALS=true

# Rate Limiting
VOLTAGENT_RATE_LIMIT_MAX=1000
VOLTAGENT_RATE_LIMIT_WINDOW=900000
```

### Programmatic Configuration

```typescript
import { createSecurityConfig } from '@voltagent/core';

const config = createSecurityConfig()
  .auth({
    enabled: true,
    methods: ['jwt', 'apikey']
  })
  .withJWT({
    secret: process.env.JWT_SECRET!,
    algorithm: 'HS256',
    expiresIn: '8h',
    issuer: 'voltagent-api'
  })
  .withApiKey({
    header: 'X-API-Key',
    queryParam: 'api_key',
    keys: async (key) => {
      // Custom validation logic
      return await validateApiKeyInDatabase(key);
    }
  })
  .authorization({
    enabled: true,
    strategy: 'rbac',
    roles: [
      {
        name: 'admin',
        permissions: ['*']
      },
      {
        name: 'user',
        permissions: ['read', 'execute']
      }
    ]
  })
  .cors({
    origin: ['https://trusted-domain.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
  .headers({
    contentSecurityPolicy: "default-src 'self'",
    frameOptions: 'DENY',
    strictTransportSecurity: 'max-age=31536000'
  })
  .validation({
    body: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    allowedContentTypes: ['application/json']
  })
  .build();
```

## 🔑 Authentication

### JWT Authentication

```typescript
// Configure JWT
const config = createSecurityConfig()
  .withJWT({
    secret: 'your-secret-key',
    algorithm: 'HS256',
    expiresIn: '1h',
    issuer: 'your-app',
    audience: 'your-users',
    header: 'Authorization' // Bearer token
  })
  .build();

// Usage in requests
// Header: Authorization: Bearer <jwt-token>
```

### API Key Authentication

```typescript
// Configure API Keys
const config = createSecurityConfig()
  .withApiKey({
    header: 'X-API-Key',
    queryParam: 'api_key',
    keys: [
      'volt_prod_key_123',
      'volt_dev_key_456'
    ],
    prefix: 'volt_' // Optional prefix
  })
  .build();

// Usage in requests
// Header: X-API-Key: volt_prod_key_123
// Or Query: ?api_key=volt_prod_key_123
```

### OAuth Authentication

```typescript
// Configure OAuth
const config = createSecurityConfig()
  .withOAuth({
    providers: {
      google: {
        clientId: 'your-google-client-id',
        clientSecret: 'your-google-client-secret',
        authUrl: 'https://accounts.google.com/oauth2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'email', 'profile']
      }
    },
    redirectUri: 'https://yourapp.com/auth/callback'
  })
  .build();
```

## 🛡️ Authorization

### Role-Based Access Control (RBAC)

```typescript
// Define roles and permissions
const config = createSecurityConfig()
  .authorization({
    enabled: true,
    strategy: 'rbac',
    roles: [
      {
        name: 'admin',
        description: 'System administrator',
        permissions: ['*'], // All permissions
      },
      {
        name: 'agent_manager',
        description: 'Can manage agents',
        permissions: ['agents:read', 'agents:write', 'agents:execute'],
        inherits: ['user'] // Inherit user permissions
      },
      {
        name: 'user',
        description: 'Regular user',
        permissions: ['agents:read', 'agents:execute']
      }
    ],
    permissions: [
      {
        name: 'agents:read',
        description: 'Read agent information',
        resource: 'agents',
        actions: ['GET']
      },
      {
        name: 'agents:write',
        description: 'Create and update agents',
        resource: 'agents',
        actions: ['POST', 'PUT', 'PATCH']
      }
    ]
  })
  .build();

// Use in routes
app.get('/agents', requirePermissions(['agents:read']), handler);
app.post('/agents', requirePermissions(['agents:write']), handler);
app.get('/admin', requireRoles(['admin']), handler);
```

### Permission Decorators

```typescript
import { RequirePermissions, RequireRoles } from '@voltagent/core';

class AgentController {
  @RequirePermissions(['agents:read'])
  async getAgents() {
    // Method implementation
  }

  @RequireRoles(['admin', 'agent_manager'])
  async deleteAgent(id: string) {
    // Method implementation
  }
}
```

## 🔍 Validation & Sanitization

### Input Sanitization

```typescript
import { InputSanitizer } from '@voltagent/core';

// Sanitize user input
const cleanString = InputSanitizer.sanitizeString(userInput);
const cleanHtml = InputSanitizer.sanitizeHtml(htmlContent);
const cleanSql = InputSanitizer.sanitizeSql(sqlInput);
const cleanUrl = InputSanitizer.sanitizeUrl(urlInput);

// Sanitize objects recursively
const cleanObject = InputSanitizer.sanitizeObject(requestBody, {
  html: true,
  sql: true
});
```

### Schema Validation

```typescript
import { SchemaValidator, CommonSchemas } from '@voltagent/core';

// Define validation schema
const userSchema = {
  type: 'object',
  properties: {
    email: CommonSchemas.email,
    username: CommonSchemas.username,
    age: {
      type: 'number',
      min: 18,
      max: 120
    }
  }
};

// Validate data
const result = SchemaValidator.validate(userData, userSchema);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## 🌐 CORS & Security Headers

### CORS Configuration

```typescript
const config = createSecurityConfig()
  .cors({
    origin: ['https://app.example.com', 'https://admin.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400 // 24 hours
  })
  .build();
```

### Security Headers

```typescript
const config = createSecurityConfig()
  .headers({
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'",
    frameOptions: 'DENY',
    contentTypeOptions: true,
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xssProtection: true
  })
  .build();
```

## ⚡ Rate Limiting

```typescript
import { createRateLimitMiddleware } from '@voltagent/core';

// Global rate limiting
const config = createSecurityConfig()
  .rateLimit({
    max: 100, // 100 requests
    windowMs: 15 * 60 * 1000, // per 15 minutes
    message: 'Too many requests, please try again later',
    skipSuccessfulRequests: false
  })
  .build();

// Or specific endpoint rate limiting
app.use('/api/heavy-operation', createRateLimitMiddleware({
  max: 10,
  windowMs: 60 * 1000 // 10 requests per minute
}));
```

## 🔧 Utilities

### Security Context

```typescript
import { getSecurityContext, getCurrentUser, hasPermission } from '@voltagent/core';

app.get('/profile', async (c) => {
  const securityContext = getSecurityContext(c);
  const user = getCurrentUser(c);
  const canEdit = await hasPermission(c, 'profile:edit');

  return c.json({
    user: user?.username,
    roles: securityContext?.roles,
    permissions: securityContext?.permissions,
    canEdit
  });
});
```

### Custom Error Handling

```typescript
const securityMiddleware = createSecurityMiddleware({
  config: securityConfig,
  onError: async (error, context) => {
    // Log security errors
    console.error('Security error:', error);
    
    // Custom error response
    return context.json({
      error: 'Access denied',
      code: error.code,
      timestamp: new Date().toISOString()
    }, error.status);
  }
});
```

## 📊 Monitoring & Logging

The security framework automatically logs security events and provides metrics for monitoring:

```typescript
// Security events are automatically logged
// - Authentication attempts (success/failure)
// - Authorization checks
// - Rate limit violations
// - Validation errors
// - Security header violations

// Access security metrics
app.get('/security/metrics', requireRoles(['admin']), (c) => {
  return c.json({
    authAttempts: securityMetrics.authAttempts,
    rateLimitViolations: securityMetrics.rateLimitViolations,
    validationErrors: securityMetrics.validationErrors
  });
});
```

## 🔄 Migration Guide

### From Basic CORS to Security Framework

```typescript
// Before: Basic CORS
app.use('/*', cors());

// After: Comprehensive security
app.use('/*', createBasicSecurityMiddleware(['your-api-key']));
```

### Adding to Existing VoltAgent Server

```typescript
import { integrateWithExistingServer } from '@voltagent/core/security/examples';

// Integrate with existing server
const secureApp = integrateWithExistingServer(existingApp);
```

## 🧪 Testing

```typescript
// Test security middleware
import { createSecurityMiddleware } from '@voltagent/core';

describe('Security Middleware', () => {
  it('should require authentication', async () => {
    const app = new Hono();
    app.use('/*', createBasicSecurityMiddleware(['test-key']));
    
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
  });

  it('should allow valid API key', async () => {
    const app = new Hono();
    app.use('/*', createBasicSecurityMiddleware(['test-key']));
    
    const res = await app.request('/protected', {
      headers: { 'X-API-Key': 'test-key' }
    });
    expect(res.status).toBe(200);
  });
});
```

## 📚 API Reference

### Core Classes

- `SecurityConfigBuilder` - Fluent configuration builder
- `AuthenticationManager` - Handles authentication
- `AuthorizationManager` - Handles authorization
- `InputSanitizer` - Input sanitization utilities
- `RequestValidator` - Request validation
- `SchemaValidator` - Schema-based validation

### Middleware Functions

- `createSecurityMiddleware()` - Main security middleware
- `requirePermissions()` - Permission-based route protection
- `requireRoles()` - Role-based route protection
- `createRateLimitMiddleware()` - Rate limiting middleware

### Utility Functions

- `getSecurityContext()` - Get security context from request
- `getCurrentUser()` - Get current authenticated user
- `hasPermission()` - Check user permissions
- `hasRole()` - Check user roles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- Documentation: [VoltAgent Docs](https://docs.voltagent.ai)
- Issues: [GitHub Issues](https://github.com/voltagent/voltagent/issues)
- Discord: [VoltAgent Community](https://discord.gg/voltagent)

