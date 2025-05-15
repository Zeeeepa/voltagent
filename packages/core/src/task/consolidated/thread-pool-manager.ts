import { TaskPriority } from './task-manager';

/**
 * Options for task submission
 */
interface SubmitOptions {
  priority?: TaskPriority;
  timeout?: number;
}

/**
 * Task wrapper with priority information
 */
interface PrioritizedTask {
  task: () => Promise<any>;
  priority: TaskPriority;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout?: NodeJS.Timeout;
}

/**
 * Manages a pool of worker threads for concurrent task execution
 */
export class ThreadPoolManager {
  private poolSize: number;
  private activeWorkers: number = 0;
  private taskQueue: PrioritizedTask[] = [];
  private isShutdown: boolean = false;

  /**
   * Creates a new ThreadPoolManager
   * 
   * @param initialPoolSize Initial size of the thread pool
   */
  constructor(initialPoolSize: number = 4) {
    this.poolSize = initialPoolSize;
  }

  /**
   * Submits a task for execution
   * 
   * @param task The task function to execute
   * @param options Options for task execution
   * @returns A promise that resolves with the task result
   */
  submit<T>(task: () => Promise<T>, options: SubmitOptions = {}): Promise<T> {
    if (this.isShutdown) {
      return Promise.reject(new Error('Thread pool has been shut down'));
    }

    return new Promise<T>((resolve, reject) => {
      const prioritizedTask: PrioritizedTask = {
        task,
        priority: options.priority || TaskPriority.MEDIUM,
        resolve,
        reject
      };

      // Set up timeout if specified
      if (options.timeout) {
        prioritizedTask.timeout = setTimeout(() => {
          const index = this.taskQueue.indexOf(prioritizedTask);
          if (index !== -1) {
            this.taskQueue.splice(index, 1);
          }
          reject(new Error(`Task timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      // Add task to queue
      this.taskQueue.push(prioritizedTask);
      
      // Sort queue by priority (higher priority first)
      this.taskQueue.sort((a, b) => b.priority - a.priority);
      
      // Try to execute next task
      this.executeNextTask();
    });
  }

  /**
   * Executes the next task in the queue if a worker is available
   */
  private executeNextTask(): void {
    if (this.isShutdown || this.taskQueue.length === 0 || this.activeWorkers >= this.poolSize) {
      return;
    }

    const prioritizedTask = this.taskQueue.shift();
    if (!prioritizedTask) {
      return;
    }

    // Clear timeout if it was set
    if (prioritizedTask.timeout) {
      clearTimeout(prioritizedTask.timeout);
    }

    this.activeWorkers++;

    // Execute the task
    prioritizedTask.task()
      .then(result => {
        prioritizedTask.resolve(result);
      })
      .catch(error => {
        prioritizedTask.reject(error);
      })
      .finally(() => {
        this.activeWorkers--;
        // Try to execute next task
        this.executeNextTask();
      });
  }

  /**
   * Increases the thread pool size
   * 
   * @param amount Amount to increase by (default: 1)
   */
  increasePoolSize(amount: number = 1): void {
    this.poolSize += amount;
    
    // Try to execute tasks with the new capacity
    for (let i = 0; i < amount; i++) {
      this.executeNextTask();
    }
  }

  /**
   * Reduces the thread pool size
   * 
   * @param amount Amount to reduce by (default: 1)
   */
  reducePoolSize(amount: number = 1): void {
    this.poolSize = Math.max(1, this.poolSize - amount);
  }

  /**
   * Gets the current pool size
   * 
   * @returns The current pool size
   */
  getPoolSize(): number {
    return this.poolSize;
  }

  /**
   * Gets the number of active workers
   * 
   * @returns The number of active workers
   */
  getActiveWorkers(): number {
    return this.activeWorkers;
  }

  /**
   * Gets the number of queued tasks
   * 
   * @returns The number of queued tasks
   */
  getQueuedTaskCount(): number {
    return this.taskQueue.length;
  }

  /**
   * Shuts down the thread pool
   * 
   * @param waitForTasks Whether to wait for queued tasks to complete
   */
  shutdown(waitForTasks: boolean = true): void {
    this.isShutdown = true;

    if (!waitForTasks) {
      // Reject all queued tasks
      for (const task of this.taskQueue) {
        if (task.timeout) {
          clearTimeout(task.timeout);
        }
        task.reject(new Error('Thread pool was shut down'));
      }
      this.taskQueue = [];
    }
  }
}

