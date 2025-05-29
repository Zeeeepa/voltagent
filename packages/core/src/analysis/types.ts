import { z } from "zod";

/**
 * Severity levels for analysis findings
 */
export enum AnalysisSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Types of data flow issues that can be detected
 */
export enum DataFlowIssueType {
  UNINITIALIZED_VARIABLE = "uninitialized_variable",
  UNUSED_VARIABLE = "unused_variable",
  UNUSED_ASSIGNMENT = "unused_assignment",
  DATA_RACE = "data_race",
  MEMORY_LEAK = "memory_leak",
  SCOPE_VIOLATION = "scope_violation",
  NULL_POINTER_ACCESS = "null_pointer_access",
  UNDEFINED_ACCESS = "undefined_access",
  TYPE_MISMATCH = "type_mismatch",
  CIRCULAR_DEPENDENCY = "circular_dependency"
}

/**
 * Location information for code issues
 */
export const LocationSchema = z.object({
  file: z.string().describe("File path where the issue occurs"),
  line: z.number().describe("Line number where the issue occurs"),
  column: z.number().optional().describe("Column number where the issue occurs"),
  endLine: z.number().optional().describe("End line number for multi-line issues"),
  endColumn: z.number().optional().describe("End column number for multi-line issues")
});

export type Location = z.infer<typeof LocationSchema>;

/**
 * Concurrent access information for data race detection
 */
export const ConcurrentAccessSchema = z.object({
  file: z.string().describe("File where the concurrent access occurs"),
  line: z.number().describe("Line number of the access"),
  operation: z.enum(["read", "write", "modify"]).describe("Type of operation"),
  context: z.string().optional().describe("Context of the access (function, method, etc.)")
});

export type ConcurrentAccess = z.infer<typeof ConcurrentAccessSchema>;

/**
 * Variable information
 */
export const VariableInfoSchema = z.object({
  name: z.string().describe("Variable name"),
  type: z.string().optional().describe("Variable type if available"),
  scope: z.string().describe("Variable scope (global, function, block, etc.)"),
  declaration: LocationSchema.describe("Location where variable is declared"),
  usages: z.array(LocationSchema).describe("All locations where variable is used")
});

export type VariableInfo = z.infer<typeof VariableInfoSchema>;

/**
 * Data flow finding
 */
export const DataFlowFindingSchema = z.object({
  type: z.nativeEnum(DataFlowIssueType).describe("Type of data flow issue"),
  severity: z.nativeEnum(AnalysisSeverity).describe("Severity of the issue"),
  message: z.string().describe("Human-readable description of the issue"),
  location: LocationSchema.describe("Primary location of the issue"),
  variable: z.string().optional().describe("Variable name involved in the issue"),
  variableInfo: VariableInfoSchema.optional().describe("Detailed variable information"),
  relatedLocations: z.array(LocationSchema).optional().describe("Related locations for context"),
  concurrentAccess: z.array(ConcurrentAccessSchema).optional().describe("Concurrent access information for data races"),
  suggestion: z.string().describe("Suggested fix for the issue"),
  confidence: z.number().min(0).max(1).describe("Confidence level of the detection (0.0 to 1.0)")
});

export type DataFlowFinding = z.infer<typeof DataFlowFindingSchema>;

/**
 * Analysis result for data flow tracking
 */
export const DataFlowAnalysisResultSchema = z.object({
  module: z.literal("data_flow_tracking").describe("Analysis module identifier"),
  severity: z.nativeEnum(AnalysisSeverity).describe("Overall severity of findings"),
  analysisTime: z.number().describe("Time taken for analysis in milliseconds"),
  filesAnalyzed: z.number().describe("Number of files analyzed"),
  variablesTracked: z.number().describe("Total number of variables tracked"),
  findings: z.array(DataFlowFindingSchema).describe("List of data flow issues found"),
  summary: z.object({
    totalIssues: z.number().describe("Total number of issues found"),
    criticalIssues: z.number().describe("Number of critical issues"),
    highIssues: z.number().describe("Number of high severity issues"),
    mediumIssues: z.number().describe("Number of medium severity issues"),
    lowIssues: z.number().describe("Number of low severity issues")
  }).describe("Summary of findings by severity"),
  metadata: z.object({
    analysisVersion: z.string().describe("Version of the analysis module"),
    timestamp: z.string().describe("ISO timestamp of when analysis was performed"),
    configuration: z.record(z.any()).optional().describe("Analysis configuration used")
  }).describe("Analysis metadata")
});

export type DataFlowAnalysisResult = z.infer<typeof DataFlowAnalysisResultSchema>;

/**
 * Configuration for data flow analysis
 */
export const DataFlowAnalysisConfigSchema = z.object({
  enableUninitializedVariableDetection: z.boolean().default(true),
  enableUnusedVariableDetection: z.boolean().default(true),
  enableDataRaceDetection: z.boolean().default(true),
  enableMemoryLeakDetection: z.boolean().default(true),
  enableScopeViolationDetection: z.boolean().default(true),
  enableNullPointerDetection: z.boolean().default(true),
  enableTypeChecking: z.boolean().default(true),
  maxFileSizeKB: z.number().default(1024).describe("Maximum file size to analyze in KB"),
  excludePatterns: z.array(z.string()).default([]).describe("File patterns to exclude from analysis"),
  includePatterns: z.array(z.string()).default(["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]).describe("File patterns to include in analysis"),
  strictMode: z.boolean().default(false).describe("Enable strict analysis mode with more aggressive checks"),
  confidenceThreshold: z.number().min(0).max(1).default(0.7).describe("Minimum confidence threshold for reporting issues")
});

export type DataFlowAnalysisConfig = z.infer<typeof DataFlowAnalysisConfigSchema>;

/**
 * Input for data flow analysis
 */
export const DataFlowAnalysisInputSchema = z.object({
  files: z.array(z.object({
    path: z.string().describe("File path"),
    content: z.string().describe("File content")
  })).describe("Files to analyze"),
  config: DataFlowAnalysisConfigSchema.optional().describe("Analysis configuration")
});

export type DataFlowAnalysisInput = z.infer<typeof DataFlowAnalysisInputSchema>;

