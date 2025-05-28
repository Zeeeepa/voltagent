import type { AgentStatus } from "../agent/types";

/**
 * Status synchronization channel types
 */
export type StatusSyncChannel = "history" | "events" | "telemetry" | "websocket" | "api";

/**
 * Status update source types
 */
export type StatusUpdateSource = "agent" | "tool" | "system" | "external" | "user";

/**
 * Status synchronization priority levels
 */
export type StatusSyncPriority = "low" | "normal" | "high" | "critical";

/**
 * Status synchronization mode
 */
export type StatusSyncMode = "immediate" | "batched" | "queued" | "manual";

/**
 * Status change reason codes
 */
export enum StatusChangeReason {
  AGENT_STARTED = "agent_started",
  AGENT_COMPLETED = "agent_completed",
  AGENT_ERROR = "agent_error",
  TOOL_EXECUTION = "tool_execution",
  TOOL_COMPLETED = "tool_completed",
  TOOL_ERROR = "tool_error",
  SYSTEM_UPDATE = "system_update",
  USER_ACTION = "user_action",
  TIMEOUT = "timeout",
  CANCELLED = "cancelled",
  DELEGATED = "delegated",
  RESUMED = "resumed",
}

/**
 * Status validation result
 */
export interface StatusValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Status synchronization metrics
 */
export interface StatusSyncMetrics {
  totalUpdates: number;
  successfulUpdates: number;
  failedUpdates: number;
  averageLatency: number;
  channelMetrics: Record<StatusSyncChannel, {
    updates: number;
    successes: number;
    failures: number;
    averageLatency: number;
  }>;
  lastUpdate: string;
}

/**
 * Status synchronization configuration
 */
export interface StatusSyncConfig {
  mode: StatusSyncMode;
  priority: StatusSyncPriority;
  channels: StatusSyncChannel[];
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enableMetrics: boolean;
  enableValidation: boolean;
  batchSize?: number;
  batchInterval?: number;
  queueMaxSize?: number;
}

/**
 * Status update context
 */
export interface StatusUpdateContext {
  requestId: string;
  agentId: string;
  historyId?: string;
  parentAgentId?: string;
  parentHistoryId?: string;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  source: StatusUpdateSource;
  reason: StatusChangeReason;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Status synchronization filter
 */
export interface StatusSyncFilter {
  agentIds?: string[];
  statuses?: AgentStatus[];
  sources?: StatusUpdateSource[];
  reasons?: StatusChangeReason[];
  channels?: StatusSyncChannel[];
  timeRange?: {
    start: string;
    end: string;
  };
}

/**
 * Status synchronization event
 */
export interface StatusSyncEvent {
  id: string;
  type: "update" | "error" | "retry" | "timeout" | "cancelled";
  context: StatusUpdateContext;
  previousStatus?: AgentStatus;
  newStatus: AgentStatus;
  channels: StatusSyncChannel[];
  success: boolean;
  errors?: Array<{
    channel: StatusSyncChannel;
    error: string;
    retryable: boolean;
  }>;
  latency: number;
  retryCount: number;
}

/**
 * Status synchronization listener
 */
export interface StatusSyncListener {
  id: string;
  filter?: StatusSyncFilter;
  callback: (event: StatusSyncEvent) => void | Promise<void>;
  priority: StatusSyncPriority;
  enabled: boolean;
}

/**
 * Status synchronization queue item
 */
export interface StatusSyncQueueItem {
  id: string;
  context: StatusUpdateContext;
  status: AgentStatus;
  priority: StatusSyncPriority;
  channels: StatusSyncChannel[];
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  scheduledAt: string;
  metadata?: Record<string, any>;
}

/**
 * Status synchronization batch
 */
export interface StatusSyncBatch {
  id: string;
  items: StatusSyncQueueItem[];
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  success: boolean;
  errors?: string[];
}

/**
 * Status synchronization health check
 */
export interface StatusSyncHealthCheck {
  healthy: boolean;
  channels: Record<StatusSyncChannel, {
    healthy: boolean;
    lastUpdate: string;
    errorCount: number;
    latency: number;
  }>;
  queueSize: number;
  processingRate: number;
  errorRate: number;
  lastCheck: string;
}

/**
 * Linear integration status mapping
 */
export interface LinearStatusMapping {
  agentStatus: AgentStatus;
  linearStateId: string;
  linearStateName: string;
  autoTransition: boolean;
  conditions?: {
    field: string;
    operator: "equals" | "contains" | "startsWith" | "endsWith";
    value: any;
  }[];
}

/**
 * Real-time status subscription
 */
export interface StatusSubscription {
  id: string;
  agentId?: string;
  filter?: StatusSyncFilter;
  channels: ("websocket" | "sse" | "webhook")[];
  endpoint?: string;
  headers?: Record<string, string>;
  active: boolean;
  createdAt: string;
  lastActivity: string;
}

/**
 * Status synchronization plugin interface
 */
export interface StatusSyncPlugin {
  name: string;
  version: string;
  channels: StatusSyncChannel[];
  
  initialize(config: Record<string, any>): Promise<void>;
  updateStatus(context: StatusUpdateContext, status: AgentStatus): Promise<void>;
  getStatus(agentId: string): Promise<AgentStatus | null>;
  cleanup(): Promise<void>;
  
  healthCheck?(): Promise<boolean>;
  getMetrics?(): Promise<Record<string, any>>;
}

/**
 * Status synchronization middleware
 */
export interface StatusSyncMiddleware {
  name: string;
  priority: number;
  
  beforeUpdate?(context: StatusUpdateContext, status: AgentStatus): Promise<void>;
  afterUpdate?(context: StatusUpdateContext, status: AgentStatus, result: any): Promise<void>;
  onError?(context: StatusUpdateContext, error: Error): Promise<void>;
}

