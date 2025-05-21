import { AbortSignal } from "node:abort-controller";
import { EventEmitter } from "node:events";

/**
 * Unique identifier for a task
 */
export type TaskId = string;

/**
 * Possible states of a task
 */
export enum TaskState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  SKIPPED = "skipped",
}

/**
 * Priority levels for tasks
 * Higher numbers indicate higher priority
 */
export enum TaskPriority {
  LOW = 0,
  NORMAL = 50,
  HIGH = 100,
  CRITICAL = 200,
}

/**
 * Resource requirements for a task
 */
export interface ResourceRequirements {
  cpu?: number; // CPU units (0-100)
  memory?: number; // Memory in MB
  concurrency?: number; // Number of concurrent tasks allowed
  [key: string]: any; // Custom resource requirements
}

/**
 * Retry policy for a task
 */
export interface RetryPolicy {
  maxRetries: number; // Maximum number of retry attempts
  backoffFactor?: number; // Exponential backoff factor (default: 2)
  initialDelay?: number; // Initial delay in ms before first retry (default: 1000)
  maxDelay?: number; // Maximum delay in ms between retries (default: 30000)
  retryableErrors?: Array<string | RegExp>; // Errors that should trigger a retry
}

/**
 * Task execution options
 */
export interface TaskExecutionOptions {
  timeout?: number; // Timeout in milliseconds
  signal?: AbortSignal; // Signal to abort execution
  context?: Record<string, any>; // Execution context
}

/**
 * Task definition
 */
export interface TaskDefinition<TInput = any, TOutput = any> {
  id: TaskId; // Unique identifier for the task
  name: string; // Human-readable name
  description?: string; // Optional description
  dependencies?: TaskId[]; // IDs of tasks that must complete before this task
  execute: (input: TInput, options?: TaskExecutionOptions) => Promise<TOutput>; // Function to execute the task
  input?: TInput | ((results: Record<TaskId, any>) => TInput); // Static input or function to derive input from previous results
  priority?: TaskPriority; // Task priority (default: NORMAL)
  resources?: ResourceRequirements; // Resource requirements
  retryPolicy?: RetryPolicy; // Retry policy
  timeout?: number; // Timeout in milliseconds
  failureMode?: "fail-workflow" | "continue-workflow"; // What to do if this task fails (default: fail-workflow)
  isolationLevel?: "none" | "process" | "container"; // Level of isolation for this task (default: none)
  tags?: string[]; // Optional tags for grouping and filtering
}

/**
 * Task instance with runtime state
 */
export interface TaskInstance<TInput = any, TOutput = any> {
  definition: TaskDefinition<TInput, TOutput>; // Task definition
  state: TaskState; // Current state
  result?: TOutput; // Task result (if completed)
  error?: Error; // Error (if failed)
  startTime?: Date; // When the task started
  endTime?: Date; // When the task completed or failed
  retryCount: number; // Number of retry attempts
  nextRetryTime?: Date; // When the next retry will occur
  abortController?: AbortController; // Controller to abort execution
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string; // Unique identifier
  name: string; // Human-readable name
  description?: string; // Optional description
  tasks: TaskDefinition[]; // Tasks in this workflow
  concurrencyLimit?: number; // Maximum number of concurrent tasks (default: unlimited)
  failFast?: boolean; // Whether to fail the workflow on first task failure (default: true)
  tags?: string[]; // Optional tags for grouping and filtering
}

/**
 * Workflow instance with runtime state
 */
export interface WorkflowInstance {
  definition: WorkflowDefinition; // Workflow definition
  tasks: Map<TaskId, TaskInstance>; // Task instances by ID
  state: WorkflowState; // Current state
  results: Record<TaskId, any>; // Results of completed tasks
  startTime?: Date; // When the workflow started
  endTime?: Date; // When the workflow completed or failed
  abortController: AbortController; // Controller to abort execution
  eventEmitter: EventEmitter; // Event emitter for workflow events
}

/**
 * Possible states of a workflow
 */
export enum WorkflowState {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  signal?: AbortSignal; // Signal to abort execution
  context?: Record<string, any>; // Execution context
  initialResults?: Record<TaskId, any>; // Initial results for tasks
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  workflowId: string; // Workflow ID
  state: WorkflowState; // Final state
  results: Record<TaskId, any>; // Results of completed tasks
  errors: Record<TaskId, Error>; // Errors of failed tasks
  startTime: Date; // When the workflow started
  endTime: Date; // When the workflow completed or failed
  duration: number; // Duration in milliseconds
}

/**
 * Task execution result
 */
export interface TaskExecutionResult<TOutput = any> {
  taskId: TaskId; // Task ID
  state: TaskState; // Final state
  result?: TOutput; // Result (if completed)
  error?: Error; // Error (if failed)
  startTime: Date; // When the task started
  endTime: Date; // When the task completed or failed
  duration: number; // Duration in milliseconds
  retryCount: number; // Number of retry attempts
}

/**
 * Workflow event types
 */
export enum WorkflowEventType {
  WORKFLOW_STARTED = "workflow:started",
  WORKFLOW_COMPLETED = "workflow:completed",
  WORKFLOW_FAILED = "workflow:failed",
  WORKFLOW_CANCELLED = "workflow:cancelled",
  TASK_PENDING = "task:pending",
  TASK_STARTED = "task:started",
  TASK_COMPLETED = "task:completed",
  TASK_FAILED = "task:failed",
  TASK_CANCELLED = "task:cancelled",
  TASK_RETRYING = "task:retrying",
  TASK_SKIPPED = "task:skipped",
}

/**
 * Base workflow event
 */
export interface WorkflowEvent {
  type: WorkflowEventType;
  workflowId: string;
  timestamp: Date;
}

/**
 * Task-related workflow event
 */
export interface TaskEvent extends WorkflowEvent {
  taskId: TaskId;
  taskName: string;
}

/**
 * Task started event
 */
export interface TaskStartedEvent extends TaskEvent {
  type: WorkflowEventType.TASK_STARTED;
}

/**
 * Task completed event
 */
export interface TaskCompletedEvent extends TaskEvent {
  type: WorkflowEventType.TASK_COMPLETED;
  result: any;
  duration: number;
}

/**
 * Task failed event
 */
export interface TaskFailedEvent extends TaskEvent {
  type: WorkflowEventType.TASK_FAILED;
  error: Error;
  duration: number;
  willRetry: boolean;
}

/**
 * Task retrying event
 */
export interface TaskRetryingEvent extends TaskEvent {
  type: WorkflowEventType.TASK_RETRYING;
  error: Error;
  retryCount: number;
  nextRetryTime: Date;
}

/**
 * Workflow started event
 */
export interface WorkflowStartedEvent extends WorkflowEvent {
  type: WorkflowEventType.WORKFLOW_STARTED;
  workflowName: string;
}

/**
 * Workflow completed event
 */
export interface WorkflowCompletedEvent extends WorkflowEvent {
  type: WorkflowEventType.WORKFLOW_COMPLETED;
  results: Record<TaskId, any>;
  duration: number;
}

/**
 * Workflow failed event
 */
export interface WorkflowFailedEvent extends WorkflowEvent {
  type: WorkflowEventType.WORKFLOW_FAILED;
  errors: Record<TaskId, Error>;
  duration: number;
}

/**
 * Workflow cancelled event
 */
export interface WorkflowCancelledEvent extends WorkflowEvent {
  type: WorkflowEventType.WORKFLOW_CANCELLED;
  reason?: string;
  duration: number;
}

