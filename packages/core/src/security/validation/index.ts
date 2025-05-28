/**
 * Request validation module for VoltAgent Security Framework
 */

import type { Context } from 'hono';
import type { SecurityError, ValidationConfig } from '../types';

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input to prevent XSS attacks
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: protocol
      .trim();
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Basic HTML sanitization - remove script tags and dangerous attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '');
  }

  /**
   * Sanitize SQL input to prevent SQL injection
   */
  static sanitizeSql(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/['";\\]/g, '') // Remove quotes and backslashes
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments start
      .replace(/\*\//g, '') // Remove SQL block comments end
      .replace(/\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b/gi, '');
  }

  /**
   * Sanitize file path to prevent directory traversal
   */
  static sanitizeFilePath(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[<>:"|?*]/g, '') // Remove invalid filename characters
      .replace(/^\/+/, '') // Remove leading slashes
      .replace(/\/+/g, '/') // Normalize multiple slashes
      .trim();
  }

  /**
   * Validate and sanitize email address
   */
  static sanitizeEmail(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = input.toLowerCase().trim();
    
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize URL to prevent malicious redirects
   */
  static sanitizeUrl(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    try {
      const url = new URL(input);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }

      return url.toString();
    } catch {
      return '';
    }
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, options: SanitizeOptions = {}): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (options.html) {
        return this.sanitizeHtml(obj);
      }
      if (options.sql) {
        return this.sanitizeSql(obj);
      }
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, options));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value, options);
      }
      return sanitized;
    }

    return obj;
  }
}

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  html?: boolean;
  sql?: boolean;
  strict?: boolean;
}

/**
 * Request validator
 */
export class RequestValidator {
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
  }

  /**
   * Validate request body
   */
  async validateBody(c: Context): Promise<void> {
    if (!this.config.body) {
      return;
    }

    const contentType = c.req.header('content-type');
    if (!contentType) {
      return;
    }

    // Validate content type
    if (this.config.allowedContentTypes && this.config.allowedContentTypes.length > 0) {
      const baseContentType = contentType.split(';')[0].trim();
      if (!this.config.allowedContentTypes.includes(baseContentType)) {
        throw this.createValidationError(
          'INVALID_CONTENT_TYPE',
          `Content type '${baseContentType}' is not allowed`,
          415
        );
      }
    }

    // Validate body size
    if (this.config.maxBodySize) {
      const contentLength = c.req.header('content-length');
      if (contentLength && parseInt(contentLength, 10) > this.config.maxBodySize) {
        throw this.createValidationError(
          'BODY_TOO_LARGE',
          `Request body size exceeds maximum allowed size of ${this.config.maxBodySize} bytes`,
          413
        );
      }
    }

    // Parse and validate JSON body
    if (contentType.includes('application/json')) {
      try {
        const body = await c.req.json();
        this.validateJsonStructure(body);
      } catch (error) {
        throw this.createValidationError(
          'INVALID_JSON',
          'Invalid JSON in request body',
          400,
          { originalError: error }
        );
      }
    }
  }

  /**
   * Validate query parameters
   */
  validateQuery(c: Context): void {
    if (!this.config.query) {
      return;
    }

    const url = new URL(c.req.url);
    const params = Object.fromEntries(url.searchParams.entries());

    // Validate parameter count
    const paramCount = Object.keys(params).length;
    if (paramCount > 100) { // Arbitrary limit
      throw this.createValidationError(
        'TOO_MANY_PARAMS',
        'Too many query parameters',
        400
      );
    }

    // Validate parameter values
    for (const [key, value] of Object.entries(params)) {
      this.validateParameterValue(key, value);
    }
  }

  /**
   * Validate request headers
   */
  validateHeaders(c: Context): void {
    if (!this.config.headers) {
      return;
    }

    const headers = c.req.header();

    // Validate header count
    const headerCount = Object.keys(headers).length;
    if (headerCount > 50) { // Arbitrary limit
      throw this.createValidationError(
        'TOO_MANY_HEADERS',
        'Too many request headers',
        400
      );
    }

    // Validate specific headers
    for (const [key, value] of Object.entries(headers)) {
      this.validateHeaderValue(key, value);
    }
  }

  /**
   * Sanitize request data
   */
  sanitizeRequest(c: Context, options: SanitizeOptions = {}): void {
    // Note: This is a conceptual implementation
    // In practice, you would need to modify the request object
    // which may not be directly possible with all frameworks
    
    // Sanitize would typically happen during parsing
    // and would require framework-specific implementation
  }

  private validateJsonStructure(obj: any, depth = 0): void {
    const maxDepth = 10;
    const maxKeys = 100;

    if (depth > maxDepth) {
      throw this.createValidationError(
        'JSON_TOO_DEEP',
        `JSON structure exceeds maximum depth of ${maxDepth}`,
        400
      );
    }

    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const keys = Object.keys(obj);
      if (keys.length > maxKeys) {
        throw this.createValidationError(
          'JSON_TOO_MANY_KEYS',
          `JSON object has too many keys (max: ${maxKeys})`,
          400
        );
      }

      for (const value of Object.values(obj)) {
        if (value && typeof value === 'object') {
          this.validateJsonStructure(value, depth + 1);
        }
      }
    }

    if (Array.isArray(obj)) {
      if (obj.length > 1000) { // Arbitrary limit
        throw this.createValidationError(
          'ARRAY_TOO_LARGE',
          'Array exceeds maximum allowed size',
          400
        );
      }

      for (const item of obj) {
        if (item && typeof item === 'object') {
          this.validateJsonStructure(item, depth + 1);
        }
      }
    }
  }

  private validateParameterValue(key: string, value: string): void {
    // Validate parameter key
    if (key.length > 100) {
      throw this.createValidationError(
        'PARAM_KEY_TOO_LONG',
        `Parameter key '${key}' is too long`,
        400
      );
    }

    // Validate parameter value
    if (value.length > 1000) {
      throw this.createValidationError(
        'PARAM_VALUE_TOO_LONG',
        `Parameter value for '${key}' is too long`,
        400
      );
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(value)) {
      throw this.createValidationError(
        'SUSPICIOUS_PARAM_VALUE',
        `Parameter value for '${key}' contains suspicious patterns`,
        400
      );
    }
  }

  private validateHeaderValue(key: string, value: string): void {
    // Validate header value length
    if (value.length > 8192) { // HTTP header limit
      throw this.createValidationError(
        'HEADER_TOO_LONG',
        `Header '${key}' value is too long`,
        400
      );
    }

    // Check for header injection
    if (value.includes('\n') || value.includes('\r')) {
      throw this.createValidationError(
        'HEADER_INJECTION',
        `Header '${key}' contains invalid characters`,
        400
      );
    }
  }

  private containsSuspiciousPatterns(value: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /\.\./,
      /union\s+select/i,
      /drop\s+table/i,
      /exec\s*\(/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(value));
  }

  private createValidationError(code: string, message: string, status: number, details?: any): SecurityError {
    const error = new Error(message) as SecurityError;
    error.code = code;
    error.status = status;
    error.details = details;
    return error;
  }
}

/**
 * Schema validation utilities
 */
export class SchemaValidator {
  /**
   * Validate object against a simple schema
   */
  static validate(obj: any, schema: ValidationSchema): ValidationResult {
    const errors: string[] = [];
    
    try {
      this.validateObject(obj, schema, '', errors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Validation error');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateObject(obj: any, schema: ValidationSchema, path: string, errors: string[]): void {
    if (schema.type && typeof obj !== schema.type) {
      errors.push(`${path}: Expected ${schema.type}, got ${typeof obj}`);
      return;
    }

    if (schema.required && (obj === null || obj === undefined)) {
      errors.push(`${path}: Field is required`);
      return;
    }

    if (schema.minLength && typeof obj === 'string' && obj.length < schema.minLength) {
      errors.push(`${path}: String too short (min: ${schema.minLength})`);
    }

    if (schema.maxLength && typeof obj === 'string' && obj.length > schema.maxLength) {
      errors.push(`${path}: String too long (max: ${schema.maxLength})`);
    }

    if (schema.min && typeof obj === 'number' && obj < schema.min) {
      errors.push(`${path}: Number too small (min: ${schema.min})`);
    }

    if (schema.max && typeof obj === 'number' && obj > schema.max) {
      errors.push(`${path}: Number too large (max: ${schema.max})`);
    }

    if (schema.pattern && typeof obj === 'string' && !schema.pattern.test(obj)) {
      errors.push(`${path}: String does not match required pattern`);
    }

    if (schema.properties && typeof obj === 'object' && obj !== null) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        const newPath = path ? `${path}.${key}` : key;
        this.validateObject(obj[key], subSchema, newPath, errors);
      }
    }

    if (schema.items && Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newPath = path ? `${path}[${index}]` : `[${index}]`;
        this.validateObject(item, schema.items!, newPath, errors);
      });
    }
  }
}

/**
 * Validation schema interface
 */
export interface ValidationSchema {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  properties?: Record<string, ValidationSchema>;
  items?: ValidationSchema;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  email: {
    type: 'string' as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
  },
  
  url: {
    type: 'string' as const,
    pattern: /^https?:\/\/.+/,
    maxLength: 2048,
  },
  
  uuid: {
    type: 'string' as const,
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  },
  
  apiKey: {
    type: 'string' as const,
    minLength: 16,
    maxLength: 128,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  
  username: {
    type: 'string' as const,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
};

