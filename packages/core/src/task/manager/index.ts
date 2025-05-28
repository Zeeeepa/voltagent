/**
 * Task Manager
 * Core implementation for task management operations
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import {
  Task,
  TasksData,
  Subtask,
  TaskStatus,
  TaskPriority,
  TaskOperationResult,
  TaskComplexityReport,
  TaskComplexityAnalysis
} from '../types';

// Task manager events
export const TASK_CREATED_EVENT = 'task:created';
export const TASK_UPDATED_EVENT = 'task:updated';
export const TASK_DELETED_EVENT = 'task:deleted';
export const SUBTASK_CREATED_EVENT = 'subtask:created';
export const SUBTASK_UPDATED_EVENT = 'subtask:updated';
export const SUBTASK_DELETED_EVENT = 'subtask:deleted';

export interface TaskManagerOptions {
  storage: TaskStorageProvider;
  events?: EventEmitter;
}

export interface TaskStorageProvider {
  getTasks(): Promise<TasksData>;
  saveTasks(tasks: TasksData): Promise<void>;
  getComplexityReport(): Promise<TaskComplexityReport | null>;
  saveComplexityReport(report: TaskComplexityReport): Promise<void>;
}

/**
 * TaskManager class for managing tasks and subtasks
 */
export class TaskManager {
  private storage: TaskStorageProvider;
  private events: EventEmitter;

  constructor(options: TaskManagerOptions) {
    this.storage = options.storage;
    this.events = options.events || new EventEmitter();
  }

  /**
   * Get all tasks
   */
  async getTasks(filter?: { status?: TaskStatus }): Promise<TaskOperationResult<Task[]>> {
    try {
      const tasksData = await this.storage.getTasks();
      let tasks = tasksData.tasks;

      // Apply filters if provided
      if (filter?.status) {
        tasks = tasks.filter(task => task.status === filter.status);
      }

      return {
        success: true,
        data: tasks
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TASKS_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: number): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      const task = tasksData.tasks.find(t => t.id === taskId);

      if (!task) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }

      return {
        success: true,
        data: task
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData: Omit<Task, 'id'>): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      
      // Find the highest task ID to determine the next ID
      const highestId = tasksData.tasks.reduce((max, task) => Math.max(max, task.id), 0);
      const newTaskId = highestId + 1;
      
      const newTask: Task = {
        ...taskData,
        id: newTaskId,
        status: taskData.status || 'pending',
        dependencies: taskData.dependencies || [],
        subtasks: taskData.subtasks || []
      };
      
      // Add the new task
      tasksData.tasks.push(newTask);
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit task created event
      this.events.emit(TASK_CREATED_EVENT, newTask);
      
      return {
        success: true,
        data: newTask,
        message: `Task ${newTaskId} created successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: number, updates: Partial<Task>): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      // Update the task
      const updatedTask = {
        ...tasksData.tasks[taskIndex],
        ...updates
      };
      
      tasksData.tasks[taskIndex] = updatedTask;
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit task updated event
      this.events.emit(TASK_UPDATED_EVENT, updatedTask);
      
      return {
        success: true,
        data: updatedTask,
        message: `Task ${taskId} updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: number): Promise<TaskOperationResult<void>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      // Store the task for the event
      const deletedTask = tasksData.tasks[taskIndex];
      
      // Remove the task
      tasksData.tasks.splice(taskIndex, 1);
      
      // Remove references to this task in other tasks' dependencies
      tasksData.tasks.forEach(task => {
        if (task.dependencies && task.dependencies.includes(taskId)) {
          task.dependencies = task.dependencies.filter(depId => depId !== taskId);
        }
      });
      
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit task deleted event
      this.events.emit(TASK_DELETED_EVENT, deletedTask);
      
      return {
        success: true,
        message: `Task ${taskId} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Add a subtask to a task
   */
  async addSubtask(taskId: number, subtaskData: Omit<Subtask, 'id'>): Promise<TaskOperationResult<Subtask>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      const task = tasksData.tasks[taskIndex];
      
      // Initialize subtasks array if it doesn't exist
      if (!task.subtasks) {
        task.subtasks = [];
      }
      
      // Find the highest subtask ID to determine the next ID
      const highestSubtaskId = task.subtasks.reduce((max, subtask) => Math.max(max, subtask.id), 0);
      const newSubtaskId = highestSubtaskId + 1;
      
      const newSubtask: Subtask = {
        ...subtaskData,
        id: newSubtaskId,
        status: subtaskData.status || 'pending',
        dependencies: subtaskData.dependencies || []
      };
      
      // Add the new subtask
      task.subtasks.push(newSubtask);
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit subtask created event
      this.events.emit(SUBTASK_CREATED_EVENT, { taskId, subtask: newSubtask });
      
      return {
        success: true,
        data: newSubtask,
        message: `Subtask ${newSubtaskId} added to task ${taskId} successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_SUBTASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Update a subtask
   */
  async updateSubtask(taskId: number, subtaskId: number, updates: Partial<Subtask>): Promise<TaskOperationResult<Subtask>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (!task.subtasks) {
        return {
          success: false,
          error: {
            code: 'SUBTASKS_NOT_FOUND',
            message: `Task ${taskId} has no subtasks`
          }
        };
      }
      
      const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskId);
      
      if (subtaskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'SUBTASK_NOT_FOUND',
            message: `Subtask with ID ${subtaskId} not found in task ${taskId}`
          }
        };
      }
      
      // Update the subtask
      const updatedSubtask = {
        ...task.subtasks[subtaskIndex],
        ...updates
      };
      
      task.subtasks[subtaskIndex] = updatedSubtask;
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit subtask updated event
      this.events.emit(SUBTASK_UPDATED_EVENT, { taskId, subtask: updatedSubtask });
      
      return {
        success: true,
        data: updatedSubtask,
        message: `Subtask ${subtaskId} in task ${taskId} updated successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_SUBTASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(taskId: number, subtaskId: number): Promise<TaskOperationResult<void>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      const task = tasksData.tasks[taskIndex];
      
      if (!task.subtasks) {
        return {
          success: false,
          error: {
            code: 'SUBTASKS_NOT_FOUND',
            message: `Task ${taskId} has no subtasks`
          }
        };
      }
      
      const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskId);
      
      if (subtaskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'SUBTASK_NOT_FOUND',
            message: `Subtask with ID ${subtaskId} not found in task ${taskId}`
          }
        };
      }
      
      // Store the subtask for the event
      const deletedSubtask = task.subtasks[subtaskIndex];
      
      // Remove the subtask
      task.subtasks.splice(subtaskIndex, 1);
      
      // Remove references to this subtask in other subtasks' dependencies
      if (task.subtasks.length > 0) {
        task.subtasks.forEach(subtask => {
          if (subtask.dependencies && subtask.dependencies.includes(subtaskId)) {
            subtask.dependencies = subtask.dependencies.filter(depId => depId !== subtaskId);
          }
        });
      }
      
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      // Emit subtask deleted event
      this.events.emit(SUBTASK_DELETED_EVENT, { taskId, subtask: deletedSubtask });
      
      return {
        success: true,
        message: `Subtask ${subtaskId} in task ${taskId} deleted successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_SUBTASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Set task status
   */
  async setTaskStatus(taskId: number, status: TaskStatus): Promise<TaskOperationResult<Task>> {
    return this.updateTask(taskId, { status });
  }

  /**
   * Set subtask status
   */
  async setSubtaskStatus(taskId: number, subtaskId: number, status: TaskStatus): Promise<TaskOperationResult<Subtask>> {
    return this.updateSubtask(taskId, subtaskId, { status });
  }

  /**
   * Find the next task to work on based on dependencies and status
   */
  async findNextTask(): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      
      // Filter tasks that are pending or in-progress
      const eligibleTasks = tasksData.tasks.filter(task => 
        (task.status === 'pending' || task.status === 'in-progress')
      );
      
      if (eligibleTasks.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_ELIGIBLE_TASKS',
            message: 'No pending or in-progress tasks found'
          }
        };
      }
      
      // Check which tasks have all dependencies satisfied (all dependencies are 'done')
      const tasksWithSatisfiedDependencies = eligibleTasks.filter(task => {
        if (!task.dependencies || task.dependencies.length === 0) {
          return true; // No dependencies, so all are satisfied
        }
        
        // Check if all dependencies are satisfied
        return task.dependencies.every(depId => {
          const dependencyTask = tasksData.tasks.find(t => t.id === depId);
          return dependencyTask && dependencyTask.status === 'done';
        });
      });
      
      if (tasksWithSatisfiedDependencies.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_READY_TASKS',
            message: 'No tasks with all dependencies satisfied found'
          }
        };
      }
      
      // Sort tasks by priority (high > medium > low) and then by ID (lower first)
      const priorityOrder: Record<TaskPriority, number> = {
        high: 1,
        medium: 2,
        low: 3
      };
      
      const sortedTasks = tasksWithSatisfiedDependencies.sort((a, b) => {
        // First sort by priority
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        
        // Then sort by ID (lower first)
        return a.id - b.id;
      });
      
      // Return the highest priority task with satisfied dependencies
      return {
        success: true,
        data: sortedTasks[0]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FIND_NEXT_TASK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Add a dependency between tasks
   */
  async addDependency(taskId: number, dependsOnTaskId: number): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      const dependencyTaskIndex = tasksData.tasks.findIndex(t => t.id === dependsOnTaskId);
      
      if (dependencyTaskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'DEPENDENCY_TASK_NOT_FOUND',
            message: `Dependency task with ID ${dependsOnTaskId} not found`
          }
        };
      }
      
      // Prevent circular dependencies
      if (taskId === dependsOnTaskId) {
        return {
          success: false,
          error: {
            code: 'CIRCULAR_DEPENDENCY',
            message: 'A task cannot depend on itself'
          }
        };
      }
      
      const task = tasksData.tasks[taskIndex];
      
      // Initialize dependencies array if it doesn't exist
      if (!task.dependencies) {
        task.dependencies = [];
      }
      
      // Check if dependency already exists
      if (task.dependencies.includes(dependsOnTaskId)) {
        return {
          success: true,
          data: task,
          message: `Dependency already exists between task ${taskId} and ${dependsOnTaskId}`
        };
      }
      
      // Add the dependency
      task.dependencies.push(dependsOnTaskId);
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      return {
        success: true,
        data: task,
        message: `Dependency added between task ${taskId} and ${dependsOnTaskId}`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ADD_DEPENDENCY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Remove a dependency between tasks
   */
  async removeDependency(taskId: number, dependsOnTaskId: number): Promise<TaskOperationResult<Task>> {
    try {
      const tasksData = await this.storage.getTasks();
      const taskIndex = tasksData.tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        return {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: `Task with ID ${taskId} not found`
          }
        };
      }
      
      const task = tasksData.tasks[taskIndex];
      
      // Check if dependencies array exists
      if (!task.dependencies || !task.dependencies.includes(dependsOnTaskId)) {
        return {
          success: false,
          error: {
            code: 'DEPENDENCY_NOT_FOUND',
            message: `Dependency between task ${taskId} and ${dependsOnTaskId} not found`
          }
        };
      }
      
      // Remove the dependency
      task.dependencies = task.dependencies.filter(depId => depId !== dependsOnTaskId);
      tasksData.lastUpdated = new Date().toISOString();
      
      // Save the updated tasks
      await this.storage.saveTasks(tasksData);
      
      return {
        success: true,
        data: task,
        message: `Dependency removed between task ${taskId} and ${dependsOnTaskId}`
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'REMOVE_DEPENDENCY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Validate task dependencies
   */
  async validateDependencies(): Promise<TaskOperationResult<{ 
    valid: boolean; 
    issues: Array<{ taskId: number; issue: string }> 
  }>> {
    try {
      const tasksData = await this.storage.getTasks();
      const issues: Array<{ taskId: number; issue: string }> = [];
      
      // Check for non-existent dependencies
      tasksData.tasks.forEach(task => {
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach(depId => {
            const dependencyTask = tasksData.tasks.find(t => t.id === depId);
            if (!dependencyTask) {
              issues.push({
                taskId: task.id,
                issue: `Task ${task.id} depends on non-existent task ${depId}`
              });
            }
          });
        }
        
        // Check subtask dependencies
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            if (subtask.dependencies && subtask.dependencies.length > 0) {
              subtask.dependencies.forEach(depId => {
                const dependencySubtask = task.subtasks?.find(st => st.id === depId);
                if (!dependencySubtask) {
                  issues.push({
                    taskId: task.id,
                    issue: `Subtask ${subtask.id} in task ${task.id} depends on non-existent subtask ${depId}`
                  });
                }
              });
            }
          });
        }
      });
      
      return {
        success: true,
        data: {
          valid: issues.length === 0,
          issues
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATE_DEPENDENCIES_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Get the complexity report for tasks
   */
  async getComplexityReport(): Promise<TaskOperationResult<TaskComplexityReport>> {
    try {
      const report = await this.storage.getComplexityReport();
      
      if (!report) {
        return {
          success: false,
          error: {
            code: 'COMPLEXITY_REPORT_NOT_FOUND',
            message: 'No complexity report found'
          }
        };
      }
      
      return {
        success: true,
        data: report
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_COMPLEXITY_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Save a complexity report for tasks
   */
  async saveComplexityReport(report: TaskComplexityReport): Promise<TaskOperationResult<void>> {
    try {
      await this.storage.saveComplexityReport(report);
      
      return {
        success: true,
        message: 'Complexity report saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_COMPLEXITY_REPORT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Associate a task with an agent
   */
  async assignTaskToAgent(taskId: number, agentId: string): Promise<TaskOperationResult<Task>> {
    return this.updateTask(taskId, { agentId });
  }

  /**
   * Associate a task with a checkpoint
   */
  async associateTaskWithCheckpoint(taskId: number, checkpointId: string): Promise<TaskOperationResult<Task>> {
    return this.updateTask(taskId, { checkpointId });
  }
}

