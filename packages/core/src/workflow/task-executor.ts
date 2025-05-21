import { EventEmitter } from "node:events";
import {
  RetryPolicy,
  TaskDefinition,
  TaskExecutionOptions,
  TaskExecutionResult,
  TaskId,
  TaskInstance,
  TaskState,
  WorkflowEventType,
} from "./types";

/**
 * Error thrown when a task execution times out
 */
export class TaskTimeoutError extends Error {
  constructor(public readonly taskId: TaskId, public readonly timeout: number) {
    super(`Task "${taskId}" timed out after ${timeout}ms`);
    this.name = "TaskTimeoutError";
  }
}

/**
 * TaskExecutor is responsible for executing individual tasks,
 * handling retries, timeouts, and isolation.
 */
export class TaskExecutor {
  /**
   * Executes a task
   * @param taskInstance Task instance to execute
   * @param input Input data for the task
   * @param options Execution options
   * @param eventEmitter Event emitter for task events
   * @returns Task execution result
   */
  public async executeTask<TInput = any, TOutput = any>(
    taskInstance: TaskInstance<TInput, TOutput>,
    input: TInput,
    options: TaskExecutionOptions = {},
    eventEmitter?: EventEmitter,
  ): Promise<TaskExecutionResult<TOutput>> {
    const { definition } = taskInstance;
    const startTime = new Date();
    
    // Create abort controller for this execution
    const abortController = new AbortController();
    taskInstance.abortController = abortController;
    
    // Combine signals if both are provided
    const signal = options.signal
      ? this.combineAbortSignals(options.signal, abortController.signal)
      : abortController.signal;
    
    // Update task state
    taskInstance.state = TaskState.RUNNING;
    taskInstance.startTime = startTime;
    
    // Emit task started event
    if (eventEmitter) {
      eventEmitter.emit(WorkflowEventType.TASK_STARTED, {
        type: WorkflowEventType.TASK_STARTED,
        taskId: definition.id,
        taskName: definition.name,
        timestamp: startTime,
        workflowId: options.context?.workflowId,
      });
    }
    
    try {
      // Set up timeout if specified
      const timeout = definition.timeout || options.timeout;
      let timeoutId: NodeJS.Timeout | undefined;
      
      if (timeout) {
        timeoutId = setTimeout(() => {
          abortController.abort(new TaskTimeoutError(definition.id, timeout));
        }, timeout);
      }
      
      // Execute the task with the provided input and signal
      const result = await definition.execute(input, {
        ...options,
        signal,
      });
      
      // Clear timeout if set
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Update task state
      taskInstance.state = TaskState.COMPLETED;
      taskInstance.result = result;
      taskInstance.endTime = new Date();
      
      // Calculate duration
      const duration = taskInstance.endTime.getTime() - startTime.getTime();
      
      // Emit task completed event
      if (eventEmitter) {
        eventEmitter.emit(WorkflowEventType.TASK_COMPLETED, {
          type: WorkflowEventType.TASK_COMPLETED,
          taskId: definition.id,
          taskName: definition.name,
          timestamp: new Date(),
          workflowId: options.context?.workflowId,
          result,
          duration,
        });
      }
      
      // Return successful result
      return {
        taskId: definition.id,
        state: TaskState.COMPLETED,
        result,
        startTime,
        endTime: taskInstance.endTime,
        duration,
        retryCount: taskInstance.retryCount,
      };
    } catch (error) {
      // Get the error object
      const err = error instanceof Error ? error : new Error(String(error));
      
      // Update task state
      taskInstance.state = TaskState.FAILED;
      taskInstance.error = err;
      taskInstance.endTime = new Date();
      
      // Calculate duration
      const duration = taskInstance.endTime.getTime() - startTime.getTime();
      
      // Check if we should retry
      const shouldRetry = this.shouldRetryTask(taskInstance, err);
      
      // Emit task failed event
      if (eventEmitter) {
        eventEmitter.emit(WorkflowEventType.TASK_FAILED, {
          type: WorkflowEventType.TASK_FAILED,
          taskId: definition.id,
          taskName: definition.name,
          timestamp: new Date(),
          workflowId: options.context?.workflowId,
          error: err,
          duration,
          willRetry: shouldRetry,
        });
      }
      
      // If we should retry, schedule the retry
      if (shouldRetry) {
        this.scheduleRetry(taskInstance, eventEmitter, options.context?.workflowId);
      }
      
      // Return failed result
      return {
        taskId: definition.id,
        state: TaskState.FAILED,
        error: err,
        startTime,
        endTime: taskInstance.endTime,
        duration,
        retryCount: taskInstance.retryCount,
      };
    }
  }
  
  /**
   * Combines multiple abort signals into one
   * @param signals Abort signals to combine
   * @returns Combined abort signal
   */
  private combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();
    
    // If any signal aborts, abort the controller
    for (const signal of signals) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        break;
      }
      
      signal.addEventListener("abort", () => {
        controller.abort(signal.reason);
      });
    }
    
    return controller.signal;
  }
  
  /**
   * Determines if a task should be retried based on its retry policy
   * @param taskInstance Task instance
   * @param error Error that occurred
   * @returns True if the task should be retried, false otherwise
   */
  private shouldRetryTask(taskInstance: TaskInstance, error: Error): boolean {
    const { definition, retryCount } = taskInstance;
    const retryPolicy = definition.retryPolicy;
    
    // If no retry policy or max retries reached, don't retry
    if (!retryPolicy || retryCount >= retryPolicy.maxRetries) {
      return false;
    }
    
    // If retryable errors specified, check if error matches
    if (retryPolicy.retryableErrors && retryPolicy.retryableErrors.length > 0) {
      return this.isRetryableError(error, retryPolicy);
    }
    
    // Default to retry for all errors
    return true;
  }
  
  /**
   * Checks if an error is retryable based on the retry policy
   * @param error Error to check
   * @param retryPolicy Retry policy
   * @returns True if the error is retryable, false otherwise
   */
  private isRetryableError(error: Error, retryPolicy: RetryPolicy): boolean {
    if (!retryPolicy.retryableErrors) {
      return true;
    }
    
    return retryPolicy.retryableErrors.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(error.message) || pattern.test(error.name);
      }
      
      return error.message.includes(pattern) || error.name.includes(pattern);
    });
  }
  
  /**
   * Schedules a retry for a failed task
   * @param taskInstance Task instance
   * @param eventEmitter Event emitter for task events
   * @param workflowId Workflow ID
   */
  private scheduleRetry(
    taskInstance: TaskInstance,
    eventEmitter?: EventEmitter,
    workflowId?: string,
  ): void {
    const { definition, retryCount } = taskInstance;
    const retryPolicy = definition.retryPolicy!;
    
    // Increment retry count
    taskInstance.retryCount++;
    
    // Calculate delay with exponential backoff
    const backoffFactor = retryPolicy.backoffFactor || 2;
    const initialDelay = retryPolicy.initialDelay || 1000;
    const maxDelay = retryPolicy.maxDelay || 30000;
    
    const delay = Math.min(initialDelay * Math.pow(backoffFactor, retryCount), maxDelay);
    
    // Set next retry time
    const nextRetryTime = new Date(Date.now() + delay);
    taskInstance.nextRetryTime = nextRetryTime;
    
    // Reset task state to pending for retry
    taskInstance.state = TaskState.PENDING;
    
    // Emit task retrying event
    if (eventEmitter) {
      eventEmitter.emit(WorkflowEventType.TASK_RETRYING, {
        type: WorkflowEventType.TASK_RETRYING,
        taskId: definition.id,
        taskName: definition.name,
        timestamp: new Date(),
        workflowId,
        error: taskInstance.error!,
        retryCount: taskInstance.retryCount,
        nextRetryTime,
      });
    }
  }
  
  /**
   * Cancels a running task
   * @param taskInstance Task instance to cancel
   */
  public cancelTask(taskInstance: TaskInstance): void {
    if (taskInstance.state === TaskState.RUNNING && taskInstance.abortController) {
      taskInstance.abortController.abort(new Error("Task cancelled"));
    }
    
    taskInstance.state = TaskState.CANCELLED;
    taskInstance.endTime = new Date();
  }
}

