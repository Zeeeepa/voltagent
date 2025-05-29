import type { Agent } from "../agent";
import type { StandardEventData } from "../events/types";

/**
 * Orchestrator component status
 */
export type ComponentStatus = "idle" | "starting" | "running" | "stopping" | "stopped" | "error";

/**
 * System health status
 */
export type SystemHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/**
 * Workflow execution status
 */
export type WorkflowStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

/**
 * Task priority levels
 */
export type TaskPriority = "low" | "normal" | "high" | "critical";

/**
 * Agent coordination mode
 */
export type CoordinationMode = "sequential" | "parallel" | "conditional" | "pipeline";

/**
 * Component health information
 */
export interface ComponentHealth {
  id: string;
  name: string;
  status: ComponentStatus;
  lastHeartbeat: Date;
  uptime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errorCount: number;
  lastError?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  timestamp: Date;
  totalAgents: number;
  activeWorkflows: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage?: number;
  networkLatency?: number;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: "agent_task" | "condition" | "parallel" | "sequential" | "custom";
  agentId?: string;
  task?: string;
  condition?: string;
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  onSuccess?: string[];
  onFailure?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: "fixed" | "exponential" | "linear";
  baseDelay: number;
  maxDelay?: number;
  retryableErrors?: string[];
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  currentStep?: string;
  variables: Map<string, unknown>;
  results: Map<string, unknown>;
  errors: WorkflowError[];
  metadata?: Record<string, unknown>;
}

/**
 * Workflow error information
 */
export interface WorkflowError {
  stepId: string;
  error: Error;
  timestamp: Date;
  retryCount: number;
  recoverable: boolean;
}

/**
 * Task definition
 */
export interface TaskDefinition {
  id: string;
  type: string;
  priority: TaskPriority;
  agentId?: string;
  payload: unknown;
  dependencies?: string[];
  timeout?: number;
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, unknown>;
}

/**
 * Task execution result
 */
export interface TaskResult {
  taskId: string;
  status: "success" | "failure" | "timeout";
  result?: unknown;
  error?: Error;
  startTime: Date;
  endTime: Date;
  executionTime: number;
  metadata?: Record<string, unknown>;
}

/**
 * Agent coordination request
 */
export interface CoordinationRequest {
  id: string;
  sourceAgentId: string;
  targetAgentId?: string;
  mode: CoordinationMode;
  task: string;
  context?: Record<string, unknown>;
  priority: TaskPriority;
  timeout?: number;
  callback?: (result: TaskResult) => void;
}

/**
 * Event routing rule
 */
export interface EventRoutingRule {
  id: string;
  name: string;
  eventType: string;
  sourcePattern?: string;
  targetPattern?: string;
  condition?: (event: OrchestratorEvent) => boolean;
  transform?: (event: OrchestratorEvent) => OrchestratorEvent;
  priority: number;
  enabled: boolean;
}

/**
 * Orchestrator event
 */
export interface OrchestratorEvent extends StandardEventData {
  id: string;
  type: string;
  source: string;
  target?: string;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  version: number;
  data: Record<string, unknown>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
  strategy: "lru" | "lfu" | "fifo";
  keyPrefix?: string;
}

/**
 * Load balancing strategy
 */
export type LoadBalancingStrategy = "round_robin" | "least_connections" | "weighted" | "random" | "performance_based";

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckInterval: number;
  maxRetries: number;
  weights?: Map<string, number>;
  performanceMetrics?: string[];
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  environment: string;
  configPath?: string;
  watchForChanges?: boolean;
  validation?: boolean;
  encryption?: boolean;
}

/**
 * State persistence options
 */
export interface StatePersistenceOptions {
  enabled: boolean;
  storage: "memory" | "file" | "database" | "redis";
  path?: string;
  connectionString?: string;
  syncInterval?: number;
  compression?: boolean;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  id: string;
  name: string;
  version: string;
  components: {
    systemWatcher: ComponentConfig;
    coordinationEngine: ComponentConfig;
    eventDispatcher: ComponentConfig;
    workflowManager: ComponentConfig;
    requirementProcessor: ComponentConfig;
    taskOrchestrator: ComponentConfig;
    healthMonitor: ComponentConfig;
    stateManager: ComponentConfig;
    cacheManager: ComponentConfig;
    loadBalancer: ComponentConfig;
  };
  cache: CacheConfig;
  loadBalancer: LoadBalancerConfig;
  statePersistence: StatePersistenceOptions;
  metrics: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
  logging: {
    level: "debug" | "info" | "warn" | "error";
    format: "json" | "text";
    destination: "console" | "file" | "both";
  };
}

/**
 * Component configuration
 */
export interface ComponentConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
}

/**
 * Orchestrator component interface
 */
export interface OrchestratorComponent {
  readonly id: string;
  readonly name: string;
  readonly status: ComponentStatus;
  
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getHealth(): ComponentHealth;
  getMetrics(): Record<string, unknown>;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: OrchestratorEvent & { data: T }) => Promise<void> | void;

/**
 * Workflow template
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  version: string;
  parameters: WorkflowParameter[];
  definition: Omit<WorkflowDefinition, "id">;
}

/**
 * Workflow parameter
 */
export interface WorkflowParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  defaultValue?: unknown;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: unknown[];
  };
}

/**
 * Requirement analysis result
 */
export interface RequirementAnalysis {
  id: string;
  originalRequirement: string;
  parsedRequirements: ParsedRequirement[];
  dependencies: RequirementDependency[];
  estimatedComplexity: "low" | "medium" | "high" | "very_high";
  estimatedDuration: number;
  suggestedWorkflow?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Parsed requirement
 */
export interface ParsedRequirement {
  id: string;
  type: "functional" | "non_functional" | "constraint" | "assumption";
  description: string;
  priority: TaskPriority;
  acceptance_criteria: string[];
  tags: string[];
}

/**
 * Requirement dependency
 */
export interface RequirementDependency {
  sourceId: string;
  targetId: string;
  type: "depends_on" | "blocks" | "related_to";
  description?: string;
}

