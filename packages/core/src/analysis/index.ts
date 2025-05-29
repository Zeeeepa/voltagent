/**
 * Static Analysis Module
 * 
 * This module provides comprehensive static analysis tools for code quality,
 * security, performance, and maintainability analysis.
 */

// Static Analysis Tools
export { 
  duplicateCodeDetectionTool,
  type DuplicateCodeFinding,
  type DuplicateCodeAnalysisResult,
  type DuplicateCodeDetectorConfig,
  type CodeLocation
} from './static/duplicate-code-detector';

// Analysis Types
export interface AnalysisModule {
  name: string;
  version: string;
  description: string;
  tools: string[];
}

export interface AnalysisResult {
  module: string;
  severity: "low" | "medium" | "high";
  findings: unknown[];
  summary: Record<string, unknown>;
  timestamp: string;
}

/**
 * Available static analysis modules
 */
export const STATIC_ANALYSIS_MODULES: AnalysisModule[] = [
  {
    name: "duplicate_code_detection",
    version: "1.0.0",
    description: "Detects duplicated functionality, similar code blocks, and refactoring opportunities",
    tools: ["duplicate_code_detection"]
  }
];

/**
 * Get all available analysis tools
 */
export function getAvailableAnalysisTools() {
  return STATIC_ANALYSIS_MODULES.flatMap(module => module.tools);
}

/**
 * Get analysis module by name
 */
export function getAnalysisModule(name: string): AnalysisModule | undefined {
  return STATIC_ANALYSIS_MODULES.find(module => module.name === name);
}

