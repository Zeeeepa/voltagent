import { Tool } from "@voltagent/core";
import { z } from "zod";
import { PerformanceHotspotDetector } from "../analyzers/hotspot-detector";
import { StaticPerformanceAnalyzer } from "../analyzers/static-analyzer";
import { ProfilingIntegration } from "../analyzers/profiling-integration";
import type { AnalysisInput, AnalyzerConfig, PerformanceAnalysisResult } from "../types";

// Zod schemas for input validation
const ExecutionProfileSchema = z.object({
  file: z.string(),
  function: z.string(),
  execution_time_ms: z.number(),
  cpu_usage_percent: z.number(),
  memory_usage_bytes: z.number(),
  call_count: z.number(),
  line_start: z.number().optional(),
  line_end: z.number().optional(),
});

const ResourceUsageMetricsSchema = z.object({
  file: z.string(),
  function: z.string().optional(),
  memory_allocations: z.number(),
  memory_deallocations: z.number(),
  peak_memory_usage: z.number(),
  io_operations: z.number(),
  network_requests: z.number(),
  database_queries: z.number(),
});

const FunctionCallFrequencySchema = z.object({
  file: z.string(),
  function: z.string(),
  call_count: z.number(),
  average_execution_time: z.number(),
  total_execution_time: z.number(),
});

const MemoryAllocationPatternSchema = z.object({
  file: z.string(),
  function: z.string().optional(),
  allocation_size: z.number(),
  allocation_frequency: z.number(),
  deallocation_frequency: z.number(),
  potential_leak: z.boolean(),
  leak_rate_per_hour: z.number().optional(),
});

const AnalysisInputSchema = z.object({
  execution_profiles: z.array(ExecutionProfileSchema),
  resource_usage_metrics: z.array(ResourceUsageMetricsSchema),
  function_call_frequencies: z.array(FunctionCallFrequencySchema),
  memory_allocation_patterns: z.array(MemoryAllocationPatternSchema),
  source_files: z.array(z.string()).optional(),
});

const AnalyzerConfigSchema = z.object({
  cpu_threshold_percent: z.number().default(70),
  memory_threshold_mb: z.number().default(100),
  execution_time_threshold_ms: z.number().default(1000),
  call_frequency_threshold: z.number().default(1000),
  memory_leak_threshold_mb_per_hour: z.number().default(10),
  io_threshold_ms: z.number().default(500),
  enable_static_analysis: z.boolean().default(true),
  enable_complexity_analysis: z.boolean().default(true),
});

/**
 * Performance Hotspot Detection Tool for VoltAgent
 * 
 * This tool analyzes execution profiles, resource usage metrics, and source code
 * to identify performance bottlenecks and optimization opportunities.
 */
export const performanceAnalyzerTool = new Tool({
  name: "performance_hotspot_analyzer",
  description: `Analyze performance data to identify hotspots, bottlenecks, and optimization opportunities.
  
  This tool performs comprehensive performance analysis including:
  - CPU-intensive function detection
  - Memory leak and allocation pattern analysis
  - I/O bottleneck identification
  - Algorithm complexity assessment
  - Static code analysis for performance anti-patterns
  
  Input should include execution profiles, resource usage metrics, function call frequencies,
  and memory allocation patterns from profiling tools or runtime monitoring.`,
  
  parameters: z.object({
    analysis_input: AnalysisInputSchema.describe("Performance data collected from profiling tools or runtime monitoring"),
    config: AnalyzerConfigSchema.optional().describe("Configuration options for the analysis thresholds and settings"),
    include_static_analysis: z.boolean().default(false).describe("Whether to perform static code analysis on provided source files"),
    source_code_files: z.record(z.string(), z.string()).optional().describe("Map of file paths to source code content for static analysis"),
  }),

  async execute(args) {
    try {
      const { analysis_input, config = {}, include_static_analysis, source_code_files } = args;
      
      // Initialize the performance hotspot detector
      const detector = new PerformanceHotspotDetector(config);
      
      // Perform main hotspot analysis
      let result: PerformanceAnalysisResult = await detector.analyze(analysis_input);
      
      // Perform static analysis if requested and source files are provided
      if (include_static_analysis && source_code_files) {
        const staticAnalyzer = new StaticPerformanceAnalyzer();
        const staticFindings = [];
        
        for (const [filePath, sourceCode] of Object.entries(source_code_files)) {
          const findings = await staticAnalyzer.analyzeSourceCode(filePath, sourceCode);
          staticFindings.push(...findings);
        }
        
        // Merge static analysis findings with runtime analysis
        result.findings.push(...staticFindings);
        
        // Re-sort by impact score
        result.findings.sort((a, b) => b.impact_score - a.impact_score);
        
        // Update summary
        result.summary.total_hotspots = result.findings.length;
        result.summary.critical_issues = result.findings.filter(f => f.impact_score >= 8).length;
      }
      
      return {
        success: true,
        analysis_result: result,
        recommendations: generateRecommendations(result),
        next_steps: generateNextSteps(result),
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred during performance analysis",
        recommendations: [
          "Verify that the input data format matches the expected schema",
          "Check that profiling data contains valid numeric values",
          "Ensure source code files are provided if static analysis is enabled",
        ],
      };
    }
  },
});

/**
 * Tool for starting runtime performance monitoring
 */
export const startPerformanceMonitoringTool = new Tool({
  name: "start_performance_monitoring",
  description: "Start runtime performance monitoring to collect execution profiles and resource usage data",
  
  parameters: z.object({
    duration_seconds: z.number().default(60).describe("Duration to monitor performance in seconds"),
    sample_interval_ms: z.number().default(1000).describe("Sampling interval in milliseconds"),
  }),

  async execute(args) {
    try {
      const { duration_seconds, sample_interval_ms } = args;
      
      const profiler = new ProfilingIntegration();
      
      // Start monitoring
      profiler.startMonitoring();
      
      // Wait for the specified duration
      await new Promise(resolve => setTimeout(resolve, duration_seconds * 1000));
      
      // Stop monitoring and collect data
      profiler.stopMonitoring();
      
      const analysisInput: AnalysisInput = {
        execution_profiles: profiler.generateExecutionProfiles(),
        resource_usage_metrics: profiler.generateResourceUsageMetrics(),
        function_call_frequencies: profiler.generateFunctionCallFrequencies(),
        memory_allocation_patterns: profiler.generateMemoryAllocationPatterns(),
      };
      
      return {
        success: true,
        message: `Performance monitoring completed for ${duration_seconds} seconds`,
        analysis_input: analysisInput,
        data_points_collected: {
          execution_profiles: analysisInput.execution_profiles.length,
          resource_metrics: analysisInput.resource_usage_metrics.length,
          function_frequencies: analysisInput.function_call_frequencies.length,
          memory_patterns: analysisInput.memory_allocation_patterns.length,
        },
        next_step: "Use the 'performance_hotspot_analyzer' tool with this data to identify performance issues",
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to start performance monitoring",
        recommendations: [
          "Ensure the application is running and generating performance data",
          "Check that performance monitoring APIs are available in the runtime environment",
          "Verify that the monitoring duration is reasonable (not too short or too long)",
        ],
      };
    }
  },
});

/**
 * Generate actionable recommendations based on analysis results
 */
function generateRecommendations(result: PerformanceAnalysisResult): string[] {
  const recommendations: string[] = [];
  
  // Group findings by type for targeted recommendations
  const findingsByType = result.findings.reduce((acc, finding) => {
    if (!acc[finding.type]) acc[finding.type] = [];
    acc[finding.type].push(finding);
    return acc;
  }, {} as Record<string, typeof result.findings>);
  
  // CPU hotspot recommendations
  if (findingsByType.cpu_hotspot?.length > 0) {
    recommendations.push(
      "🔥 CPU Hotspots Detected:",
      "- Profile the most CPU-intensive functions using detailed profiling tools",
      "- Consider algorithm optimization or caching for frequently called functions",
      "- Implement async processing for CPU-intensive operations"
    );
  }
  
  // Memory leak recommendations
  if (findingsByType.memory_leak?.length > 0) {
    recommendations.push(
      "🧠 Memory Leaks Found:",
      "- Review object lifecycle management and ensure proper cleanup",
      "- Check for event listener removal and timer cleanup",
      "- Use memory profiling tools to identify unreferenced objects"
    );
  }
  
  // I/O bottleneck recommendations
  if (findingsByType.io_bottleneck?.length > 0 || findingsByType.database_bottleneck?.length > 0) {
    recommendations.push(
      "💾 I/O Bottlenecks Identified:",
      "- Implement connection pooling for database operations",
      "- Add caching layers for frequently accessed data",
      "- Use async I/O operations and batch processing where possible"
    );
  }
  
  // Algorithm complexity recommendations
  if (findingsByType.algorithm_complexity?.length > 0) {
    recommendations.push(
      "⚡ Algorithm Complexity Issues:",
      "- Review algorithms for O(n²) or worse complexity",
      "- Consider using more efficient data structures (Maps, Sets, etc.)",
      "- Implement memoization for expensive computations"
    );
  }
  
  // General recommendations based on severity
  if (result.severity === "critical") {
    recommendations.unshift(
      "🚨 CRITICAL PERFORMANCE ISSUES DETECTED:",
      "- Immediate attention required to prevent system degradation",
      "- Consider implementing performance monitoring in production"
    );
  }
  
  return recommendations;
}

/**
 * Generate next steps based on analysis results
 */
function generateNextSteps(result: PerformanceAnalysisResult): string[] {
  const nextSteps: string[] = [];
  
  if (result.findings.length === 0) {
    return [
      "✅ No significant performance issues detected",
      "Continue monitoring performance in production",
      "Consider running analysis with lower thresholds for optimization opportunities"
    ];
  }
  
  // Prioritize by impact score
  const criticalFindings = result.findings.filter(f => f.impact_score >= 8);
  const highFindings = result.findings.filter(f => f.impact_score >= 6 && f.impact_score < 8);
  
  if (criticalFindings.length > 0) {
    nextSteps.push(
      "1. 🔴 Address critical issues first:",
      ...criticalFindings.slice(0, 3).map(f => `   - ${f.file}${f.function ? `:${f.function}` : ''}: ${f.suggestion}`)
    );
  }
  
  if (highFindings.length > 0) {
    nextSteps.push(
      "2. 🟡 Address high-impact issues:",
      ...highFindings.slice(0, 3).map(f => `   - ${f.file}${f.function ? `:${f.function}` : ''}: ${f.suggestion}`)
    );
  }
  
  nextSteps.push(
    "3. 📊 Set up continuous monitoring:",
    "   - Implement performance monitoring in production",
    "   - Set up alerts for performance regressions",
    "   - Schedule regular performance analysis"
  );
  
  if (result.summary.optimization_potential.includes("High")) {
    nextSteps.push(
      "4. 🎯 Performance optimization opportunity:",
      `   - ${result.summary.estimated_improvement} potential improvement available`,
      "   - Consider dedicating a sprint to performance optimization"
    );
  }
  
  return nextSteps;
}

