// Comprehensive CI/CD System with Claude Code Validation Integration
// Main exports for the system

export { ClaudeCodeValidator } from './validation/service.js';
export { WSL2Manager } from './wsl2/manager.js';
export { AgentAPIClient } from './agentapi/client.js';
export { DatabaseConnection, db } from './database/connection.js';
export { config, validateConfig, getEnvironmentConfig } from './config/index.js';

// Type exports
export type {
  ValidationOptions,
  ValidationResult,
  ValidationFeedback,
  AnalysisOptions,
  AnalysisResult,
  SecurityVulnerability,
  PerformanceIssue,
  HealthStatus,
} from './agentapi/client.js';

export type {
  WSL2Instance,
  WSL2Configuration,
  DeploymentResult,
} from './wsl2/manager.js';

export type {
  PRInfo,
  TaskContext,
  ValidationSession,
  ValidationMetrics,
} from './validation/service.js';

export type { Config } from './config/index.js';

// Utility functions
export const createValidator = (options?: {
  agentapiUrl?: string;
  apiKey?: string;
  wsl2Config?: any;
}) => {
  return new ClaudeCodeValidator(options);
};

export const createWSL2Manager = (options?: any) => {
  return new WSL2Manager(options);
};

export const createAgentAPIClient = (options?: {
  agentapiUrl?: string;
  apiKey?: string;
  timeout?: number;
}) => {
  return new AgentAPIClient(options);
};

// System health check utility
export const systemHealthCheck = async () => {
  const validator = createValidator();
  return await validator.healthCheck();
};

// Version information
export const VERSION = '1.0.0';
export const SYSTEM_NAME = 'Comprehensive CI/CD with Claude Code Validation';

// Default configuration
export const DEFAULT_CONFIG = {
  validation: {
    timeout: 300000, // 5 minutes
    enableSecurityAnalysis: true,
    enablePerformanceAnalysis: true,
    codeQualityWeight: 0.3,
    functionalityWeight: 0.4,
    testingWeight: 0.2,
    documentationWeight: 0.1,
  },
  wsl2: {
    distro: 'Ubuntu-22.04',
    basePath: '/mnt/c/projects',
    maxInstances: 5,
    memory: '8GB',
    processors: 4,
    swap: '2GB',
  },
  deployment: {
    strategy: 'wsl2' as const,
    enableContainerDeployment: false,
  },
};

