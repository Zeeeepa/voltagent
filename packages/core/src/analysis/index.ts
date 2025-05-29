/**
 * VoltAgent Analysis Module
 * 
 * Comprehensive static analysis tools for code quality, complexity, and maintainability.
 * This module is part of the larger PR Analysis & CI/CD Automation System.
 */

// Complexity Analysis Module
export * from "./complexity";

// Re-export main analyzer classes for convenience
export { ComplexityAnalyzer } from "./complexity/analyzer";

// Re-export main types
export type {
  ComplexityAnalysisResult,
  ComplexityFinding,
  ComplexityMetrics,
} from "./complexity/types";

/**
 * Analysis module metadata
 */
export const ANALYSIS_MODULE_INFO = {
  name: "VoltAgent Analysis",
  version: "1.0.0",
  description: "Static analysis tools for code complexity and maintainability",
  modules: [
    {
      name: "complexity_analysis",
      description: "Code complexity and maintainability metrics",
      features: [
        "Cyclomatic complexity",
        "Cognitive complexity", 
        "Halstead metrics",
        "Maintainability index",
        "Technical debt indicators",
      ],
    },
  ],
} as const;

