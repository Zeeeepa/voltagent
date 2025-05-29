/**
 * Codegen SDK Integration
 * Main entry point for all Codegen functionality in VoltAgent
 */

// Core components
export { CodegenSDKClient } from './sdk-client';
export { CodegenAuthManager } from './auth-manager';
export { CodegenRepositoryOps } from './repository-ops';
export { CodegenCodeGeneration } from './code-generation';
export { CodegenOrchestrator } from './orchestrator';

// Types
export * from './types';

// Re-export commonly used interfaces
export type {
  CodegenConfig,
  CodegenTask,
  CreateTaskRequest,
  TaskStatus,
  CodeGenerationRequest,
  CodeAnalysisResult,
  RepositoryInfo,
  PullRequestInfo,
  AuthenticationInfo
} from './types';

// Utility function to create a configured orchestrator
export function createCodegenOrchestrator(config: {
  orgId: string;
  token: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
  enableEvents?: boolean;
  maxConcurrentTasks?: number;
  taskTimeout?: number;
}): CodegenOrchestrator {
  return new CodegenOrchestrator(config);
}

// Utility function to validate configuration
export function validateCodegenConfig(config: Partial<CodegenConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.orgId) {
    errors.push('Organization ID is required');
  } else if (typeof config.orgId !== 'string' || config.orgId.length < 3) {
    errors.push('Organization ID must be a string with at least 3 characters');
  }

  if (!config.token) {
    errors.push('API token is required');
  } else if (typeof config.token !== 'string' || config.token.length < 10) {
    errors.push('API token must be a string with at least 10 characters');
  }

  if (config.baseURL && typeof config.baseURL !== 'string') {
    errors.push('Base URL must be a string');
  }

  if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    errors.push('Timeout must be a positive number');
  }

  if (config.retries && (typeof config.retries !== 'number' || config.retries < 0)) {
    errors.push('Retries must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Default configuration
export const DEFAULT_CODEGEN_CONFIG: Partial<CodegenConfig> = {
  baseURL: 'https://codegen-sh-rest-api.modal.run',
  timeout: 30000,
  retries: 3,
  rateLimit: {
    requests: 100,
    window: 60000
  },
  cache: {
    ttl: 300000,
    maxSize: 1000
  }
};

// Environment variable helpers
export function getCodegenConfigFromEnv(): Partial<CodegenConfig> {
  return {
    orgId: process.env.CODEGEN_ORG_ID,
    token: process.env.CODEGEN_TOKEN,
    baseURL: process.env.CODEGEN_BASE_URL || DEFAULT_CODEGEN_CONFIG.baseURL,
    timeout: process.env.CODEGEN_TIMEOUT ? parseInt(process.env.CODEGEN_TIMEOUT) : DEFAULT_CODEGEN_CONFIG.timeout,
    retries: process.env.CODEGEN_RETRIES ? parseInt(process.env.CODEGEN_RETRIES) : DEFAULT_CODEGEN_CONFIG.retries
  };
}

// Quick setup function
export async function setupCodegen(config?: Partial<CodegenConfig>): Promise<CodegenOrchestrator> {
  // Merge environment variables with provided config
  const envConfig = getCodegenConfigFromEnv();
  const finalConfig = { ...DEFAULT_CODEGEN_CONFIG, ...envConfig, ...config };

  // Validate configuration
  const validation = validateCodegenConfig(finalConfig);
  if (!validation.valid) {
    throw new Error(`Invalid Codegen configuration: ${validation.errors.join(', ')}`);
  }

  // Create and initialize orchestrator
  const orchestrator = createCodegenOrchestrator(finalConfig as any);
  await orchestrator.initialize();

  return orchestrator;
}

