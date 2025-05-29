/**
 * Database health monitoring system
 */

import { EventEmitter } from 'events';
import { DatabaseConnectionPool } from './config';

export interface HealthMetrics {
  timestamp: Date;
  isHealthy: boolean;
  connectionPool: {
    totalConnections: number;
    idleConnections: number;
    waitingConnections: number;
  };
  performance: {
    queryLatency: number;
    connectionLatency: number;
  };
  errors: {
    connectionErrors: number;
    queryErrors: number;
    lastError?: string;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: HealthMetrics;
  issues: string[];
}

export class DatabaseHealthMonitor extends EventEmitter {
  private db: DatabaseConnectionPool;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private checkInterval: number;
  private metrics: HealthMetrics[] = [];
  private maxMetricsHistory: number = 100;
  private connectionErrors: number = 0;
  private queryErrors: number = 0;
  private lastError: string | undefined;

  constructor(db: DatabaseConnectionPool, checkInterval: number = 30000) {
    super();
    this.db = db;
    this.checkInterval = checkInterval;
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.monitoringInterval) {
      this.stop();
    }

    console.log('[DatabaseHealthMonitor] Starting health monitoring');
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);

    // Perform initial health check
    this.performHealthCheck();
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[DatabaseHealthMonitor] Stopped health monitoring');
    }
  }

  /**
   * Perform a comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const issues: string[] = [];
    let isHealthy = true;

    try {
      // Test basic connectivity
      const connectionStartTime = Date.now();
      const client = await this.db.getClient();
      const connectionLatency = Date.now() - connectionStartTime;

      try {
        // Test query performance
        const queryStartTime = Date.now();
        await client.query('SELECT 1 as health_check');
        const queryLatency = Date.now() - queryStartTime;

        // Get pool statistics
        const poolStats = this.db.getPoolStats();

        // Create metrics
        const metrics: HealthMetrics = {
          timestamp: new Date(),
          isHealthy: true,
          connectionPool: {
            totalConnections: poolStats?.totalCount || 0,
            idleConnections: poolStats?.idleCount || 0,
            waitingConnections: poolStats?.waitingCount || 0,
          },
          performance: {
            queryLatency,
            connectionLatency,
          },
          errors: {
            connectionErrors: this.connectionErrors,
            queryErrors: this.queryErrors,
            lastError: this.lastError,
          },
        };

        // Analyze metrics for issues
        if (connectionLatency > 5000) {
          issues.push('High connection latency detected');
          isHealthy = false;
        }

        if (queryLatency > 1000) {
          issues.push('High query latency detected');
          isHealthy = false;
        }

        if (poolStats?.waitingCount && poolStats.waitingCount > 5) {
          issues.push('High number of waiting connections');
          isHealthy = false;
        }

        if (this.connectionErrors > 10) {
          issues.push('High number of connection errors');
          isHealthy = false;
        }

        if (this.queryErrors > 20) {
          issues.push('High number of query errors');
          isHealthy = false;
        }

        metrics.isHealthy = isHealthy;

        // Store metrics
        this.addMetrics(metrics);

        const result: HealthCheckResult = {
          status: isHealthy ? 'healthy' : issues.length > 2 ? 'unhealthy' : 'degraded',
          metrics,
          issues,
        };

        // Emit health check event
        this.emit('healthCheck', result);

        if (!isHealthy) {
          this.emit('healthIssue', result);
        }

        return result;

      } finally {
        client.release();
      }

    } catch (error) {
      this.connectionErrors++;
      this.lastError = error instanceof Error ? error.message : 'Unknown error';

      const metrics: HealthMetrics = {
        timestamp: new Date(),
        isHealthy: false,
        connectionPool: {
          totalConnections: 0,
          idleConnections: 0,
          waitingConnections: 0,
        },
        performance: {
          queryLatency: -1,
          connectionLatency: Date.now() - startTime,
        },
        errors: {
          connectionErrors: this.connectionErrors,
          queryErrors: this.queryErrors,
          lastError: this.lastError,
        },
      };

      issues.push(`Database connection failed: ${this.lastError}`);

      this.addMetrics(metrics);

      const result: HealthCheckResult = {
        status: 'unhealthy',
        metrics,
        issues,
      };

      this.emit('healthCheck', result);
      this.emit('healthIssue', result);

      console.error('[DatabaseHealthMonitor] Health check failed:', error);
      return result;
    }
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: HealthMetrics): void {
    this.metrics.push(metrics);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 10): HealthMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get current health status
   */
  async getCurrentHealth(): Promise<HealthCheckResult> {
    return await this.performHealthCheck();
  }

  /**
   * Get health summary over time period
   */
  getHealthSummary(minutes: number = 60): {
    averageQueryLatency: number;
    averageConnectionLatency: number;
    healthyPercentage: number;
    totalErrors: number;
    recentIssues: string[];
  } {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return {
        averageQueryLatency: 0,
        averageConnectionLatency: 0,
        healthyPercentage: 0,
        totalErrors: 0,
        recentIssues: [],
      };
    }

    const totalQueryLatency = recentMetrics.reduce((sum, m) => sum + m.performance.queryLatency, 0);
    const totalConnectionLatency = recentMetrics.reduce((sum, m) => sum + m.performance.connectionLatency, 0);
    const healthyCount = recentMetrics.filter(m => m.isHealthy).length;
    const totalErrors = this.connectionErrors + this.queryErrors;

    // Get recent unique issues
    const recentIssues: string[] = [];
    if (this.lastError) {
      recentIssues.push(this.lastError);
    }

    return {
      averageQueryLatency: totalQueryLatency / recentMetrics.length,
      averageConnectionLatency: totalConnectionLatency / recentMetrics.length,
      healthyPercentage: (healthyCount / recentMetrics.length) * 100,
      totalErrors,
      recentIssues,
    };
  }

  /**
   * Reset error counters
   */
  resetErrorCounters(): void {
    this.connectionErrors = 0;
    this.queryErrors = 0;
    this.lastError = undefined;
    console.log('[DatabaseHealthMonitor] Error counters reset');
  }

  /**
   * Record a query error
   */
  recordQueryError(error: Error): void {
    this.queryErrors++;
    this.lastError = error.message;
    this.emit('queryError', error);
  }

  /**
   * Record a connection error
   */
  recordConnectionError(error: Error): void {
    this.connectionErrors++;
    this.lastError = error.message;
    this.emit('connectionError', error);
  }

  /**
   * Set up automatic reconnection logic
   */
  setupAutoReconnect(): void {
    this.on('healthIssue', async (result: HealthCheckResult) => {
      if (result.status === 'unhealthy') {
        console.log('[DatabaseHealthMonitor] Attempting automatic reconnection...');
        
        try {
          // Wait a bit before attempting reconnection
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Test connection
          await this.db.testConnection();
          console.log('[DatabaseHealthMonitor] Automatic reconnection successful');
          
          // Reset error counters on successful reconnection
          this.resetErrorCounters();
          
        } catch (error) {
          console.error('[DatabaseHealthMonitor] Automatic reconnection failed:', error);
        }
      }
    });
  }
}

