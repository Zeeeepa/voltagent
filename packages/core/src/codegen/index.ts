/**
 * Codegen AI-Powered Development Engine
 * 
 * A comprehensive AI-powered development engine that converts natural language requirements
 * into working code implementations with full context awareness.
 * 
 * @example
 * ```typescript
 * import { CodegenDevelopmentEngine } from '@voltagent/core/codegen';
 * 
 * const engine = new CodegenDevelopmentEngine(agent, {
 *   database: { connectionString: 'postgresql://...' },
 *   github: { token: 'ghp_...', owner: 'org', repo: 'repo' },
 *   linear: { apiKey: 'lin_...', teamId: 'team-id' },
 *   generation: { temperature: 0.3, maxTokens: 4000 },
 *   quality: { qualityThreshold: 0.8 },
 *   testing: { framework: 'Jest', coverage: 80 }
 * });
 * 
 * // Start monitoring Linear for new assignments
 * await engine.monitorLinearAssignments();
 * 
 * // Execute complete development workflow for a task
 * const result = await engine.executeCompleteWorkflow('task-123');
 * console.log('PR created:', result.prUrl);
 * ```
 */

// Main Development Engine
export { CodegenDevelopmentEngine } from './DevelopmentEngine';

// Core Components
export { ContextAnalyzer } from './ContextAnalyzer';
export { CodebaseAnalyzer } from './CodebaseAnalyzer';
export { CodeGenerator } from './CodeGenerator';
export { QualityAssurance } from './QualityAssurance';
export { PRManager } from './PRManager';
export { LinearMonitor } from './LinearMonitor';
export { TestGenerator } from './TestGenerator';

// Types and Interfaces
export type {
  // Configuration Types
  DevelopmentEngineOptions,
  DatabaseOptions,
  GitHubOptions,
  LinearOptions,
  CodeGenerationOptions,
  QualityAssuranceOptions,
  TestingOptions,

  // Task and Context Types
  TaskContext,
  Requirements,
  TechnicalSpecification,
  Constraint,
  IntegrationPoint,

  // Analysis Types
  CodebaseAnalysisResult,
  ArchitecturalPattern,
  ComponentMap,
  DependencyGraph,
  DesignPattern,
  CodingStandards,
  TestingFramework,
  CodebaseMetrics,

  // Implementation Types
  ImplementationResult,
  GeneratedFile,
  ProjectStructure,
  BestPractice,
  Optimization,

  // Quality Assurance Types
  QualityAssuranceResult,
  CodeQualityMetrics,
  SecurityAnalysis,
  PerformanceAnalysis,
  MaintainabilityAnalysis,
  TestCoverageAnalysis,
  QualityIssue,
  OptimizationSuggestion,

  // Testing Types
  TestSuite,
  TestCoverage,

  // Documentation Types
  Documentation,
  DocumentationSection,

  // Migration Types
  Migration,

  // Configuration Types
  Configuration,

  // PR and Git Types
  PRCreationResult,
  PRCheck,

  // Learning and Feedback Types
  ValidationResults,
  Feedback,
  ValidationError,
  ValidationMetrics,
  LearningData,
  ImplementationPatterns,

  // Event Types
  DevelopmentEngineEvent,

  // Error Types
  DevelopmentEngineError,
} from './types';

/**
 * Create a new Codegen Development Engine instance
 * 
 * @param agent - VoltAgent instance with LLM provider
 * @param options - Configuration options for the development engine
 * @returns Configured CodegenDevelopmentEngine instance
 * 
 * @example
 * ```typescript
 * import { createDevelopmentEngine } from '@voltagent/core/codegen';
 * 
 * const engine = createDevelopmentEngine(agent, {
 *   database: { connectionString: process.env.DATABASE_URL },
 *   github: { 
 *     token: process.env.GITHUB_TOKEN,
 *     owner: 'myorg',
 *     repo: 'myrepo'
 *   },
 *   linear: {
 *     apiKey: process.env.LINEAR_API_KEY,
 *     teamId: process.env.LINEAR_TEAM_ID
 *   }
 * });
 * ```
 */
export function createDevelopmentEngine(
  agent: any,
  options: any
): CodegenDevelopmentEngine {
  return new CodegenDevelopmentEngine(agent, options);
}

/**
 * Default configuration for the development engine
 */
export const DEFAULT_ENGINE_CONFIG = {
  generation: {
    temperature: 0.3,
    maxTokens: 4000,
    codeStyle: {
      indentation: 'spaces' as const,
      indentSize: 2,
      quotes: 'double' as const,
      semicolons: true,
      trailingCommas: true,
      lineLength: 100,
    },
  },
  quality: {
    enableLinting: true,
    enableSecurity: true,
    enablePerformance: true,
    qualityThreshold: 0.8,
  },
  testing: {
    framework: 'Jest',
    coverage: 80,
    generateIntegrationTests: true,
    generateE2ETests: false,
  },
} as const;

/**
 * Utility function to merge user config with defaults
 */
export function mergeEngineConfig(userConfig: any): any {
  return {
    ...DEFAULT_ENGINE_CONFIG,
    ...userConfig,
    generation: {
      ...DEFAULT_ENGINE_CONFIG.generation,
      ...userConfig.generation,
    },
    quality: {
      ...DEFAULT_ENGINE_CONFIG.quality,
      ...userConfig.quality,
    },
    testing: {
      ...DEFAULT_ENGINE_CONFIG.testing,
      ...userConfig.testing,
    },
  };
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

/**
 * Feature flags for experimental functionality
 */
export const FEATURES = {
  CONTINUOUS_LEARNING: true,
  MULTI_LANGUAGE_SUPPORT: true,
  ADVANCED_OPTIMIZATION: true,
  SECURITY_SCANNING: true,
  PERFORMANCE_PROFILING: true,
} as const;

