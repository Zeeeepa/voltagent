import { z } from "zod";

/**
 * Complexity metrics for a function or method
 */
export const ComplexityMetricsSchema = z.object({
  cyclomatic_complexity: z.number().describe("Cyclomatic complexity (decision points + 1)"),
  cognitive_complexity: z.number().describe("Cognitive complexity (human perception of complexity)"),
  maintainability_index: z.number().describe("Maintainability index (0-100, higher is better)"),
  lines_of_code: z.number().describe("Total lines of code"),
  halstead_volume: z.number().optional().describe("Halstead volume metric"),
  halstead_difficulty: z.number().optional().describe("Halstead difficulty metric"),
  halstead_effort: z.number().optional().describe("Halstead effort metric"),
  nesting_depth: z.number().describe("Maximum nesting depth"),
  parameter_count: z.number().describe("Number of parameters"),
});

export type ComplexityMetrics = z.infer<typeof ComplexityMetricsSchema>;

/**
 * Threshold levels for complexity metrics
 */
export const ThresholdLevelsSchema = z.object({
  cyclomatic: z.object({
    warning: z.number().default(10),
    critical: z.number().default(15),
  }),
  cognitive: z.object({
    warning: z.number().default(15),
    critical: z.number().default(25),
  }),
  lines_of_code: z.object({
    warning: z.number().default(50),
    critical: z.number().default(100),
  }),
  nesting_depth: z.object({
    warning: z.number().default(4),
    critical: z.number().default(6),
  }),
  parameter_count: z.object({
    warning: z.number().default(5),
    critical: z.number().default(8),
  }),
});

export type ThresholdLevels = z.infer<typeof ThresholdLevelsSchema>;

/**
 * Severity levels for findings
 */
export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Refactor priority levels
 */
export const RefactorPrioritySchema = z.enum(["low", "medium", "high", "critical"]);
export type RefactorPriority = z.infer<typeof RefactorPrioritySchema>;

/**
 * Individual complexity finding
 */
export const ComplexityFindingSchema = z.object({
  file: z.string().describe("File path"),
  function: z.string().describe("Function or method name"),
  line_start: z.number().describe("Starting line number"),
  line_end: z.number().describe("Ending line number"),
  metrics: ComplexityMetricsSchema,
  thresholds_exceeded: z.array(z.string()).describe("List of threshold types exceeded"),
  suggestion: z.string().describe("Specific refactoring suggestion"),
  refactor_priority: RefactorPrioritySchema,
  technical_debt_score: z.number().min(0).max(100).describe("Technical debt score (0-100)"),
});

export type ComplexityFinding = z.infer<typeof ComplexityFindingSchema>;

/**
 * Complete complexity analysis result
 */
export const ComplexityAnalysisResultSchema = z.object({
  module: z.literal("complexity_analysis"),
  severity: SeveritySchema,
  timestamp: z.string().describe("ISO timestamp of analysis"),
  summary: z.object({
    total_functions: z.number(),
    functions_with_issues: z.number(),
    average_complexity: z.number(),
    highest_complexity: z.number(),
    total_technical_debt: z.number(),
  }),
  findings: z.array(ComplexityFindingSchema),
  thresholds: ThresholdLevelsSchema,
});

export type ComplexityAnalysisResult = z.infer<typeof ComplexityAnalysisResultSchema>;

/**
 * Function or method information extracted from AST
 */
export interface FunctionInfo {
  name: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  parameters: string[];
  body: string;
  isAsync: boolean;
  isGenerator: boolean;
  isMethod: boolean;
  className?: string;
}

/**
 * AST node types for complexity calculation
 */
export interface ASTNode {
  type: string;
  children?: ASTNode[];
  value?: string;
  line?: number;
  column?: number;
}

/**
 * Configuration for complexity analysis
 */
export const ComplexityAnalysisConfigSchema = z.object({
  thresholds: ThresholdLevelsSchema.optional(),
  include_patterns: z.array(z.string()).default(["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"]),
  exclude_patterns: z.array(z.string()).default(["**/node_modules/**", "**/dist/**", "**/build/**", "**/*.test.*", "**/*.spec.*"]),
  calculate_halstead: z.boolean().default(true),
  track_trends: z.boolean().default(true),
});

export type ComplexityAnalysisConfig = z.infer<typeof ComplexityAnalysisConfigSchema>;

