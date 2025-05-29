import type { 
  ExecutionProfile, 
  ResourceUsageMetrics, 
  FunctionCallFrequency, 
  MemoryAllocationPattern 
} from "../types";

/**
 * Integration with profiling tools and runtime monitoring
 */
export class ProfilingIntegration {
  private performanceObserver?: PerformanceObserver;
  private memoryUsageTracker: Map<string, number> = new Map();
  private functionCallTracker: Map<string, { count: number; totalTime: number }> = new Map();

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource', 'function'] 
      });
    }

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  /**
   * Process performance entries from PerformanceObserver
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    for (const entry of entries) {
      if (entry.entryType === 'measure') {
        this.trackFunctionCall(entry.name, entry.duration);
      }
    }
  }

  /**
   * Track function call performance
   */
  private trackFunctionCall(functionName: string, duration: number): void {
    const existing = this.functionCallTracker.get(functionName) || { count: 0, totalTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    this.functionCallTracker.set(functionName, existing);
  }

  /**
   * Start memory monitoring using Node.js process.memoryUsage()
   */
  private startMemoryMonitoring(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        this.memoryUsageTracker.set(Date.now().toString(), memUsage.heapUsed);
      }, 1000); // Track every second
    }
  }

  /**
   * Generate execution profiles from collected data
   */
  generateExecutionProfiles(): ExecutionProfile[] {
    const profiles: ExecutionProfile[] = [];

    for (const [functionName, data] of this.functionCallTracker.entries()) {
      const avgExecutionTime = data.totalTime / data.count;
      
      profiles.push({
        file: this.extractFileFromFunctionName(functionName),
        function: this.extractFunctionName(functionName),
        execution_time_ms: avgExecutionTime,
        cpu_usage_percent: this.estimateCpuUsage(avgExecutionTime, data.count),
        memory_usage_bytes: this.estimateMemoryUsage(functionName),
        call_count: data.count,
      });
    }

    return profiles;
  }

  /**
   * Generate resource usage metrics
   */
  generateResourceUsageMetrics(): ResourceUsageMetrics[] {
    // This would typically integrate with actual monitoring tools
    // For now, we'll return mock data structure
    return [
      {
        file: "example.js",
        memory_allocations: 1000,
        memory_deallocations: 950,
        peak_memory_usage: 50 * 1024 * 1024, // 50MB
        io_operations: 150,
        network_requests: 25,
        database_queries: 10,
      }
    ];
  }

  /**
   * Generate function call frequency data
   */
  generateFunctionCallFrequencies(): FunctionCallFrequency[] {
    const frequencies: FunctionCallFrequency[] = [];

    for (const [functionName, data] of this.functionCallTracker.entries()) {
      frequencies.push({
        file: this.extractFileFromFunctionName(functionName),
        function: this.extractFunctionName(functionName),
        call_count: data.count,
        average_execution_time: data.totalTime / data.count,
        total_execution_time: data.totalTime,
      });
    }

    return frequencies;
  }

  /**
   * Generate memory allocation patterns
   */
  generateMemoryAllocationPatterns(): MemoryAllocationPattern[] {
    const patterns: MemoryAllocationPattern[] = [];
    const memoryEntries = Array.from(this.memoryUsageTracker.entries());
    
    if (memoryEntries.length < 2) {
      return patterns;
    }

    // Analyze memory growth patterns
    for (let i = 1; i < memoryEntries.length; i++) {
      const [prevTime, prevMemory] = memoryEntries[i - 1];
      const [currentTime, currentMemory] = memoryEntries[i];
      
      const timeDiff = parseInt(currentTime) - parseInt(prevTime);
      const memoryDiff = currentMemory - prevMemory;
      
      if (memoryDiff > 0) {
        const leakRate = (memoryDiff / timeDiff) * 3600000; // Per hour
        const potentialLeak = leakRate > 10 * 1024 * 1024; // 10MB/hour threshold
        
        patterns.push({
          file: "runtime",
          allocation_size: memoryDiff,
          allocation_frequency: 1000 / timeDiff, // Frequency per second
          deallocation_frequency: 0, // Would need GC tracking
          potential_leak: potentialLeak,
          leak_rate_per_hour: potentialLeak ? leakRate / (1024 * 1024) : undefined,
        });
      }
    }

    return patterns;
  }

  /**
   * Extract file name from function identifier
   */
  private extractFileFromFunctionName(functionName: string): string {
    // Function names might be in format "file.js:functionName" or just "functionName"
    const parts = functionName.split(':');
    return parts.length > 1 ? parts[0] : 'unknown.js';
  }

  /**
   * Extract function name from function identifier
   */
  private extractFunctionName(functionName: string): string {
    const parts = functionName.split(':');
    return parts.length > 1 ? parts[1] : functionName;
  }

  /**
   * Estimate CPU usage based on execution time and call frequency
   */
  private estimateCpuUsage(avgExecutionTime: number, callCount: number): number {
    // Simple heuristic: longer execution time + higher call frequency = higher CPU usage
    const baseUsage = Math.min(avgExecutionTime / 10, 50); // Max 50% from execution time
    const frequencyUsage = Math.min(callCount / 1000 * 20, 40); // Max 40% from frequency
    return Math.min(baseUsage + frequencyUsage, 100);
  }

  /**
   * Estimate memory usage for a function
   */
  private estimateMemoryUsage(functionName: string): number {
    // This would typically require more sophisticated tracking
    // For now, return a reasonable estimate based on function characteristics
    const baseMemory = 1024; // 1KB base
    const nameComplexity = functionName.length * 100; // Rough heuristic
    return baseMemory + nameComplexity;
  }

  /**
   * Create a performance mark for function entry
   */
  markFunctionStart(functionName: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${functionName}-start`);
    }
  }

  /**
   * Create a performance mark for function exit and measure duration
   */
  markFunctionEnd(functionName: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${functionName}-end`);
      performance.measure(functionName, `${functionName}-start`, `${functionName}-end`);
    }
  }

  /**
   * Decorator for automatic function performance tracking
   */
  trackPerformance<T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    const method = descriptor.value!;
    const className = target.constructor.name;
    const functionName = `${className}.${propertyName}`;

    descriptor.value = ((...args: any[]) => {
      this.markFunctionStart(functionName);
      
      try {
        const result = method.apply(this, args);
        
        // Handle both sync and async functions
        if (result instanceof Promise) {
          return result.finally(() => {
            this.markFunctionEnd(functionName);
          });
        } else {
          this.markFunctionEnd(functionName);
          return result;
        }
      } catch (error) {
        this.markFunctionEnd(functionName);
        throw error;
      }
    }) as T;

    return descriptor;
  }

  /**
   * Get current memory usage snapshot
   */
  getCurrentMemoryUsage(): NodeJS.MemoryUsage | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return null;
  }

  /**
   * Clear all collected performance data
   */
  clearData(): void {
    this.functionCallTracker.clear();
    this.memoryUsageTracker.clear();
    
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

