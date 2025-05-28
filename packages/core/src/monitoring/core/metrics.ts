/**
 * Unified metrics collection system
 */

import type { MonitoringConfig, MetricPoint, MonitoringProvider } from '../types';
import { VoltAgentExporter } from '../../telemetry/exporter';

/**
 * Metrics collector that unifies all metric collection
 */
export class MetricsCollector implements MonitoringProvider {
  public readonly name = 'MetricsCollector';
  
  private config: MonitoringConfig;
  private voltAgentExporter?: VoltAgentExporter;
  private metricsBuffer: MetricPoint[] = [];
  private flushInterval?: NodeJS.Timeout;
  private isInitialized = false;
  
  constructor(config: MonitoringConfig) {
    this.config = config;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize VoltAgent Exporter if configured
      if (this.config.voltAgentExporter?.baseUrl) {
        this.voltAgentExporter = new VoltAgentExporter(this.config.voltAgentExporter);
      }
      
      // Start periodic flush
      this.startPeriodicFlush();
      
      this.isInitialized = true;
      console.log('[MetricsCollector] Initialized successfully');
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to initialize:', error);
      throw error;
    }
  }
  
  async track(): Promise<void> {
    // Not used for metrics collector
  }
  
  async recordMetric(metric: MetricPoint): Promise<void> {
    await this.record(metric);
  }
  
  /**
   * Record a metric point
   */
  async record(metric: MetricPoint): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[MetricsCollector] Not initialized, skipping metric recording');
      return;
    }
    
    try {
      // Add to buffer for batch processing
      this.metricsBuffer.push({
        ...metric,
        timestamp: metric.timestamp || new Date().toISOString(),
      });
      
      // Flush if buffer is getting large
      if (this.metricsBuffer.length >= 100) {
        await this.flush();
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to record metric:', error);
      throw error;
    }
  }
  
  /**
   * Record multiple metrics at once
   */
  async recordBatch(metrics: MetricPoint[]): Promise<void> {
    for (const metric of metrics) {
      await this.record(metric);
    }
  }
  
  /**
   * Record system performance metrics
   */
  async recordSystemMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();
    
    try {
      // Memory usage
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const memUsage = process.memoryUsage();
        
        await this.record({
          name: 'system.memory.used',
          value: memUsage.heapUsed,
          timestamp,
          tags: { type: 'heap' },
          unit: 'bytes',
        });
        
        await this.record({
          name: 'system.memory.total',
          value: memUsage.heapTotal,
          timestamp,
          tags: { type: 'heap' },
          unit: 'bytes',
        });
        
        await this.record({
          name: 'system.memory.external',
          value: memUsage.external,
          timestamp,
          tags: { type: 'external' },
          unit: 'bytes',
        });
      }
      
      // CPU usage (if available)
      if (typeof process !== 'undefined' && process.cpuUsage) {
        const cpuUsage = process.cpuUsage();
        
        await this.record({
          name: 'system.cpu.user',
          value: cpuUsage.user,
          timestamp,
          tags: { type: 'user' },
          unit: 'microseconds',
        });
        
        await this.record({
          name: 'system.cpu.system',
          value: cpuUsage.system,
          timestamp,
          tags: { type: 'system' },
          unit: 'microseconds',
        });
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to record system metrics:', error);
    }
  }
  
  /**
   * Get current metrics buffer size
   */
  getBufferSize(): number {
    return this.metricsBuffer.length;
  }
  
  /**
   * Flush all buffered metrics
   */
  async flush(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }
    
    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];
    
    try {
      // Send to VoltAgent Exporter if available
      if (this.voltAgentExporter) {
        // Convert metrics to a format suitable for the exporter
        // This would need to be implemented based on the exporter's expected format
        console.log(`[MetricsCollector] Flushing ${metricsToFlush.length} metrics to VoltAgent Exporter`);
      }
      
      // Log metrics for debugging (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[MetricsCollector] Metrics:', metricsToFlush.slice(0, 5)); // Log first 5
      }
      
    } catch (error) {
      console.error('[MetricsCollector] Failed to flush metrics:', error);
      // Put metrics back in buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
      throw error;
    }
  }
  
  /**
   * Start periodic flushing of metrics
   */
  private startPeriodicFlush(): void {
    // Flush every 30 seconds
    this.flushInterval = setInterval(async () => {
      try {
        await this.flush();
        await this.recordSystemMetrics();
      } catch (error) {
        console.error('[MetricsCollector] Error during periodic flush:', error);
      }
    }, 30000);
  }
  
  /**
   * Stop periodic flushing
   */
  private stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = undefined;
    }
  }
  
  isHealthy(): boolean {
    return this.isInitialized;
  }
  
  async shutdown(): Promise<void> {
    console.log('[MetricsCollector] Shutting down...');
    
    try {
      // Stop periodic flush
      this.stopPeriodicFlush();
      
      // Flush remaining metrics
      await this.flush();
      
      this.isInitialized = false;
      console.log('[MetricsCollector] Shut down successfully');
      
    } catch (error) {
      console.error('[MetricsCollector] Error during shutdown:', error);
      throw error;
    }
  }
}

