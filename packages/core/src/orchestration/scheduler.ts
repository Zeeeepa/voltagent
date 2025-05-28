import { EventEmitter } from "events";
import type {
  ITaskScheduler,
  QueuedTask,
  SchedulerConfig,
  WorkflowError,
  TaskStatus,
} from "./types";

/**
 * Task Scheduler for managing task execution queues and concurrency
 */
export class TaskScheduler extends EventEmitter implements ITaskScheduler {
  private config: SchedulerConfig;
  private taskQueue: QueuedTask[] = [];
  private runningTasks = new Map<string, QueuedTask>();
  private completedTasks = new Set<string>();
  private isRunning = false;
  private heartbeatTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: SchedulerConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the task scheduler
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startHeartbeat();
    this.startCleanup();
    this.processQueue();

    this.emit("schedulerStarted");
  }

  /**
   * Stop the task scheduler
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Wait for running tasks to complete or timeout
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.runningTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force cancel remaining tasks
    for (const [taskId] of this.runningTasks) {
      await this.cancelTask(taskId);
    }

    this.emit("schedulerStopped");
  }

  /**
   * Schedule a task for execution
   */
  public async scheduleTask(task: QueuedTask): Promise<void> {
    if (this.taskQueue.length >= this.config.taskQueueSize) {
      throw new Error("Task queue is full");
    }

    // Insert task in priority order
    const insertIndex = this.findInsertionIndex(task);
    this.taskQueue.splice(insertIndex, 0, task);

    this.emit("taskScheduled", task);

    // Try to process immediately if scheduler is running
    if (this.isRunning) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Cancel a scheduled or running task
   */
  public async cancelTask(taskId: string): Promise<void> {
    // Remove from queue if not yet running
    const queueIndex = this.taskQueue.findIndex(task => task.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.emit("taskCancelled", taskId);
      return;
    }

    // Cancel running task
    const runningTask = this.runningTasks.get(taskId);
    if (runningTask) {
      this.runningTasks.delete(taskId);
      this.emit("taskCancelled", taskId);
    }
  }

  /**
   * Cancel all tasks for a specific workflow
   */
  public async cancelWorkflowTasks(executionId: string): Promise<void> {
    // Cancel queued tasks
    this.taskQueue = this.taskQueue.filter(task => {
      if (task.executionId === executionId) {
        this.emit("taskCancelled", task.id);
        return false;
      }
      return true;
    });

    // Cancel running tasks
    const runningTasksToCancel = Array.from(this.runningTasks.values())
      .filter(task => task.executionId === executionId);

    for (const task of runningTasksToCancel) {
      await this.cancelTask(task.id);
    }
  }

  /**
   * Get current queue status
   */
  public async getQueueStatus(): Promise<{ pending: number; running: number; completed: number }> {
    return {
      pending: this.taskQueue.length,
      running: this.runningTasks.size,
      completed: this.completedTasks.size,
    };
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    // Check if we can start more tasks
    const availableSlots = this.config.maxConcurrentTasks - this.runningTasks.size;
    if (availableSlots <= 0) return;

    // Get ready tasks (dependencies met and scheduled time reached)
    const readyTasks = this.getReadyTasks();
    const tasksToStart = readyTasks.slice(0, availableSlots);

    // Start tasks
    for (const task of tasksToStart) {
      await this.startTask(task);
    }

    // Schedule next processing cycle
    if (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Get tasks that are ready to execute
   */
  private getReadyTasks(): QueuedTask[] {
    const now = new Date();
    
    return this.taskQueue.filter(task => {
      // Check if scheduled time has arrived
      if (task.scheduledTime > now) return false;

      // Check if dependencies are met
      return this.areDependenciesMet(task);
    });
  }

  /**
   * Check if task dependencies are satisfied
   */
  private areDependenciesMet(task: QueuedTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    // Check if all dependency tasks are completed
    return task.dependencies.every(depId => this.completedTasks.has(depId));
  }

  /**
   * Start executing a task
   */
  private async startTask(task: QueuedTask): Promise<void> {
    // Remove from queue and add to running tasks
    const queueIndex = this.taskQueue.findIndex(t => t.id === task.id);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.runningTasks.set(task.id, task);
    this.emit("taskStarted", task);

    try {
      // Execute the task (this would integrate with the workflow engine)
      const result = await this.executeTask(task);
      
      // Task completed successfully
      this.runningTasks.delete(task.id);
      this.completedTasks.add(task.id);
      
      this.emit("taskCompleted", task.id, result);

    } catch (error) {
      // Task failed
      this.runningTasks.delete(task.id);
      
      const workflowError: WorkflowError = {
        code: "TASK_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        taskId: task.id,
        originalError: error instanceof Error ? error : undefined,
        timestamp: new Date(),
      };

      this.emit("taskFailed", task.id, workflowError);

      // Handle retry logic
      if (this.shouldRetryTask(task, workflowError)) {
        await this.retryTask(task);
      }
    }
  }

  /**
   * Execute a single task (placeholder - actual execution happens in workflow engine)
   */
  private async executeTask(task: QueuedTask): Promise<unknown> {
    // This is a placeholder - actual task execution is handled by the workflow engine
    // The scheduler just manages the queuing and concurrency
    return new Promise((resolve, reject) => {
      // Simulate task execution
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate for simulation
          resolve(`Task ${task.id} completed successfully`);
        } else {
          reject(new Error(`Task ${task.id} failed`));
        }
      }, Math.random() * 1000); // Random execution time
    });
  }

  /**
   * Determine if a task should be retried
   */
  private shouldRetryTask(task: QueuedTask, error: WorkflowError): boolean {
    const maxRetries = task.task.retries || 0;
    const currentRetries = this.getTaskRetryCount(task.id);
    
    return currentRetries < maxRetries;
  }

  /**
   * Retry a failed task
   */
  private async retryTask(task: QueuedTask): Promise<void> {
    // Create a new task instance for retry
    const retryTask: QueuedTask = {
      ...task,
      id: `${task.id}_retry_${Date.now()}`,
      scheduledTime: this.calculateRetryDelay(task),
    };

    await this.scheduleTask(retryTask);
    this.emit("taskRetried", task.id, retryTask.id);
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(task: QueuedTask): Date {
    const retryCount = this.getTaskRetryCount(task.id);
    const baseDelay = 1000; // 1 second base delay
    
    let delay: number;
    
    // Simple exponential backoff
    delay = baseDelay * Math.pow(2, retryCount);
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000;
    
    return new Date(Date.now() + delay);
  }

  /**
   * Get retry count for a task
   */
  private getTaskRetryCount(taskId: string): number {
    // Extract retry count from task ID if it's a retry
    const retryMatch = taskId.match(/_retry_(\d+)$/);
    return retryMatch ? parseInt(retryMatch[1], 10) : 0;
  }

  /**
   * Find insertion index for task based on priority
   */
  private findInsertionIndex(task: QueuedTask): number {
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (this.taskQueue[i].priority < task.priority) {
        return i;
      }
    }
    return this.taskQueue.length;
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.emit("heartbeat", {
        timestamp: new Date(),
        queueSize: this.taskQueue.length,
        runningTasks: this.runningTasks.size,
        completedTasks: this.completedTasks.size,
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private performCleanup(): void {
    // Clean up old completed task IDs to prevent memory leaks
    const maxCompletedTasks = 10000;
    if (this.completedTasks.size > maxCompletedTasks) {
      const tasksToRemove = this.completedTasks.size - maxCompletedTasks;
      const taskArray = Array.from(this.completedTasks);
      
      for (let i = 0; i < tasksToRemove; i++) {
        this.completedTasks.delete(taskArray[i]);
      }
    }

    // Check for stuck tasks (running too long)
    const maxTaskDuration = 300000; // 5 minutes
    const now = Date.now();
    
    for (const [taskId, task] of this.runningTasks) {
      const taskAge = now - task.scheduledTime.getTime();
      if (taskAge > maxTaskDuration) {
        console.warn(`Task ${taskId} has been running for ${taskAge}ms, considering it stuck`);
        this.cancelTask(taskId);
      }
    }

    this.emit("cleanupCompleted", {
      timestamp: new Date(),
      completedTasksCount: this.completedTasks.size,
      runningTasksCount: this.runningTasks.size,
    });
  }
}

