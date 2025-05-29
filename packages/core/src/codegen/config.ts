/**
 * Codegen Configuration
 * Configuration schema and validation for Codegen SDK integration
 */

import { z } from 'zod';

// Zod schema for Codegen configuration
export const CodegenConfigSchema = z.object({
  orgId: z.string().min(3, 'Organization ID must be at least 3 characters'),
  token: z.string().min(10, 'API token must be at least 10 characters'),
  baseURL: z.string().url().optional().default('https://codegen-sh-rest-api.modal.run'),
  timeout: z.number().positive().optional().default(30000),
  retries: z.number().min(0).optional().default(3),
  rateLimit: z.object({
    requests: z.number().positive().default(100),
    window: z.number().positive().default(60000)
  }).optional().default({ requests: 100, window: 60000 }),
  cache: z.object({
    ttl: z.number().positive().default(300000),
    maxSize: z.number().positive().default(1000)
  }).optional().default({ ttl: 300000, maxSize: 1000 })
});

// Zod schema for orchestrator configuration
export const OrchestratorConfigSchema = CodegenConfigSchema.extend({
  enableEvents: z.boolean().optional().default(true),
  maxConcurrentTasks: z.number().positive().optional().default(5),
  taskTimeout: z.number().positive().optional().default(600000),
  enableAutoRetry: z.boolean().optional().default(true),
  retryAttempts: z.number().min(0).optional().default(3)
});

// Environment variable schema
export const CodegenEnvSchema = z.object({
  CODEGEN_ORG_ID: z.string().optional(),
  CODEGEN_TOKEN: z.string().optional(),
  CODEGEN_BASE_URL: z.string().url().optional(),
  CODEGEN_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).optional(),
  CODEGEN_RETRIES: z.string().regex(/^\d+$/).transform(Number).optional(),
  CODEGEN_MAX_CONCURRENT_TASKS: z.string().regex(/^\d+$/).transform(Number).optional(),
  CODEGEN_TASK_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).optional(),
  CODEGEN_ENABLE_EVENTS: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional(),
  CODEGEN_ENABLE_AUTO_RETRY: z.string().regex(/^(true|false)$/).transform(val => val === 'true').optional()
});

// Type inference from schemas
export type CodegenConfigType = z.infer<typeof CodegenConfigSchema>;
export type OrchestratorConfigType = z.infer<typeof OrchestratorConfigSchema>;
export type CodegenEnvType = z.infer<typeof CodegenEnvSchema>;

/**
 * Validate Codegen configuration
 */
export function validateCodegenConfig(config: unknown): {
  success: boolean;
  data?: CodegenConfigType;
  error?: z.ZodError;
} {
  const result = CodegenConfigSchema.safeParse(config);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: result.success ? undefined : result.error
  };
}

/**
 * Validate orchestrator configuration
 */
export function validateOrchestratorConfig(config: unknown): {
  success: boolean;
  data?: OrchestratorConfigType;
  error?: z.ZodError;
} {
  const result = OrchestratorConfigSchema.safeParse(config);
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    error: result.success ? undefined : result.error
  };
}

/**
 * Parse environment variables for Codegen configuration
 */
export function parseCodegenEnv(env: Record<string, string | undefined> = process.env): CodegenEnvType {
  const result = CodegenEnvSchema.parse(env);
  return result;
}

/**
 * Create Codegen configuration from environment variables
 */
export function createConfigFromEnv(env: Record<string, string | undefined> = process.env): Partial<CodegenConfigType> {
  const envConfig = parseCodegenEnv(env);
  
  return {
    orgId: envConfig.CODEGEN_ORG_ID,
    token: envConfig.CODEGEN_TOKEN,
    baseURL: envConfig.CODEGEN_BASE_URL,
    timeout: envConfig.CODEGEN_TIMEOUT,
    retries: envConfig.CODEGEN_RETRIES
  };
}

/**
 * Create orchestrator configuration from environment variables
 */
export function createOrchestratorConfigFromEnv(env: Record<string, string | undefined> = process.env): Partial<OrchestratorConfigType> {
  const envConfig = parseCodegenEnv(env);
  
  return {
    ...createConfigFromEnv(env),
    maxConcurrentTasks: envConfig.CODEGEN_MAX_CONCURRENT_TASKS,
    taskTimeout: envConfig.CODEGEN_TASK_TIMEOUT,
    enableEvents: envConfig.CODEGEN_ENABLE_EVENTS,
    enableAutoRetry: envConfig.CODEGEN_ENABLE_AUTO_RETRY
  };
}

/**
 * Merge configuration with defaults
 */
export function mergeWithDefaults<T extends Partial<CodegenConfigType>>(config: T): CodegenConfigType {
  const validation = validateCodegenConfig({
    orgId: '',
    token: '',
    ...config
  });
  
  if (!validation.success) {
    throw new Error(`Invalid configuration: ${validation.error?.message}`);
  }
  
  return validation.data!;
}

/**
 * Configuration presets for different environments
 */
export const ConfigPresets = {
  development: {
    timeout: 60000, // 1 minute
    retries: 1,
    enableEvents: true,
    maxConcurrentTasks: 2,
    taskTimeout: 300000, // 5 minutes
    enableAutoRetry: false,
    cache: {
      ttl: 60000, // 1 minute
      maxSize: 100
    }
  },
  
  production: {
    timeout: 30000, // 30 seconds
    retries: 3,
    enableEvents: false,
    maxConcurrentTasks: 10,
    taskTimeout: 600000, // 10 minutes
    enableAutoRetry: true,
    cache: {
      ttl: 300000, // 5 minutes
      maxSize: 1000
    }
  },
  
  testing: {
    timeout: 10000, // 10 seconds
    retries: 0,
    enableEvents: false,
    maxConcurrentTasks: 1,
    taskTimeout: 30000, // 30 seconds
    enableAutoRetry: false,
    cache: {
      ttl: 10000, // 10 seconds
      maxSize: 10
    }
  }
} as const;

/**
 * Get configuration preset
 */
export function getConfigPreset(environment: keyof typeof ConfigPresets): Partial<OrchestratorConfigType> {
  return ConfigPresets[environment];
}

/**
 * Create configuration for specific environment
 */
export function createConfigForEnvironment(
  environment: keyof typeof ConfigPresets,
  overrides: Partial<OrchestratorConfigType> = {}
): Partial<OrchestratorConfigType> {
  const preset = getConfigPreset(environment);
  const envConfig = createOrchestratorConfigFromEnv();
  
  return {
    ...preset,
    ...envConfig,
    ...overrides
  };
}

