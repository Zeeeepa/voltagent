/**
 * Data Flow & Variable Tracking Analysis Module
 * 
 * This module provides comprehensive analysis capabilities for tracking data flow,
 * variable usage patterns, and identifying data-related issues in TypeScript and
 * JavaScript code.
 * 
 * Features:
 * - Uninitialized variable usage detection
 * - Unused variable detection
 * - Data race condition identification
 * - Memory leak pattern detection
 * - Variable scope violation checking
 * - Null/undefined pointer access detection
 * 
 * @module analysis
 */

// Export types
export * from "./types";

// Export main analyzer class
export { DataFlowTracker } from "./data-flow-tracker";

// Export tools
export {
  createDataFlowAnalysisTool,
  createSingleFileDataFlowTool,
  createDataFlowConfigValidationTool
} from "./data-flow-tool";

// Export convenience functions
export { createDataFlowAnalysisToolkit } from "./toolkit";

// Version information
export const ANALYSIS_MODULE_VERSION = "1.0.0";
export const ANALYSIS_MODULE_NAME = "data_flow_tracking";

