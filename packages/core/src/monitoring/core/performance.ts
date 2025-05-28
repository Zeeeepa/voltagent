/**
 * Performance monitoring system
 */

import type { 
  MonitoringConfig, 
  PerformanceMetrics, 
  PerformanceThresholds,
  MetricPoint,
  MonitoringProvider 
} from '../types';

/**
 * Performance monitor that tracks system and agent performance
 */
export class PerformanceMonitor implements MonitoringProvider {
  public readonly name = 'PerformanceMonitor';
  
  private config: MonitoringConfig;
  private thresholds: PerformanceThresholds;
  private activeOperations: Map<string, { startTime: number; metadata: any }> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private isInitialized = false;
  
  constructor(config: MonitoringConfig) {
    this.config = config;
    this.thresholds = {
      maxOperationDuration: 30000, // 30 seconds
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxErrorRate: 0.05, // 5%
      minThroughput: 1, // 1 operation per second
      maxLatency: 5000, // 5 seconds
    };
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Start performance monitoring
      this.startPerformanceTracking();
      
      this.isInitialized = true;
      console.log('[PerformanceMonitor] Initialized successfully');
      
    } catch (error) {
      console.error('[PerformanceMonitor] Failed to initialize:', error);
      throw error;
    }
  }
  
  async track(): Promise<void> {
    // Not used for performance monitor
  }
  
  async recordMetric(): Promise<void> {
    // Not used for performance monitor
  }
  
  /**
   * Start tracking an operation
   */
  startOperation(operationId: string, metadata: any = {}): void {
    this.activeOperations.set(operationId, {
      startTime: Date.now(),
      metadata,
    });
  }
  
  /**
   * End tracking an operation and return performance metrics
   */
  endOperation(operationId: string, result?: { success: boolean; error?: any }): PerformanceMetrics | null {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`[PerformanceMonitor] Operation ${operationId} not found`);
      return null;
    }
    
    this.activeOperations.delete(operationId);
    
    const duration = Date.now() - operation.startTime;
    const memoryUsage = this.getCurrentMemoryUsage();
    
    const metrics: PerformanceMetrics = {
      operationDuration: duration,
      memoryUsage,
      errorRate: result?.success === false ? 1 : 0,
      throughput: 1000 / duration, // operations per second
      latency: duration,
      tokenUsage: operation.metadata.tokenUsage,
    };
    
    // Store in history (keep last 1000 entries)
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.shift();
    }
    
    // Check thresholds
    this.checkThresholds(metrics, operationId);
    
    return metrics;
  }
  
  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = this.getCurrentMemoryUsage();
    const recentMetrics = this.performanceHistory.slice(-10); // Last 10 operations
    
    const avgDuration = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.operationDuration, 0) / recentMetrics.length
      : 0;
    
    const errorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
      : 0;
    
    const avgThroughput = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length
      : 0;
    
    const avgLatency = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length
      : 0;
    
    return {
      operationDuration: avgDuration,
      memoryUsage,
      errorRate,
      throughput: avgThroughput,
      latency: avgLatency,
    };
  }
  
  /**
   * Get performance history
   */
  getPerformanceHistory(limit: number = 100): PerformanceMetrics[] {
    return this.performanceHistory.slice(-limit);
  }
  
  /**
   * Get active operations count
   */
  getActiveOperationsCount(): number {
    return this.activeOperations.size;
  }
  
  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }
  
  /**
   * Get current performance thresholds
   */
  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }
  
  /**
   * Check if current metrics exceed thresholds
   */
  private checkThresholds(metrics: PerformanceMetrics, operationId: string): void {
    const violations: string[] = [];
    
    if (metrics.operationDuration > this.thresholds.maxOperationDuration) {
      violations.push(`Operation duration (${metrics.operationDuration}ms) exceeds threshold (${this.thresholds.maxOperationDuration}ms)`);
    }
    
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      violations.push(`Memory usage (${Math.round(metrics.memoryUsage / 1024 / 1024)}MB) exceeds threshold (${Math.round(this.thresholds.maxMemoryUsage / 1024 / 1024)}MB)`);
    }
    
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      violations.push(`Error rate (${(metrics.errorRate * 100).toFixed(2)}%) exceeds threshold (${(this.thresholds.maxErrorRate * 100).toFixed(2)}%)`);
    }
    
    if (metrics.throughput < this.thresholds.minThroughput) {
      violations.push(`Throughput (${metrics.throughput.toFixed(2)} ops/sec) below threshold (${this.thresholds.minThroughput} ops/sec)`);
    }
    
    if (metrics.latency > this.thresholds.maxLatency) {
      violations.push(`Latency (${metrics.latency}ms) exceeds threshold (${this.thresholds.maxLatency}ms)`);
    }
    
    if (violations.length > 0) {
      console.warn(`[PerformanceMonitor] Performance threshold violations for operation ${operationId}:`, violations);
      
      // Emit performance alert (could be picked up by alerting system)
      if (typeof process !== 'undefined' && process.emit) {
        process.emit('performanceAlert', {
          operationId,
          violations,
          metrics,
        });
      }
    }
  }
  
  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        return process.memoryUsage().heapUsed;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * Start periodic performance tracking
   */
  private startPerformanceTracking(): void {
    // Track system performance every 10 seconds
    setInterval(() => {
      try {
        const metrics = this.getCurrentMetrics();
        
        // Log performance summary in development
        if (process.env.NODE_ENV === 'development') {
          console.log('[PerformanceMonitor] Current metrics:', {
            memoryMB: Math.round(metrics.memoryUsage / 1024 / 1024),
            avgDuration: Math.round(metrics.operationDuration),
            errorRate: (metrics.errorRate * 100).toFixed(2) + '%',
            throughput: metrics.throughput.toFixed(2) + ' ops/sec',
            activeOps: this.getActiveOperationsCount(),
          });
        }
        
      } catch (error) {
        console.error('[PerformanceMonitor] Error during performance tracking:', error);
      }
    }, 10000);
  }
  
  isHealthy(): boolean {
    return this.isInitialized;
  }
  
  async shutdown(): Promise<void> {
    console.log('[PerformanceMonitor] Shutting down...');
    
    try {
      // Clear active operations
      this.activeOperations.clear();
      
      this.isInitialized = false;
      console.log('[PerformanceMonitor] Shut down successfully');
      
    } catch (error) {
      console.error('[PerformanceMonitor] Error during shutdown:', error);
      throw error;
    }
  }
}

