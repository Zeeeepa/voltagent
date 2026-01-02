import { Task, TaskStatus } from './task-manager';

/**
 * Task performance metrics
 */
export interface TaskMetrics {
  startTime?: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Tracks task status, progress, and performance metrics
 */
export class TaskMonitor {
  private taskMetrics: Map<string, TaskMetrics> = new Map();
  private taskStatuses: Map<string, TaskStatus> = new Map();
  private taskResults: Map<string, any> = new Map();
  private taskErrors: Map<string, Error> = new Map();

  /**
   * Starts tracking a task
   * 
   * @param task The task to track
   */
  trackTask(task: Task): void {
    this.taskStatuses.set(task.id, task.status || TaskStatus.PENDING);
    this.taskMetrics.set(task.id, {});
  }

  /**
   * Updates a task's status
   * 
   * @param taskId The ID of the task
   * @param status The new status
   */
  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.taskStatuses.set(taskId, status);
    
    const metrics = this.taskMetrics.get(taskId) || {};
    
    if (status === TaskStatus.RUNNING && !metrics.startTime) {
      metrics.startTime = Date.now();
    } else if ([TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(status) && metrics.startTime && !metrics.endTime) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;
    }
    
    this.taskMetrics.set(taskId, metrics);
  }

  /**
   * Sets a task's result
   * 
   * @param taskId The ID of the task
   * @param result The task result
   */
  setTaskResult(taskId: string, result: any): void {
    this.taskResults.set(taskId, result);
  }

  /**
   * Sets a task's error
   * 
   * @param taskId The ID of the task
   * @param error The task error
   */
  setTaskError(taskId: string, error: Error): void {
    this.taskErrors.set(taskId, error);
  }

  /**
   * Updates a task's metrics
   * 
   * @param taskId The ID of the task
   * @param metrics The metrics to update
   */
  updateTaskMetrics(taskId: string, metrics: Partial<TaskMetrics>): void {
    const currentMetrics = this.taskMetrics.get(taskId) || {};
    this.taskMetrics.set(taskId, { ...currentMetrics, ...metrics });
  }

  /**
   * Gets a task's status
   * 
   * @param taskId The ID of the task
   * @returns The task status, or undefined if not found
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.taskStatuses.get(taskId);
  }

  /**
   * Gets a task's metrics
   * 
   * @param taskId The ID of the task
   * @returns The task metrics, or undefined if not found
   */
  getTaskMetrics(taskId: string): TaskMetrics | undefined {
    return this.taskMetrics.get(taskId);
  }

  /**
   * Gets a task's result
   * 
   * @param taskId The ID of the task
   * @returns The task result, or undefined if not found
   */
  getTaskResult(taskId: string): any {
    return this.taskResults.get(taskId);
  }

  /**
   * Gets a task's error
   * 
   * @param taskId The ID of the task
   * @returns The task error, or undefined if not found
   */
  getTaskError(taskId: string): Error | undefined {
    return this.taskErrors.get(taskId);
  }

  /**
   * Gets all task IDs being monitored
   * 
   * @returns An array of all task IDs
   */
  getAllTaskIds(): string[] {
    return Array.from(this.taskStatuses.keys());
  }

  /**
   * Generates a performance report for all tasks
   * 
   * @returns A report object with task performance data
   */
  generateReport(): Record<string, any> {
    const report: Record<string, any> = {
      tasks: {},
      summary: {
        total: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        pending: 0,
        running: 0,
        averageDuration: 0
      }
    };

    let totalDuration = 0;
    let tasksWithDuration = 0;

    for (const taskId of this.getAllTaskIds()) {
      const status = this.getTaskStatus(taskId);
      const metrics = this.getTaskMetrics(taskId);
      
      // Add to task-specific report
      report.tasks[taskId] = {
        status,
        metrics,
        hasError: this.taskErrors.has(taskId)
      };

      // Update summary
      report.summary.total++;
      if (status) {
        report.summary[status.toLowerCase()]++;
      }

      if (metrics?.duration) {
        totalDuration += metrics.duration;
        tasksWithDuration++;
      }
    }

    // Calculate average duration
    if (tasksWithDuration > 0) {
      report.summary.averageDuration = totalDuration / tasksWithDuration;
    }

    return report;
  }

  /**
   * Clears all monitoring data
   */
  clear(): void {
    this.taskMetrics.clear();
    this.taskStatuses.clear();
    this.taskResults.clear();
    this.taskErrors.clear();
  }
}

