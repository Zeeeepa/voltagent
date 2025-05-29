import { EventEmitter } from "events";
import type {
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowContext,
  WorkflowStatus,
  WorkflowError,
  WorkflowTemplate,
  WorkflowParameter,
  RetryPolicy,
  OrchestratorEvent,
} from "./types";

/**
 * Workflow execution engine
 */
export interface WorkflowExecutionEngine {
  executeStep(step: WorkflowStep, context: WorkflowContext): Promise<unknown>;
  evaluateCondition(condition: string, context: WorkflowContext): Promise<boolean>;
  handleStepError(step: WorkflowStep, error: Error, context: WorkflowContext): Promise<void>;
}

/**
 * Step execution result
 */
export interface StepExecutionResult {
  stepId: string;
  status: "success" | "failure" | "skipped" | "timeout";
  result?: unknown;
  error?: Error;
  startTime: Date;
  endTime: Date;
  executionTime: number;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Workflow execution statistics
 */
export interface WorkflowExecutionStats {
  totalWorkflows: number;
  activeWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  successRate: number;
  mostUsedTemplates: string[];
}

/**
 * Workflow Manager - Manage complete development pipeline workflows
 */
export class WorkflowManager implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "WorkflowManager";
  private _status: ComponentStatus = "idle";
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private workflowContexts: Map<string, WorkflowContext> = new Map();
  private workflowTemplates: Map<string, WorkflowTemplate> = new Map();
  private executionEngine?: WorkflowExecutionEngine;
  private eventEmitter: EventEmitter = new EventEmitter();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private executionTimer?: NodeJS.Timeout;
  private readonly maxConcurrentWorkflows: number;
  private readonly executionCheckInterval: number;
  private readonly defaultTimeout: number;
  private executionStats: WorkflowExecutionStats;

  constructor(options: {
    id?: string;
    maxConcurrentWorkflows?: number;
    executionCheckInterval?: number;
    defaultTimeout?: number;
    executionEngine?: WorkflowExecutionEngine;
  } = {}) {
    this.id = options.id || `workflow-manager-${Date.now()}`;
    this.maxConcurrentWorkflows = options.maxConcurrentWorkflows || 5;
    this.executionCheckInterval = options.executionCheckInterval || 5000; // 5 seconds
    this.defaultTimeout = options.defaultTimeout || 1800000; // 30 minutes
    this.executionEngine = options.executionEngine;
    
    this.executionStats = {
      totalWorkflows: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageExecutionTime: 0,
      successRate: 0,
      mostUsedTemplates: [],
    };
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the workflow manager
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";

    try {
      // Initialize default workflow templates
      this.initializeDefaultTemplates();

      // Start execution monitoring
      this.executionTimer = setInterval(
        () => this.monitorWorkflowExecution(),
        this.executionCheckInterval
      );

      this._status = "running";
      this.startTime = new Date();

      this.emitWorkflowEvent("workflow.manager.started", {
        managerId: this.id,
        maxConcurrentWorkflows: this.maxConcurrentWorkflows,
        templateCount: this.workflowTemplates.size,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the workflow manager
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";

    try {
      // Stop execution monitoring
      if (this.executionTimer) {
        clearInterval(this.executionTimer);
        this.executionTimer = undefined;
      }

      // Cancel active workflows
      for (const context of this.workflowContexts.values()) {
        if (context.status === "running") {
          context.status = "cancelled";
          context.endTime = new Date();
        }
      }

      this._status = "stopped";

      this.emitWorkflowEvent("workflow.manager.stopped", {
        managerId: this.id,
        uptime: Date.now() - this.startTime.getTime(),
        totalWorkflows: this.executionStats.totalWorkflows,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the workflow manager
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get component health information
   */
  public getHealth(): ComponentHealth {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      lastHeartbeat: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        activeWorkflows: this.executionStats.activeWorkflows,
        totalWorkflows: this.executionStats.totalWorkflows,
        templateCount: this.workflowTemplates.size,
        successRate: this.executionStats.successRate,
        averageExecutionTime: this.executionStats.averageExecutionTime,
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    return {
      ...this.executionStats,
      templateCount: this.workflowTemplates.size,
      uptime: Date.now() - this.startTime.getTime(),
      errorRate: this.errorCount / Math.max(this.executionStats.totalWorkflows, 1),
    };
  }

  /**
   * Set workflow execution engine
   */
  public setExecutionEngine(engine: WorkflowExecutionEngine): void {
    this.executionEngine = engine;
  }

  /**
   * Register workflow template
   */
  public registerTemplate(template: WorkflowTemplate): void {
    this.workflowTemplates.set(template.id, template);

    this.emitWorkflowEvent("workflow.template.registered", {
      templateId: template.id,
      templateName: template.name,
      category: template.category,
      version: template.version,
    });
  }

  /**
   * Unregister workflow template
   */
  public unregisterTemplate(templateId: string): void {
    const template = this.workflowTemplates.get(templateId);
    if (template) {
      this.workflowTemplates.delete(templateId);
      
      this.emitWorkflowEvent("workflow.template.unregistered", {
        templateId,
        templateName: template.name,
      });
    }
  }

  /**
   * Get workflow template
   */
  public getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.workflowTemplates.get(templateId);
  }

  /**
   * Get all workflow templates
   */
  public getTemplates(category?: string): WorkflowTemplate[] {
    const templates = Array.from(this.workflowTemplates.values());
    if (category) {
      return templates.filter(t => t.category === category);
    }
    return templates;
  }

  /**
   * Create workflow from template
   */
  public createWorkflowFromTemplate(
    templateId: string,
    parameters: Record<string, unknown>,
    workflowId?: string
  ): WorkflowDefinition {
    const template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Workflow template ${templateId} not found`);
    }

    // Validate parameters
    this.validateTemplateParameters(template, parameters);

    // Create workflow definition
    const workflow: WorkflowDefinition = {
      id: workflowId || `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      description: template.description,
      version: template.version,
      steps: this.processTemplateSteps(template.definition.steps, parameters),
      dependencies: template.definition.dependencies,
      timeout: template.definition.timeout,
      retryPolicy: template.definition.retryPolicy,
      metadata: {
        templateId,
        templateVersion: template.version,
        parameters,
        createdAt: new Date(),
      },
    };

    this.workflows.set(workflow.id, workflow);

    this.emitWorkflowEvent("workflow.created", {
      workflowId: workflow.id,
      templateId,
      workflowName: workflow.name,
    });

    return workflow;
  }

  /**
   * Execute workflow
   */
  public async executeWorkflow(
    workflowId: string,
    initialVariables: Record<string, unknown> = {}
  ): Promise<string> {
    if (this._status !== "running") {
      throw new Error("WorkflowManager is not running");
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check concurrent workflow limit
    if (this.executionStats.activeWorkflows >= this.maxConcurrentWorkflows) {
      throw new Error("Maximum concurrent workflows reached");
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const context: WorkflowContext = {
      workflowId,
      executionId,
      status: "running",
      startTime: new Date(),
      currentStep: workflow.steps[0]?.id,
      variables: new Map(Object.entries(initialVariables)),
      results: new Map(),
      errors: [],
      metadata: {
        workflowName: workflow.name,
        templateId: workflow.metadata?.templateId,
      },
    };

    this.workflowContexts.set(executionId, context);
    this.executionStats.activeWorkflows++;
    this.executionStats.totalWorkflows++;

    this.emitWorkflowEvent("workflow.execution.started", {
      workflowId,
      executionId,
      workflowName: workflow.name,
      stepCount: workflow.steps.length,
    });

    // Start workflow execution asynchronously
    this.executeWorkflowSteps(workflow, context).catch(error => {
      this.handleWorkflowError(context, error as Error);
    });

    return executionId;
  }

  /**
   * Cancel workflow execution
   */
  public cancelWorkflow(executionId: string): boolean {
    const context = this.workflowContexts.get(executionId);
    if (!context || context.status !== "running") {
      return false;
    }

    context.status = "cancelled";
    context.endTime = new Date();

    this.updateExecutionStats(context);

    this.emitWorkflowEvent("workflow.execution.cancelled", {
      workflowId: context.workflowId,
      executionId,
      duration: context.endTime.getTime() - context.startTime.getTime(),
    });

    return true;
  }

  /**
   * Pause workflow execution
   */
  public pauseWorkflow(executionId: string): boolean {
    const context = this.workflowContexts.get(executionId);
    if (!context || context.status !== "running") {
      return false;
    }

    context.status = "paused";

    this.emitWorkflowEvent("workflow.execution.paused", {
      workflowId: context.workflowId,
      executionId,
      currentStep: context.currentStep,
    });

    return true;
  }

  /**
   * Resume workflow execution
   */
  public async resumeWorkflow(executionId: string): Promise<boolean> {
    const context = this.workflowContexts.get(executionId);
    if (!context || context.status !== "paused") {
      return false;
    }

    const workflow = this.workflows.get(context.workflowId);
    if (!workflow) {
      return false;
    }

    context.status = "running";

    this.emitWorkflowEvent("workflow.execution.resumed", {
      workflowId: context.workflowId,
      executionId,
      currentStep: context.currentStep,
    });

    // Resume execution from current step
    this.executeWorkflowSteps(workflow, context).catch(error => {
      this.handleWorkflowError(context, error as Error);
    });

    return true;
  }

  /**
   * Get workflow execution status
   */
  public getWorkflowStatus(executionId: string): WorkflowContext | undefined {
    return this.workflowContexts.get(executionId);
  }

  /**
   * Get all active workflow executions
   */
  public getActiveWorkflows(): WorkflowContext[] {
    return Array.from(this.workflowContexts.values())
      .filter(context => context.status === "running" || context.status === "paused");
  }

  /**
   * Get workflow execution history
   */
  public getWorkflowHistory(workflowId?: string): WorkflowContext[] {
    const contexts = Array.from(this.workflowContexts.values());
    if (workflowId) {
      return contexts.filter(context => context.workflowId === workflowId);
    }
    return contexts;
  }

  /**
   * Get workflow execution statistics
   */
  public getExecutionStats(): WorkflowExecutionStats {
    return { ...this.executionStats };
  }

  /**
   * Subscribe to workflow events
   */
  public onWorkflowEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Unsubscribe from workflow events
   */
  public offWorkflowEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflowSteps(
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<void> {
    try {
      for (const step of workflow.steps) {
        if (context.status !== "running") {
          break;
        }

        // Check dependencies
        if (!this.checkStepDependencies(step, context)) {
          continue;
        }

        context.currentStep = step.id;

        this.emitWorkflowEvent("workflow.step.started", {
          workflowId: context.workflowId,
          executionId: context.executionId,
          stepId: step.id,
          stepName: step.name,
        });

        const stepResult = await this.executeStep(step, context);

        context.results.set(step.id, stepResult);

        this.emitWorkflowEvent("workflow.step.completed", {
          workflowId: context.workflowId,
          executionId: context.executionId,
          stepId: step.id,
          stepName: step.name,
          result: stepResult,
        });

        // Handle step completion actions
        if (stepResult.status === "success" && step.onSuccess) {
          await this.handleStepActions(step.onSuccess, context);
        } else if (stepResult.status === "failure" && step.onFailure) {
          await this.handleStepActions(step.onFailure, context);
        }
      }

      // Complete workflow
      context.status = "completed";
      context.endTime = new Date();

      this.updateExecutionStats(context);

      this.emitWorkflowEvent("workflow.execution.completed", {
        workflowId: context.workflowId,
        executionId: context.executionId,
        duration: context.endTime.getTime() - context.startTime.getTime(),
        stepCount: workflow.steps.length,
        successfulSteps: Array.from(context.results.values())
          .filter(r => r.status === "success").length,
      });
    } catch (error) {
      this.handleWorkflowError(context, error as Error);
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const startTime = new Date();
    let retryCount = 0;
    const maxRetries = step.retryPolicy?.maxAttempts || 1;

    while (retryCount < maxRetries) {
      try {
        if (!this.executionEngine) {
          throw new Error("No execution engine configured");
        }

        // Set timeout
        const timeout = step.timeout || this.defaultTimeout;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Step execution timeout")), timeout);
        });

        const executionPromise = this.executionEngine.executeStep(step, context);
        const result = await Promise.race([executionPromise, timeoutPromise]);

        const endTime = new Date();

        return {
          stepId: step.id,
          status: "success",
          result,
          startTime,
          endTime,
          executionTime: endTime.getTime() - startTime.getTime(),
          retryCount,
          metadata: step.metadata,
        };
      } catch (error) {
        retryCount++;

        if (retryCount >= maxRetries) {
          const endTime = new Date();

          // Handle step error
          if (this.executionEngine) {
            await this.executionEngine.handleStepError(step, error as Error, context);
          }

          return {
            stepId: step.id,
            status: "failure",
            error: error as Error,
            startTime,
            endTime,
            executionTime: endTime.getTime() - startTime.getTime(),
            retryCount,
            metadata: step.metadata,
          };
        }

        // Wait before retry
        if (step.retryPolicy) {
          const delay = this.calculateRetryDelay(step.retryPolicy, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error("Unexpected end of step execution");
  }

  /**
   * Check step dependencies
   */
  private checkStepDependencies(step: WorkflowStep, context: WorkflowContext): boolean {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true;
    }

    for (const dependency of step.dependencies) {
      const dependencyResult = context.results.get(dependency);
      if (!dependencyResult || dependencyResult.status !== "success") {
        return false;
      }
    }

    return true;
  }

  /**
   * Handle step actions
   */
  private async handleStepActions(actions: string[], context: WorkflowContext): Promise<void> {
    for (const action of actions) {
      // Implement action handling logic
      // This could include setting variables, triggering events, etc.
      console.log(`Executing action: ${action}`);
    }
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(retryPolicy: RetryPolicy, attempt: number): number {
    const { backoffStrategy, baseDelay, maxDelay } = retryPolicy;

    let delay = baseDelay;

    switch (backoffStrategy) {
      case "exponential":
        delay = baseDelay * Math.pow(2, attempt - 1);
        break;
      case "linear":
        delay = baseDelay * attempt;
        break;
      case "fixed":
      default:
        delay = baseDelay;
        break;
    }

    if (maxDelay && delay > maxDelay) {
      delay = maxDelay;
    }

    return delay;
  }

  /**
   * Validate template parameters
   */
  private validateTemplateParameters(
    template: WorkflowTemplate,
    parameters: Record<string, unknown>
  ): void {
    for (const param of template.parameters) {
      const value = parameters[param.name];

      if (param.required && (value === undefined || value === null)) {
        throw new Error(`Required parameter '${param.name}' is missing`);
      }

      if (value !== undefined && param.validation) {
        this.validateParameterValue(param, value);
      }
    }
  }

  /**
   * Validate parameter value
   */
  private validateParameterValue(param: WorkflowParameter, value: unknown): void {
    const validation = param.validation!;

    if (param.type === "number" && typeof value === "number") {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(`Parameter '${param.name}' must be >= ${validation.min}`);
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(`Parameter '${param.name}' must be <= ${validation.max}`);
      }
    }

    if (param.type === "string" && typeof value === "string") {
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          throw new Error(`Parameter '${param.name}' does not match pattern ${validation.pattern}`);
        }
      }
    }

    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(`Parameter '${param.name}' must be one of: ${validation.enum.join(", ")}`);
    }
  }

  /**
   * Process template steps with parameter substitution
   */
  private processTemplateSteps(
    steps: WorkflowStep[],
    parameters: Record<string, unknown>
  ): WorkflowStep[] {
    return steps.map(step => ({
      ...step,
      task: this.substituteParameters(step.task || "", parameters),
      condition: step.condition ? this.substituteParameters(step.condition, parameters) : undefined,
    }));
  }

  /**
   * Substitute parameters in template strings
   */
  private substituteParameters(template: string, parameters: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
      const value = parameters[paramName];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Monitor workflow execution
   */
  private monitorWorkflowExecution(): void {
    const now = new Date();

    for (const context of this.workflowContexts.values()) {
      if (context.status === "running") {
        const workflow = this.workflows.get(context.workflowId);
        if (workflow) {
          const timeout = workflow.timeout || this.defaultTimeout;
          const elapsed = now.getTime() - context.startTime.getTime();

          if (elapsed > timeout) {
            context.status = "failed";
            context.endTime = now;
            context.errors.push({
              stepId: context.currentStep || "unknown",
              error: new Error("Workflow execution timeout"),
              timestamp: now,
              retryCount: 0,
              recoverable: false,
            });

            this.updateExecutionStats(context);

            this.emitWorkflowEvent("workflow.execution.timeout", {
              workflowId: context.workflowId,
              executionId: context.executionId,
              timeout,
              elapsed,
            });
          }
        }
      }
    }
  }

  /**
   * Handle workflow error
   */
  private handleWorkflowError(context: WorkflowContext, error: Error): void {
    context.status = "failed";
    context.endTime = new Date();

    const workflowError: WorkflowError = {
      stepId: context.currentStep || "unknown",
      error,
      timestamp: new Date(),
      retryCount: 0,
      recoverable: false,
    };

    context.errors.push(workflowError);

    this.updateExecutionStats(context);
    this.handleError(error);

    this.emitWorkflowEvent("workflow.execution.failed", {
      workflowId: context.workflowId,
      executionId: context.executionId,
      error: error.message,
      currentStep: context.currentStep,
      duration: context.endTime.getTime() - context.startTime.getTime(),
    });
  }

  /**
   * Update execution statistics
   */
  private updateExecutionStats(context: WorkflowContext): void {
    this.executionStats.activeWorkflows--;

    if (context.status === "completed") {
      this.executionStats.completedWorkflows++;
    } else if (context.status === "failed") {
      this.executionStats.failedWorkflows++;
    }

    // Update success rate
    const totalCompleted = this.executionStats.completedWorkflows + this.executionStats.failedWorkflows;
    if (totalCompleted > 0) {
      this.executionStats.successRate = this.executionStats.completedWorkflows / totalCompleted;
    }

    // Update average execution time
    if (context.endTime) {
      const executionTime = context.endTime.getTime() - context.startTime.getTime();
      this.executionStats.averageExecutionTime = 
        (this.executionStats.averageExecutionTime + executionTime) / 2;
    }
  }

  /**
   * Initialize default workflow templates
   */
  private initializeDefaultTemplates(): void {
    // Basic development workflow template
    const basicDevTemplate: WorkflowTemplate = {
      id: "basic-development",
      name: "Basic Development Workflow",
      description: "Standard development workflow with requirements, implementation, and testing",
      category: "development",
      version: "1.0.0",
      parameters: [
        {
          name: "requirement",
          type: "string",
          required: true,
          description: "The development requirement to implement",
        },
        {
          name: "priority",
          type: "string",
          required: false,
          defaultValue: "normal",
          description: "Task priority level",
          validation: {
            enum: ["low", "normal", "high", "critical"],
          },
        },
      ],
      definition: {
        steps: [
          {
            id: "analyze-requirement",
            name: "Analyze Requirement",
            type: "agent_task",
            task: "Analyze the requirement: {{requirement}}",
          },
          {
            id: "generate-tasks",
            name: "Generate Implementation Tasks",
            type: "agent_task",
            task: "Generate implementation tasks based on analysis",
            dependencies: ["analyze-requirement"],
          },
          {
            id: "implement-solution",
            name: "Implement Solution",
            type: "agent_task",
            task: "Implement the solution based on generated tasks",
            dependencies: ["generate-tasks"],
          },
          {
            id: "validate-implementation",
            name: "Validate Implementation",
            type: "agent_task",
            task: "Validate and test the implementation",
            dependencies: ["implement-solution"],
          },
        ],
        timeout: 1800000, // 30 minutes
        retryPolicy: {
          maxAttempts: 3,
          backoffStrategy: "exponential",
          baseDelay: 5000,
          maxDelay: 30000,
        },
      },
    };

    this.registerTemplate(basicDevTemplate);
  }

  /**
   * Emit workflow-related events
   */
  private emitWorkflowEvent(type: string, data: any): void {
    const event: OrchestratorEvent = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source: this.id,
      timestamp: new Date(),
      version: 1,
      status: "completed",
      affectedNodeId: this.id,
      data,
    };

    this.eventEmitter.emit(type, event);
    this.eventEmitter.emit("*", event); // Wildcard listener
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = error;
    console.error(`WorkflowManager Error:`, error);

    this.emitWorkflowEvent("workflow.manager.error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }
}

