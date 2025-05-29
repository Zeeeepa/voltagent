/**
 * Complexity Analysis Module
 * 
 * This module provides comprehensive code complexity analysis including:
 * - Cyclomatic complexity
 * - Cognitive complexity  
 * - Halstead metrics
 * - Maintainability index
 * - Technical debt indicators
 */

export { ComplexityAnalyzer } from "./analyzer";
export { ComplexityCalculator } from "./calculator";
export { CodeParser } from "./parser";

export type {
  ComplexityMetrics,
  ComplexityFinding,
  ComplexityAnalysisResult,
  ComplexityAnalysisConfig,
  ThresholdLevels,
  Severity,
  RefactorPriority,
  FunctionInfo,
  ASTNode,
} from "./types";

export {
  ComplexityMetricsSchema,
  ComplexityFindingSchema,
  ComplexityAnalysisResultSchema,
  ComplexityAnalysisConfigSchema,
  ThresholdLevelsSchema,
  SeveritySchema,
  RefactorPrioritySchema,
} from "./types";

/**
 * Default configuration for complexity analysis
 */
export const DEFAULT_COMPLEXITY_CONFIG: ComplexityAnalysisConfig = {
  thresholds: {
    cyclomatic: { warning: 10, critical: 15 },
    cognitive: { warning: 15, critical: 25 },
    lines_of_code: { warning: 50, critical: 100 },
    nesting_depth: { warning: 4, critical: 6 },
    parameter_count: { warning: 5, critical: 8 },
  },
  include_patterns: ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
  exclude_patterns: [
    "**/node_modules/**",
    "**/dist/**", 
    "**/build/**",
    "**/*.test.*",
    "**/*.spec.*",
  ],
  calculate_halstead: true,
  track_trends: true,
};

/**
 * Convenience function to create a complexity analyzer with default configuration
 */
export function createComplexityAnalyzer(config?: Partial<ComplexityAnalysisConfig>): ComplexityAnalyzer {
  return new ComplexityAnalyzer({
    ...DEFAULT_COMPLEXITY_CONFIG,
    ...config,
  });
}

/**
 * Quick analysis function for a single file
 */
export async function analyzeFileComplexity(
  filePath: string,
  config?: Partial<ComplexityAnalysisConfig>
): Promise<ComplexityFinding[]> {
  const analyzer = createComplexityAnalyzer(config);
  return analyzer.analyzeFile(filePath);
}

/**
 * Quick analysis function for an entire project
 */
export async function analyzeProjectComplexity(
  rootPath?: string,
  config?: Partial<ComplexityAnalysisConfig>
): Promise<ComplexityAnalysisResult> {
  const analyzer = createComplexityAnalyzer(config);
  return analyzer.analyzeProject(rootPath);
}

