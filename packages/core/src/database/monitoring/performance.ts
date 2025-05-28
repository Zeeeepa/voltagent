/**
 * Database Performance Monitor
 * 
 * Comprehensive performance monitoring with query analysis,
 * metrics collection, and optimization suggestions
 */

import type {
  MonitoringConfig,
  PerformanceMetrics,
  SlowQuery,
} from '../types';

import type {
  IPerformanceMonitor,
  QueryTracker,
  TimeRange,
  QueryOptimization,
  QueryAnalysis,
} from '../interfaces';

interface QueryMetrics {
  query: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  lastExecuted: Date;
  params?: any[];
}

/**
 * Query tracker implementation
 */
class QueryTrackerImpl implements QueryTracker {
  private startTime: number;
  private metadata: Map<string, any> = new Map();

  constructor(
    private query: string,
    private params: any[] | undefined,
    private monitor: PerformanceMonitor
  ) {
    this.startTime = Date.now();
  }

  end(): void {
    const duration = Date.now() - this.startTime;
    this.monitor.recordQuery(this.query, duration, this.params, this.metadata);
  }

  addMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }
}

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private config: MonitoringConfig;
  private queryMetrics: Map<string, QueryMetrics> = new Map();
  private slowQueries: SlowQuery[] = [];
  private totalQueries = 0;
  private totalTime = 0;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      queryLogging: config?.queryLogging ?? false,
      performanceMetrics: config?.performanceMetrics ?? true,
      slowQueryThresholdMs: config?.slowQueryThresholdMs ?? 1000,
      metricsRetentionDays: config?.metricsRetentionDays ?? 7,
    };

    // Clean up old metrics periodically
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000); // Every hour
  }

  /**
   * Start tracking a query
   */
  startQuery(query: string, params?: any[]): QueryTracker {
    if (!this.config.enabled) {
      return {
        end: () => {},
        addMetadata: () => {},
      };
    }

    if (this.config.queryLogging) {
      console.log(`[DB Query] ${query}`, params);
    }

    return new QueryTrackerImpl(query, params, this);
  }

  /**
   * Record query metrics (called by QueryTracker)
   */
  recordQuery(query: string, duration: number, params?: any[], metadata?: Map<string, any>): void {
    if (!this.config.performanceMetrics) {
      return;
    }

    this.totalQueries++;
    this.totalTime += duration;

    // Normalize query for grouping (remove specific values)
    const normalizedQuery = this.normalizeQuery(query);
    
    // Update query metrics
    const existing = this.queryMetrics.get(normalizedQuery);
    if (existing) {
      existing.count++;
      existing.totalTime += duration;
      existing.minTime = Math.min(existing.minTime, duration);
      existing.maxTime = Math.max(existing.maxTime, duration);
      existing.avgTime = existing.totalTime / existing.count;
      existing.lastExecuted = new Date();
    } else {
      this.queryMetrics.set(normalizedQuery, {
        query: normalizedQuery,
        count: 1,
        totalTime: duration,
        minTime: duration,
        maxTime: duration,
        avgTime: duration,
        lastExecuted: new Date(),
        params,
      });
    }

    // Track slow queries
    if (duration > this.config.slowQueryThresholdMs) {
      this.slowQueries.push({
        query,
        duration,
        timestamp: new Date(),
        params,
        stackTrace: this.captureStackTrace(),
      });

      // Limit slow queries array size
      if (this.slowQueries.length > 1000) {
        this.slowQueries = this.slowQueries.slice(-500);
      }
    }
  }

  /**
   * Record custom metrics
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    // This could be extended to store custom metrics
    if (metrics.queryCount) {
      this.totalQueries += metrics.queryCount;
    }
  }

  /**
   * Get performance metrics for a time range
   */
  async getMetrics(timeRange?: TimeRange): Promise<PerformanceMetrics> {
    const now = new Date();
    const start = timeRange?.start || new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const end = timeRange?.end || now;

    // Filter slow queries by time range
    const filteredSlowQueries = this.slowQueries.filter(
      sq => sq.timestamp >= start && sq.timestamp <= end
    );

    return {
      queryCount: this.totalQueries,
      averageQueryTime: this.totalQueries > 0 ? this.totalTime / this.totalQueries : 0,
      slowQueries: filteredSlowQueries.slice(-10), // Last 10 slow queries
      connectionPoolStats: {
        totalConnections: 0, // Would be provided by connection pool
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
      },
    };
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit = 10): Promise<SlowQuery[]> {
    return this.slowQueries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Optimize a query (basic implementation)
   */
  async optimizeQuery(query: string): Promise<QueryOptimization> {
    const suggestions: string[] = [];
    let optimizedQuery = query;
    let estimatedImprovement = 0;

    // Basic optimization suggestions
    const upperQuery = query.toUpperCase();

    // Check for SELECT *
    if (upperQuery.includes('SELECT *')) {
      suggestions.push('Avoid SELECT *, specify only needed columns');
      estimatedImprovement += 10;
    }

    // Check for missing WHERE clause in UPDATE/DELETE
    if ((upperQuery.includes('UPDATE ') || upperQuery.includes('DELETE ')) && 
        !upperQuery.includes('WHERE ')) {
      suggestions.push('Add WHERE clause to UPDATE/DELETE statements');
      estimatedImprovement += 50;
    }

    // Check for LIKE with leading wildcard
    if (upperQuery.includes("LIKE '%")) {
      suggestions.push('Avoid LIKE patterns starting with wildcard (%)');
      estimatedImprovement += 20;
    }

    // Check for ORDER BY without LIMIT
    if (upperQuery.includes('ORDER BY ') && !upperQuery.includes('LIMIT ')) {
      suggestions.push('Consider adding LIMIT to ORDER BY queries');
      estimatedImprovement += 15;
    }

    // Check for subqueries that could be JOINs
    if (upperQuery.includes('IN (SELECT ')) {
      suggestions.push('Consider replacing IN (SELECT ...) with JOIN');
      optimizedQuery = query; // Would need more sophisticated parsing
      estimatedImprovement += 25;
    }

    return {
      originalQuery: query,
      optimizedQuery,
      estimatedImprovement,
      suggestions,
    };
  }

  /**
   * Get top queries by various metrics
   */
  getTopQueries(metric: 'count' | 'totalTime' | 'avgTime' = 'totalTime', limit = 10): QueryMetrics[] {
    return Array.from(this.queryMetrics.values())
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.queryMetrics.clear();
    this.slowQueries = [];
    this.totalQueries = 0;
    this.totalTime = 0;
  }

  // Private methods

  private normalizeQuery(query: string): string {
    // Remove specific values and normalize whitespace
    return query
      .replace(/\$\d+/g, '?') // Replace PostgreSQL parameters
      .replace(/\?/g, '?') // Normalize parameters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\b\d+\b/g, '?') // Replace numbers
      .replace(/'[^']*'/g, '?') // Replace string literals
      .trim();
  }

  private captureStackTrace(): string {
    const stack = new Error().stack;
    if (!stack) return '';
    
    // Remove the first few lines (this function and Error constructor)
    const lines = stack.split('\n').slice(3);
    return lines.slice(0, 5).join('\n'); // Keep only first 5 lines
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.metricsRetentionDays);

    // Clean up slow queries
    this.slowQueries = this.slowQueries.filter(sq => sq.timestamp > cutoff);

    // Clean up query metrics that haven't been used recently
    for (const [key, metrics] of this.queryMetrics.entries()) {
      if (metrics.lastExecuted < cutoff) {
        this.queryMetrics.delete(key);
      }
    }
  }
}

