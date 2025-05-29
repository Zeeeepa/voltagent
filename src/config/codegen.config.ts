/**
 * Codegen Configuration
 * 
 * Configuration management for Codegen SDK integration
 */

export interface CodegenEnvironmentConfig {
  // Authentication
  CODEGEN_API_TOKEN?: string;
  CODEGEN_API_KEY?: string;
  CODEGEN_ORG_ID?: string;
  
  // API Configuration
  CODEGEN_BASE_URL?: string;
  CODEGEN_TIMEOUT?: string;
  CODEGEN_RETRY_ATTEMPTS?: string;
  
  // GitHub Integration
  GITHUB_TOKEN?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  
  // Logging and Monitoring
  CODEGEN_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  CODEGEN_ENABLE_METRICS?: string;
  
  // Performance
  CODEGEN_MAX_CONCURRENT_TASKS?: string;
  CODEGEN_TASK_TIMEOUT?: string;
  
  // Features
  CODEGEN_ENABLE_AUTO_FIX?: string;
  CODEGEN_ENABLE_CACHING?: string;
}

export interface CodegenConfig {
  // Authentication
  apiToken: string;
  orgId: string;
  
  // API Configuration
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  
  // GitHub Integration
  githubToken?: string;
  githubWebhookSecret?: string;
  
  // Logging and Monitoring
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  
  // Performance
  maxConcurrentTasks: number;
  taskTimeout: number;
  
  // Features
  enableAutoFix: boolean;
  enableCaching: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Omit<CodegenConfig, 'apiToken' | 'orgId'> = {
  baseUrl: 'https://codegen-sh-rest-api.modal.run',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  logLevel: 'info',
  enableMetrics: true,
  maxConcurrentTasks: 5,
  taskTimeout: 300000, // 5 minutes
  enableAutoFix: false,
  enableCaching: true
};

/**
 * Load configuration from environment variables
 */
export function loadCodegenConfig(env: CodegenEnvironmentConfig = process.env): CodegenConfig {
  // Required fields
  const apiToken = env.CODEGEN_API_TOKEN || env.CODEGEN_API_KEY;
  const orgId = env.CODEGEN_ORG_ID;

  if (!apiToken) {
    throw new Error(
      'Codegen API token is required. Set CODEGEN_API_TOKEN or CODEGEN_API_KEY environment variable.'
    );
  }

  if (!orgId) {
    throw new Error(
      'Codegen organization ID is required. Set CODEGEN_ORG_ID environment variable.'
    );
  }

  // Build configuration with defaults
  const config: CodegenConfig = {
    ...DEFAULT_CONFIG,
    apiToken,
    orgId,
    
    // Override with environment variables
    baseUrl: env.CODEGEN_BASE_URL || DEFAULT_CONFIG.baseUrl,
    timeout: parseInt(env.CODEGEN_TIMEOUT || '') || DEFAULT_CONFIG.timeout,
    retryAttempts: parseInt(env.CODEGEN_RETRY_ATTEMPTS || '') || DEFAULT_CONFIG.retryAttempts,
    
    githubToken: env.GITHUB_TOKEN,
    githubWebhookSecret: env.GITHUB_WEBHOOK_SECRET,
    
    logLevel: (env.CODEGEN_LOG_LEVEL as any) || DEFAULT_CONFIG.logLevel,
    enableMetrics: env.CODEGEN_ENABLE_METRICS !== 'false',
    
    maxConcurrentTasks: parseInt(env.CODEGEN_MAX_CONCURRENT_TASKS || '') || DEFAULT_CONFIG.maxConcurrentTasks,
    taskTimeout: parseInt(env.CODEGEN_TASK_TIMEOUT || '') || DEFAULT_CONFIG.taskTimeout,
    
    enableAutoFix: env.CODEGEN_ENABLE_AUTO_FIX === 'true',
    enableCaching: env.CODEGEN_ENABLE_CACHING !== 'false'
  };

  return config;
}

/**
 * Validate configuration
 */
export function validateCodegenConfig(config: CodegenConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!config.apiToken) {
    errors.push('API token is required');
  }

  if (!config.orgId) {
    errors.push('Organization ID is required');
  }

  // Validate URL format
  try {
    new URL(config.baseUrl);
  } catch {
    errors.push('Invalid base URL format');
  }

  // Validate numeric values
  if (config.timeout <= 0) {
    errors.push('Timeout must be positive');
  }

  if (config.retryAttempts < 0) {
    errors.push('Retry attempts cannot be negative');
  }

  if (config.maxConcurrentTasks <= 0) {
    errors.push('Max concurrent tasks must be positive');
  }

  if (config.taskTimeout <= 0) {
    errors.push('Task timeout must be positive');
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`Invalid log level. Must be one of: ${validLogLevels.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration summary for logging
 */
export function getConfigSummary(config: CodegenConfig): Record<string, any> {
  return {
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    logLevel: config.logLevel,
    enableMetrics: config.enableMetrics,
    maxConcurrentTasks: config.maxConcurrentTasks,
    taskTimeout: config.taskTimeout,
    enableAutoFix: config.enableAutoFix,
    enableCaching: config.enableCaching,
    hasGithubToken: !!config.githubToken,
    hasWebhookSecret: !!config.githubWebhookSecret
  };
}

/**
 * Create configuration for different environments
 */
export function createEnvironmentConfig(environment: 'development' | 'staging' | 'production'): Partial<CodegenConfig> {
  const baseConfig = {
    development: {
      logLevel: 'debug' as const,
      enableMetrics: true,
      enableAutoFix: false,
      timeout: 60000, // 1 minute for development
      maxConcurrentTasks: 3
    },
    staging: {
      logLevel: 'info' as const,
      enableMetrics: true,
      enableAutoFix: true,
      timeout: 45000, // 45 seconds
      maxConcurrentTasks: 4
    },
    production: {
      logLevel: 'warn' as const,
      enableMetrics: true,
      enableAutoFix: true,
      timeout: 30000, // 30 seconds
      maxConcurrentTasks: 5
    }
  };

  return baseConfig[environment];
}

