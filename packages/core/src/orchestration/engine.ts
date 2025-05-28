import { EventEmitter } from "events";
import type { Agent } from "../agent";
import type { BaseMessage } from "../agent/providers";
import type {
  WorkflowDefinition,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  WorkflowExecutionOptions,
  WorkflowTask,
  TaskExecutionResult,
  WorkflowEvent,
  WorkflowError,
  IWorkflowOrchestrator,
  TaskStatus,
  WorkflowStatus,
  QueuedTask,
} from "./types";
import { TaskScheduler } from "./scheduler";
import { WorkflowStateManager } from "./state-manager";
import { WorkflowValidator } from "./validator";

/**
 * Unified Workflow Orchestration Engine
 * 
 * Consolidates workflow and task management into a single cohesive system
 * that builds upon the existing SubAgentManager while providing advanced
 * orchestration capabilities.
 */
export class WorkflowOrchestrationEngine extends EventEmitter implements IWorkflowOrchestrator {
  private workflows = new Map<string, WorkflowDefinition>();
  private activeExecutions = new Map<string, WorkflowExecutionContext>();
  private agents = new Map<string, Agent<any>>();
  private scheduler: TaskScheduler;
  private stateManager: WorkflowStateManager;
  private validator: WorkflowValidator;
  private isRunning = false;

  constructor(
    agents: Agent<any>[] = [],
    options: {
      maxConcurrentWorkflows?: number;
      maxConcurrentTasks?: number;
      persistenceEnabled?: boolean;
    } = {}
  ) {
    super();
    
    // Register agents
    agents.forEach(agent => this.registerAgent(agent));
    
    // Initialize components
    this.scheduler = new TaskScheduler({
      maxConcurrentWorkflows: options.maxConcurrentWorkflows || 10,
      maxConcurrentTasks: options.maxConcurrentTasks || 50,
      taskQueueSize: 1000,
      heartbeatInterval: 5000,
      cleanupInterval: 60000,
      persistenceEnabled: options.persistenceEnabled || false,
    });
    
    this.stateManager = new WorkflowStateManager(options.persistenceEnabled || false);
    this.validator = new WorkflowValidator();
    
    // Set up event forwarding
    this.scheduler.on("taskCompleted", this.handleTaskCompleted.bind(this));
    this.scheduler.on("taskFailed", this.handleTaskFailed.bind(this));
    this.scheduler.on("workflowCompleted", this.handleWorkflowCompleted.bind(this));
  }

  /**
   * Register an agent for workflow execution
   */
  public registerAgent(agent: Agent<any>): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * Unregister an agent
   */
  public unregisterAgent(agentName: string): void {
    this.agents.delete(agentName);
  }

  /**
   * Start the orchestration engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    
    await this.scheduler.start();
    this.isRunning = true;
    
    // Restore active workflows from persistence
    if (this.stateManager.isPersistenceEnabled()) {
      await this.restoreActiveWorkflows();
    }
    
    this.emit("engineStarted");
  }

  /**
   * Stop the orchestration engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    await this.scheduler.stop();
    this.isRunning = false;
    
    this.emit("engineStopped");
  }

  /**
   * Register a workflow definition
   */
  public async registerWorkflow(definition: WorkflowDefinition): Promise<void> {
    // Validate workflow definition
    const validation = await this.validator.validateWorkflow(definition, this.agents);
    if (!validation.isValid) {
      throw new Error(`Invalid workflow definition: ${validation.errors.join(", ")}`);
    }
    
    this.workflows.set(definition.id, definition);
    this.emit("workflowRegistered", { workflowId: definition.id });
  }

  /**
   * Unregister a workflow definition
   */
  public async unregisterWorkflow(workflowId: string): Promise<void> {
    // Cancel any active executions
    const activeExecutions = Array.from(this.activeExecutions.values())
      .filter(ctx => ctx.workflowId === workflowId);
    
    for (const execution of activeExecutions) {
      await this.cancelWorkflow(execution.executionId);
    }
    
    this.workflows.delete(workflowId);
    this.emit("workflowUnregistered", { workflowId });
  }

  /**
   * Get a workflow definition
   */
  public async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * List all registered workflows
   */
  public async listWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    input: Record<string, unknown> = {},
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create execution context
    const executionId = crypto.randomUUID();
    const context: WorkflowExecutionContext = {
      workflowId,
      executionId,
      status: "pending",
      startTime: new Date(),
      taskResults: new Map(),
      globalContext: new Map(Object.entries(input)),
      userContext: options.userContext,
      conversationId: options.conversationId,
      userId: options.userId,
      parentAgentId: options.parentAgentId,
      parentHistoryEntryId: options.parentHistoryEntryId,
    };

    this.activeExecutions.set(executionId, context);

    try {
      // Dry run validation if requested
      if (options.dryRun) {
        return this.performDryRun(workflow, context);
      }

      // Save initial state
      await this.stateManager.saveWorkflowState(context);

      // Start workflow execution
      context.status = "running";
      this.emitWorkflowEvent("workflow_started", context);

      // Execute based on workflow mode
      const result = await this.executeWorkflowByMode(workflow, context);

      // Clean up
      this.activeExecutions.delete(executionId);
      await this.stateManager.deleteWorkflowState(executionId);

      return result;

    } catch (error) {
      context.status = "failed";
      context.endTime = new Date();
      
      const workflowError: WorkflowError = {
        code: "WORKFLOW_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        originalError: error instanceof Error ? error : undefined,
        timestamp: new Date(),
      };

      this.emitWorkflowEvent("workflow_failed", context, { error: workflowError });

      const result: WorkflowExecutionResult = {
        workflowId,
        executionId,
        status: "failed",
        startTime: context.startTime,
        endTime: context.endTime,
        duration: context.endTime.getTime() - context.startTime.getTime(),
        taskResults: Array.from(context.taskResults.values()),
        error: workflowError,
      };

      this.activeExecutions.delete(executionId);
      return result;
    }
  }

  /**
   * Pause a workflow execution
   */
  public async pauseWorkflow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    context.status = "paused";
    await this.stateManager.saveWorkflowState(context);
    this.emitWorkflowEvent("workflow_paused", context);
  }

  /**
   * Resume a paused workflow execution
   */
  public async resumeWorkflow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (context.status !== "paused") {
      throw new Error(`Workflow is not paused: ${executionId}`);
    }

    context.status = "running";
    await this.stateManager.saveWorkflowState(context);
    this.emitWorkflowEvent("workflow_resumed", context);
  }

  /**
   * Cancel a workflow execution
   */
  public async cancelWorkflow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    context.status = "cancelled";
    context.endTime = new Date();
    
    // Cancel any pending tasks
    await this.scheduler.cancelWorkflowTasks(executionId);
    
    await this.stateManager.deleteWorkflowState(executionId);
    this.activeExecutions.delete(executionId);
    
    this.emitWorkflowEvent("workflow_cancelled", context);
  }

  /**
   * Get execution status
   */
  public async getExecutionStatus(executionId: string): Promise<WorkflowExecutionContext | null> {
    return this.activeExecutions.get(executionId) || 
           await this.stateManager.loadWorkflowState(executionId);
  }

  /**
   * Register workflow event callback
   */
  public onWorkflowEvent(callback: (event: WorkflowEvent) => void): void {
    this.on("workflowEvent", callback);
  }

  /**
   * Get execution history
   */
  public async getExecutionHistory(workflowId?: string, limit = 100): Promise<WorkflowExecutionResult[]> {
    // This would typically query a persistent store
    // For now, return empty array as this is a basic implementation
    return [];
  }

  /**
   * Execute workflow based on its execution mode
   */
  private async executeWorkflowByMode(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    switch (workflow.mode) {
      case "sequential":
        return this.executeSequential(workflow, context);
      case "parallel":
        return this.executeParallel(workflow, context);
      case "conditional":
        return this.executeConditional(workflow, context);
      case "pipeline":
        return this.executePipeline(workflow, context);
      case "graph":
        return this.executeGraph(workflow, context);
      default:
        throw new Error(`Unsupported execution mode: ${workflow.mode}`);
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    for (const task of workflow.tasks) {
      const result = await this.executeTask(task, context);
      
      if (result.status === "failed" && workflow.errorHandling?.onTaskFailure === "stop") {
        break;
      }
    }

    return this.createWorkflowResult(workflow, context);
  }

  /**
   * Execute tasks in parallel
   */
  private async executeParallel(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const taskPromises = workflow.tasks.map(task => this.executeTask(task, context));
    await Promise.allSettled(taskPromises);

    return this.createWorkflowResult(workflow, context);
  }

  /**
   * Execute tasks with conditional logic
   */
  private async executeConditional(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    for (const task of workflow.tasks) {
      if (this.shouldExecuteTask(task, context)) {
        await this.executeTask(task, context);
      } else {
        // Mark task as skipped
        const result: TaskExecutionResult = {
          taskId: task.id,
          status: "skipped",
          startTime: new Date(),
          endTime: new Date(),
          retryCount: 0,
        };
        context.taskResults.set(task.id, result);
      }
    }

    return this.createWorkflowResult(workflow, context);
  }

  /**
   * Execute tasks in pipeline mode (data flows between tasks)
   */
  private async executePipeline(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    let pipelineData: unknown = context.globalContext.get("input");

    for (const task of workflow.tasks) {
      // Pass previous task result as input to next task
      const taskInput = typeof task.input === "string" ? task.input : { ...task.input, pipelineData };
      const modifiedTask = { ...task, input: taskInput };
      
      const result = await this.executeTask(modifiedTask, context);
      
      if (result.status === "completed") {
        pipelineData = result.result;
      } else if (workflow.errorHandling?.onTaskFailure === "stop") {
        break;
      }
    }

    return this.createWorkflowResult(workflow, context);
  }

  /**
   * Execute tasks based on dependency graph
   */
  private async executeGraph(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    const taskMap = new Map(workflow.tasks.map(task => [task.id, task]));
    const completed = new Set<string>();
    const running = new Set<string>();

    while (completed.size < workflow.tasks.length) {
      const readyTasks = workflow.tasks.filter(task => 
        !completed.has(task.id) && 
        !running.has(task.id) &&
        this.areDependenciesMet(task, completed)
      );

      if (readyTasks.length === 0) {
        // Check if we're deadlocked
        if (running.size === 0) {
          throw new Error("Workflow deadlock detected - no tasks can proceed");
        }
        // Wait for running tasks to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Execute ready tasks in parallel
      const taskPromises = readyTasks.map(async task => {
        running.add(task.id);
        try {
          await this.executeTask(task, context);
          completed.add(task.id);
        } finally {
          running.delete(task.id);
        }
      });

      await Promise.allSettled(taskPromises);
    }

    return this.createWorkflowResult(workflow, context);
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    task: WorkflowTask,
    context: WorkflowExecutionContext
  ): Promise<TaskExecutionResult> {
    const agent = this.agents.get(task.agentName);
    if (!agent) {
      throw new Error(`Agent not found: ${task.agentName}`);
    }

    const result: TaskExecutionResult = {
      taskId: task.id,
      status: "running",
      startTime: new Date(),
      retryCount: 0,
    };

    context.taskResults.set(task.id, result);
    context.currentTask = task.id;

    this.emitWorkflowEvent("task_started", context, { taskId: task.id });

    try {
      // Prepare task input
      const taskInput = typeof task.input === "string" 
        ? task.input 
        : JSON.stringify(task.input);

      // Execute task using agent
      const response = await agent.generateText(taskInput, {
        conversationId: context.conversationId,
        userId: context.userId,
        parentAgentId: context.parentAgentId,
        parentHistoryEntryId: context.parentHistoryEntryId,
        userContext: context.userContext,
      });

      result.status = "completed";
      result.result = response.text;
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();
      result.agentConversationId = response.conversationId;

      this.emitWorkflowEvent("task_completed", context, { taskId: task.id, result: response.text });

    } catch (error) {
      result.status = "failed";
      result.error = {
        code: "TASK_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
        taskId: task.id,
        originalError: error instanceof Error ? error : undefined,
        timestamp: new Date(),
      };
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - result.startTime.getTime();

      this.emitWorkflowEvent("task_failed", context, { taskId: task.id, error: result.error });
    }

    // Update context
    context.taskResults.set(task.id, result);
    await this.stateManager.saveWorkflowState(context);

    return result;
  }

  /**
   * Check if task conditions are met
   */
  private shouldExecuteTask(task: WorkflowTask, context: WorkflowExecutionContext): boolean {
    if (!task.conditions || task.conditions.length === 0) {
      return true;
    }

    return task.conditions.every(condition => {
      if (condition.type === "custom" && condition.customEvaluator) {
        return condition.customEvaluator(context);
      }

      if (condition.taskId) {
        const taskResult = context.taskResults.get(condition.taskId);
        if (!taskResult) return false;

        if (condition.type === "status") {
          return this.evaluateCondition(taskResult.status, condition.operator, condition.value);
        } else if (condition.type === "result") {
          return this.evaluateCondition(taskResult.result, condition.operator, condition.value);
        }
      }

      return false;
    });
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: WorkflowTask, completed: Set<string>): boolean {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    return task.dependencies.every(depId => completed.has(depId));
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case "equals":
        return actual === expected;
      case "not_equals":
        return actual !== expected;
      case "contains":
        return String(actual).includes(String(expected));
      case "greater_than":
        return Number(actual) > Number(expected);
      case "less_than":
        return Number(actual) < Number(expected);
      case "exists":
        return actual !== undefined && actual !== null;
      default:
        return false;
    }
  }

  /**
   * Create workflow execution result
   */
  private createWorkflowResult(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): WorkflowExecutionResult {
    context.status = "completed";
    context.endTime = new Date();

    const taskResults = Array.from(context.taskResults.values());
    const hasFailedTasks = taskResults.some(result => result.status === "failed");

    if (hasFailedTasks) {
      context.status = "failed";
    }

    this.emitWorkflowEvent("workflow_completed", context);

    return {
      workflowId: workflow.id,
      executionId: context.executionId,
      status: context.status,
      startTime: context.startTime,
      endTime: context.endTime,
      duration: context.endTime!.getTime() - context.startTime.getTime(),
      taskResults,
      finalResult: this.extractFinalResult(taskResults),
    };
  }

  /**
   * Extract final result from task results
   */
  private extractFinalResult(taskResults: TaskExecutionResult[]): unknown {
    const lastCompletedTask = taskResults
      .filter(result => result.status === "completed")
      .sort((a, b) => (b.endTime?.getTime() || 0) - (a.endTime?.getTime() || 0))[0];

    return lastCompletedTask?.result;
  }

  /**
   * Perform dry run validation
   */
  private async performDryRun(
    workflow: WorkflowDefinition,
    context: WorkflowExecutionContext
  ): Promise<WorkflowExecutionResult> {
    // Simulate execution without actually running tasks
    const taskResults: TaskExecutionResult[] = workflow.tasks.map(task => ({
      taskId: task.id,
      status: "completed" as TaskStatus,
      result: `[DRY RUN] Task ${task.name} would execute with agent ${task.agentName}`,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      retryCount: 0,
    }));

    return {
      workflowId: workflow.id,
      executionId: context.executionId,
      status: "completed",
      startTime: context.startTime,
      endTime: new Date(),
      duration: 0,
      taskResults,
      finalResult: "[DRY RUN] Workflow validation successful",
    };
  }

  /**
   * Restore active workflows from persistence
   */
  private async restoreActiveWorkflows(): Promise<void> {
    const activeWorkflowIds = await this.stateManager.listActiveWorkflows();
    
    for (const executionId of activeWorkflowIds) {
      const context = await this.stateManager.loadWorkflowState(executionId);
      if (context && context.status === "running") {
        this.activeExecutions.set(executionId, context);
        // Resume execution logic would go here
      }
    }
  }

  /**
   * Emit workflow event
   */
  private emitWorkflowEvent(
    type: WorkflowEvent["type"],
    context: WorkflowExecutionContext,
    data?: Record<string, unknown>
  ): void {
    const event: WorkflowEvent = {
      type,
      workflowId: context.workflowId,
      executionId: context.executionId,
      taskId: data?.taskId as string,
      timestamp: new Date(),
      data,
    };

    this.emit("workflowEvent", event);
  }

  /**
   * Handle task completion from scheduler
   */
  private handleTaskCompleted(taskId: string, result: unknown): void {
    // Update task result in active executions
    for (const context of this.activeExecutions.values()) {
      const taskResult = context.taskResults.get(taskId);
      if (taskResult) {
        taskResult.status = "completed";
        taskResult.result = result;
        taskResult.endTime = new Date();
        break;
      }
    }
  }

  /**
   * Handle task failure from scheduler
   */
  private handleTaskFailed(taskId: string, error: WorkflowError): void {
    // Update task result in active executions
    for (const context of this.activeExecutions.values()) {
      const taskResult = context.taskResults.get(taskId);
      if (taskResult) {
        taskResult.status = "failed";
        taskResult.error = error;
        taskResult.endTime = new Date();
        break;
      }
    }
  }

  /**
   * Handle workflow completion from scheduler
   */
  private handleWorkflowCompleted(executionId: string): void {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      context.status = "completed";
      context.endTime = new Date();
      this.emitWorkflowEvent("workflow_completed", context);
    }
  }
}

