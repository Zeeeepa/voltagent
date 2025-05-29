import { z } from "zod";

// Error handling analysis severity levels
export const SeverityLevel = z.enum(["low", "medium", "high", "critical"]);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

// Error handling finding types
export const ErrorFindingType = z.enum([
  "missing_error_handling",
  "unhandled_exception",
  "error_propagation_issue",
  "missing_recovery_mechanism",
  "inadequate_error_logging",
  "error_swallowing",
  "generic_error_handling",
  "resource_leak_risk",
  "async_error_handling",
  "error_context_loss"
]);
export type ErrorFindingType = z.infer<typeof ErrorFindingType>;

// Error categories
export const ErrorCategory = z.enum([
  "database_errors",
  "network_errors",
  "validation_errors",
  "system_errors",
  "business_logic_errors",
  "async_errors",
  "resource_errors"
]);
export type ErrorCategory = z.infer<typeof ErrorCategory>;

// Individual finding schema
export const ErrorFinding = z.object({
  type: ErrorFindingType,
  file: z.string(),
  function: z.string().optional(),
  line: z.number(),
  column: z.number().optional(),
  operation: z.string().optional(),
  error_path: z.array(z.string()).optional(),
  missing_context: z.string().optional(),
  suggestion: z.string(),
  category: ErrorCategory.optional(),
  severity: SeverityLevel,
  code_snippet: z.string().optional(),
  confidence: z.number().min(0).max(1).optional()
});
export type ErrorFinding = z.infer<typeof ErrorFinding>;

// Analysis result schema
export const ErrorHandlingAnalysisResult = z.object({
  module: z.literal("error_handling_analysis"),
  severity: SeverityLevel,
  timestamp: z.string(),
  analyzed_files: z.array(z.string()),
  total_findings: z.number(),
  findings: z.array(ErrorFinding),
  summary: z.object({
    missing_error_handling: z.number(),
    unhandled_exceptions: z.number(),
    error_propagation_issues: z.number(),
    missing_recovery_mechanisms: z.number(),
    inadequate_logging: z.number(),
    coverage_percentage: z.number()
  }),
  recommendations: z.array(z.string())
});
export type ErrorHandlingAnalysisResult = z.infer<typeof ErrorHandlingAnalysisResult>;

// Code analysis input schema
export const CodeAnalysisInput = z.object({
  files: z.array(z.object({
    path: z.string(),
    content: z.string(),
    language: z.string().optional()
  })),
  project_type: z.string().optional(),
  analysis_depth: z.enum(["basic", "comprehensive", "deep"]).default("comprehensive")
});
export type CodeAnalysisInput = z.infer<typeof CodeAnalysisInput>;

// Language-specific patterns
export interface LanguagePatterns {
  trycatch: RegExp[];
  errorHandling: RegExp[];
  exceptionThrow: RegExp[];
  errorReturn: RegExp[];
  logging: RegExp[];
  asyncPatterns: RegExp[];
  resourceManagement: RegExp[];
}

// Analysis context
export interface AnalysisContext {
  language: string;
  patterns: LanguagePatterns;
  errorProneOperations: string[];
  commonErrorTypes: string[];
}

