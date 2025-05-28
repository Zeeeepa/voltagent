/**
 * Types for the Dependency Management System
 */

/**
 * Enum representing different types of dependencies between tasks
 */
export enum DependencyType {
  /**
   * The dependent task can start only after the predecessor task finishes
   * This is the most common dependency type
   */
  FINISH_TO_START = "finish-to-start",

  /**
   * The dependent task can start only after the predecessor task starts
   */
  START_TO_START = "start-to-start",

  /**
   * The dependent task can finish only after the predecessor task finishes
   */
  FINISH_TO_FINISH = "finish-to-finish",

  /**
   * The dependent task can finish only after the predecessor task starts
   */
  START_TO_FINISH = "start-to-finish",
}

/**
 * Enum representing the status of a task
 */
export enum TaskStatus {
  /**
   * Task is not yet ready to be executed (dependencies not satisfied)
   */
  PENDING = "pending",

  /**
   * Task is ready to be executed (all dependencies satisfied)
   */
  READY = "ready",

  /**
   * Task is currently being executed
   */
  IN_PROGRESS = "in-progress",

  /**
   * Task has been completed successfully
   */
  COMPLETED = "completed",

  /**
   * Task has failed
   */
  FAILED = "failed",

  /**
   * Task has been blocked due to a dependency failure
   */
  BLOCKED = "blocked",
}

/**
 * Interface representing a dependency between two tasks
 */
export interface Dependency {
  /**
   * ID of the predecessor task
   */
  predecessorId: string;

  /**
   * ID of the dependent task
   */
  dependentId: string;

  /**
   * Type of dependency
   */
  type: DependencyType;

  /**
   * Optional lag time between predecessor and dependent tasks (in milliseconds)
   */
  lag?: number;

  /**
   * Optional metadata for the dependency
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface representing a task in the dependency graph
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  id: string;

  /**
   * Name of the task
   */
  name: string;

  /**
   * Description of the task
   */
  description?: string;

  /**
   * Current status of the task
   */
  status: TaskStatus;

  /**
   * Estimated duration of the task (in milliseconds)
   */
  estimatedDuration?: number;

  /**
   * Actual duration of the task (in milliseconds)
   * Only available after task completion
   */
  actualDuration?: number;

  /**
   * Start time of the task
   * Only available after task has started
   */
  startTime?: Date;

  /**
   * End time of the task
   * Only available after task completion
   */
  endTime?: Date;

  /**
   * Agent ID that will execute this task
   */
  agentId?: string;

  /**
   * Optional metadata for the task
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for task creation options
 */
export interface CreateTaskOptions {
  /**
   * Name of the task
   */
  name: string;

  /**
   * Description of the task
   */
  description?: string;

  /**
   * Estimated duration of the task (in milliseconds)
   */
  estimatedDuration?: number;

  /**
   * Agent ID that will execute this task
   */
  agentId?: string;

  /**
   * Optional metadata for the task
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for dependency creation options
 */
export interface CreateDependencyOptions {
  /**
   * ID of the predecessor task
   */
  predecessorId: string;

  /**
   * ID of the dependent task
   */
  dependentId: string;

  /**
   * Type of dependency
   */
  type?: DependencyType;

  /**
   * Optional lag time between predecessor and dependent tasks (in milliseconds)
   */
  lag?: number;

  /**
   * Optional metadata for the dependency
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for critical path analysis result
 */
export interface CriticalPathResult {
  /**
   * Array of task IDs that form the critical path
   */
  path: string[];

  /**
   * Total duration of the critical path (in milliseconds)
   */
  duration: number;

  /**
   * Earliest start time for each task
   */
  earliestStart: Record<string, number>;

  /**
   * Earliest finish time for each task
   */
  earliestFinish: Record<string, number>;

  /**
   * Latest start time for each task
   */
  latestStart: Record<string, number>;

  /**
   * Latest finish time for each task
   */
  latestFinish: Record<string, number>;

  /**
   * Slack time for each task (in milliseconds)
   */
  slack: Record<string, number>;
}

/**
 * Interface for dependency validation result
 */
export interface ValidationResult {
  /**
   * Whether the dependency graph is valid
   */
  valid: boolean;

  /**
   * Array of validation errors
   */
  errors: ValidationError[];
}

/**
 * Interface for a validation error
 */
export interface ValidationError {
  /**
   * Type of validation error
   */
  type: ValidationErrorType;

  /**
   * Error message
   */
  message: string;

  /**
   * Task IDs involved in the error
   */
  taskIds: string[];
}

/**
 * Enum representing different types of validation errors
 */
export enum ValidationErrorType {
  /**
   * Cycle detected in the dependency graph
   */
  CYCLE_DETECTED = "cycle-detected",

  /**
   * Missing task in the dependency graph
   */
  MISSING_TASK = "missing-task",

  /**
   * Invalid dependency type
   */
  INVALID_DEPENDENCY_TYPE = "invalid-dependency-type",

  /**
   * Self-dependency detected
   */
  SELF_DEPENDENCY = "self-dependency",

  /**
   * Duplicate dependency detected
   */
  DUPLICATE_DEPENDENCY = "duplicate-dependency",

  /**
   * Other validation error
   */
  OTHER = "other",
}

/**
 * Interface for dependency impact analysis result
 */
export interface ImpactAnalysisResult {
  /**
   * Tasks directly affected by the change
   */
  directlyAffectedTasks: string[];

  /**
   * Tasks indirectly affected by the change
   */
  indirectlyAffectedTasks: string[];

  /**
   * Estimated impact on project duration (in milliseconds)
   */
  durationImpact: number;

  /**
   * Whether the critical path is affected
   */
  criticalPathAffected: boolean;

  /**
   * New critical path if affected
   */
  newCriticalPath?: string[];
}

/**
 * Interface for dependency visualization options
 */
export interface VisualizationOptions {
  /**
   * Format of the visualization
   */
  format: "json" | "mermaid" | "dot" | "html";

  /**
   * Whether to include task details in the visualization
   */
  includeTaskDetails?: boolean;

  /**
   * Whether to highlight the critical path
   */
  highlightCriticalPath?: boolean;

  /**
   * Custom styling options for the visualization
   */
  styling?: Record<string, unknown>;
}

/**
 * Interface for dependency health metrics
 */
export interface DependencyHealthMetrics {
  /**
   * Number of tasks in the dependency graph
   */
  taskCount: number;

  /**
   * Number of dependencies in the dependency graph
   */
  dependencyCount: number;

  /**
   * Average number of dependencies per task
   */
  averageDependenciesPerTask: number;

  /**
   * Maximum number of dependencies for a single task
   */
  maxDependenciesForTask: number;

  /**
   * Task ID with the maximum number of dependencies
   */
  maxDependenciesTaskId: string;

  /**
   * Complexity score of the dependency graph (higher is more complex)
   */
  complexityScore: number;

  /**
   * Health score of the dependency graph (0-100, higher is healthier)
   */
  healthScore: number;

  /**
   * Recommendations for improving the dependency graph
   */
  recommendations: string[];
}

