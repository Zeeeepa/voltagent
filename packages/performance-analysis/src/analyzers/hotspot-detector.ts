import type {
  AnalysisInput,
  AnalyzerConfig,
  PerformanceAnalysisResult,
  PerformanceFinding,
  PerformanceSeverity,
  HotspotType,
  DEFAULT_ANALYZER_CONFIG,
} from "../types";

/**
 * Performance Hotspot Detection Analyzer
 * 
 * Identifies performance bottlenecks, resource usage patterns, and optimization opportunities
 * from execution profiles, resource metrics, and static analysis data.
 */
export class PerformanceHotspotDetector {
  private config: AnalyzerConfig;

  constructor(config: Partial<AnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_ANALYZER_CONFIG, ...config };
  }

  /**
   * Analyze performance data and detect hotspots
   */
  async analyze(input: AnalysisInput): Promise<PerformanceAnalysisResult> {
    const startTime = Date.now();
    const findings: PerformanceFinding[] = [];

    // Analyze CPU hotspots
    findings.push(...this.analyzeCpuHotspots(input.execution_profiles));

    // Analyze memory issues
    findings.push(...this.analyzeMemoryIssues(input.memory_allocation_patterns));

    // Analyze I/O bottlenecks
    findings.push(...this.analyzeIoBottlenecks(input.resource_usage_metrics));

    // Analyze function call patterns
    findings.push(...this.analyzeFunctionCallPatterns(input.function_call_frequencies));

    // Analyze execution time issues
    findings.push(...this.analyzeExecutionTimeIssues(input.execution_profiles));

    // Sort findings by impact score (highest first)
    findings.sort((a, b) => b.impact_score - a.impact_score);

    // Determine overall severity
    const severity = this.calculateOverallSeverity(findings);

    // Calculate metadata
    const analysisTime = Date.now() - startTime;
    const uniqueFiles = new Set([
      ...input.execution_profiles.map(p => p.file),
      ...input.resource_usage_metrics.map(m => m.file),
      ...input.function_call_frequencies.map(f => f.file),
      ...input.memory_allocation_patterns.map(p => p.file),
    ]);

    const uniqueFunctions = new Set([
      ...input.execution_profiles.map(p => `${p.file}:${p.function}`),
      ...input.function_call_frequencies.map(f => `${f.file}:${f.function}`),
    ]);

    return {
      module: "performance_hotspot_detection",
      severity,
      findings: findings.slice(0, 10), // Top 10 findings
      summary: {
        total_hotspots: findings.length,
        critical_issues: findings.filter(f => f.impact_score >= 8).length,
        optimization_potential: this.calculateOptimizationPotential(findings),
        estimated_improvement: this.estimatePerformanceImprovement(findings),
      },
      metadata: {
        analysis_timestamp: new Date().toISOString(),
        analysis_duration_ms: analysisTime,
        files_analyzed: uniqueFiles.size,
        functions_analyzed: uniqueFunctions.size,
      },
    };
  }

  /**
   * Analyze CPU-intensive functions
   */
  private analyzeCpuHotspots(profiles: AnalysisInput["execution_profiles"]): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];

    for (const profile of profiles) {
      if (profile.cpu_usage_percent >= this.config.cpu_threshold_percent) {
        const impactScore = Math.min(10, (profile.cpu_usage_percent / 10) + (profile.call_count / 1000));
        
        findings.push({
          type: "cpu_hotspot",
          file: profile.file,
          function: profile.function,
          line_start: profile.line_start,
          line_end: profile.line_end,
          metrics: {
            cpu_usage: `${profile.cpu_usage_percent}%`,
            execution_time: `${profile.execution_time_ms}ms`,
            call_frequency: profile.call_count,
          },
          suggestion: this.generateCpuOptimizationSuggestion(profile),
          impact_score: impactScore,
          confidence: 0.9,
        });
      }
    }

    return findings;
  }

  /**
   * Analyze memory allocation patterns and detect leaks
   */
  private analyzeMemoryIssues(patterns: AnalysisInput["memory_allocation_patterns"]): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];

    for (const pattern of patterns) {
      // Check for memory leaks
      if (pattern.potential_leak && pattern.leak_rate_per_hour) {
        const leakRateMB = pattern.leak_rate_per_hour;
        if (leakRateMB >= this.config.memory_leak_threshold_mb_per_hour) {
          findings.push({
            type: "memory_leak",
            file: pattern.file,
            function: pattern.function,
            metrics: {
              leak_rate: `${leakRateMB}MB/hour`,
              allocation_rate: `${pattern.allocation_frequency}/sec`,
            },
            suggestion: "Ensure proper resource cleanup and check for unreferenced objects",
            impact_score: Math.min(10, leakRateMB / 5),
            confidence: 0.8,
          });
        }
      }

      // Check for excessive allocations
      const allocationSizeMB = pattern.allocation_size / (1024 * 1024);
      if (allocationSizeMB >= this.config.memory_threshold_mb && pattern.allocation_frequency > 100) {
        findings.push({
          type: "memory_allocation",
          file: pattern.file,
          function: pattern.function,
          metrics: {
            memory_usage: `${allocationSizeMB.toFixed(2)}MB`,
            allocation_rate: `${pattern.allocation_frequency}/sec`,
          },
          suggestion: "Consider object pooling, reduce allocation frequency, or optimize data structures",
          impact_score: Math.min(10, (allocationSizeMB / 50) + (pattern.allocation_frequency / 1000)),
          confidence: 0.85,
        });
      }
    }

    return findings;
  }

  /**
   * Analyze I/O bottlenecks
   */
  private analyzeIoBottlenecks(metrics: AnalysisInput["resource_usage_metrics"]): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];

    for (const metric of metrics) {
      // Database bottlenecks
      if (metric.database_queries > 100) {
        findings.push({
          type: "database_bottleneck",
          file: metric.file,
          function: metric.function,
          metrics: {
            io_wait_time: `${metric.database_queries} queries`,
          },
          suggestion: "Optimize database queries, add indexing, or implement query batching",
          impact_score: Math.min(10, metric.database_queries / 50),
          confidence: 0.9,
        });
      }

      // Network bottlenecks
      if (metric.network_requests > 50) {
        findings.push({
          type: "network_bottleneck",
          file: metric.file,
          function: metric.function,
          metrics: {
            io_wait_time: `${metric.network_requests} requests`,
          },
          suggestion: "Implement request batching, caching, or connection pooling",
          impact_score: Math.min(10, metric.network_requests / 25),
          confidence: 0.85,
        });
      }

      // General I/O bottlenecks
      if (metric.io_operations > 200) {
        findings.push({
          type: "io_bottleneck",
          file: metric.file,
          function: metric.function,
          metrics: {
            io_wait_time: `${metric.io_operations} operations`,
          },
          suggestion: "Optimize I/O operations, implement async processing, or use buffering",
          impact_score: Math.min(10, metric.io_operations / 100),
          confidence: 0.8,
        });
      }
    }

    return findings;
  }

  /**
   * Analyze function call patterns
   */
  private analyzeFunctionCallPatterns(frequencies: AnalysisInput["function_call_frequencies"]): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];

    for (const freq of frequencies) {
      if (freq.call_count >= this.config.call_frequency_threshold && 
          freq.average_execution_time >= this.config.execution_time_threshold_ms) {
        
        findings.push({
          type: "algorithm_complexity",
          file: freq.file,
          function: freq.function,
          metrics: {
            call_frequency: freq.call_count,
            execution_time: `${freq.average_execution_time}ms avg`,
          },
          suggestion: "Optimize algorithm complexity, add caching, or reduce call frequency",
          impact_score: Math.min(10, (freq.call_count / 1000) + (freq.average_execution_time / 1000)),
          confidence: 0.9,
        });
      }
    }

    return findings;
  }

  /**
   * Analyze execution time issues
   */
  private analyzeExecutionTimeIssues(profiles: AnalysisInput["execution_profiles"]): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];

    for (const profile of profiles) {
      if (profile.execution_time_ms >= this.config.execution_time_threshold_ms) {
        const impactScore = Math.min(10, profile.execution_time_ms / 1000);
        
        findings.push({
          type: "algorithm_complexity",
          file: profile.file,
          function: profile.function,
          line_start: profile.line_start,
          line_end: profile.line_end,
          metrics: {
            execution_time: `${profile.execution_time_ms}ms`,
            call_frequency: profile.call_count,
          },
          suggestion: "Profile and optimize slow operations, consider async processing",
          impact_score: impactScore,
          confidence: 0.85,
        });
      }
    }

    return findings;
  }

  /**
   * Generate CPU optimization suggestions
   */
  private generateCpuOptimizationSuggestion(profile: AnalysisInput["execution_profiles"][0]): string {
    const suggestions = [];
    
    if (profile.cpu_usage_percent > 90) {
      suggestions.push("Critical CPU usage detected");
    }
    
    if (profile.call_count > 10000) {
      suggestions.push("consider reducing call frequency");
    }
    
    if (profile.execution_time_ms > 5000) {
      suggestions.push("optimize algorithm or break into smaller operations");
    }
    
    suggestions.push("add caching or memoization");
    
    return suggestions.join(", ");
  }

  /**
   * Calculate overall severity based on findings
   */
  private calculateOverallSeverity(findings: PerformanceFinding[]): PerformanceSeverity {
    const criticalCount = findings.filter(f => f.impact_score >= 8).length;
    const highCount = findings.filter(f => f.impact_score >= 6).length;
    
    if (criticalCount > 0) return "critical";
    if (highCount > 2) return "high";
    return "medium";
  }

  /**
   * Calculate optimization potential
   */
  private calculateOptimizationPotential(findings: PerformanceFinding[]): string {
    const totalImpact = findings.reduce((sum, f) => sum + f.impact_score, 0);
    const avgImpact = totalImpact / findings.length;
    
    if (avgImpact >= 7) return "High optimization potential";
    if (avgImpact >= 5) return "Medium optimization potential";
    return "Low optimization potential";
  }

  /**
   * Estimate performance improvement
   */
  private estimatePerformanceImprovement(findings: PerformanceFinding[]): string {
    const criticalIssues = findings.filter(f => f.impact_score >= 8).length;
    const highIssues = findings.filter(f => f.impact_score >= 6).length;
    
    const estimatedImprovement = (criticalIssues * 15) + (highIssues * 8) + (findings.length * 3);
    
    return `${Math.min(estimatedImprovement, 80)}% potential improvement`;
  }
}

