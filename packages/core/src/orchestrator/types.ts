import type { Agent } from "../agent";
import type { VoltAgentError } from "../agent/types";

/**
 * System component health status
 */
export type ComponentHealth = "healthy" | "degraded" | "unhealthy" | "unknown";

/**
 * Workflow execution status
 */
export type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/**
 * Event priority levels
 */
export type EventPriority = "low" | "normal" | "high" | "critical";

/**
 * System component types
 */
export type ComponentType = "agent" | "database" | "api" | "cache" | "external";

/**
 * Workflow step types
 */
export type WorkflowStepType = "requirement_analysis" | "task_generation" | "agent_assignment" | "execution" | "validation" | "deployment";

/**
 * System component interface
 */
export interface SystemComponent {
  id: string;
  name: string;
  type: ComponentType;
  status: ComponentHealth;
  lastHealthCheck: Date;
  metadata?: Record<string, any>;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
}

/**
 * System event interface
 */
export interface SystemEvent {
  id: string;
  type: string;
  priority: EventPriority;
  source: string;
  target?: string;
  data: Record<string, any>;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Workflow definition interface
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, any>;
}

/**
 * Workflow step interface
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  agentId?: string;
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  parameters?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Workflow execution interface
 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  results: Record<string, any>;
  error?: VoltAgentError;
  metadata?: Record<string, any>;
}

/**
 * Retry policy interface
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  baseDelay: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

/**
 * Agent assignment interface
 */
export interface AgentAssignment {
  agentId: string;
  taskId: string;
  priority: number;
  estimatedDuration?: number;
  requirements?: string[];
  metadata?: Record<string, any>;
}

/**
 * Load balancing strategy
 */
export type LoadBalancingStrategy = "round_robin" | "least_connections" | "weighted" | "performance_based";

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  ttl: number;
  maxSize?: number;
  strategy: "lru" | "lfu" | "fifo";
  namespace?: string;
}

/**
 * Configuration interface
 */
export interface OrchestratorConfig {
  healthCheckInterval: number;
  metricsCollectionInterval: number;
  workflowTimeout: number;
  maxConcurrentWorkflows: number;
  loadBalancingStrategy: LoadBalancingStrategy;
  cacheConfig: CacheConfig;
  retryPolicy: RetryPolicy;
  enableTelemetry: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
}

/**
 * State snapshot interface
 */
export interface StateSnapshot {
  id: string;
  timestamp: Date;
  components: Record<string, SystemComponent>;
  workflows: Record<string, WorkflowExecution>;
  metrics: PerformanceMetrics;
  metadata?: Record<string, any>;
}

/**
 * Event handler interface
 */
export interface EventHandler {
  type: string;
  priority: EventPriority;
  handler: (event: SystemEvent) => Promise<void>;
}

/**
 * Orchestrator interface
 */
export interface IOrchestrator {
  start(): Promise<void>;
  stop(): Promise<void>;
  getHealth(): Promise<ComponentHealth>;
  executeWorkflow(definition: WorkflowDefinition, input?: Record<string, any>): Promise<WorkflowExecution>;
  getWorkflowStatus(workflowId: string): Promise<WorkflowExecution | null>;
  cancelWorkflow(workflowId: string): Promise<boolean>;
  registerAgent(agent: Agent<any>): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;
  getSystemMetrics(): Promise<PerformanceMetrics>;
}

