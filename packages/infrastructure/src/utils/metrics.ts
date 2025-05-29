export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface MetricsSummary {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export class MetricsCollector {
  private metrics: Map<string, Metric[]> = new Map();
  private readonly maxMetricsPerName = 1000;

  /**
   * Record a metric value
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricsList = this.metrics.get(name)!;
    metricsList.push(metric);

    // Keep only the most recent metrics
    if (metricsList.length > this.maxMetricsPerName) {
      metricsList.shift();
    }
  }

  /**
   * Record timing metric
   */
  recordTiming(name: string, startTime: Date, tags?: Record<string, string>): void {
    const duration = Date.now() - startTime.getTime();
    this.record(name, duration, tags);
  }

  /**
   * Record counter increment
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }

  /**
   * Record gauge value
   */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }

  /**
   * Get metrics summary for a metric name
   */
  getSummary(name: string, since?: Date): MetricsSummary | null {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) {
      return null;
    }

    let filteredMetrics = metricsList;
    if (since) {
      filteredMetrics = metricsList.filter(m => m.timestamp >= since);
    }

    if (filteredMetrics.length === 0) {
      return null;
    }

    const values = filteredMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      sum,
      avg: sum / count,
      min: values[0],
      max: values[count - 1],
      p50: this.percentile(values, 0.5),
      p95: this.percentile(values, 0.95),
      p99: this.percentile(values, 0.99),
    };
  }

  /**
   * Get all metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get recent metrics for a name
   */
  getRecentMetrics(name: string, limit: number = 100): Metric[] {
    const metricsList = this.metrics.get(name);
    if (!metricsList) {
      return [];
    }

    return metricsList.slice(-limit);
  }

  /**
   * Clear metrics for a name
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Get metrics by tags
   */
  getMetricsByTags(name: string, tags: Record<string, string>): Metric[] {
    const metricsList = this.metrics.get(name);
    if (!metricsList) {
      return [];
    }

    return metricsList.filter(metric => {
      if (!metric.tags) return false;
      
      return Object.entries(tags).every(([key, value]) => 
        metric.tags![key] === value
      );
    });
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    
    const index = Math.ceil(values.length * p) - 1;
    return values[Math.max(0, Math.min(index, values.length - 1))];
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const [name, metricsList] of this.metrics) {
      if (metricsList.length === 0) continue;

      const latest = metricsList[metricsList.length - 1];
      const metricName = name.replace(/[^a-zA-Z0-9_]/g, "_");
      
      if (latest.tags && Object.keys(latest.tags).length > 0) {
        const tagString = Object.entries(latest.tags)
          .map(([key, value]) => `${key}="${value}"`)
          .join(",");
        lines.push(`${metricName}{${tagString}} ${latest.value}`);
      } else {
        lines.push(`${metricName} ${latest.value}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, metricsList] of this.metrics) {
      result[name] = {
        summary: this.getSummary(name),
        recent: metricsList.slice(-10), // Last 10 metrics
      };
    }

    return result;
  }

  /**
   * Common infrastructure metrics
   */
  static readonly METRICS = {
    // Database metrics
    DB_QUERY_DURATION: "db_query_duration_ms",
    DB_CONNECTION_COUNT: "db_connection_count",
    DB_QUERY_COUNT: "db_query_count",
    DB_ERROR_COUNT: "db_error_count",

    // Task queue metrics
    TASK_QUEUE_SIZE: "task_queue_size",
    TASK_PROCESSING_DURATION: "task_processing_duration_ms",
    TASK_SUCCESS_COUNT: "task_success_count",
    TASK_FAILURE_COUNT: "task_failure_count",

    // Workflow metrics
    WORKFLOW_EXECUTION_DURATION: "workflow_execution_duration_ms",
    WORKFLOW_STEP_DURATION: "workflow_step_duration_ms",
    WORKFLOW_SUCCESS_COUNT: "workflow_success_count",
    WORKFLOW_FAILURE_COUNT: "workflow_failure_count",

    // Analysis metrics
    ANALYSIS_DURATION: "analysis_duration_ms",
    ANALYSIS_FINDINGS_COUNT: "analysis_findings_count",
    CODEGEN_EXECUTION_DURATION: "codegen_execution_duration_ms",
  } as const;
}

