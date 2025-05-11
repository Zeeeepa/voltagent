/**
 * Task Management System Types
 */

/**
 * Task status types
 */
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Subtask interface
 */
export interface Subtask {
  /** Subtask ID (e.g., 1, 2, 3) */
  id: number;
  /** Subtask title */
  title: string;
  /** Detailed description of the subtask */
  description?: string;
  /** Implementation details */
  details?: string;
  /** Current status of the subtask */
  status: TaskStatus;
  /** IDs of subtasks this subtask depends on */
  dependencies?: number[];
}

/**
 * Task interface
 */
export interface Task {
  /** Task ID (e.g., 1, 2, 3) */
  id: number;
  /** Task title */
  title: string;
  /** Detailed description of the task */
  description?: string;
  /** Implementation details */
  details?: string;
  /** Current status of the task */
  status: TaskStatus;
  /** Task priority level */
  priority: TaskPriority;
  /** IDs of tasks this task depends on */
  dependencies?: number[];
  /** List of subtasks */
  subtasks?: Subtask[];
  /** Test strategy for the task */
  testStrategy?: string;
  /** Complexity score (1-10) */
  complexity?: number;
}

/**
 * Tasks data structure
 */
export interface TasksData {
  /** Array of tasks */
  tasks: Task[];
  /** Metadata about the tasks */
  metadata?: {
    /** Project name */
    projectName?: string;
    /** Project description */
    projectDescription?: string;
    /** Creation date */
    createdAt?: string;
    /** Last updated date */
    updatedAt?: string;
    /** Source of the tasks (e.g., "prd", "manual") */
    source?: string;
  };
}

/**
 * Task complexity analysis result
 */
export interface TaskComplexityAnalysis {
  /** Task ID */
  taskId: number;
  /** Complexity score (1-10) */
  complexityScore: number;
  /** Reasoning for the complexity score */
  reasoning: string;
  /** Estimated time to complete (in hours) */
  estimatedHours?: number;
  /** Recommended number of subtasks */
  recommendedSubtasks?: number;
  /** Skills required to complete the task */
  requiredSkills?: string[];
}

/**
 * Arguments for direct functions
 */
export interface DirectFunctionArgs {
  /** Path to the tasks.json file */
  tasksJsonPath: string;
  /** Project root directory */
  projectRoot?: string;
  /** Task ID */
  taskId?: number | string;
  /** Subtask ID */
  subtaskId?: number;
  /** Parent task ID for subtask operations */
  parentTaskId?: number;
  /** Task status */
  status?: TaskStatus;
  /** Task priority */
  priority?: TaskPriority;
  /** Whether to include subtasks in results */
  withSubtasks?: boolean;
  /** Prompt for AI-driven operations */
  prompt?: string;
  /** Task title */
  title?: string;
  /** Task description */
  description?: string;
  /** Task details */
  details?: string;
  /** Task test strategy */
  testStrategy?: string;
  /** Task dependencies */
  dependencies?: number[] | string;
  /** Whether to use research capabilities */
  research?: boolean;
  /** Path to the PRD file */
  input?: string;
  /** Output path for generated files */
  output?: string;
  /** Number of tasks to generate */
  numTasks?: number;
  /** Whether to append to existing tasks */
  append?: boolean;
  /** Number of subtasks to generate */
  numSubtasks?: number;
  /** Additional context for task operations */
  additionalContext?: string;
}

/**
 * Logger interface for direct functions
 */
export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  debug?: (message: string) => void;
}

/**
 * Context for direct functions
 */
export interface DirectFunctionContext {
  /** Session object with environment variables */
  session?: {
    env?: Record<string, string>;
  };
  /** Function to report progress */
  reportProgress?: (progress: number, message: string) => void;
}

/**
 * Result of a direct function
 */
export interface DirectFunctionResult<T = any> {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data (if success is true) */
  data?: T;
  /** Error information (if success is false) */
  error?: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Additional error details */
    details?: any;
  };
  /** Whether the result was retrieved from cache */
  fromCache?: boolean;
}

