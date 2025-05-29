/**
 * VoltAgent Analysis Modules
 * 
 * This package provides comprehensive static analysis capabilities for code quality,
 * dependency management, and automated issue detection.
 */

// Export dependency validation module
export * from "./dependency-validation";

// Re-export main analyzer for convenience
export { DependencyAnalyzer as StaticAnalyzer } from "./dependency-validation";

/**
 * Analysis module registry for future expansion
 */
export const ANALYSIS_MODULES = {
  DEPENDENCY_VALIDATION: "dependency_validation",
  // Future modules can be added here:
  // SECURITY_ANALYSIS: "security_analysis",
  // PERFORMANCE_ANALYSIS: "performance_analysis",
  // CODE_QUALITY: "code_quality",
} as const;

export type AnalysisModuleType = typeof ANALYSIS_MODULES[keyof typeof ANALYSIS_MODULES];

