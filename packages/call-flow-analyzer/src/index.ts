/**
 * @voltagent/call-flow-analyzer
 * 
 * Dynamic Analysis: Function Call Flow Mapping Module
 * 
 * This module provides comprehensive analysis of function call flows,
 * unreachable code detection, and performance bottleneck identification
 * for JavaScript and TypeScript codebases.
 */

// Core analyzer
export { CallFlowAnalyzer } from "./analyzer";

// Types and interfaces
export {
  Severity,
  FindingType,
  UnreachableReason,
  CallFlowAnalyzerConfig,
  CallFlowAnalysisResult,
  AnalysisFinding,
  CallChainAnalysis,
  CallGraph,
  CallNode,
  CallEdge,
  ExecutionPath,
  PerformanceBottleneck,
  AnalysisContext,
  DEFAULT_CONFIG,
} from "./types";

// VoltAgent tools
export {
  analyzeCallFlowTool,
  analyzeFileCallFlowTool,
  detectUnreachableCodeTool,
  analyzePerformanceBottlenecksTool,
  generateCallFlowVisualizationTool,
} from "./tools";

// Schemas for validation
export {
  AnalysisFindingSchema,
  CallChainAnalysisSchema,
  CallFlowAnalysisResultSchema,
} from "./types";

/**
 * Create a pre-configured call flow analyzer with common settings
 */
export function createCallFlowAnalyzer(config?: Partial<CallFlowAnalyzerConfig>): CallFlowAnalyzer {
  return new CallFlowAnalyzer(config);
}

/**
 * Quick analysis function for simple use cases
 */
export async function analyzeCallFlow(
  targetPath: string,
  config?: Partial<CallFlowAnalyzerConfig>
): Promise<CallFlowAnalysisResult> {
  const analyzer = createCallFlowAnalyzer(config);
  return analyzer.analyze(targetPath);
}

/**
 * Utility function to get all available tools as an array
 */
export function getCallFlowAnalysisTools() {
  return [
    analyzeCallFlowTool,
    analyzeFileCallFlowTool,
    detectUnreachableCodeTool,
    analyzePerformanceBottlenecksTool,
    generateCallFlowVisualizationTool,
  ];
}

/**
 * Version information
 */
export const VERSION = "0.1.0";

/**
 * Module metadata
 */
export const MODULE_INFO = {
  name: "call_flow_mapping",
  version: VERSION,
  description: "Dynamic analysis module for function call flow mapping and code quality analysis",
  capabilities: [
    "Function call flow mapping",
    "Unreachable code detection", 
    "Dead code identification",
    "Performance bottleneck analysis",
    "Circular dependency detection",
    "Call chain visualization",
    "Execution path analysis",
  ],
  supportedLanguages: ["JavaScript", "TypeScript", "JSX", "TSX"],
  outputFormats: ["JSON", "Mermaid", "Graphviz"],
} as const;

