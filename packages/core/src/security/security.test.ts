/**
 * Comprehensive tests for VoltAgent Security Framework
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  createSecurityConfig,
  createSecurityMiddleware,
  AuthenticationManager,
  AuthorizationManager,
  InputSanitizer,
  SchemaValidator,
  CommonSchemas,
  type SecurityConfig,
  type AuthContext,
} from './index';

describe('VoltAgent Security Framework', () => {
  describe('SecurityConfigBuilder', () => {
    it('should create default configuration', () => {
      const config = createSecurityConfig().build();
      
      expect(config.auth.enabled).toBe(true);
      expect(config.authorization.enabled).toBe(true);
      expect(config.cors.origin).toBe('*');
      expect(config.validation.body).toBe(true);
    });

    it('should build configuration with JWT', () => {
      const config = createSecurityConfig()
        .withJWT({
          secret: 'test-secret',
          algorithm: 'HS256',
          expiresIn: '1h',
        })
        .build();

      expect(config.auth.methods).toContain('jwt');
      expect(config.auth.jwt?.secret).toBe('test-secret');
      expect(config.auth.jwt?.algorithm).toBe('HS256');
    });

    it('should build configuration with API keys', () => {
      const config = createSecurityConfig()
        .withApiKey({
          header: 'X-API-Key',
          keys: ['key1', 'key2'],
        })
        .build();

      expect(config.auth.methods).toContain('apikey');
      expect(config.auth.apiKey?.header).toBe('X-API-Key');
      expect(config.auth.apiKey?.keys).toEqual(['key1', 'key2']);
    });

    it('should configure CORS', () => {
      const config = createSecurityConfig()
        .cors({
          origin: ['https://example.com'],
          credentials: true,
        })
        .build();

      expect(config.cors.origin).toEqual(['https://example.com']);
      expect(config.cors.credentials).toBe(true);
    });

    it('should configure rate limiting', () => {
      const config = createSecurityConfig()
        .rateLimit({
          max: 50,
          windowMs: 60000,
        })
        .build();

      expect(config.rateLimit?.max).toBe(50);
      expect(config.rateLimit?.windowMs).toBe(60000);
    });
  });

  describe('AuthenticationManager', () => {
    let authManager: AuthenticationManager;
    let config: SecurityConfig;

    beforeEach(() => {
      config = createSecurityConfig()
        .withApiKey({
          header: 'x-api-key',
          keys: ['valid-key-123'],
        })
        .withJWT({
          secret: 'test-secret',
          algorithm: 'HS256',
        })
        .build();

      authManager = new AuthenticationManager(config.auth);
    });

    it('should authenticate with valid API key', async () => {
      const context: AuthContext = {
        headers: { 'x-api-key': 'valid-key-123' },
        query: {},
      };

      const result = await authManager.authenticate(context);

      expect(result.success).toBe(true);
      expect(result.user?.id).toContain('apikey:');
      expect(result.method).toBe('apikey');
    });

    it('should reject invalid API key', async () => {
      const context: AuthContext = {
        headers: { 'x-api-key': 'invalid-key' },
        query: {},
      };

      const result = await authManager.authenticate(context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_API_KEY');
    });

    it('should authenticate with API key from query parameter', async () => {
      const context: AuthContext = {
        headers: {},
        query: { api_key: 'valid-key-123' },
      };

      const result = await authManager.authenticate(context);

      expect(result.success).toBe(true);
      expect(result.method).toBe('apikey');
    });

    it('should handle missing authentication', async () => {
      const context: AuthContext = {
        headers: {},
        query: {},
      };

      const result = await authManager.authenticate(context);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('AUTH_FAILED');
    });

    it('should validate configuration', () => {
      const errors = authManager.validate();
      expect(errors).toHaveLength(0);
    });

    it('should detect configuration errors', () => {
      const invalidConfig = {
        enabled: true,
        methods: ['jwt' as const],
        // Missing JWT configuration
      };

      const invalidAuthManager = new AuthenticationManager(invalidConfig);
      const errors = invalidAuthManager.validate();

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('JWT configuration is required');
    });
  });

  describe('AuthorizationManager', () => {
    let authzManager: AuthorizationManager;

    beforeEach(() => {
      const config = createSecurityConfig().build();
      authzManager = new AuthorizationManager(config.authorization);
    });

    it('should authorize user with required permissions', async () => {
      const context = {
        user: { id: 'user1', username: 'testuser' },
        roles: ['user'],
        permissions: ['read', 'execute'],
        authMethod: 'apikey' as const,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      const result = await authzManager.authorize(context, ['read']);

      expect(result.success).toBe(true);
      expect(result.requiredPermissions).toEqual(['read']);
    });

    it('should deny user without required permissions', async () => {
      const context = {
        user: { id: 'user1', username: 'testuser' },
        roles: ['readonly'],
        permissions: ['read'],
        authMethod: 'apikey' as const,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      const result = await authzManager.authorize(context, ['write']);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should check user roles', () => {
      const context = {
        user: { id: 'user1', username: 'testuser' },
        roles: ['admin', 'user'],
        permissions: [],
        authMethod: 'apikey' as const,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      expect(authzManager.hasRole(context, 'admin')).toBe(true);
      expect(authzManager.hasRole(context, 'guest')).toBe(false);
      expect(authzManager.hasAnyRole(context, ['admin', 'guest'])).toBe(true);
      expect(authzManager.hasAllRoles(context, ['admin', 'user'])).toBe(true);
    });

    it('should get user permissions from roles', async () => {
      const context = {
        user: { id: 'user1', username: 'testuser' },
        roles: ['user'],
        permissions: [],
        authMethod: 'apikey' as const,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      const permissions = await authzManager.getUserPermissions(context);

      expect(permissions).toContain('read');
      expect(permissions).toContain('execute');
    });

    it('should handle wildcard permissions', async () => {
      const context = {
        user: { id: 'admin1', username: 'admin' },
        roles: ['admin'],
        permissions: ['*'],
        authMethod: 'apikey' as const,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      const result = await authzManager.authorize(context, ['any-permission']);

      expect(result.success).toBe(true);
    });
  });

  describe('InputSanitizer', () => {
    it('should sanitize strings', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = InputSanitizer.sanitizeString(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toBe('Hello');
    });

    it('should sanitize HTML', () => {
      const htmlInput = '<p>Safe content</p><script>alert("xss")</script>';
      const sanitized = InputSanitizer.sanitizeHtml(htmlInput);

      expect(sanitized).toContain('<p>Safe content</p>');
      expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize SQL input', () => {
      const sqlInput = "'; DROP TABLE users; --";
      const sanitized = InputSanitizer.sanitizeSql(sqlInput);

      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('--');
    });

    it('should sanitize file paths', () => {
      const maliciousPath = '../../../etc/passwd';
      const sanitized = InputSanitizer.sanitizeFilePath(maliciousPath);

      expect(sanitized).not.toContain('..');
      expect(sanitized).toBe('etc/passwd');
    });

    it('should validate and sanitize emails', () => {
      expect(InputSanitizer.sanitizeEmail('user@example.com')).toBe('user@example.com');
      expect(InputSanitizer.sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(InputSanitizer.sanitizeEmail('invalid-email')).toBe('');
    });

    it('should sanitize URLs', () => {
      expect(InputSanitizer.sanitizeUrl('https://example.com')).toBe('https://example.com/');
      expect(InputSanitizer.sanitizeUrl('javascript:alert(1)')).toBe('');
      expect(InputSanitizer.sanitizeUrl('ftp://example.com')).toBe('');
    });

    it('should sanitize objects recursively', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        nested: {
          description: 'Safe content<script>alert("nested")</script>',
        },
        array: ['<script>alert("array")</script>item1', 'item2'],
      };

      const sanitized = InputSanitizer.sanitizeObject(maliciousObject);

      expect(sanitized.name).toBe('John');
      expect(sanitized.email).toBe('john@example.com');
      expect(sanitized.nested.description).toBe('Safe content');
      expect(sanitized.array[0]).toBe('item1');
      expect(sanitized.array[1]).toBe('item2');
    });
  });

  describe('SchemaValidator', () => {
    it('should validate valid data', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string' as const,
            minLength: 2,
            maxLength: 50,
          },
          age: {
            type: 'number' as const,
            min: 0,
            max: 150,
          },
        },
      };

      const validData = {
        name: 'John Doe',
        age: 30,
      };

      const result = SchemaValidator.validate(validData, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string' as const,
            minLength: 2,
            required: true,
          },
          age: {
            type: 'number' as const,
            min: 0,
          },
        },
      };

      const invalidData = {
        name: 'A', // Too short
        age: -5, // Below minimum
      };

      const result = SchemaValidator.validate(invalidData, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.includes('too short'))).toBe(true);
      expect(result.errors.some(error => error.includes('too small'))).toBe(true);
    });

    it('should validate with common schemas', () => {
      const emailResult = SchemaValidator.validate('user@example.com', CommonSchemas.email);
      expect(emailResult.valid).toBe(true);

      const invalidEmailResult = SchemaValidator.validate('invalid-email', CommonSchemas.email);
      expect(invalidEmailResult.valid).toBe(false);

      const urlResult = SchemaValidator.validate('https://example.com', CommonSchemas.url);
      expect(urlResult.valid).toBe(true);

      const usernameResult = SchemaValidator.validate('valid_username', CommonSchemas.username);
      expect(usernameResult.valid).toBe(true);
    });

    it('should validate arrays', () => {
      const schema = {
        type: 'array' as const,
        items: {
          type: 'string' as const,
          minLength: 1,
        },
      };

      const validArray = ['item1', 'item2', 'item3'];
      const invalidArray = ['item1', '', 'item3']; // Empty string

      const validResult = SchemaValidator.validate(validArray, schema);
      expect(validResult.valid).toBe(true);

      const invalidResult = SchemaValidator.validate(invalidArray, schema);
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should create a complete security configuration', () => {
      const config = createSecurityConfig()
        .withJWT({
          secret: 'test-secret',
          expiresIn: '1h',
        })
        .withApiKey({
          header: 'X-API-Key',
          keys: ['key1', 'key2'],
        })
        .cors({
          origin: ['https://example.com'],
          credentials: true,
        })
        .headers({
          contentSecurityPolicy: "default-src 'self'",
          frameOptions: 'DENY',
        })
        .rateLimit({
          max: 100,
          windowMs: 60000,
        })
        .validation({
          body: true,
          maxBodySize: 1024 * 1024,
        })
        .build();

      expect(config.auth.methods).toContain('jwt');
      expect(config.auth.methods).toContain('apikey');
      expect(config.cors.origin).toEqual(['https://example.com']);
      expect(config.headers.frameOptions).toBe('DENY');
      expect(config.rateLimit?.max).toBe(100);
      expect(config.validation.maxBodySize).toBe(1024 * 1024);
    });

    it('should validate complete configuration', () => {
      const config = createSecurityConfig()
        .withJWT({
          secret: 'test-secret',
        })
        .withApiKey({
          header: 'X-API-Key',
          keys: ['key1'],
        })
        .build();

      const authManager = new AuthenticationManager(config.auth);
      const authzManager = new AuthorizationManager(config.authorization);

      const authErrors = authManager.validate();
      const authzErrors = authzManager.validate();

      expect(authErrors).toHaveLength(0);
      expect(authzErrors).toHaveLength(0);
    });

    it('should handle authentication and authorization flow', async () => {
      const config = createSecurityConfig()
        .withApiKey({
          header: 'x-api-key',
          keys: ['valid-key'],
        })
        .build();

      const authManager = new AuthenticationManager(config.auth);
      const authzManager = new AuthorizationManager(config.authorization);

      // Authenticate
      const authContext: AuthContext = {
        headers: { 'x-api-key': 'valid-key' },
        query: {},
      };

      const authResult = await authManager.authenticate(authContext);
      expect(authResult.success).toBe(true);

      // Authorize
      const securityContext = {
        user: authResult.user!,
        roles: ['user'],
        permissions: ['read'],
        authMethod: authResult.method!,
        request: {
          ip: '127.0.0.1',
          timestamp: new Date(),
        },
      };

      const authzResult = await authzManager.authorize(securityContext, ['read']);
      expect(authzResult.success).toBe(true);
    });
  });
});

