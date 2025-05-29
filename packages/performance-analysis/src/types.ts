/**
 * Performance analysis types and interfaces
 */

export type PerformanceSeverity = "medium" | "high" | "critical";

export type HotspotType = 
  | "cpu_hotspot"
  | "memory_leak"
  | "memory_allocation"
  | "io_bottleneck"
  | "database_bottleneck"
  | "network_bottleneck"
  | "lock_contention"
  | "algorithm_complexity"
  | "resource_leak";

export interface PerformanceMetrics {
  cpu_usage?: string;
  memory_usage?: string;
  execution_time?: string;
  call_frequency?: number;
  allocation_rate?: string;
  leak_rate?: string;
  io_wait_time?: string;
  lock_wait_time?: string;
  complexity_score?: number;
}

export interface PerformanceFinding {
  type: HotspotType;
  file: string;
  function?: string;
  line_start?: number;
  line_end?: number;
  metrics: PerformanceMetrics;
  suggestion: string;
  impact_score: number; // 1-10 scale
  confidence: number; // 0-1 scale
}

export interface PerformanceAnalysisResult {
  module: "performance_hotspot_detection";
  severity: PerformanceSeverity;
  findings: PerformanceFinding[];
  summary: {
    total_hotspots: number;
    critical_issues: number;
    optimization_potential: string;
    estimated_improvement: string;
  };
  metadata: {
    analysis_timestamp: string;
    analysis_duration_ms: number;
    files_analyzed: number;
    functions_analyzed: number;
  };
}

export interface ExecutionProfile {
  file: string;
  function: string;
  execution_time_ms: number;
  cpu_usage_percent: number;
  memory_usage_bytes: number;
  call_count: number;
  line_start?: number;
  line_end?: number;
}

export interface ResourceUsageMetrics {
  file: string;
  function?: string;
  memory_allocations: number;
  memory_deallocations: number;
  peak_memory_usage: number;
  io_operations: number;
  network_requests: number;
  database_queries: number;
}

export interface FunctionCallFrequency {
  file: string;
  function: string;
  call_count: number;
  average_execution_time: number;
  total_execution_time: number;
}

export interface MemoryAllocationPattern {
  file: string;
  function?: string;
  allocation_size: number;
  allocation_frequency: number;
  deallocation_frequency: number;
  potential_leak: boolean;
  leak_rate_per_hour?: number;
}

export interface AnalysisInput {
  execution_profiles: ExecutionProfile[];
  resource_usage_metrics: ResourceUsageMetrics[];
  function_call_frequencies: FunctionCallFrequency[];
  memory_allocation_patterns: MemoryAllocationPattern[];
  source_files?: string[]; // Optional: for static analysis
}

export interface AnalyzerConfig {
  cpu_threshold_percent: number;
  memory_threshold_mb: number;
  execution_time_threshold_ms: number;
  call_frequency_threshold: number;
  memory_leak_threshold_mb_per_hour: number;
  io_threshold_ms: number;
  enable_static_analysis: boolean;
  enable_complexity_analysis: boolean;
}

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  cpu_threshold_percent: 70,
  memory_threshold_mb: 100,
  execution_time_threshold_ms: 1000,
  call_frequency_threshold: 1000,
  memory_leak_threshold_mb_per_hour: 10,
  io_threshold_ms: 500,
  enable_static_analysis: true,
  enable_complexity_analysis: true,
};

