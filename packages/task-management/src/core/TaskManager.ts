/**
 * Task Manager implementation
 *
 * This module provides a manager for creating, updating, and managing tasks.
 */

import { v4 as uuidv4 } from "uuid";
import { Task, CreateTaskOptions, UpdateTaskOptions } from "../types/task.js";
import { TaskStatus } from "../types/status.js";
import { TaskDependency, DependencyType } from "../types/dependency.js";
import { TaskFSM } from "./TaskFSM.js";

/**
 * Options for creating a TaskManager
 */
export interface TaskManagerOptions {
  /**
   * Initial tasks (optional)
   */
  initialTasks?: Task[];

  /**
   * Custom TaskFSM instance (optional)
   */
  fsm?: TaskFSM;

  /**
   * Storage adapter for persisting tasks (optional)
   * If not provided, tasks will only be stored in memory
   */
  storage?: TaskStorageAdapter;
}

/**
 * Interface for task storage adapters
 */
export interface TaskStorageAdapter {
  /**
   * Save tasks to storage
   */
  saveTasks(tasks: Task[]): Promise<void>;

  /**
   * Load tasks from storage
   */
  loadTasks(): Promise<Task[]>;
}

/**
 * Task Manager for creating, updating, and managing tasks
 */
export class TaskManager {
  /**
   * All tasks managed by this TaskManager
   */
  private tasks: Task[] = [];

  /**
   * Task FSM for managing status transitions
   */
  private fsm: TaskFSM;

  /**
   * Storage adapter for persisting tasks
   */
  private storage?: TaskStorageAdapter;

  /**
   * Create a new TaskManager
   */
  constructor(options?: TaskManagerOptions) {
    this.tasks = options?.initialTasks || [];
    this.fsm = options?.fsm || new TaskFSM();
    this.storage = options?.storage;
  }

  /**
   * Initialize the TaskManager
   * Loads tasks from storage if a storage adapter is provided
   */
  public async initialize(): Promise<void> {
    if (this.storage) {
      try {
        this.tasks = await this.storage.loadTasks();
      } catch (error) {
        console.error("Failed to load tasks from storage:", error);
        // Continue with empty tasks array
      }
    }
  }

  /**
   * Create a new task
   *
   * @param options - Task creation options
   * @returns The created task
   */
  public async createTask(options: CreateTaskOptions): Promise<Task> {
    const now = new Date().toISOString();

    const task: Task = {
      id: uuidv4(),
      title: options.title,
      description: options.description,
      status: TaskStatus.BACKLOG,
      priority: options.priority || 3,
      complexity: options.complexity || 3,
      dependencies: options.dependencies || [],
      subtasks: [],
      parentId: options.parentId,
      createdAt: now,
      updatedAt: now,
      assignedTo: options.assignedTo,
      metadata: options.metadata || {},
    };

    this.tasks.push(task);

    // If this is a subtask, add it to the parent's subtasks
    if (options.parentId) {
      const parentTask = this.getTaskById(options.parentId);
      if (parentTask) {
        parentTask.subtasks.push(task);
        parentTask.updatedAt = now;
      }
    }

    await this.persistTasks();

    return task;
  }

  /**
   * Get a task by ID
   *
   * @param id - Task ID
   * @returns The task, or undefined if not found
   */
  public getTaskById(id: string): Task | undefined {
    return this.tasks.find((task) => task.id === id);
  }

  /**
   * Get all tasks
   *
   * @returns Array of all tasks
   */
  public getAllTasks(): Task[] {
    return [...this.tasks];
  }

  /**
   * Get root tasks (tasks without a parent)
   *
   * @returns Array of root tasks
   */
  public getRootTasks(): Task[] {
    return this.tasks.filter((task) => !task.parentId);
  }

  /**
   * Update a task
   *
   * @param id - Task ID
   * @param updates - Task updates
   * @returns The updated task, or undefined if not found
   */
  public async updateTask(id: string, updates: UpdateTaskOptions): Promise<Task | undefined> {
    const task = this.getTaskById(id);
    if (!task) {
      return undefined;
    }

    // Handle status transition if status is being updated
    if (updates.status && updates.status !== task.status) {
      if (!this.fsm.canTransition(task.status, updates.status, task)) {
        throw new Error(`Invalid status transition from ${task.status} to ${updates.status}`);
      }
    }

    // Update the task
    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Replace the task in the tasks array
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
    }

    // If this is a subtask, update it in the parent's subtasks
    if (updatedTask.parentId) {
      const parentTask = this.getTaskById(updatedTask.parentId);
      if (parentTask) {
        const subtaskIndex = parentTask.subtasks.findIndex((st) => st.id === id);
        if (subtaskIndex !== -1) {
          parentTask.subtasks[subtaskIndex] = updatedTask;
          parentTask.updatedAt = updatedTask.updatedAt;
        }
      }
    }

    await this.persistTasks();

    return updatedTask;
  }

  /**
   * Delete a task
   *
   * @param id - Task ID
   * @returns Whether the task was deleted
   */
  public async deleteTask(id: string): Promise<boolean> {
    const task = this.getTaskById(id);
    if (!task) {
      return false;
    }

    // Remove the task from the tasks array
    this.tasks = this.tasks.filter((t) => t.id !== id);

    // If this is a subtask, remove it from the parent's subtasks
    if (task.parentId) {
      const parentTask = this.getTaskById(task.parentId);
      if (parentTask) {
        parentTask.subtasks = parentTask.subtasks.filter((st) => st.id !== id);
        parentTask.updatedAt = new Date().toISOString();
      }
    }

    // Remove this task from any dependencies
    this.tasks.forEach((t) => {
      const hasDependency = t.dependencies.some((dep) => dep.taskId === id);
      if (hasDependency) {
        t.dependencies = t.dependencies.filter((dep) => dep.taskId !== id);
        t.updatedAt = new Date().toISOString();
      }
    });

    await this.persistTasks();

    return true;
  }

  /**
   * Add a dependency between tasks
   *
   * @param taskId - ID of the dependent task
   * @param dependsOnTaskId - ID of the task that taskId depends on
   * @param type - Type of dependency
   * @param description - Optional description of the dependency
   * @returns The updated task, or undefined if either task not found
   */
  public async addDependency(
    taskId: string,
    dependsOnTaskId: string,
    type: DependencyType = DependencyType.BLOCKS,
    description?: string,
  ): Promise<Task | undefined> {
    const task = this.getTaskById(taskId);
    const dependsOnTask = this.getTaskById(dependsOnTaskId);

    if (!task || !dependsOnTask) {
      return undefined;
    }

    // Check if dependency already exists
    const existingDep = task.dependencies.find((dep) => dep.taskId === dependsOnTaskId);
    if (existingDep) {
      // Update existing dependency
      existingDep.type = type;
      if (description) {
        existingDep.description = description;
      }
    } else {
      // Add new dependency
      task.dependencies.push({
        taskId: dependsOnTaskId,
        type,
        description,
      });
    }

    task.updatedAt = new Date().toISOString();

    await this.persistTasks();

    return task;
  }

  /**
   * Remove a dependency between tasks
   *
   * @param taskId - ID of the dependent task
   * @param dependsOnTaskId - ID of the task that taskId depends on
   * @returns The updated task, or undefined if not found
   */
  public async removeDependency(
    taskId: string,
    dependsOnTaskId: string,
  ): Promise<Task | undefined> {
    const task = this.getTaskById(taskId);
    if (!task) {
      return undefined;
    }

    task.dependencies = task.dependencies.filter((dep) => dep.taskId !== dependsOnTaskId);
    task.updatedAt = new Date().toISOString();

    await this.persistTasks();

    return task;
  }

  /**
   * Get tasks by status
   *
   * @param status - Task status
   * @returns Array of tasks with the specified status
   */
  public getTasksByStatus(status: TaskStatus): Task[] {
    return this.tasks.filter((task) => task.status === status);
  }

  /**
   * Get tasks assigned to a specific agent
   *
   * @param agentId - Agent ID
   * @returns Array of tasks assigned to the agent
   */
  public getTasksByAssignee(agentId: string): Task[] {
    return this.tasks.filter((task) => task.assignedTo === agentId);
  }

  /**
   * Get the next available task for an agent
   *
   * @param agentId - Agent ID (optional)
   * @returns The next available task, or undefined if none available
   */
  public getNextAvailableTask(agentId?: string): Task | undefined {
    // First, check for tasks already assigned to this agent that are in progress
    if (agentId) {
      const assignedInProgress = this.tasks.find(
        (task) => task.assignedTo === agentId && task.status === TaskStatus.IN_PROGRESS,
      );
      if (assignedInProgress) {
        return assignedInProgress;
      }
    }

    // Then, check for tasks already assigned to this agent that are ready
    if (agentId) {
      const assignedReady = this.tasks.find(
        (task) => task.assignedTo === agentId && task.status === TaskStatus.READY,
      );
      if (assignedReady) {
        return assignedReady;
      }
    }

    // Then, check for unassigned ready tasks
    const readyTasks = this.tasks.filter(
      (task) => !task.assignedTo && task.status === TaskStatus.READY,
    );

    // Sort by priority (lower number = higher priority)
    readyTasks.sort((a, b) => a.priority - b.priority);

    return readyTasks[0];
  }

  /**
   * Transition a task to a new status
   *
   * @param id - Task ID
   * @param newStatus - New status
   * @returns The updated task, or undefined if not found or transition not allowed
   */
  public async transitionTaskStatus(id: string, newStatus: TaskStatus): Promise<Task | undefined> {
    const task = this.getTaskById(id);
    if (!task) {
      return undefined;
    }

    if (!this.fsm.canTransition(task.status, newStatus, task)) {
      throw new Error(`Invalid status transition from ${task.status} to ${newStatus}`);
    }

    return this.updateTask(id, { status: newStatus });
  }

  /**
   * Assign a task to an agent
   *
   * @param id - Task ID
   * @param agentId - Agent ID
   * @returns The updated task, or undefined if not found
   */
  public async assignTask(id: string, agentId: string): Promise<Task | undefined> {
    return this.updateTask(id, { assignedTo: agentId });
  }

  /**
   * Unassign a task
   *
   * @param id - Task ID
   * @returns The updated task, or undefined if not found
   */
  public async unassignTask(id: string): Promise<Task | undefined> {
    return this.updateTask(id, { assignedTo: undefined });
  }

  /**
   * Get the FSM instance
   *
   * @returns The TaskFSM instance
   */
  public getFSM(): TaskFSM {
    return this.fsm;
  }

  /**
   * Persist tasks to storage
   */
  private async persistTasks(): Promise<void> {
    if (this.storage) {
      try {
        await this.storage.saveTasks(this.tasks);
      } catch (error) {
        console.error("Failed to save tasks to storage:", error);
      }
    }
  }
}
