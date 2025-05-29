import { createToolkit } from "@voltagent/core";
import { performanceAnalyzerTool, startPerformanceMonitoringTool } from "./tools/performance-analyzer-tool";

/**
 * Create a performance analysis toolkit for VoltAgent
 * 
 * This toolkit provides a complete set of tools for performance analysis:
 * - Performance hotspot detection and analysis
 * - Runtime performance monitoring
 * 
 * @returns Toolkit containing performance analysis tools
 */
export function createPerformanceAnalysisToolkit() {
  return createToolkit({
    name: "performance-analysis",
    description: "Comprehensive performance analysis and hotspot detection toolkit",
    tools: [
      performanceAnalyzerTool,
      startPerformanceMonitoringTool,
    ],
  });
}

/**
 * Default performance analysis toolkit instance
 */
export const performanceAnalysisToolkit = createPerformanceAnalysisToolkit();

