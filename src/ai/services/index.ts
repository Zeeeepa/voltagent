/**
 * AI Services
 * 
 * Main exports for AI services modules
 */

// Code Generation Service
export {
  CodeGenerationService,
  type CodeGenerationOptions,
  type CodeContext,
  type GenerationResult,
  type CodeTemplate
} from './code-generation.js';

// Review Analysis Service
export {
  ReviewAnalysisService,
  type ReviewCriteria,
  type ReviewResult,
  type ReviewIssue,
  type ReviewSuggestion,
  type CodeLocation,
  type CodeMetrics,
  type ReviewContext,
  ReviewCategory
} from './review-analysis.js';

// Debugging Assistant Service
export {
  DebuggingAssistantService,
  type DebugRequest,
  type DebugContext,
  type DebugResult,
  type ErrorAnalysis,
  type Solution,
  type CodeChange,
  type PreventionTip,
  type TestCase,
  type RelatedIssue,
  ErrorType
} from './debugging-assistant.js';

