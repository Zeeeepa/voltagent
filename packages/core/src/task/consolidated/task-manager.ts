import { ThreadPoolManager } from './thread-pool-manager';
import { ResourceMonitor } from './resource-monitor';
import { PluginManager } from './plugin-manager';
import { TaskMonitor } from './task-monitor';

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Task status values
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Task configuration options
 */
export interface TaskConfig {
  priority?: TaskPriority;
  dependencies?: string[];
  retries?: number;
  timeout?: number;
  autoShutdown?: boolean;
  resourceLimits?: {
    maxMemory?: number;
    maxCpu?: number;
  };
}

/**
 * Task definition interface
 */
export interface Task {
  id: string;
  name: string;
  execute: (...args: any[]) => Promise<any>;
  config?: TaskConfig;
  status?: TaskStatus;
  result?: any;
  error?: Error;
}

/**
 * Central component for task registration, scheduling, and execution
 */
export class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private threadPoolManager: ThreadPoolManager;
  private resourceMonitor: ResourceMonitor;
  private pluginManager: PluginManager;
  private taskMonitor: TaskMonitor;

  /**
   * Creates a new TaskManager instance
   */
  constructor() {
    this.threadPoolManager = new ThreadPoolManager();
    this.resourceMonitor = new ResourceMonitor();
    this.pluginManager = new PluginManager();
    this.taskMonitor = new TaskMonitor();

    // Set up resource monitoring
    this.resourceMonitor.onCriticalResource((resource, value) => {
      console.warn(`Critical resource usage: ${resource} at ${value}`);
      if (resource === 'memory' && value > 90) {
        this.threadPoolManager.reducePoolSize();
      }
    });
  }

  /**
   * Registers a new task
   * 
   * @param task The task to register
   * @returns The registered task
   */
  registerTask(task: Task): Task {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task with ID ${task.id} already exists`);
    }
    
    task.status = TaskStatus.PENDING;
    this.tasks.set(task.id, task);
    this.taskMonitor.trackTask(task);
    
    return task;
  }

  /**
   * Executes a task by its ID
   * 
   * @param taskId The ID of the task to execute
   * @param args Arguments to pass to the task execution function
   * @returns The result of the task execution
   */
  async executeTask(taskId: string, ...args: any[]): Promise<any> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    // Check dependencies
    if (task.config?.dependencies?.length) {
      await this.executeDependencies(task);
    }

    // Update task status
    task.status = TaskStatus.RUNNING;
    this.taskMonitor.updateTaskStatus(task.id, TaskStatus.RUNNING);

    try {
      // Submit task to thread pool
      const result = await this.threadPoolManager.submit(() => task.execute(...args), {
        priority: task.config?.priority || TaskPriority.MEDIUM,
        timeout: task.config?.timeout
      });

      // Update task status and result
      task.status = TaskStatus.COMPLETED;
      task.result = result;
      this.taskMonitor.updateTaskStatus(task.id, TaskStatus.COMPLETED);
      this.taskMonitor.setTaskResult(task.id, result);

      // Auto-shutdown if configured
      if (task.config?.autoShutdown) {
        this.shutdown();
      }

      return result;
    } catch (error) {
      // Handle task failure
      task.status = TaskStatus.FAILED;
      task.error = error as Error;
      this.taskMonitor.updateTaskStatus(task.id, TaskStatus.FAILED);
      this.taskMonitor.setTaskError(task.id, error as Error);

      // Retry if configured
      if (task.config?.retries && task.config.retries > 0) {
        task.config.retries--;
        return this.executeTask(taskId, ...args);
      }

      throw error;
    }
  }

  /**
   * Executes all dependencies for a task
   * 
   * @param task The task whose dependencies should be executed
   */
  private async executeDependencies(task: Task): Promise<void> {
    if (!task.config?.dependencies?.length) {
      return;
    }

    const dependencyPromises = task.config.dependencies.map(depId => {
      const depTask = this.tasks.get(depId);
      if (!depTask) {
        throw new Error(`Dependency task with ID ${depId} not found`);
      }

      if (depTask.status === TaskStatus.COMPLETED) {
        return Promise.resolve(depTask.result);
      }

      return this.executeTask(depId);
    });

    await Promise.all(dependencyPromises);
  }

  /**
   * Cancels a task by its ID
   * 
   * @param taskId The ID of the task to cancel
   * @returns True if the task was cancelled, false otherwise
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== TaskStatus.PENDING) {
      return false;
    }

    task.status = TaskStatus.CANCELLED;
    this.taskMonitor.updateTaskStatus(task.id, TaskStatus.CANCELLED);
    return true;
  }

  /**
   * Gets a task by its ID
   * 
   * @param taskId The ID of the task to get
   * @returns The task, or undefined if not found
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Gets all registered tasks
   * 
   * @returns An array of all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Shuts down the task manager and all its components
   */
  shutdown(): void {
    this.threadPoolManager.shutdown();
    this.resourceMonitor.stop();
    this.pluginManager.unloadAll();
    this.taskMonitor.generateReport();
  }
}

