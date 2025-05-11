/**
 * Task types for the task management system
 */

import { TaskStatus } from "./status.js";
import { TaskDependency } from "./dependency.js";

/**
 * Represents a task in the task management system
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  id: string;

  /**
   * Task title
   */
  title: string;

  /**
   * Task description
   */
  description: string;

  /**
   * Current status of the task
   */
  status: TaskStatus;

  /**
   * Task priority (1-5, with 1 being highest)
   */
  priority: number;

  /**
   * Estimated complexity (1-5, with 1 being simplest)
   */
  complexity: number;

  /**
   * Dependencies for this task
   */
  dependencies: TaskDependency[];

  /**
   * Subtasks for this task
   */
  subtasks: Task[];

  /**
   * Parent task ID (if this is a subtask)
   */
  parentId?: string;

  /**
   * Creation timestamp
   */
  createdAt: string;

  /**
   * Last update timestamp
   */
  updatedAt: string;

  /**
   * Assigned agent ID (if any)
   */
  assignedTo?: string;

  /**
   * Additional metadata for the task
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for creating a new task
 */
export interface CreateTaskOptions {
  /**
   * Task title
   */
  title: string;

  /**
   * Task description
   */
  description: string;

  /**
   * Task priority (1-5, with 1 being highest)
   */
  priority?: number;

  /**
   * Estimated complexity (1-5, with 1 being simplest)
   */
  complexity?: number;

  /**
   * Dependencies for this task
   */
  dependencies?: TaskDependency[];

  /**
   * Parent task ID (if this is a subtask)
   */
  parentId?: string;

  /**
   * Assigned agent ID (if any)
   */
  assignedTo?: string;

  /**
   * Additional metadata for the task
   */
  metadata?: Record<string, unknown>;
}

/**
 * Options for updating an existing task
 */
export interface UpdateTaskOptions {
  /**
   * Task title
   */
  title?: string;

  /**
   * Task description
   */
  description?: string;

  /**
   * Task status
   */
  status?: TaskStatus;

  /**
   * Task priority (1-5, with 1 being highest)
   */
  priority?: number;

  /**
   * Estimated complexity (1-5, with 1 being simplest)
   */
  complexity?: number;

  /**
   * Dependencies for this task
   */
  dependencies?: TaskDependency[];

  /**
   * Assigned agent ID (if any)
   */
  assignedTo?: string;

  /**
   * Additional metadata for the task
   */
  metadata?: Record<string, unknown>;
}
