import { EventEmitter } from "node:events";
import { DependencyResolver } from "./dependency-resolver";
import { ResourceManager } from "./resource-manager";
import { TaskExecutor } from "./task-executor";
import { TaskScheduler } from "./task-scheduler";
import {
  TaskDefinition,
  TaskExecutionOptions,
  TaskExecutionResult,
  TaskId,
  TaskInstance,
  TaskState,
  WorkflowDefinition,
  WorkflowEventType,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  WorkflowInstance,
  WorkflowState,
} from "./types";

/**
 * WorkflowEngine is the main class responsible for executing workflows
 * with parallel task execution while respecting dependencies.
 */
export class WorkflowEngine {
  private dependencyResolver: DependencyResolver;
  private resourceManager: ResourceManager;
  private taskScheduler: TaskScheduler;
  private taskExecutor: TaskExecutor;
  
  // Active workflow instances
  private activeWorkflows: Map<string, WorkflowInstance>;
  
  /**
   * Creates a new WorkflowEngine
   */
  constructor() {
    this.dependencyResolver = new DependencyResolver();
    this.resourceManager = new ResourceManager();
    this.taskScheduler = new TaskScheduler(this.dependencyResolver, this.resourceManager);
    this.taskExecutor = new TaskExecutor();
    this.activeWorkflows = new Map();
  }
  
  /**
   * Executes a workflow
   * @param workflow Workflow definition
   * @param options Execution options
   * @returns Workflow execution result
   */
  public async executeWorkflow(
    workflow: WorkflowDefinition,
    options: WorkflowExecutionOptions = {},
  ): Promise<WorkflowExecutionResult> {
    // Validate workflow dependencies
    this.dependencyResolver.validateDependencies(workflow);
    
    // Create workflow instance
    const instance = this.createWorkflowInstance(workflow, options);
    
    // Store in active workflows
    this.activeWorkflows.set(workflow.id, instance);
    
    try {
      // Execute workflow
      return await this.runWorkflow(instance, options);
    } finally {
      // Remove from active workflows
      this.activeWorkflows.delete(workflow.id);
    }
  }
  
  /**
   * Creates a workflow instance from a definition
   * @param workflow Workflow definition
   * @param options Execution options
   * @returns Workflow instance
   */
  private createWorkflowInstance(
    workflow: WorkflowDefinition,
    options: WorkflowExecutionOptions,
  ): WorkflowInstance {
    // Create abort controller
    const abortController = new AbortController();
    
    // Combine signals if provided
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        abortController.abort(options.signal!.reason);
      });
    }
    
    // Create event emitter
    const eventEmitter = new EventEmitter();
    
    // Create task instances
    const tasks = new Map<TaskId, TaskInstance>();
    
    for (const taskDef of workflow.tasks) {
      tasks.set(taskDef.id, {
        definition: taskDef,
        state: TaskState.PENDING,
        retryCount: 0,
      });
    }
    
    // Create workflow instance
    const instance: WorkflowInstance = {
      definition: workflow,
      tasks,
      state: WorkflowState.PENDING,
      results: options.initialResults || {},
      abortController,
      eventEmitter,
    };
    
    return instance;
  }
  
  /**
   * Runs a workflow instance
   * @param workflow Workflow instance
   * @param options Execution options
   * @returns Workflow execution result
   */
  private async runWorkflow(
    workflow: WorkflowInstance,
    options: WorkflowExecutionOptions,
  ): Promise<WorkflowExecutionResult> {
    const { definition, abortController, eventEmitter } = workflow;
    const startTime = new Date();
    workflow.startTime = startTime;
    workflow.state = WorkflowState.RUNNING;
    
    // Emit workflow started event
    eventEmitter.emit(WorkflowEventType.WORKFLOW_STARTED, {
      type: WorkflowEventType.WORKFLOW_STARTED,
      workflowId: definition.id,
      workflowName: definition.name,
      timestamp: startTime,
    });
    
    try {
      // Execute workflow until all tasks are completed or workflow fails
      while (workflow.state === WorkflowState.RUNNING) {
        // Check if workflow should be cancelled
        if (abortController.signal.aborted) {
          this.cancelWorkflow(workflow, abortController.signal.reason?.message);
          break;
        }
        
        // Schedule tasks for execution
        const concurrencyLimit = definition.concurrencyLimit || Infinity;
        const scheduledTasks = this.taskScheduler.scheduleTasks(workflow, concurrencyLimit);
        
        if (scheduledTasks.length === 0) {
          // Check if all tasks are completed
          if (this.areAllTasksCompleted(workflow)) {
            workflow.state = WorkflowState.COMPLETED;
            break;
          }
          
          // Check if workflow has failed
          if (this.hasWorkflowFailed(workflow)) {
            workflow.state = WorkflowState.FAILED;
            break;
          }
          
          // No tasks to execute, wait for running tasks to complete
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Execute scheduled tasks in parallel
        const executionPromises = scheduledTasks.map(taskId => this.executeTaskById(workflow, taskId, options));
        
        // Wait for all tasks to complete
        await Promise.all(executionPromises);
      }
      
      // Set end time
      workflow.endTime = new Date();
      
      // Calculate duration
      const duration = workflow.endTime.getTime() - startTime.getTime();
      
      // Collect errors from failed tasks
      const errors: Record<TaskId, Error> = {};
      for (const [taskId, task] of workflow.tasks.entries()) {
        if (task.state === TaskState.FAILED && task.error) {
          errors[taskId] = task.error;
        }
      }
      
      // Emit workflow completed or failed event
      if (workflow.state === WorkflowState.COMPLETED) {
        eventEmitter.emit(WorkflowEventType.WORKFLOW_COMPLETED, {
          type: WorkflowEventType.WORKFLOW_COMPLETED,
          workflowId: definition.id,
          timestamp: workflow.endTime,
          results: workflow.results,
          duration,
        });
      } else if (workflow.state === WorkflowState.FAILED) {
        eventEmitter.emit(WorkflowEventType.WORKFLOW_FAILED, {
          type: WorkflowEventType.WORKFLOW_FAILED,
          workflowId: definition.id,
          timestamp: workflow.endTime,
          errors,
          duration,
        });
      } else if (workflow.state === WorkflowState.CANCELLED) {
        eventEmitter.emit(WorkflowEventType.WORKFLOW_CANCELLED, {
          type: WorkflowEventType.WORKFLOW_CANCELLED,
          workflowId: definition.id,
          timestamp: workflow.endTime,
          reason: abortController.signal.reason?.message,
          duration,
        });
      }
      
      // Return workflow execution result
      return {
        workflowId: definition.id,
        state: workflow.state,
        results: workflow.results,
        errors,
        startTime,
        endTime: workflow.endTime,
        duration,
      };
    } catch (error) {
      // Set workflow state to failed
      workflow.state = WorkflowState.FAILED;
      workflow.endTime = new Date();
      
      // Calculate duration
      const duration = workflow.endTime.getTime() - startTime.getTime();
      
      // Collect errors
      const errors: Record<TaskId, Error> = {
        workflow: error instanceof Error ? error : new Error(String(error)),
      };
      
      // Emit workflow failed event
      eventEmitter.emit(WorkflowEventType.WORKFLOW_FAILED, {
        type: WorkflowEventType.WORKFLOW_FAILED,
        workflowId: definition.id,
        timestamp: workflow.endTime,
        errors,
        duration,
      });
      
      // Return workflow execution result
      return {
        workflowId: definition.id,
        state: WorkflowState.FAILED,
        results: workflow.results,
        errors,
        startTime,
        endTime: workflow.endTime,
        duration,
      };
    }
  }
  
  /**
   * Executes a task by ID
   * @param workflow Workflow instance
   * @param taskId Task ID
   * @param options Execution options
   * @returns Task execution result
   */
  private async executeTaskById(
    workflow: WorkflowInstance,
    taskId: TaskId,
    options: WorkflowExecutionOptions,
  ): Promise<TaskExecutionResult> {
    const taskInstance = workflow.tasks.get(taskId)!;
    const { definition } = taskInstance;
    
    try {
      // Prepare input for the task
      const input = this.prepareTaskInput(workflow, definition);
      
      // Prepare execution options
      const taskOptions: TaskExecutionOptions = {
        ...options,
        context: {
          ...options.context,
          workflowId: workflow.definition.id,
        },
      };
      
      // Execute the task
      const result = await this.taskExecutor.executeTask(
        taskInstance,
        input,
        taskOptions,
        workflow.eventEmitter,
      );
      
      // Store result
      if (result.state === TaskState.COMPLETED && result.result !== undefined) {
        workflow.results[taskId] = result.result;
      }
      
      // Release resources
      this.taskScheduler.releaseTaskResources(workflow, taskId);
      
      // Check if workflow should fail fast
      if (result.state === TaskState.FAILED && workflow.definition.failFast) {
        workflow.state = WorkflowState.FAILED;
      }
      
      return result;
    } catch (error) {
      // Update task state
      taskInstance.state = TaskState.FAILED;
      taskInstance.error = error instanceof Error ? error : new Error(String(error));
      taskInstance.endTime = new Date();
      
      // Release resources
      this.taskScheduler.releaseTaskResources(workflow, taskId);
      
      // Check if workflow should fail fast
      if (workflow.definition.failFast) {
        workflow.state = WorkflowState.FAILED;
      }
      
      // Return failed result
      return {
        taskId,
        state: TaskState.FAILED,
        error: taskInstance.error,
        startTime: taskInstance.startTime || new Date(),
        endTime: taskInstance.endTime,
        duration: taskInstance.endTime.getTime() - (taskInstance.startTime?.getTime() || Date.now()),
        retryCount: taskInstance.retryCount,
      };
    }
  }
  
  /**
   * Prepares input for a task
   * @param workflow Workflow instance
   * @param task Task definition
   * @returns Task input
   */
  private prepareTaskInput<TInput>(workflow: WorkflowInstance, task: TaskDefinition<TInput>): TInput {
    // If input is a function, call it with the results
    if (typeof task.input === "function") {
      return task.input(workflow.results);
    }
    
    // Otherwise, return the static input or undefined
    return task.input as TInput;
  }
  
  /**
   * Checks if all tasks in a workflow are completed
   * @param workflow Workflow instance
   * @returns True if all tasks are completed, false otherwise
   */
  private areAllTasksCompleted(workflow: WorkflowInstance): boolean {
    for (const task of workflow.tasks.values()) {
      if (task.state !== TaskState.COMPLETED && task.state !== TaskState.SKIPPED) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Checks if a workflow has failed
   * @param workflow Workflow instance
   * @returns True if the workflow has failed, false otherwise
   */
  private hasWorkflowFailed(workflow: WorkflowInstance): boolean {
    // If any task has failed and has no more retries, check its failure mode
    for (const task of workflow.tasks.values()) {
      if (task.state === TaskState.FAILED && task.retryCount >= (task.definition.retryPolicy?.maxRetries || 0)) {
        // If the task's failure mode is fail-workflow, the workflow has failed
        if (task.definition.failureMode !== "continue-workflow") {
          return true;
        }
      }
    }
    
    // Check if there are any tasks that can still be executed
    const pendingTasks = Array.from(workflow.tasks.values()).filter(
      task => task.state === TaskState.PENDING,
    );
    
    // If there are no pending tasks but not all tasks are completed,
    // it means some tasks are blocked by failed dependencies
    if (pendingTasks.length === 0 && !this.areAllTasksCompleted(workflow)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Cancels a workflow
   * @param workflow Workflow instance
   * @param reason Cancellation reason
   */
  public cancelWorkflow(workflow: WorkflowInstance, reason?: string): void {
    // Set workflow state to cancelled
    workflow.state = WorkflowState.CANCELLED;
    workflow.endTime = new Date();
    
    // Cancel all running tasks
    for (const task of workflow.tasks.values()) {
      if (task.state === TaskState.RUNNING) {
        this.taskExecutor.cancelTask(task);
      } else if (task.state === TaskState.PENDING) {
        task.state = TaskState.CANCELLED;
      }
    }
    
    // Calculate duration
    const duration = workflow.endTime.getTime() - (workflow.startTime?.getTime() || Date.now());
    
    // Emit workflow cancelled event
    workflow.eventEmitter.emit(WorkflowEventType.WORKFLOW_CANCELLED, {
      type: WorkflowEventType.WORKFLOW_CANCELLED,
      workflowId: workflow.definition.id,
      timestamp: workflow.endTime,
      reason,
      duration,
    });
  }
  
  /**
   * Gets a workflow instance by ID
   * @param workflowId Workflow ID
   * @returns Workflow instance or undefined if not found
   */
  public getWorkflow(workflowId: string): WorkflowInstance | undefined {
    return this.activeWorkflows.get(workflowId);
  }
  
  /**
   * Gets all active workflow instances
   * @returns Map of workflow IDs to workflow instances
   */
  public getActiveWorkflows(): Map<string, WorkflowInstance> {
    return new Map(this.activeWorkflows);
  }
  
  /**
   * Updates the resource manager's total resources
   * @param resources New total resources
   */
  public updateResources(resources: Record<string, number>): void {
    this.resourceManager.updateTotalResources(resources);
  }
  
  /**
   * Gets the current resource utilization
   * @returns Record of resource utilization (0-1)
   */
  public getResourceUtilization(): Record<string, number> {
    return this.resourceManager.getUtilization();
  }
}

