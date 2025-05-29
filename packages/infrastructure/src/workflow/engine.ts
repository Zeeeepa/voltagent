import { DatabaseManager } from "../database/manager";
import { TaskRepository, WorkflowExecutionRepository } from "../database";
import { TaskQueue } from "./task-queue";
import { 
  WorkflowDefinition, 
  WorkflowStep, 
  WorkflowContext, 
  WorkflowStepExecutor,
  WorkflowEventHandler,
  TaskExecutionResult 
} from "./types";
import { Task, WorkflowExecution } from "../types";

export class WorkflowEngine {
  private stepExecutors = new Map<string, WorkflowStepExecutor>();
  private eventHandlers: WorkflowEventHandler[] = [];

  constructor(
    private db: DatabaseManager,
    private taskQueue: TaskQueue,
    private taskRepo: TaskRepository,
    private workflowRepo: WorkflowExecutionRepository
  ) {}

  /**
   * Register a step executor for a specific step type
   */
  registerStepExecutor(stepType: string, executor: WorkflowStepExecutor): void {
    this.stepExecutors.set(stepType, executor);
  }

  /**
   * Register an event handler
   */
  registerEventHandler(handler: WorkflowEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    prId: string,
    projectId: string,
    workflow: WorkflowDefinition,
    variables: Record<string, unknown> = {}
  ): Promise<WorkflowExecution> {
    // Create workflow execution record
    const workflowExecution = await this.workflowRepo.create({
      pr_id: prId,
      workflow_name: workflow.name,
      status: "active",
      metadata: {
        workflow_version: workflow.version,
        variables,
      },
    });

    // Create workflow context
    const context: WorkflowContext = {
      prId,
      projectId,
      workflowExecution,
      variables,
      metadata: {},
    };

    // Notify event handlers
    await this.notifyEventHandlers("onWorkflowStarted", context);

    // Create tasks for all workflow steps
    await this.createWorkflowTasks(workflow, context);

    // Start processing runnable tasks
    await this.processRunnableTasks(context);

    return workflowExecution;
  }

  /**
   * Create tasks for all workflow steps
   */
  private async createWorkflowTasks(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<void> {
    const stepTasks = new Map<string, Task>();

    for (const step of workflow.steps) {
      // Map step dependencies to task IDs
      const dependencies: string[] = [];
      if (step.dependencies) {
        for (const depStepId of step.dependencies) {
          const depTask = stepTasks.get(depStepId);
          if (depTask) {
            dependencies.push(depTask.id);
          }
        }
      }

      // Create task for this step
      const task = await this.taskRepo.create({
        pr_id: context.prId,
        name: step.name,
        description: step.description,
        task_type: step.type,
        dependencies,
        priority: this.getStepPriority(step),
        metadata: {
          workflow_step_id: step.id,
          workflow_execution_id: context.workflowExecution.id,
          step_config: step.config || {},
        },
      });

      stepTasks.set(step.id, task);
    }
  }

  /**
   * Process runnable tasks (tasks with no pending dependencies)
   */
  async processRunnableTasks(context: WorkflowContext): Promise<void> {
    const runnableTasks = await this.taskRepo.getRunnableTasks();
    
    // Filter tasks for this workflow execution
    const workflowTasks = runnableTasks.filter(
      task => task.metadata?.workflow_execution_id === context.workflowExecution.id
    );

    for (const task of workflowTasks) {
      await this.enqueueTask(task, context);
    }
  }

  /**
   * Enqueue a task for execution
   */
  private async enqueueTask(task: Task, context: WorkflowContext): Promise<void> {
    await this.taskQueue.enqueue({
      id: `task_${task.id}`,
      prId: context.prId,
      taskId: task.id,
      priority: this.getPriorityScore(task.priority),
      payload: {
        workflowExecutionId: context.workflowExecution.id,
        stepId: task.metadata?.workflow_step_id,
        taskId: task.id,
      },
    });

    // Update task status
    await this.taskRepo.updateStatus(task.id, "pending", new Date());
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = await this.taskRepo.getById(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Get workflow execution
    const workflowExecution = await this.workflowRepo.getById(
      task.metadata?.workflow_execution_id as string
    );
    if (!workflowExecution) {
      throw new Error(`Workflow execution not found for task ${taskId}`);
    }

    // Create context
    const context: WorkflowContext = {
      prId: task.pr_id,
      projectId: "", // TODO: Get from PR
      workflowExecution,
      variables: workflowExecution.metadata?.variables || {},
      metadata: {},
    };

    // Get workflow step
    const stepId = task.metadata?.workflow_step_id as string;
    const step = await this.getWorkflowStep(stepId, context);
    if (!step) {
      throw new Error(`Workflow step ${stepId} not found`);
    }

    try {
      // Update task status to running
      await this.taskRepo.updateStatus(task.id, "running", new Date());

      // Notify event handlers
      await this.notifyEventHandlers("onStepStarted", step, context);

      // Execute the step
      const executor = this.stepExecutors.get(step.type);
      if (!executor) {
        throw new Error(`No executor registered for step type: ${step.type}`);
      }

      const result = await executor.execute(step, context, task);

      if (result.success) {
        // Mark task as completed
        await this.taskRepo.updateStatus(task.id, "completed", undefined, new Date());

        // Update workflow execution
        await this.workflowRepo.addCompletedStep(
          workflowExecution.id,
          step.id,
          await this.getNextStep(step, context)
        );

        // Notify event handlers
        await this.notifyEventHandlers("onStepCompleted", step, context, result);

        // Process next runnable tasks
        await this.processRunnableTasks(context);

        // Check if workflow is complete
        await this.checkWorkflowCompletion(context);
      } else {
        // Mark task as failed
        await this.taskRepo.updateStatus(task.id, "failed", undefined, new Date());

        // Update workflow execution
        await this.workflowRepo.addFailedStep(workflowExecution.id, step.id);

        // Notify event handlers
        await this.notifyEventHandlers("onStepFailed", step, context, result.error || "Unknown error");
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Mark task as failed
      await this.taskRepo.updateStatus(task.id, "failed", undefined, new Date());

      // Update workflow execution
      await this.workflowRepo.addFailedStep(workflowExecution.id, step.id);

      // Notify event handlers
      await this.notifyEventHandlers("onStepFailed", step, context, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if workflow is complete
   */
  private async checkWorkflowCompletion(context: WorkflowContext): Promise<void> {
    const tasks = await this.taskRepo.getByPR(context.prId);
    const workflowTasks = tasks.filter(
      task => task.metadata?.workflow_execution_id === context.workflowExecution.id
    );

    const allCompleted = workflowTasks.every(task => 
      task.status === "completed" || task.status === "cancelled"
    );

    const anyFailed = workflowTasks.some(task => task.status === "failed");

    if (allCompleted) {
      if (anyFailed) {
        await this.workflowRepo.markAsFailed(context.workflowExecution.id);
        await this.notifyEventHandlers("onWorkflowFailed", context, "Some tasks failed");
      } else {
        await this.workflowRepo.markAsCompleted(context.workflowExecution.id);
        await this.notifyEventHandlers("onWorkflowCompleted", context);
      }
    }
  }

  /**
   * Get workflow step by ID (placeholder - would need workflow definition storage)
   */
  private async getWorkflowStep(stepId: string, context: WorkflowContext): Promise<WorkflowStep | null> {
    // TODO: Implement workflow definition storage and retrieval
    // For now, return a mock step
    return {
      id: stepId,
      name: `Step ${stepId}`,
      description: `Workflow step ${stepId}`,
      type: "analysis",
    };
  }

  /**
   * Get next step in workflow (placeholder)
   */
  private async getNextStep(currentStep: WorkflowStep, context: WorkflowContext): Promise<string | undefined> {
    // TODO: Implement workflow step navigation logic
    return undefined;
  }

  /**
   * Get step priority based on type and config
   */
  private getStepPriority(step: WorkflowStep): Task["priority"] {
    switch (step.type) {
      case "analysis":
        return "high";
      case "codegen":
        return "medium";
      case "validation":
        return "high";
      case "notification":
        return "low";
      default:
        return "medium";
    }
  }

  /**
   * Convert priority to numeric score for queue
   */
  private getPriorityScore(priority: Task["priority"]): number {
    switch (priority) {
      case "critical":
        return 100;
      case "high":
        return 75;
      case "medium":
        return 50;
      case "low":
        return 25;
      default:
        return 50;
    }
  }

  /**
   * Notify all event handlers
   */
  private async notifyEventHandlers(
    event: keyof WorkflowEventHandler,
    ...args: any[]
  ): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        const method = handler[event] as Function;
        if (method) {
          await method.apply(handler, args);
        }
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    }
  }
}

