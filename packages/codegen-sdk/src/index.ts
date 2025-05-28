/**
 * @voltagent/codegen-sdk
 * 
 * Unified Codegen SDK Integration for VoltAgent
 * Consolidates natural language processing, automated PR creation, 
 * Claude Code orchestration, and AgentAPI middleware into a single cohesive system.
 * 
 * This package represents the consolidation of PRs #52, #54, #55, #82, #86, #87
 * with zero duplication and standardized SDK integration patterns.
 */

// Main SDK Client
export { CodegenSDKClient } from './client/sdk-client';

// Core Components
export { UnifiedNLPEngine } from './nlp/engine';
export { UnifiedPRCreator } from './automation/pr-creator';
export { ClaudeCodeOrchestrator } from './middleware/claude-orchestrator';
export { AgentAPIMiddleware } from './middleware/agent-api';

// Types and Interfaces
export type {
  // Configuration Types
  CodegenSDKConfig,
  CodegenIntegrationConfig,
  NLPProcessingOptions,
  ClaudeCodeOrchestrationConfig,
  AgentAPIMiddlewareConfig,

  // Request/Response Types
  CodeGenerationRequest,
  CodeGenerationResult,
  NLPResult,
  PRCreationOptions,
  PRCreationResult,
  ClaudeCodeRequest,
  ClaudeCodeResult,
  AgentAPIRequest,
  AgentAPIResponse,

  // Error Types
  CodegenSDKError,
  NLPProcessingError,
  PRAutomationError,
  ClaudeCodeError
} from './types';

// Validation Schemas
export {
  CodeGenerationRequestSchema,
  PRCreationOptionsSchema,
  ClaudeCodeRequestSchema
} from './types';

// Utility Functions
export {
  validateRepositoryFormat,
  parseRepository,
  generateSecureId,
  sanitizeText,
  detectLanguageFromExtension,
  formatCode,
  calculateTextSimilarity,
  truncateText,
  camelToKebab,
  kebabToCamel,
  deepClone,
  retryWithBackoff,
  debounce,
  throttle,
  isValidEmail,
  isValidUrl,
  formatBytes,
  timeAgo,
  delay,
  hasSecurityConcerns
} from './utils';

// Default Configuration Factory
export function createDefaultConfig(
  githubToken: string,
  githubOwner: string,
  githubRepo: string,
  anthropicApiKey?: string
): CodegenIntegrationConfig {
  return {
    sdk: {
      timeout: 30000,
      retryAttempts: 3
    },
    nlp: {
      language: 'en',
      confidence: 0.7,
      enableSentimentAnalysis: true,
      enableEntityExtraction: true,
      enableIntentClassification: false
    },
    prAutomation: {
      github: {
        token: githubToken,
        owner: githubOwner,
        repo: githubRepo
      }
    },
    claudeCode: {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.1,
      systemPrompt: 'You are an expert software engineer and code generator.'
    },
    middleware: {
      enableLogging: true,
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60
      }
    }
  };
}

// Quick Setup Function
export async function createCodegenSDK(
  githubToken: string,
  githubOwner: string,
  githubRepo: string,
  anthropicApiKey?: string,
  customConfig?: Partial<CodegenIntegrationConfig>
): Promise<CodegenSDKClient> {
  const defaultConfig = createDefaultConfig(
    githubToken,
    githubOwner,
    githubRepo,
    anthropicApiKey
  );

  const finalConfig = customConfig 
    ? { ...defaultConfig, ...customConfig }
    : defaultConfig;

  return new CodegenSDKClient(finalConfig);
}

// Version and Metadata
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@voltagent/codegen-sdk';

// Feature Flags
export const FEATURES = {
  NLP_PROCESSING: true,
  PR_AUTOMATION: true,
  CLAUDE_CODE_ORCHESTRATION: true,
  AGENT_API_MIDDLEWARE: true,
  CACHING: true,
  RATE_LIMITING: true,
  METRICS: true,
  LOGGING: true
} as const;

// Consolidated PR Information
export const CONSOLIDATED_PRS = {
  description: 'This package consolidates the following PRs into a unified Codegen SDK integration',
  originalPRs: [
    { number: 52, description: 'Codegen SDK client implementation' },
    { number: 54, description: 'Natural language processing engine' },
    { number: 55, description: 'Automated PR creation logic' },
    { number: 82, description: 'AgentAPI middleware for Claude Code orchestration' },
    { number: 86, description: 'Comprehensive Codegen SDK integration' },
    { number: 87, description: 'Real Codegen SDK integration & NLP engine' }
  ],
  consolidationObjectives: [
    'Merge natural language processing features into unified engine',
    'Consolidate automated PR creation logic for consistency',
    'Standardize SDK integration patterns across all components',
    'Eliminate duplicate NLP processing',
    'Unify Claude Code orchestration'
  ],
  technicalRequirements: [
    'Zero duplication in NLP processing logic',
    'Consistent SDK integration interfaces',
    'Removal of redundant PR creation functions',
    'Single cohesive Codegen integration',
    'Clear contracts for natural language processing'
  ]
} as const;

