import { z } from "zod";

/**
 * Severity levels for analysis findings
 */
export enum Severity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Types of analysis findings
 */
export enum FindingType {
  UNREACHABLE_CODE = "unreachable_code",
  DEAD_CODE = "dead_code",
  CALL_CHAIN_ANALYSIS = "call_chain_analysis",
  PERFORMANCE_BOTTLENECK = "performance_bottleneck",
  CIRCULAR_DEPENDENCY = "circular_dependency",
  UNUSED_FUNCTION = "unused_function",
}

/**
 * Reasons for unreachable code
 */
export enum UnreachableReason {
  CONDITION_NEVER_TRUE = "condition_never_true",
  CONDITION_NEVER_FALSE = "condition_never_false",
  EARLY_RETURN = "early_return",
  EXCEPTION_ALWAYS_THROWN = "exception_always_thrown",
  DEAD_BRANCH = "dead_branch",
}

/**
 * Schema for analysis findings
 */
export const AnalysisFindingSchema = z.object({
  type: z.nativeEnum(FindingType),
  file: z.string(),
  function: z.string().optional(),
  lines: z.string().optional(),
  reason: z.string().optional(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Schema for call chain analysis
 */
export const CallChainAnalysisSchema = z.object({
  type: z.literal(FindingType.CALL_CHAIN_ANALYSIS),
  entry_point: z.string(),
  max_depth: z.number(),
  total_functions: z.number(),
  bottlenecks: z.array(z.string()),
  optimization_opportunities: z.array(z.string()),
  call_graph: z.record(z.array(z.string())).optional(),
});

/**
 * Schema for the complete analysis result
 */
export const CallFlowAnalysisResultSchema = z.object({
  module: z.literal("call_flow_mapping"),
  severity: z.nativeEnum(Severity),
  timestamp: z.string(),
  analysis_duration_ms: z.number(),
  files_analyzed: z.number(),
  functions_analyzed: z.number(),
  findings: z.array(AnalysisFindingSchema),
  call_chain_analysis: CallChainAnalysisSchema.optional(),
  statistics: z.object({
    total_lines: z.number(),
    executable_lines: z.number(),
    unreachable_lines: z.number(),
    coverage_percentage: z.number(),
  }),
});

/**
 * TypeScript types derived from schemas
 */
export type AnalysisFinding = z.infer<typeof AnalysisFindingSchema>;
export type CallChainAnalysis = z.infer<typeof CallChainAnalysisSchema>;
export type CallFlowAnalysisResult = z.infer<typeof CallFlowAnalysisResultSchema>;

/**
 * Configuration for the call flow analyzer
 */
export interface CallFlowAnalyzerConfig {
  /** Maximum depth for call chain analysis */
  maxCallDepth: number;
  /** Whether to include external dependencies in analysis */
  includeExternalDeps: boolean;
  /** File patterns to exclude from analysis */
  excludePatterns: string[];
  /** Whether to perform dynamic tracing (requires instrumentation) */
  enableDynamicTracing: boolean;
  /** Confidence threshold for reporting findings (0-1) */
  confidenceThreshold: number;
  /** Whether to generate visualization data */
  generateVisualization: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: CallFlowAnalyzerConfig = {
  maxCallDepth: 50,
  includeExternalDeps: false,
  excludePatterns: ["node_modules/**", "**/*.test.ts", "**/*.spec.ts"],
  enableDynamicTracing: false,
  confidenceThreshold: 0.7,
  generateVisualization: true,
};

/**
 * Function call node in the call graph
 */
export interface CallNode {
  id: string;
  name: string;
  file: string;
  line: number;
  column: number;
  type: "function" | "method" | "arrow" | "async";
  parameters: string[];
  returnType?: string;
  isExported: boolean;
  isAsync: boolean;
  complexity: number;
}

/**
 * Call edge representing a function call relationship
 */
export interface CallEdge {
  from: string;
  to: string;
  file: string;
  line: number;
  callType: "direct" | "indirect" | "conditional" | "loop";
  weight: number; // Number of times this call is made
}

/**
 * Call graph structure
 */
export interface CallGraph {
  nodes: Map<string, CallNode>;
  edges: CallEdge[];
  entryPoints: string[];
  unreachableNodes: string[];
}

/**
 * Execution path through the call graph
 */
export interface ExecutionPath {
  id: string;
  nodes: string[];
  depth: number;
  isComplete: boolean;
  hasLoop: boolean;
  estimatedExecutionTime?: number;
}

/**
 * Performance bottleneck information
 */
export interface PerformanceBottleneck {
  functionId: string;
  type: "cpu_intensive" | "io_bound" | "memory_intensive" | "recursive";
  severity: Severity;
  estimatedImpact: number; // 0-1 scale
  suggestions: string[];
}

/**
 * Analysis context for tracking state during analysis
 */
export interface AnalysisContext {
  currentFile: string;
  currentFunction?: string;
  callStack: string[];
  visitedNodes: Set<string>;
  findings: AnalysisFinding[];
  callGraph: CallGraph;
  config: CallFlowAnalyzerConfig;
}

