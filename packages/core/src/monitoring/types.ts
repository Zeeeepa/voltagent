/**
 * Unified types for the consolidated monitoring system
 */

import type { AgentStatus } from '../agent/types';
import type { UsageInfo } from '../agent/providers/base/types';
import type { EventStatus, TimelineEventType } from '../events/types';

// Core monitoring interfaces
export interface MonitoringConfig {
  enabled: boolean;
  telemetryEnabled: boolean;
  analyticsEnabled: boolean;
  performanceEnabled: boolean;
  alertingEnabled: boolean;
  dashboardEnabled: boolean;
  
  // Provider configurations
  posthog?: PostHogConfig;
  opentelemetry?: OpenTelemetryConfig;
  voltAgentExporter?: VoltAgentExporterConfig;
  
  // Sampling and filtering
  samplingRate?: number;
  eventFilters?: EventFilter[];
  metricFilters?: MetricFilter[];
}

export interface PostHogConfig {
  apiKey: string;
  host?: string;
  flushAt?: number;
  flushInterval?: number;
  disableGeoip?: boolean;
}

export interface OpenTelemetryConfig {
  serviceName: string;
  serviceVersion: string;
  endpoint?: string;
  headers?: Record<string, string>;
}

export interface VoltAgentExporterConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  fetch?: typeof fetch;
}

// Event and metric filtering
export interface EventFilter {
  type: TimelineEventType | 'all';
  status?: EventStatus[];
  agentIds?: string[];
  exclude?: boolean;
}

export interface MetricFilter {
  name: string;
  tags?: Record<string, string>;
  exclude?: boolean;
}

// Performance monitoring types
export interface PerformanceMetrics {
  operationDuration: number;
  memoryUsage: number;
  cpuUsage?: number;
  tokenUsage?: UsageInfo;
  errorRate: number;
  throughput: number;
  latency: number;
}

export interface PerformanceThresholds {
  maxOperationDuration: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
  minThroughput: number;
  maxLatency: number;
}

// Analytics types
export interface AnalyticsEvent {
  id: string;
  timestamp: string;
  type: string;
  agentId: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  metrics?: PerformanceMetrics;
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
  unit?: string;
}

// Alerting types
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  actions: AlertAction[];
  enabled: boolean;
  cooldown?: number; // minutes
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  timeWindow: number; // minutes
  aggregation: 'avg' | 'sum' | 'max' | 'min' | 'count';
}

export interface AlertAction {
  type: 'webhook' | 'email' | 'log';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: string;
}

// Dashboard types
export interface DashboardConfig {
  widgets: DashboardWidget[];
  refreshInterval: number; // seconds
  timeRange: TimeRange;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  title: string;
  config: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

export interface TimeRange {
  start: string;
  end: string;
  relative?: string; // e.g., '1h', '24h', '7d'
}

// Monitoring system state
export interface MonitoringState {
  isRunning: boolean;
  startedAt?: string;
  metrics: {
    eventsProcessed: number;
    metricsCollected: number;
    alertsTriggered: number;
    errorsEncountered: number;
  };
  health: {
    telemetry: 'healthy' | 'degraded' | 'down';
    analytics: 'healthy' | 'degraded' | 'down';
    performance: 'healthy' | 'degraded' | 'down';
    alerting: 'healthy' | 'degraded' | 'down';
  };
}

// Monitoring providers interface
export interface MonitoringProvider {
  name: string;
  initialize(config: any): Promise<void>;
  track(event: AnalyticsEvent): Promise<void>;
  recordMetric(metric: MetricPoint): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): boolean;
}

