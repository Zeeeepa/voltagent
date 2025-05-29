import { describe, it, expect } from "vitest";
import { PerformanceHotspotDetector } from "./hotspot-detector";
import type { AnalysisInput } from "../types";

describe("PerformanceHotspotDetector", () => {
  const detector = new PerformanceHotspotDetector();

  const mockAnalysisInput: AnalysisInput = {
    execution_profiles: [
      {
        file: "test.js",
        function: "slowFunction",
        execution_time_ms: 2500,
        cpu_usage_percent: 85,
        memory_usage_bytes: 50 * 1024 * 1024,
        call_count: 1500,
        line_start: 10,
        line_end: 25,
      },
      {
        file: "fast.js", 
        function: "fastFunction",
        execution_time_ms: 50,
        cpu_usage_percent: 5,
        memory_usage_bytes: 1024,
        call_count: 100,
      },
    ],
    resource_usage_metrics: [
      {
        file: "database.js",
        function: "queryData",
        memory_allocations: 1000,
        memory_deallocations: 950,
        peak_memory_usage: 100 * 1024 * 1024,
        io_operations: 50,
        network_requests: 25,
        database_queries: 150, // High number should trigger finding
      },
    ],
    function_call_frequencies: [
      {
        file: "heavy.js",
        function: "heavyComputation",
        call_count: 5000, // High frequency
        average_execution_time: 1200, // Slow execution
        total_execution_time: 6000000,
      },
    ],
    memory_allocation_patterns: [
      {
        file: "leaky.js",
        function: "leakyFunction",
        allocation_size: 10 * 1024 * 1024,
        allocation_frequency: 100,
        deallocation_frequency: 80,
        potential_leak: true,
        leak_rate_per_hour: 50, // 50MB/hour leak
      },
    ],
  };

  it("should detect CPU hotspots", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    expect(result.findings).toBeDefined();
    expect(result.findings.length).toBeGreaterThan(0);
    
    const cpuHotspot = result.findings.find(f => f.type === "cpu_hotspot");
    expect(cpuHotspot).toBeDefined();
    expect(cpuHotspot?.file).toBe("test.js");
    expect(cpuHotspot?.function).toBe("slowFunction");
    expect(cpuHotspot?.metrics.cpu_usage).toBe("85%");
  });

  it("should detect memory leaks", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    const memoryLeak = result.findings.find(f => f.type === "memory_leak");
    expect(memoryLeak).toBeDefined();
    expect(memoryLeak?.file).toBe("leaky.js");
    expect(memoryLeak?.metrics.leak_rate).toBe("50MB/hour");
  });

  it("should detect database bottlenecks", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    const dbBottleneck = result.findings.find(f => f.type === "database_bottleneck");
    expect(dbBottleneck).toBeDefined();
    expect(dbBottleneck?.file).toBe("database.js");
  });

  it("should detect algorithm complexity issues", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    const complexityIssue = result.findings.find(f => f.type === "algorithm_complexity");
    expect(complexityIssue).toBeDefined();
    expect(complexityIssue?.file).toBe("heavy.js");
  });

  it("should calculate correct severity", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    expect(result.severity).toBeDefined();
    expect(["medium", "high", "critical"]).toContain(result.severity);
  });

  it("should provide metadata", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    expect(result.metadata).toBeDefined();
    expect(result.metadata.analysis_timestamp).toBeDefined();
    expect(result.metadata.analysis_duration_ms).toBeGreaterThan(0);
    expect(result.metadata.files_analyzed).toBeGreaterThan(0);
    expect(result.metadata.functions_analyzed).toBeGreaterThan(0);
  });

  it("should sort findings by impact score", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    for (let i = 1; i < result.findings.length; i++) {
      expect(result.findings[i - 1].impact_score).toBeGreaterThanOrEqual(
        result.findings[i].impact_score
      );
    }
  });

  it("should limit findings to top 10", async () => {
    const result = await detector.analyze(mockAnalysisInput);
    
    expect(result.findings.length).toBeLessThanOrEqual(10);
  });

  it("should handle empty input gracefully", async () => {
    const emptyInput: AnalysisInput = {
      execution_profiles: [],
      resource_usage_metrics: [],
      function_call_frequencies: [],
      memory_allocation_patterns: [],
    };
    
    const result = await detector.analyze(emptyInput);
    
    expect(result.findings).toEqual([]);
    expect(result.summary.total_hotspots).toBe(0);
    expect(result.metadata.files_analyzed).toBe(0);
  });

  it("should respect custom configuration", async () => {
    const customDetector = new PerformanceHotspotDetector({
      cpu_threshold_percent: 50, // Lower threshold
      memory_leak_threshold_mb_per_hour: 20, // Higher threshold
    });
    
    const result = await customDetector.analyze(mockAnalysisInput);
    
    // Should still detect CPU hotspot with lower threshold
    const cpuHotspot = result.findings.find(f => f.type === "cpu_hotspot");
    expect(cpuHotspot).toBeDefined();
    
    // Should not detect memory leak with higher threshold
    const memoryLeak = result.findings.find(f => f.type === "memory_leak");
    expect(memoryLeak).toBeUndefined();
  });
});

