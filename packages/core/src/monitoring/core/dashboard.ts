/**
 * Dashboard system for monitoring visualization
 */

import type { 
  MonitoringConfig, 
  DashboardConfig, 
  DashboardWidget, 
  TimeRange,
  MetricPoint,
  Alert,
  MonitoringProvider 
} from '../types';

/**
 * Dashboard system that provides monitoring visualization capabilities
 */
export class DashboardSystem implements MonitoringProvider {
  public readonly name = 'DashboardSystem';
  
  private config: MonitoringConfig;
  private dashboardConfig: DashboardConfig;
  private metricsData: Map<string, MetricPoint[]> = new Map();
  private alertsData: Alert[] = [];
  private isInitialized = false;
  
  constructor(config: MonitoringConfig) {
    this.config = config;
    this.dashboardConfig = this.createDefaultDashboard();
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Initialize dashboard data collection
      this.startDataCollection();
      
      this.isInitialized = true;
      console.log('[DashboardSystem] Initialized successfully');
      
    } catch (error) {
      console.error('[DashboardSystem] Failed to initialize:', error);
      throw error;
    }
  }
  
  async track(): Promise<void> {
    // Not used for dashboard system
  }
  
  async recordMetric(metric: MetricPoint): Promise<void> {
    if (!this.isInitialized) {
      return;
    }
    
    // Store metric for dashboard visualization
    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
    
    if (!this.metricsData.has(key)) {
      this.metricsData.set(key, []);
    }
    
    const data = this.metricsData.get(key)!;
    data.push(metric);
    
    // Keep only last 1000 points per metric
    if (data.length > 1000) {
      data.shift();
    }
  }
  
  /**\n   * Add alert to dashboard data\n   */\n  addAlert(alert: Alert): void {\n    this.alertsData.push(alert);\n    \n    // Keep only last 100 alerts\n    if (this.alertsData.length > 100) {\n      this.alertsData.shift();\n    }\n  }\n  \n  /**\n   * Get dashboard configuration\n   */\n  getDashboardConfig(): DashboardConfig {\n    return { ...this.dashboardConfig };\n  }\n  \n  /**\n   * Update dashboard configuration\n   */\n  updateDashboardConfig(config: Partial<DashboardConfig>): void {\n    this.dashboardConfig = {\n      ...this.dashboardConfig,\n      ...config,\n      widgets: config.widgets || this.dashboardConfig.widgets,\n    };\n  }\n  \n  /**\n   * Get metrics data for a specific time range\n   */\n  getMetricsData(metricName: string, timeRange: TimeRange, tags?: Record<string, string>): MetricPoint[] {\n    const key = `${metricName}:${JSON.stringify(tags || {})}`;\n    const data = this.metricsData.get(key) || [];\n    \n    const start = new Date(timeRange.start).getTime();\n    const end = new Date(timeRange.end).getTime();\n    \n    return data.filter(point => {\n      const timestamp = new Date(point.timestamp).getTime();\n      return timestamp >= start && timestamp <= end;\n    });\n  }\n  \n  /**\n   * Get aggregated metrics for dashboard widgets\n   */\n  getAggregatedMetrics(metricName: string, timeRange: TimeRange, aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count'): number {\n    const data = this.getMetricsData(metricName, timeRange);\n    \n    if (data.length === 0) {\n      return 0;\n    }\n    \n    const values = data.map(point => point.value);\n    \n    switch (aggregation) {\n      case 'avg':\n        return values.reduce((sum, val) => sum + val, 0) / values.length;\n      case 'sum':\n        return values.reduce((sum, val) => sum + val, 0);\n      case 'max':\n        return Math.max(...values);\n      case 'min':\n        return Math.min(...values);\n      case 'count':\n        return values.length;\n      default:\n        return 0;\n    }\n  }\n  \n  /**\n   * Get alerts for dashboard\n   */\n  getAlertsData(timeRange?: TimeRange): Alert[] {\n    if (!timeRange) {\n      return [...this.alertsData];\n    }\n    \n    const start = new Date(timeRange.start).getTime();\n    const end = new Date(timeRange.end).getTime();\n    \n    return this.alertsData.filter(alert => {\n      const timestamp = new Date(alert.timestamp).getTime();\n      return timestamp >= start && timestamp <= end;\n    });\n  }\n  \n  /**\n   * Get dashboard summary data\n   */\n  getDashboardSummary(): {\n    totalMetrics: number;\n    activeAlerts: number;\n    systemHealth: 'healthy' | 'warning' | 'critical';\n    uptime: string;\n  } {\n    const totalMetrics = Array.from(this.metricsData.values())\n      .reduce((sum, data) => sum + data.length, 0);\n    \n    const activeAlerts = this.alertsData.filter(alert => !alert.resolved).length;\n    \n    // Determine system health based on alerts\n    const criticalAlerts = this.alertsData.filter(\n      alert => !alert.resolved && alert.severity === 'critical'\n    ).length;\n    const highAlerts = this.alertsData.filter(\n      alert => !alert.resolved && alert.severity === 'high'\n    ).length;\n    \n    let systemHealth: 'healthy' | 'warning' | 'critical';\n    if (criticalAlerts > 0) {\n      systemHealth = 'critical';\n    } else if (highAlerts > 0 || activeAlerts > 5) {\n      systemHealth = 'warning';\n    } else {\n      systemHealth = 'healthy';\n    }\n    \n    // Calculate uptime (simplified)\n    const uptime = process.uptime ? `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m` : 'Unknown';\n    \n    return {\n      totalMetrics,\n      activeAlerts,\n      systemHealth,\n      uptime,\n    };\n  }\n  \n  /**\n   * Export dashboard data for external visualization\n   */\n  exportDashboardData(): {\n    config: DashboardConfig;\n    metrics: Record<string, MetricPoint[]>;\n    alerts: Alert[];\n    summary: ReturnType<DashboardSystem['getDashboardSummary']>;\n  } {\n    const metricsObject: Record<string, MetricPoint[]> = {};\n    for (const [key, data] of this.metricsData.entries()) {\n      metricsObject[key] = [...data];\n    }\n    \n    return {\n      config: this.getDashboardConfig(),\n      metrics: metricsObject,\n      alerts: [...this.alertsData],\n      summary: this.getDashboardSummary(),\n    };\n  }\n  \n  /**\n   * Create default dashboard configuration\n   */\n  private createDefaultDashboard(): DashboardConfig {\n    return {\n      refreshInterval: 30, // 30 seconds\n      timeRange: {\n        start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago\n        end: new Date().toISOString(),\n        relative: '24h',\n      },\n      widgets: [\n        {\n          id: 'system-overview',\n          type: 'metric',\n          title: 'System Overview',\n          config: {\n            metrics: ['system.memory.used', 'system.cpu.user'],\n            aggregation: 'avg',\n          },\n          position: { x: 0, y: 0, width: 6, height: 4 },\n        },\n        {\n          id: 'agent-operations',\n          type: 'chart',\n          title: 'Agent Operations',\n          config: {\n            metric: 'agent.operation.duration',\n            chartType: 'line',\n            aggregation: 'avg',\n          },\n          position: { x: 6, y: 0, width: 6, height: 4 },\n        },\n        {\n          id: 'error-rate',\n          type: 'metric',\n          title: 'Error Rate',\n          config: {\n            metric: 'agent.error.rate',\n            aggregation: 'avg',\n            format: 'percentage',\n          },\n          position: { x: 0, y: 4, width: 3, height: 3 },\n        },\n        {\n          id: 'throughput',\n          type: 'metric',\n          title: 'Throughput',\n          config: {\n            metric: 'agent.throughput',\n            aggregation: 'avg',\n            unit: 'ops/sec',\n          },\n          position: { x: 3, y: 4, width: 3, height: 3 },\n        },\n        {\n          id: 'active-alerts',\n          type: 'alert',\n          title: 'Active Alerts',\n          config: {\n            showResolved: false,\n            maxItems: 10,\n          },\n          position: { x: 6, y: 4, width: 6, height: 3 },\n        },\n        {\n          id: 'recent-metrics',\n          type: 'table',\n          title: 'Recent Metrics',\n          config: {\n            metrics: ['system.memory.used', 'agent.operation.duration', 'agent.error.rate'],\n            maxRows: 20,\n          },\n          position: { x: 0, y: 7, width: 12, height: 4 },\n        },\n      ],\n    };\n  }\n  \n  /**\n   * Start data collection for dashboard\n   */\n  private startDataCollection(): void {\n    // Collect system metrics every 10 seconds\n    setInterval(() => {\n      try {\n        this.collectSystemMetrics();\n      } catch (error) {\n        console.error('[DashboardSystem] Error collecting system metrics:', error);\n      }\n    }, 10000);\n  }\n  \n  /**\n   * Collect system metrics for dashboard\n   */\n  private collectSystemMetrics(): void {\n    const timestamp = new Date().toISOString();\n    \n    try {\n      // Memory metrics\n      if (typeof process !== 'undefined' && process.memoryUsage) {\n        const memUsage = process.memoryUsage();\n        \n        this.recordMetric({\n          name: 'system.memory.used',\n          value: memUsage.heapUsed,\n          timestamp,\n          tags: { type: 'heap' },\n          unit: 'bytes',\n        });\n        \n        this.recordMetric({\n          name: 'system.memory.total',\n          value: memUsage.heapTotal,\n          timestamp,\n          tags: { type: 'heap' },\n          unit: 'bytes',\n        });\n      }\n      \n      // CPU metrics\n      if (typeof process !== 'undefined' && process.cpuUsage) {\n        const cpuUsage = process.cpuUsage();\n        \n        this.recordMetric({\n          name: 'system.cpu.user',\n          value: cpuUsage.user,\n          timestamp,\n          tags: { type: 'user' },\n          unit: 'microseconds',\n        });\n        \n        this.recordMetric({\n          name: 'system.cpu.system',\n          value: cpuUsage.system,\n          timestamp,\n          tags: { type: 'system' },\n          unit: 'microseconds',\n        });\n      }\n      \n    } catch (error) {\n      console.error('[DashboardSystem] Error collecting system metrics:', error);\n    }\n  }\n  \n  isHealthy(): boolean {\n    return this.isInitialized;\n  }\n  \n  async shutdown(): Promise<void> {\n    console.log('[DashboardSystem] Shutting down...');\n    \n    try {\n      // Clear all data\n      this.metricsData.clear();\n      this.alertsData = [];\n      \n      this.isInitialized = false;\n      console.log('[DashboardSystem] Shut down successfully');\n      \n    } catch (error) {\n      console.error('[DashboardSystem] Error during shutdown:', error);\n      throw error;\n    }\n  }\n}

