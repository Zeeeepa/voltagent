/**
 * Task management system types
 * Ported from SwarmMCP task management system
 */

/**
 * Task status types
 */
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'deferred';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Subtask interface
 */
export interface Subtask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  dependencies: number[];
  details?: string;
  testStrategy?: string;
}

/**
 * Task interface
 */
export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  dependencies: number[];
  priority: TaskPriority;
  details?: string;
  testStrategy?: string;
  subtasks?: Subtask[];
  complexity?: number;
  agentId?: string;
  checkpointId?: string;
}

/**
 * Tasks data structure
 */
export interface TasksData {
  project: {
    name: string;
    version: string;
    description?: string;
  };
  tasks: Task[];
  lastUpdated: string;
}

/**
 * Task complexity analysis result
 */
export interface TaskComplexityAnalysis {
  taskId: number;
  taskTitle: string;
  complexityScore: number;
  recommendedSubtasks: number;
  expansionPrompt: string;
  reasoning: string;
  expansionCommand: string;
}

/**
 * Task complexity report
 */
export interface TaskComplexityReport {
  tasksAnalyzed: number;
  threshold: number;
  generatedAt: string;
  tasks: TaskComplexityAnalysis[];
}

/**
 * Task operation result
 */
export interface TaskOperationResult<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  fromCache?: boolean;
}

