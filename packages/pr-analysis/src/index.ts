/**
 * @voltagent/pr-analysis
 * 
 * Comprehensive PR Analysis & CI/CD Automation System
 * 
 * This package provides a complete solution for automated code analysis,
 * issue detection, and automated fixing through Claude Code integration.
 */

// Core orchestration
export { PRAnalysisOrchestrator } from './orchestration/orchestrator'
export { AnalysisEngine } from './orchestration/analysis-engine'
export { WorkflowManager } from './orchestration/workflow-manager'

// Analysis modules - Static
export { UnusedFunctionDetectionModule } from './analysis/static/unused-functions'
export { ParameterValidationModule } from './analysis/static/parameter-validation'
export { DuplicateCodeDetectionModule } from './analysis/static/duplicate-code'
export { ComplexityAnalysisModule } from './analysis/static/complexity'
export { ImportValidationModule } from './analysis/static/imports'

// Analysis modules - Dynamic
export { FunctionFlowMappingModule } from './analysis/dynamic/function-flow'
export { DataFlowTrackingModule } from './analysis/dynamic/data-flow'
export { ErrorHandlingModule } from './analysis/dynamic/error-handling'
export { PerformanceHotspotModule } from './analysis/dynamic/performance-hotspots'

// Analysis modules - Security
export { VulnerabilityDetectionModule } from './analysis/security/vulnerability-detection'
export { AccessControlModule } from './analysis/security/access-control'
export { ComplianceModule } from './analysis/security/compliance'

// Analysis modules - Performance
export { HotspotDetectionModule } from './analysis/performance/hotspot-detection'
export { MemoryAnalysisModule } from './analysis/performance/memory-analysis'
export { OptimizationModule } from './analysis/performance/optimization'

// Analysis modules - Compliance
export { CodeStandardsModule } from './analysis/compliance/code-standards'
export { DocumentationModule } from './analysis/compliance/documentation'

// Integrations
export { LinearIntegration } from './integrations/linear'
export { AgentAPIIntegration } from './integrations/agentapi'

// Infrastructure
export { AnalysisDatabase } from './database/analysis-db'
export { GitHubWebhookHandler } from './webhooks/github-webhook'
export { ErrorRecoverySystem } from './recovery/error-recovery'

// Server
export { PRAnalysisServer } from './server'

// Utilities
export { Logger } from './utils/logger'

// Types
export * from './types'

// Configuration helpers
export { createDefaultConfig, validateConfig } from './config'

/**
 * Package version
 */
export const VERSION = '1.0.0'

/**
 * Supported analysis types
 */
export const ANALYSIS_TYPES = ['static', 'dynamic', 'security', 'performance', 'compliance'] as const

/**
 * Default module registry
 */
export const DEFAULT_MODULES = {
  static: [
    'unused-functions',
    'parameter-validation', 
    'duplicate-code',
    'complexity',
    'imports'
  ],
  dynamic: [
    'function-flow',
    'data-flow',
    'error-handling',
    'performance-hotspots'
  ],
  security: [
    'vulnerability-detection',
    'access-control',
    'compliance'
  ],
  performance: [
    'hotspot-detection',
    'memory-analysis',
    'optimization'
  ],
  compliance: [
    'code-standards',
    'documentation'
  ]
} as const

