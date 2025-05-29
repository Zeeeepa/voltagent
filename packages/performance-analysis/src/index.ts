/**
 * @voltagent/performance-analysis
 * 
 * Performance hotspot detection and analysis module for VoltAgent
 * 
 * This module provides comprehensive performance analysis capabilities including:
 * - CPU hotspot detection
 * - Memory leak identification
 * - I/O bottleneck analysis
 * - Algorithm complexity assessment
 * - Static code analysis for performance anti-patterns
 * - Runtime profiling integration
 */

// Export main analyzer classes
export { PerformanceHotspotDetector } from "./analyzers/hotspot-detector";
export { StaticPerformanceAnalyzer } from "./analyzers/static-analyzer";
export { ProfilingIntegration } from "./analyzers/profiling-integration";

// Export tools for VoltAgent integration
export { 
  performanceAnalyzerTool, 
  startPerformanceMonitoringTool 
} from "./tools/performance-analyzer-tool";

// Export types and interfaces
export type {
  PerformanceSeverity,
  HotspotType,
  PerformanceMetrics,
  PerformanceFinding,
  PerformanceAnalysisResult,
  ExecutionProfile,
  ResourceUsageMetrics,
  FunctionCallFrequency,
  MemoryAllocationPattern,
  AnalysisInput,
  AnalyzerConfig,
} from "./types";

// Export default configuration
export { DEFAULT_ANALYZER_CONFIG } from "./types";

// Convenience exports for common use cases
export { createPerformanceAnalysisToolkit } from "./toolkit";

/**
 * Version information
 */
export const VERSION = "0.1.0";

/**
 * Module metadata
 */
export const MODULE_INFO = {
  name: "performance_hotspot_detection",
  version: VERSION,
  description: "Performance hotspot detection and analysis module for VoltAgent",
  capabilities: [
    "CPU hotspot detection",
    "Memory leak identification", 
    "I/O bottleneck analysis",
    "Algorithm complexity assessment",
    "Static code analysis",
    "Runtime profiling integration"
  ],
  supported_languages: ["JavaScript", "TypeScript", "Node.js"],
  analysis_types: [
    "cpu_hotspot",
    "memory_leak", 
    "memory_allocation",
    "io_bottleneck",
    "database_bottleneck",
    "network_bottleneck",
    "lock_contention",
    "algorithm_complexity",
    "resource_leak"
  ]
} as const;

