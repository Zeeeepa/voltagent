/**
 * Task Runner implementation
 *
 * This module provides a runner for executing tasks using agents.
 */

import { Agent } from "@voltagent/core";
import { Task } from "../types/task.js";
import { TaskStatus } from "../types/status.js";
import { TaskManager } from "./TaskManager.js";

/**
 * Options for creating a TaskRunner
 */
export interface TaskRunnerOptions {
  /**
   * TaskManager instance
   */
  taskManager: TaskManager;

  /**
   * Agent to use for executing tasks
   */
  agent: Agent<any>;

  /**
   * Maximum number of concurrent tasks
   */
  maxConcurrentTasks?: number;

  /**
   * Whether to automatically start the runner
   */
  autoStart?: boolean;

  /**
   * Polling interval in milliseconds
   */
  pollingInterval?: number;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  /**
   * Task that was executed
   */
  task: Task;

  /**
   * Whether the execution was successful
   */
  success: boolean;

  /**
   * Result message
   */
  message: string;

  /**
   * Error if execution failed
   */
  error?: Error;
}

/**
 * Task Runner for executing tasks using agents
 */
export class TaskRunner {
  /**
   * TaskManager instance
   */
  private taskManager: TaskManager;

  /**
   * Agent to use for executing tasks
   */
  private agent: Agent<any>;

  /**
   * Maximum number of concurrent tasks
   */
  private maxConcurrentTasks: number;

  /**
   * Currently running tasks
   */
  private runningTasks: Map<string, Promise<TaskExecutionResult>> = new Map();

  /**
   * Whether the runner is currently running
   */
  private isRunning: boolean = false;

  /**
   * Polling interval ID
   */
  private pollingIntervalId?: NodeJS.Timeout;

  /**
   * Polling interval in milliseconds
   */
  private pollingInterval: number;

  /**
   * Create a new TaskRunner
   */
  constructor(options: TaskRunnerOptions) {
    this.taskManager = options.taskManager;
    this.agent = options.agent;
    this.maxConcurrentTasks = options.maxConcurrentTasks || 1;
    this.pollingInterval = options.pollingInterval || 5000;

    if (options.autoStart) {
      this.start();
    }
  }

  /**
   * Start the task runner
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.poll();

    // Set up polling interval
    this.pollingIntervalId = setInterval(() => {
      this.poll();
    }, this.pollingInterval);
  }

  /**
   * Stop the task runner
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear polling interval
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = undefined;
    }
  }

  /**
   * Poll for new tasks to execute
   */
  private poll(): void {
    // If we're already at max capacity, don't poll for new tasks
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }

    // Get the next available task
    const task = this.taskManager.getNextAvailableTask(this.agent.id);
    if (!task) {
      return;
    }

    // Execute the task
    this.executeTask(task);
  }

  /**
   * Execute a task
   *
   * @param task - Task to execute
   * @returns Promise that resolves when the task is complete
   */
  public async executeTask(task: Task): Promise<TaskExecutionResult> {
    // If the task is already running, return the existing promise
    if (this.runningTasks.has(task.id)) {
      return this.runningTasks.get(task.id)!;
    }

    // Create a promise for the task execution
    const executionPromise = this.doExecuteTask(task);

    // Add the promise to the running tasks map
    this.runningTasks.set(task.id, executionPromise);

    // When the task is complete, remove it from the running tasks map
    executionPromise.finally(() => {
      this.runningTasks.delete(task.id);
    });

    return executionPromise;
  }

  /**
   * Execute a task (internal implementation)
   *
   * @param task - Task to execute
   * @returns Promise that resolves when the task is complete
   */
  private async doExecuteTask(task: Task): Promise<TaskExecutionResult> {
    try {
      // Assign the task to the agent if not already assigned
      if (!task.assignedTo) {
        await this.taskManager.assignTask(task.id, this.agent.id);
      }

      // Transition the task to IN_PROGRESS if it's not already
      if (task.status !== TaskStatus.IN_PROGRESS) {
        await this.taskManager.transitionTaskStatus(task.id, TaskStatus.IN_PROGRESS);
      }

      // Execute the task using the agent
      const result = await this.agent.generateText(
        `Execute the following task: ${task.title}\n\nDescription: ${task.description}`,
        {
          userContext: new Map([["task", task]]),
        },
      );

      // Transition the task to REVIEW
      await this.taskManager.transitionTaskStatus(task.id, TaskStatus.REVIEW);

      return {
        task,
        success: true,
        message: result.text,
      };
    } catch (error) {
      // Transition the task to BLOCKED
      await this.taskManager.transitionTaskStatus(task.id, TaskStatus.BLOCKED);

      return {
        task,
        success: false,
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Get the currently running tasks
   *
   * @returns Map of task IDs to execution promises
   */
  public getRunningTasks(): Map<string, Promise<TaskExecutionResult>> {
    return new Map(this.runningTasks);
  }

  /**
   * Check if the runner is currently running
   *
   * @returns Whether the runner is running
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get the number of currently running tasks
   *
   * @returns Number of running tasks
   */
  public getRunningTaskCount(): number {
    return this.runningTasks.size;
  }

  /**
   * Get the maximum number of concurrent tasks
   *
   * @returns Maximum number of concurrent tasks
   */
  public getMaxConcurrentTasks(): number {
    return this.maxConcurrentTasks;
  }

  /**
   * Set the maximum number of concurrent tasks
   *
   * @param max - Maximum number of concurrent tasks
   */
  public setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = max;
  }

  /**
   * Get the polling interval
   *
   * @returns Polling interval in milliseconds
   */
  public getPollingInterval(): number {
    return this.pollingInterval;
  }

  /**
   * Set the polling interval
   *
   * @param interval - Polling interval in milliseconds
   */
  public setPollingInterval(interval: number): void {
    this.pollingInterval = interval;

    // Reset the polling interval if the runner is running
    if (this.isRunning && this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = setInterval(() => {
        this.poll();
      }, this.pollingInterval);
    }
  }
}
