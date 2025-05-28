import { db } from '../database/connection.js';

export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
  timestamp: Date;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private metricsBuffer: SystemMetric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startPeriodicFlush();
  }

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  public recordMetric(
    name: string,
    value: number,
    unit: string = '',
    tags: Record<string, string> = {}
  ): void {
    const metric: SystemMetric = {
      name,
      value,
      unit,
      tags,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(metric);

    // Flush immediately if buffer is getting large
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics();
    }
  }

  public recordValidationMetrics(sessionId: string, duration: number, score: number): void {
    this.recordMetric('validation_duration_ms', duration, 'ms', { session_id: sessionId });
    this.recordMetric('validation_score', score, 'score', { session_id: sessionId });
    this.recordMetric('validation_completed', 1, 'count', { session_id: sessionId });
  }

  public recordWSL2Metrics(instanceName: string, action: string, duration?: number): void {
    this.recordMetric('wsl2_action', 1, 'count', { 
      instance: instanceName, 
      action 
    });
    
    if (duration !== undefined) {
      this.recordMetric('wsl2_action_duration_ms', duration, 'ms', { 
        instance: instanceName, 
        action 
      });
    }
  }

  public recordAPIMetrics(endpoint: string, method: string, statusCode: number, duration: number): void {
    this.recordMetric('api_request_duration_ms', duration, 'ms', {
      endpoint,
      method,
      status_code: statusCode.toString(),
    });
    
    this.recordMetric('api_request_count', 1, 'count', {
      endpoint,
      method,
      status_code: statusCode.toString(),
    });
  }

  public recordDatabaseMetrics(operation: string, duration: number, success: boolean): void {
    this.recordMetric('database_operation_duration_ms', duration, 'ms', {
      operation,
      success: success.toString(),
    });
    
    this.recordMetric('database_operation_count', 1, 'count', {
      operation,
      success: success.toString(),
    });
  }

  public recordAgentAPIMetrics(operation: string, duration: number, success: boolean): void {
    this.recordMetric('agentapi_operation_duration_ms', duration, 'ms', {
      operation,
      success: success.toString(),
    });
    
    this.recordMetric('agentapi_operation_count', 1, 'count', {
      operation,
      success: success.toString(),
    });
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await db.transaction(async (client) => {
        for (const metric of metricsToFlush) {
          await client.query(
            `INSERT INTO system_metrics (metric_name, metric_value, metric_unit, tags, recorded_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [metric.name, metric.value, metric.unit, JSON.stringify(metric.tags), metric.timestamp]
          );
        }
      });

      console.log(`Flushed ${metricsToFlush.length} metrics to database`);
    } catch (error) {
      console.error('Failed to flush metrics to database:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000); // Flush every 30 seconds
  }

  public async getMetricsSummary(timeRange: string = '24h'): Promise<{
    validationMetrics: any;
    wsl2Metrics: any;
    apiMetrics: any;
    databaseMetrics: any;
  }> {
    const interval = this.parseTimeRange(timeRange);
    
    try {
      const [validationMetrics, wsl2Metrics, apiMetrics, databaseMetrics] = await Promise.all([
        this.getValidationMetricsSummary(interval),
        this.getWSL2MetricsSummary(interval),
        this.getAPIMetricsSummary(interval),
        this.getDatabaseMetricsSummary(interval),
      ]);

      return {
        validationMetrics,
        wsl2Metrics,
        apiMetrics,
        databaseMetrics,
      };
    } catch (error) {
      console.error('Failed to get metrics summary:', error);
      throw error;
    }
  }

  private async getValidationMetricsSummary(interval: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(CASE WHEN metric_name = 'validation_completed' THEN 1 END) as total_validations,
        AVG(CASE WHEN metric_name = 'validation_duration_ms' THEN metric_value END) as avg_duration_ms,
        AVG(CASE WHEN metric_name = 'validation_score' THEN metric_value END) as avg_score,
        MIN(CASE WHEN metric_name = 'validation_duration_ms' THEN metric_value END) as min_duration_ms,
        MAX(CASE WHEN metric_name = 'validation_duration_ms' THEN metric_value END) as max_duration_ms
      FROM system_metrics 
      WHERE recorded_at >= NOW() - INTERVAL '${interval}'
        AND metric_name IN ('validation_completed', 'validation_duration_ms', 'validation_score')
    `);

    return result.rows[0];
  }

  private async getWSL2MetricsSummary(interval: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(CASE WHEN tags->>'action' = 'create' THEN 1 END) as instances_created,
        COUNT(CASE WHEN tags->>'action' = 'destroy' THEN 1 END) as instances_destroyed,
        AVG(CASE WHEN metric_name = 'wsl2_action_duration_ms' THEN metric_value END) as avg_action_duration_ms
      FROM system_metrics 
      WHERE recorded_at >= NOW() - INTERVAL '${interval}'
        AND metric_name IN ('wsl2_action', 'wsl2_action_duration_ms')
    `);

    return result.rows[0];
  }

  private async getAPIMetricsSummary(interval: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(metric_value) as avg_response_time_ms,
        COUNT(CASE WHEN tags->>'status_code' LIKE '2%' THEN 1 END) as successful_requests,
        COUNT(CASE WHEN tags->>'status_code' LIKE '4%' THEN 1 END) as client_errors,
        COUNT(CASE WHEN tags->>'status_code' LIKE '5%' THEN 1 END) as server_errors
      FROM system_metrics 
      WHERE recorded_at >= NOW() - INTERVAL '${interval}'
        AND metric_name = 'api_request_duration_ms'
    `);

    return result.rows[0];
  }

  private async getDatabaseMetricsSummary(interval: string): Promise<any> {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_operations,
        AVG(metric_value) as avg_operation_time_ms,
        COUNT(CASE WHEN tags->>'success' = 'true' THEN 1 END) as successful_operations,
        COUNT(CASE WHEN tags->>'success' = 'false' THEN 1 END) as failed_operations
      FROM system_metrics 
      WHERE recorded_at >= NOW() - INTERVAL '${interval}'
        AND metric_name = 'database_operation_duration_ms'
    `);

    return result.rows[0];
  }

  private parseTimeRange(timeRange: string): string {
    const timeRangeMap: Record<string, string> = {
      '1h': '1 hour',
      '6h': '6 hours',
      '12h': '12 hours',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days',
    };

    return timeRangeMap[timeRange] || '24 hours';
  }

  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining metrics
    this.flushMetrics();
  }
}

// Singleton instance
export const metricsCollector = MetricsCollector.getInstance();

// Middleware for Express to automatically record API metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    metricsCollector.recordAPIMetrics(
      req.route?.path || req.path,
      req.method,
      res.statusCode,
      duration
    );
  });
  
  next();
};

