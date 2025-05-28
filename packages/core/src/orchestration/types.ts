import type { Agent } from "../agent";
import type { BaseMessage } from "../agent/providers";

/**
 * Workflow execution status
 */
export type WorkflowStatus = 
  | "pending"
  | "running" 
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

/**
 * Task execution status
 */
export type TaskStatus = 
  | "pending"
  | "running"
  | "completed" 
  | "failed"
  | "skipped"
  | "cancelled";

/**
 * Workflow execution mode
 */
export type ExecutionMode = 
  | "sequential"    // Execute tasks one after another
  | "parallel"      // Execute all tasks simultaneously
  | "conditional"   // Execute based on conditions
  | "pipeline"      // Execute in pipeline with data flow
  | "graph";        // Execute based on dependency graph

/**
 * Task definition within a workflow
 */
export interface WorkflowTask {
  id: string;
  name: string;
  description?: string;
  agentName: string;
  input: string | Record<string, unknown>;
  dependencies?: string[]; // Task IDs this task depends on
  conditions?: TaskCondition[];
  timeout?: number; // Timeout in milliseconds
  retries?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Condition for conditional task execution
 */
export interface TaskCondition {
  type: "result" | "status" | "custom";
  taskId?: string; // For result/status conditions
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "exists";
  value: unknown;
  customEvaluator?: (context: WorkflowExecutionContext) => boolean;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  mode: ExecutionMode;
  tasks: WorkflowTask[];
  globalTimeout?: number;
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandlingStrategy;
  metadata?: Record<string, unknown>;
}

/**
 * Retry policy for tasks and workflows
 */
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "linear" | "exponential" | "fixed";
  baseDelay: number; // Base delay in milliseconds
  maxDelay?: number; // Maximum delay for exponential backoff
  retryableErrors?: string[]; // Specific error types to retry
}

/**
 * Error handling strategy
 */
export interface ErrorHandlingStrategy {
  onTaskFailure: "stop" | "continue" | "retry" | "skip_dependents";
  onWorkflowFailure: "stop" | "rollback" | "partial_complete";
  errorNotification?: boolean;
  customErrorHandler?: (error: WorkflowError, context: WorkflowExecutionContext) => Promise<void>;
}

/**
 * Workflow execution context
 */
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  currentTask?: string;
  taskResults: Map<string, TaskExecutionResult>;
  globalContext: Map<string, unknown>;
  userContext?: Map<string | symbol, unknown>;
  conversationId?: string;
  userId?: string;
  parentAgentId?: string;
  parentHistoryEntryId?: string;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  taskId: string;
  status: TaskStatus;
  result?: unknown;
  error?: WorkflowError;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  agentConversationId?: string;
  messages?: BaseMessage[];
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  workflowId: string;
  executionId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  taskResults: TaskExecutionResult[];
  finalResult?: unknown;
  error?: WorkflowError;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow error with context
 */
export interface WorkflowError {
  code: string;
  message: string;
  taskId?: string;
  originalError?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Workflow event for monitoring and observability
 */
export interface WorkflowEvent {
  type: "workflow_started" | "workflow_completed" | "workflow_failed" | 
        "task_started" | "task_completed" | "task_failed" | "task_retried";
  workflowId: string;
  executionId: string;
  taskId?: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

/**
 * Workflow scheduler configuration
 */
export interface SchedulerConfig {
  maxConcurrentWorkflows: number;
  maxConcurrentTasks: number;
  taskQueueSize: number;
  heartbeatInterval: number; // Milliseconds
  cleanupInterval: number; // Milliseconds
  persistenceEnabled: boolean;
}

/**
 * Task queue item
 */
export interface QueuedTask {
  id: string;
  workflowId: string;
  executionId: string;
  task: WorkflowTask;
  priority: number;
  scheduledTime: Date;
  dependencies: string[];
  context: WorkflowExecutionContext;
}

/**
 * Workflow orchestration engine interface
 */
export interface IWorkflowOrchestrator {
  // Workflow management
  registerWorkflow(definition: WorkflowDefinition): Promise<void>;
  unregisterWorkflow(workflowId: string): Promise<void>;
  getWorkflow(workflowId: string): Promise<WorkflowDefinition | null>;
  listWorkflows(): Promise<WorkflowDefinition[]>;

  // Execution management
  executeWorkflow(workflowId: string, input?: Record<string, unknown>, options?: WorkflowExecutionOptions): Promise<WorkflowExecutionResult>;
  pauseWorkflow(executionId: string): Promise<void>;
  resumeWorkflow(executionId: string): Promise<void>;
  cancelWorkflow(executionId: string): Promise<void>;
  getExecutionStatus(executionId: string): Promise<WorkflowExecutionContext | null>;

  // Monitoring and observability
  onWorkflowEvent(callback: (event: WorkflowEvent) => void): void;
  getExecutionHistory(workflowId?: string, limit?: number): Promise<WorkflowExecutionResult[]>;
}

/**
 * Task scheduler interface
 */
export interface ITaskScheduler {
  scheduleTask(task: QueuedTask): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
  getQueueStatus(): Promise<{ pending: number; running: number; completed: number }>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  priority?: number;
  timeout?: number;
  userContext?: Map<string | symbol, unknown>;
  conversationId?: string;
  userId?: string;
  parentAgentId?: string;
  parentHistoryEntryId?: string;
  dryRun?: boolean; // Validate workflow without executing
}

/**
 * State persistence interface
 */
export interface IWorkflowStateManager {
  saveWorkflowState(context: WorkflowExecutionContext): Promise<void>;
  loadWorkflowState(executionId: string): Promise<WorkflowExecutionContext | null>;
  deleteWorkflowState(executionId: string): Promise<void>;
  listActiveWorkflows(): Promise<string[]>;
}

