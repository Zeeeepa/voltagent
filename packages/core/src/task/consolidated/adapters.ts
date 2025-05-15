import { TaskManager, Task, TaskConfig, TaskPriority, TaskStatus } from './task-manager';

/**
 * Interface for the original task runner
 */
interface OriginalTaskRunner {
  runTask: (taskName: string, params: any) => Promise<any>;
  registerTask: (taskName: string, taskFn: (params: any) => Promise<any>) => void;
}

/**
 * Interface for the new task runner
 */
interface NewTaskRunner {
  executeTask: (taskId: string, config: any) => Promise<any>;
  addTask: (taskId: string, taskFn: (config: any) => Promise<any>, options: any) => void;
}

/**
 * Adapter for the original task runner
 */
export class OriginalTaskRunnerAdapter implements OriginalTaskRunner {
  private taskManager: TaskManager;

  /**
   * Creates a new adapter for the original task runner
   * 
   * @param taskManager The consolidated task manager
   */
  constructor(taskManager: TaskManager) {
    this.taskManager = taskManager;
  }

  /**
   * Registers a task using the original API
   * 
   * @param taskName The name of the task
   * @param taskFn The task function
   */
  registerTask(taskName: string, taskFn: (params: any) => Promise<any>): void {
    const task: Task = {
      id: `original-${taskName}`,
      name: taskName,
      execute: taskFn,
      config: {
        priority: TaskPriority.MEDIUM,
        retries: 0
      }
    };

    this.taskManager.registerTask(task);
  }

  /**
   * Runs a task using the original API
   * 
   * @param taskName The name of the task
   * @param params The task parameters
   * @returns The task result
   */
  async runTask(taskName: string, params: any): Promise<any> {
    const taskId = `original-${taskName}`;
    return this.taskManager.executeTask(taskId, params);
  }
}

/**
 * Adapter for the new task runner
 */
export class NewTaskRunnerAdapter implements NewTaskRunner {
  private taskManager: TaskManager;

  /**
   * Creates a new adapter for the new task runner
   * 
   * @param taskManager The consolidated task manager
   */
  constructor(taskManager: TaskManager) {
    this.taskManager = taskManager;
  }

  /**
   * Adds a task using the new API
   * 
   * @param taskId The ID of the task
   * @param taskFn The task function
   * @param options The task options
   */
  addTask(taskId: string, taskFn: (config: any) => Promise<any>, options: any): void {
    const config: TaskConfig = {
      priority: this.mapPriority(options.priority),
      retries: options.retries || 0,
      timeout: options.timeout,
      dependencies: options.dependencies,
      autoShutdown: options.autoShutdown
    };

    const task: Task = {
      id: `new-${taskId}`,
      name: taskId,
      execute: taskFn,
      config
    };

    this.taskManager.registerTask(task);
  }

  /**
   * Executes a task using the new API
   * 
   * @param taskId The ID of the task
   * @param config The task configuration
   * @returns The task result
   */
  async executeTask(taskId: string, config: any): Promise<any> {
    const fullTaskId = `new-${taskId}`;
    return this.taskManager.executeTask(fullTaskId, config);
  }

  /**
   * Maps priority values from the new API to the consolidated API
   * 
   * @param priority The priority value from the new API
   * @returns The corresponding TaskPriority value
   */
  private mapPriority(priority: string | number | undefined): TaskPriority {
    if (priority === undefined) {
      return TaskPriority.MEDIUM;
    }

    if (typeof priority === 'number') {
      if (priority <= 0) return TaskPriority.LOW;
      if (priority === 1) return TaskPriority.MEDIUM;
      if (priority === 2) return TaskPriority.HIGH;
      return TaskPriority.CRITICAL;
    }

    switch (priority.toLowerCase()) {
      case 'low': return TaskPriority.LOW;
      case 'medium': return TaskPriority.MEDIUM;
      case 'high': return TaskPriority.HIGH;
      case 'critical': return TaskPriority.CRITICAL;
      default: return TaskPriority.MEDIUM;
    }
  }
}

