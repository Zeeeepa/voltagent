import { z } from "zod";

// Core Codegen SDK Configuration
export interface CodegenSDKConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
}

// Natural Language Processing Types
export interface NLPProcessingOptions {
  language?: string;
  confidence?: number;
  enableSentimentAnalysis?: boolean;
  enableEntityExtraction?: boolean;
  enableIntentClassification?: boolean;
}

export interface NLPResult {
  text: string;
  language: string;
  confidence: number;
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  entities?: Array<{
    text: string;
    type: string;
    confidence: number;
    start: number;
    end: number;
  }>;
  intent?: {
    name: string;
    confidence: number;
  };
  keywords?: string[];
  summary?: string;
}

// Code Generation Types
export interface CodeGenerationRequest {
  prompt: string;
  language: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  includeComments?: boolean;
  includeTests?: boolean;
}

export interface CodeGenerationResult {
  code: string;
  language: string;
  explanation?: string;
  tests?: string;
  confidence: number;
  metadata: {
    tokensUsed: number;
    processingTime: number;
    model: string;
  };
}

// PR Automation Types
export interface PRCreationOptions {
  repository: string;
  baseBranch: string;
  headBranch: string;
  title: string;
  description: string;
  draft?: boolean;
  assignees?: string[];
  reviewers?: string[];
  labels?: string[];
  autoMerge?: boolean;
}

export interface PRCreationResult {
  prNumber: number;
  prUrl: string;
  status: 'created' | 'updated' | 'failed';
  message: string;
}

// Claude Code Orchestration Types
export interface ClaudeCodeOrchestrationConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ClaudeCodeRequest {
  instruction: string;
  codeContext?: string;
  files?: Array<{
    path: string;
    content: string;
  }>;
  outputFormat?: 'code' | 'explanation' | 'both';
}

export interface ClaudeCodeResult {
  code?: string;
  explanation?: string;
  suggestions?: string[];
  confidence: number;
  metadata: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
}

// AgentAPI Middleware Types
export interface AgentAPIMiddlewareConfig {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  cacheTimeout?: number;
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

export interface AgentAPIRequest {
  id: string;
  type: 'nlp' | 'codegen' | 'pr-automation' | 'claude-code';
  payload: any;
  metadata?: Record<string, any>;
}

export interface AgentAPIResponse<T = any> {
  id: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    processingTime: number;
    timestamp: string;
    version: string;
  };
}

// Unified Integration Types
export interface CodegenIntegrationConfig {
  sdk: CodegenSDKConfig;
  nlp: NLPProcessingOptions;
  prAutomation: {
    github: {
      token: string;
      owner: string;
      repo: string;
    };
  };
  claudeCode: ClaudeCodeOrchestrationConfig;
  middleware: AgentAPIMiddlewareConfig;
}

// Zod Schemas for Validation
export const CodeGenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  language: z.string(),
  context: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  includeComments: z.boolean().optional(),
  includeTests: z.boolean().optional(),
});

export const PRCreationOptionsSchema = z.object({
  repository: z.string().min(1),
  baseBranch: z.string().min(1),
  headBranch: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  draft: z.boolean().optional(),
  assignees: z.array(z.string()).optional(),
  reviewers: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  autoMerge: z.boolean().optional(),
});

export const ClaudeCodeRequestSchema = z.object({
  instruction: z.string().min(1),
  codeContext: z.string().optional(),
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
  })).optional(),
  outputFormat: z.enum(['code', 'explanation', 'both']).optional(),
});

// Error Types
export class CodegenSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CodegenSDKError';
  }
}

export class NLPProcessingError extends CodegenSDKError {
  constructor(message: string, details?: any) {
    super(message, 'NLP_PROCESSING_ERROR', details);
  }
}

export class PRAutomationError extends CodegenSDKError {
  constructor(message: string, details?: any) {
    super(message, 'PR_AUTOMATION_ERROR', details);
  }
}

export class ClaudeCodeError extends CodegenSDKError {
  constructor(message: string, details?: any) {
    super(message, 'CLAUDE_CODE_ERROR', details);
  }
}

